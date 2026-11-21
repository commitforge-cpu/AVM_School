using AvmSchool.Api.Data;
using AvmSchool.Api.Models;
using AvmSchool.Api.Security;
using AvmSchool.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AvmSchool.Api.Controllers;

/// <summary>
/// Gallery photos. Files are saved in the "Gallery" folder (Storage:GalleryFolder) and served at /Gallery/&lt;file&gt;.
/// Metadata (title, category, order) is saved in the GalleryPhotos table.
/// </summary>
[ApiController]
[Route("api/gallery")]
public class GalleryController(IRepository<GalleryPhoto> photos, ImageStorage images, StorageOptions storage) : ControllerBase
{
    private static object View(GalleryPhoto p) => new
    {
        p.Id, p.Title, p.Description, p.Category, p.FileName, p.OriginalFileName, p.ContentType,
        p.FileSizeBytes, p.SortOrder, p.IsPublished, p.UploadedAt,
        Url = "/Gallery/" + Uri.EscapeDataString(p.FileName),
    };

    // Keep free text within the GalleryPhotos column sizes.
    private static string Cut(string s, int max) => s.Length <= max ? s : s[..max];

    private static IEnumerable<GalleryPhoto> Ordered(IEnumerable<GalleryPhoto> list) =>
        list.OrderBy(p => p.SortOrder).ThenByDescending(p => p.UploadedAt);

    /// <summary>Public: published photos, optionally one category.</summary>
    [HttpGet]
    public async Task<IActionResult> Published(string? category, CancellationToken ct)
    {
        var list = (await photos.GetAllAsync(ct)).Where(p => p.IsPublished);
        if (!string.IsNullOrWhiteSpace(category))
            list = list.Where(p => p.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
        return Ok(Ordered(list).Select(View));
    }

    [HttpGet("categories")]
    public async Task<IActionResult> Categories(CancellationToken ct) =>
        Ok((await photos.GetAllAsync(ct)).Where(p => p.IsPublished).Select(p => p.Category)
            .Distinct(StringComparer.OrdinalIgnoreCase).Order());

    /// <summary>Admin: every photo, including hidden ones.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpGet("all")]
    public async Task<IActionResult> All(CancellationToken ct) => Ok(Ordered(await photos.GetAllAsync(ct)).Select(View));

    /// <summary>Admin: upload one or more photos (form field "files").</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<IActionResult> Upload(
        [FromForm] List<IFormFile> files,
        [FromForm] string? title,
        [FromForm] string? category,
        [FromForm] string? description,
        CancellationToken ct)
    {
        if (files.Count == 0) return Problem(title: "Choose at least one photo to upload.", statusCode: 400);

        var created = new List<object>();
        var errors = new List<string>();
        var cat = Cut(string.IsNullOrWhiteSpace(category) ? "General" : category.Trim(), 60);
        title = title is null ? null : Cut(title.Trim(), 140);
        description = description is null ? null : Cut(description.Trim(), 500);

        foreach (var file in files)
        {
            try
            {
                var saved = await images.SaveAsync(file, storage.GalleryFolder, ct);
                var photo = new GalleryPhoto
                {
                    Title = !string.IsNullOrWhiteSpace(title)
                        ? (files.Count > 1 ? $"{title.Trim()} {created.Count + 1}" : title.Trim())
                        : Cut(Path.GetFileNameWithoutExtension(saved.OriginalFileName), 150),
                    Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
                    Category = cat,
                    FileName = saved.FileName,
                    OriginalFileName = Cut(saved.OriginalFileName, 260),
                    ContentType = saved.ContentType,
                    FileSizeBytes = saved.SizeBytes,
                    UploadedByUserId = User.GetUserId(),
                };
                await photos.InsertAsync(photo, ct);
                created.Add(View(photo));
            }
            catch (InvalidImageException ex)
            {
                errors.Add(ex.Message);
            }
        }

        return Ok(new { created, errors });
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, GalleryUpdateRequest req, CancellationToken ct)
    {
        var p = await photos.GetByIdAsync(id, ct);
        if (p is null) return NotFound();
        p.Title = req.Title.Trim();
        p.Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim();
        p.Category = req.Category.Trim();
        p.SortOrder = req.SortOrder;
        p.IsPublished = req.IsPublished;
        await photos.UpdateAsync(p, ct);
        return Ok(View(p));
    }

    /// <summary>Admin: delete the record and the file from the Gallery folder.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var p = await photos.GetByIdAsync(id, ct);
        if (p is null) return NotFound();
        await photos.DeleteAsync(id, ct);
        ImageStorage.TryDelete(storage.GalleryFolder, p.FileName);
        return NoContent();
    }

    /// <summary>
    /// Admin: adds photos that were copied straight into the Gallery folder (outside the website)
    /// and removes records whose file was deleted from the folder.
    /// </summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPost("sync")]
    public async Task<IActionResult> Sync(CancellationToken ct)
    {
        var existing = await photos.GetAllAsync(ct);
        var known = existing.Select(p => p.FileName).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var added = 0;
        var removed = 0;

        foreach (var path in Directory.EnumerateFiles(storage.GalleryFolder))
        {
            var name = Path.GetFileName(path);
            if (!ImageStorage.IsImageFile(name) || known.Contains(name)) continue;
            await photos.InsertAsync(new GalleryPhoto
            {
                Title = Cut(Path.GetFileNameWithoutExtension(name).Replace('-', ' ').Replace('_', ' '), 150),
                FileName = name,
                OriginalFileName = name,
                ContentType = ImageStorage.ContentTypeFor(name),
                FileSizeBytes = new FileInfo(path).Length,
                UploadedByUserId = User.GetUserId(),
            }, ct);
            added++;
        }

        foreach (var p in existing.Where(p => !System.IO.File.Exists(Path.Combine(storage.GalleryFolder, p.FileName))))
        {
            await photos.DeleteAsync(p.Id, ct);
            removed++;
        }

        return Ok(new { added, removed });
    }
}
