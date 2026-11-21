using AvmSchool.Api.Data;
using AvmSchool.Api.Models;
using AvmSchool.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AvmSchool.Api.Controllers;

/// <summary>Connect page form.</summary>
[ApiController]
[Route("api/enquiries")]
public class EnquiriesController(IRepository<ContactEnquiry> enquiries) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting("forms")]
    public async Task<IActionResult> Create(EnquiryRequest req, CancellationToken ct)
    {
        await enquiries.InsertAsync(new ContactEnquiry
        {
            Name = req.Name.Trim(),
            Phone = req.Phone?.Trim(),
            Email = req.Email.Trim(),
            Message = req.Message.Trim(),
        }, ct);
        return Ok(new { message = "Thanks for writing to us. The school office will get back to you." });
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await enquiries.GetAllAsync(ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpPatch("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, [FromQuery] bool read = true, CancellationToken ct = default)
    {
        var e = await enquiries.GetByIdAsync(id, ct);
        if (e is null) return NotFound();
        e.IsRead = read;
        await enquiries.UpdateAsync(e, ct);
        return Ok(e);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await enquiries.DeleteAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Career page form.</summary>
[ApiController]
[Route("api/careers")]
public class CareersController(IRepository<CareerApplication> applications) : ControllerBase
{
    public static readonly string[] Statuses = ["New", "Shortlisted", "Interviewed", "Hired", "Not selected"];

    [HttpPost]
    [EnableRateLimiting("forms")]
    public async Task<IActionResult> Apply(CareerRequest req, CancellationToken ct)
    {
        await applications.InsertAsync(new CareerApplication
        {
            FirstName = req.FirstName.Trim(),
            LastName = req.LastName.Trim(),
            Email = req.Email.Trim(),
            Phone = req.Phone?.Trim(),
            Position = req.Position.Trim(),
            CvLink = req.CvLink?.Trim(),
        }, ct);
        return Ok(new { message = "Application received. The school will contact you if a suitable position opens." });
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await applications.GetAllAsync(ct));

    [Authorize(Roles = Roles.Admin)]
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> SetStatus(int id, StatusUpdateRequest req, CancellationToken ct)
    {
        if (!Statuses.Contains(req.Status)) return Problem(title: $"Status must be one of: {string.Join(", ", Statuses)}.", statusCode: 400);
        var a = await applications.GetByIdAsync(id, ct);
        if (a is null) return NotFound();
        a.Status = req.Status;
        await applications.UpdateAsync(a, ct);
        return Ok(a);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await applications.DeleteAsync(id, ct);
        return NoContent();
    }
}

/// <summary>Admin: login accounts.</summary>
[ApiController]
[Route("api/users")]
[Authorize(Roles = Roles.Admin)]
public class UsersController(IRepository<User> users, PasswordHasher hasher) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok((await users.GetAllAsync(ct)).Select(UserView.From));

    [HttpPost("admin")]
    public async Task<IActionResult> CreateAdmin(CreateAdminRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await users.FindFirstAsync(nameof(Models.User.Email), email, ct) is not null)
        {
            ModelState.AddModelError(nameof(req.Email), "An account with this email already exists.");
            return ValidationProblem(ModelState);
        }
        var u = new User
        {
            FullName = req.FullName.Trim(),
            Email = email,
            Phone = req.Phone?.Trim(),
            PasswordHash = hasher.Hash(req.Password),
            Role = Roles.Admin,
        };
        await users.InsertAsync(u, ct);
        return Ok(UserView.From(u));
    }

    [HttpPatch("{id:int}/active")]
    public async Task<IActionResult> SetActive(int id, [FromQuery] bool active, CancellationToken ct)
    {
        if (id == User.GetUserId()) return Problem(title: "You can't deactivate your own account.", statusCode: 400);
        var u = await users.GetByIdAsync(id, ct);
        if (u is null) return NotFound();
        u.IsActive = active;
        await users.UpdateAsync(u, ct);
        return Ok(UserView.From(u));
    }

    /// <summary>Admin sets a new password for any account (e.g. a parent who forgot theirs).</summary>
    [HttpPost("{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, ResetPasswordRequest req, CancellationToken ct)
    {
        var u = await users.GetByIdAsync(id, ct);
        if (u is null) return NotFound();
        u.PasswordHash = hasher.Hash(req.NewPassword);
        await users.UpdateAsync(u, ct);
        return NoContent();
    }
}

/// <summary>Admin dashboard numbers.</summary>
[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = Roles.Admin)]
public class DashboardController(
    IRepository<Student> students,
    IRepository<GalleryPhoto> photos,
    IRepository<ContactEnquiry> enquiries,
    IRepository<CareerApplication> careers) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<IActionResult> Stats(CancellationToken ct)
    {
        var all = await students.GetAllAsync(ct);
        var msgs = await enquiries.GetAllAsync(ct);
        return Ok(new
        {
            students = all.Count,
            byStatus = AdmissionStatuses.All.ToDictionary(s => s, s => all.Count(x => x.AdmissionStatus == s)),
            byClass = all.GroupBy(s => s.ClassApplyingFor).OrderBy(g => g.Key).ToDictionary(g => g.Key, g => g.Count()),
            recentStudents = all.Take(5).Select(s => new { s.Id, s.ApplicationNo, s.FirstName, s.LastName, s.ClassApplyingFor, s.AdmissionStatus, s.CreatedAt }),
            photos = await photos.CountAsync(ct),
            enquiries = msgs.Count,
            unreadEnquiries = msgs.Count(m => !m.IsRead),
            careerApplications = await careers.CountAsync(ct),
        });
    }
}
