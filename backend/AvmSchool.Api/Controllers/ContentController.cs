using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using AvmSchool.Api.Data;
using AvmSchool.Api.Models;
using AvmSchool.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AvmSchool.Api.Controllers;

/// <summary>
/// Editable page content (home/index page, leadership, school life, ...), stored as JSON per page key.
/// When a key has never been saved the API returns 404 and the website shows its built-in default text.
/// </summary>
[ApiController]
[Route("api/content")]
public partial class ContentController(IRepository<SiteContent> content) : ControllerBase
{
    [GeneratedRegex("^[a-zA-Z0-9_-]{1,100}$")]
    private static partial Regex KeyPattern();

    [HttpGet("{key}")]
    public async Task<IActionResult> Get(string key, CancellationToken ct)
    {
        if (!KeyPattern().IsMatch(key)) return BadRequest();
        var row = await content.FindFirstAsync(nameof(SiteContent.ContentKey), key, ct);
        if (row is null) return NotFound();
        return Ok(new { key = row.ContentKey, updatedAt = row.UpdatedAt, data = JsonNode.Parse(row.ContentJson) });
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) =>
        Ok((await content.GetAllAsync(ct)).Select(r => new { key = r.ContentKey, updatedAt = r.UpdatedAt }));

    /// <summary>Admin: save a page's content. Body is the page's JSON object.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpPut("{key}")]
    [RequestSizeLimit(1_000_000)]
    public async Task<IActionResult> Save(string key, [FromBody] JsonElement data, CancellationToken ct)
    {
        if (!KeyPattern().IsMatch(key)) return Problem(title: "Invalid content key.", statusCode: 400);
        if (data.ValueKind != JsonValueKind.Object) return Problem(title: "Content must be a JSON object.", statusCode: 400);

        var json = data.GetRawText();
        var row = await content.FindFirstAsync(nameof(SiteContent.ContentKey), key, ct);
        if (row is null)
        {
            row = new SiteContent { ContentKey = key, ContentJson = json, UpdatedByUserId = User.GetUserId() };
            await content.InsertAsync(row, ct);
        }
        else
        {
            row.ContentJson = json;
            row.UpdatedAt = DateTime.UtcNow;
            row.UpdatedByUserId = User.GetUserId();
            await content.UpdateAsync(row, ct);
        }
        return Ok(new { key = row.ContentKey, updatedAt = row.UpdatedAt, data = JsonNode.Parse(row.ContentJson) });
    }

    /// <summary>Admin: remove saved content so the page goes back to its default text.</summary>
    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{key}")]
    public async Task<IActionResult> Reset(string key, CancellationToken ct)
    {
        if (!KeyPattern().IsMatch(key)) return BadRequest();
        var row = await content.FindFirstAsync(nameof(SiteContent.ContentKey), key, ct);
        if (row is not null) await content.DeleteAsync(row.Id, ct);
        return NoContent();
    }
}
