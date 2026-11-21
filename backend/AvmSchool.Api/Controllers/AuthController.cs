using AvmSchool.Api.Data;
using AvmSchool.Api.Models;
using AvmSchool.Api.Security;
using AvmSchool.Api.Services;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AvmSchool.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    IRepository<User> users,
    IRepository<Student> students,
    PasswordHasher hasher,
    ImageStorage images,
    StorageOptions storage) : ControllerBase
{
    // Used so a login for an unknown email takes as long as a wrong password.
    private static readonly Lazy<string> DummyHash = new(() => new PasswordHasher().Hash(Guid.NewGuid().ToString()));

    /// <summary>
    /// Student registration (multipart/form-data). Creates the login account and the student record,
    /// then returns a bearer token: { tokenType, accessToken, expiresIn, refreshToken }.
    /// </summary>
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> Register([FromForm] RegisterRequest req, IFormFile? photo, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        if (req.DateOfBirth is { } dob)
        {
            if (dob >= today) ModelState.AddModelError(nameof(req.DateOfBirth), "Date of birth must be in the past.");
            else if (dob > today.AddYears(-2)) ModelState.AddModelError(nameof(req.DateOfBirth), "The child must be at least 2 years old.");
            else if (dob < today.AddYears(-20)) ModelState.AddModelError(nameof(req.DateOfBirth), "Check the date of birth.");
        }

        var email = req.Email.Trim().ToLowerInvariant();
        if (await users.FindFirstAsync(nameof(Models.User.Email), email, ct) is not null)
            ModelState.AddModelError(nameof(req.Email), "An account with this email already exists. Log in instead.");

        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        SavedImage? saved = null;
        if (photo is { Length: > 0 })
        {
            try { saved = await images.SaveAsync(photo, storage.StudentPhotoFolder, ct); }
            catch (InvalidImageException ex)
            {
                ModelState.AddModelError("Photo", ex.Message);
                return ValidationProblem(ModelState);
            }
        }

        var user = new User
        {
            FullName = $"{req.FirstName.Trim()} {req.LastName.Trim()}",
            Email = email,
            Phone = req.Phone.Trim(),
            PasswordHash = hasher.Hash(req.Password),
            Role = Roles.Student,
            LastLoginAt = DateTime.UtcNow,
        };
        await users.InsertAsync(user, ct);

        try
        {
            var student = new Student
            {
                UserId = user.Id,
                ApplicationNo = $"TMP-{Guid.NewGuid():N}",
                PhotoFileName = saved?.FileName,
            };
            req.CopyProfileTo(student);
            await students.InsertAsync(student, ct);

            student.ApplicationNo = $"AVM{DateTime.UtcNow:yy}-{student.Id:D5}";
            await students.UpdateAsync(student, ct);
        }
        catch
        {
            // Don't leave a login account without a student record.
            await users.DeleteAsync(user.Id, CancellationToken.None);
            ImageStorage.TryDelete(storage.StudentPhotoFolder, saved?.FileName);
            throw;
        }

        return SignIn(user.ToPrincipal(), BearerTokenDefaults.AuthenticationScheme);
    }

    /// <summary>Login for both tabs. LoginAs must match the account's role.</summary>
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest req, CancellationToken ct)
    {
        var user = await users.FindFirstAsync(nameof(Models.User.Email), req.Email.Trim().ToLowerInvariant(), ct);

        if (user is null)
        {
            hasher.Verify(req.Password, DummyHash.Value);
            return Problem(title: "Email or password is incorrect.", statusCode: StatusCodes.Status401Unauthorized);
        }
        if (!hasher.Verify(req.Password, user.PasswordHash))
            return Problem(title: "Email or password is incorrect.", statusCode: StatusCodes.Status401Unauthorized);
        if (!user.IsActive)
            return Problem(title: "This account is deactivated. Contact the school office.", statusCode: StatusCodes.Status403Forbidden);
        if (!string.Equals(user.Role, req.LoginAs, StringComparison.OrdinalIgnoreCase))
            return Problem(
                title: user.Role == Roles.Admin
                    ? "This is an admin account. Use the Admin tab to log in."
                    : "This is a student account. Use the Student tab to log in.",
                statusCode: StatusCodes.Status403Forbidden);

        user.LastLoginAt = DateTime.UtcNow;
        await users.UpdateAsync(user, ct);

        return SignIn(user.ToPrincipal(), BearerTokenDefaults.AuthenticationScheme);
    }

    /// <summary>The logged-in account, plus the student record for student accounts.</summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var user = await users.GetByIdAsync(User.GetUserId() ?? 0, ct);
        if (user is null) return Unauthorized();

        var student = user.Role == Roles.Student
            ? await students.FindFirstAsync(nameof(Student.UserId), user.Id, ct)
            : null;

        return Ok(new { user = UserView.From(user), student });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(User.GetUserId() ?? 0, ct);
        if (user is null) return Unauthorized();
        if (!hasher.Verify(req.CurrentPassword, user.PasswordHash))
        {
            ModelState.AddModelError(nameof(req.CurrentPassword), "Current password is incorrect.");
            return ValidationProblem(ModelState);
        }

        user.PasswordHash = hasher.Hash(req.NewPassword);
        await users.UpdateAsync(user, ct);
        return NoContent();
    }
}
