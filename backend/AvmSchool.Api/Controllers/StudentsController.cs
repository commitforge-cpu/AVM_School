using AvmSchool.Api.Data;
using AvmSchool.Api.Models;
using AvmSchool.Api.Security;
using AvmSchool.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AvmSchool.Api.Controllers;

[ApiController]
[Route("api/students")]
public class StudentsController(
    IRepository<Student> students,
    IRepository<User> users,
    ImageStorage images,
    StorageOptions storage) : ControllerBase
{
    /// <summary>Admin: all students, with optional search / status / class filters.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpGet]
    public async Task<IActionResult> List(string? search, string? status, string? className, CancellationToken ct)
    {
        var all = await students.GetAllAsync(ct);
        var accounts = (await users.FindAsync(nameof(Models.User.Role), Roles.Student, ct)).ToDictionary(u => u.Id);

        IEnumerable<Student> q = all;
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(s => s.AdmissionStatus.Equals(status, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(className)) q = q.Where(s => s.ClassApplyingFor.Equals(className, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            q = q.Where(s =>
                $"{s.FirstName} {s.MiddleName} {s.LastName}".Contains(term, StringComparison.OrdinalIgnoreCase) ||
                s.ApplicationNo.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                s.FatherName.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                s.MotherName.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                (accounts.TryGetValue(s.UserId, out var u) && (u.Email.Contains(term, StringComparison.OrdinalIgnoreCase) || (u.Phone ?? "").Contains(term))));
        }

        return Ok(q.Select(s => new
        {
            student = s,
            account = accounts.TryGetValue(s.UserId, out var u) ? UserView.From(u) : null,
        }));
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken ct)
    {
        var s = await students.GetByIdAsync(id, ct);
        if (s is null) return NotFound();
        var u = await users.GetByIdAsync(s.UserId, ct);
        return Ok(new { student = s, account = u is null ? null : UserView.From(u) });
    }

    /// <summary>Admin: edit every field of a student, including status and remarks.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, StudentAdminUpdate req, CancellationToken ct)
    {
        var s = await students.GetByIdAsync(id, ct);
        if (s is null) return NotFound();
        if (!AdmissionStatuses.All.Contains(req.AdmissionStatus))
        {
            ModelState.AddModelError(nameof(req.AdmissionStatus), $"Status must be one of: {string.Join(", ", AdmissionStatuses.All)}.");
            return ValidationProblem(ModelState);
        }

        var account = await users.GetByIdAsync(s.UserId, ct);
        if (account is not null && !string.IsNullOrWhiteSpace(req.AccountEmail))
        {
            var newEmail = req.AccountEmail.Trim().ToLowerInvariant();
            if (newEmail != account.Email)
            {
                if (await users.FindFirstAsync(nameof(Models.User.Email), newEmail, ct) is not null)
                {
                    ModelState.AddModelError(nameof(req.AccountEmail), "Another account already uses this email.");
                    return ValidationProblem(ModelState);
                }
                account.Email = newEmail;
            }
        }

        req.CopyProfileTo(s);
        s.AdmissionStatus = req.AdmissionStatus;
        s.AdminRemarks = string.IsNullOrWhiteSpace(req.AdminRemarks) ? null : req.AdminRemarks.Trim();
        s.UpdatedAt = DateTime.UtcNow;
        await students.UpdateAsync(s, ct);

        if (account is not null)
        {
            account.FullName = $"{s.FirstName} {s.LastName}";
            if (!string.IsNullOrWhiteSpace(req.AccountPhone)) account.Phone = req.AccountPhone.Trim();
            await users.UpdateAsync(account, ct);
        }

        return Ok(new { student = s, account = account is null ? null : UserView.From(account) });
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, StatusUpdateRequest req, CancellationToken ct)
    {
        if (!AdmissionStatuses.All.Contains(req.Status))
            return Problem(title: $"Status must be one of: {string.Join(", ", AdmissionStatuses.All)}.", statusCode: 400);

        var s = await students.GetByIdAsync(id, ct);
        if (s is null) return NotFound();
        s.AdmissionStatus = req.Status;
        if (req.Remarks is not null) s.AdminRemarks = req.Remarks.Trim();
        s.UpdatedAt = DateTime.UtcNow;
        await students.UpdateAsync(s, ct);
        return Ok(s);
    }

    /// <summary>Admin: delete the student record, its login account and photo.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var s = await students.GetByIdAsync(id, ct);
        if (s is null) return NotFound();
        await students.DeleteAsync(id, ct);
        await users.DeleteAsync(s.UserId, ct);
        ImageStorage.TryDelete(storage.StudentPhotoFolder, s.PhotoFileName);
        return NoContent();
    }

    /// <summary>Admin: replace a student's photo.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost("{id:int}/photo")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> ReplacePhoto(int id, IFormFile photo, CancellationToken ct)
    {
        var s = await students.GetByIdAsync(id, ct);
        if (s is null) return NotFound();
        try
        {
            var saved = await images.SaveAsync(photo, storage.StudentPhotoFolder, ct);
            ImageStorage.TryDelete(storage.StudentPhotoFolder, s.PhotoFileName);
            s.PhotoFileName = saved.FileName;
            s.UpdatedAt = DateTime.UtcNow;
            await students.UpdateAsync(s, ct);
            return Ok(s);
        }
        catch (InvalidImageException ex)
        {
            return Problem(title: ex.Message, statusCode: 400);
        }
    }

    /// <summary>Student photo: visible to admins and to the student who owns it.</summary>
    [Authorize]
    [HttpGet("{id:int}/photo")]
    public async Task<IActionResult> Photo(int id, CancellationToken ct)
    {
        var s = await students.GetByIdAsync(id, ct);
        if (s is null) return NotFound();
        if (!User.IsInRole(Roles.Admin) && s.UserId != User.GetUserId()) return Forbid();

        var path = ImageStorage.SafePath(storage.StudentPhotoFolder, s.PhotoFileName);
        if (path is null || !System.IO.File.Exists(path)) return NotFound();
        return PhysicalFile(path, ImageStorage.ContentTypeFor(path));
    }

    /// <summary>Student: their own application.</summary>
    [Authorize(Roles = Roles.Student)]
    [HttpGet("me")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var s = await students.FindFirstAsync(nameof(Student.UserId), User.GetUserId() ?? 0, ct);
        return s is null ? NotFound() : Ok(s);
    }

    [HttpGet("statuses")]
    public IActionResult Statuses() => Ok(AdmissionStatuses.All);
}
