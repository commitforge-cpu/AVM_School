namespace AvmSchool.Api.Services;

public sealed record SavedImage(string FileName, string ContentType, long SizeBytes, string OriginalFileName);

public sealed class InvalidImageException(string message) : Exception(message);

/// <summary>
/// Saves uploaded images to disk safely: checks size, extension AND the file's real signature,
/// and always stores under a new random name (the uploaded name is never used as a path).
/// </summary>
public sealed class ImageStorage
{
    public const long MaxBytes = 10 * 1024 * 1024; // 10 MB per photo

    private static readonly Dictionary<string, string> Types = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
        [".webp"] = "image/webp",
        [".gif"] = "image/gif",
    };

    public static bool IsImageFile(string fileName) => Types.ContainsKey(Path.GetExtension(fileName));

    public static string ContentTypeFor(string fileName) =>
        Types.TryGetValue(Path.GetExtension(fileName), out var t) ? t : "application/octet-stream";

    public async Task<SavedImage> SaveAsync(IFormFile file, string folder, CancellationToken ct = default)
    {
        if (file.Length == 0) throw new InvalidImageException($"{file.FileName} is empty.");
        if (file.Length > MaxBytes) throw new InvalidImageException($"{file.FileName} is larger than 10 MB.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!Types.TryGetValue(ext, out var contentType))
            throw new InvalidImageException($"{file.FileName}: only JPG, PNG, WEBP and GIF images are allowed.");

        var header = new byte[12];
        await using (var s = file.OpenReadStream())
        {
            var read = await s.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, ct);
            if (read < 4 || !SignatureMatches(header, contentType))
                throw new InvalidImageException($"{file.FileName} is not a valid {ext.TrimStart('.').ToUpperInvariant()} image.");
        }

        if (ext == ".jpeg") ext = ".jpg";
        var name = $"{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(folder, name);

        await using (var target = new FileStream(path, FileMode.CreateNew, FileAccess.Write))
            await file.CopyToAsync(target, ct);

        return new SavedImage(name, contentType, file.Length, Path.GetFileName(file.FileName));
    }

    /// <summary>Deletes a file only if the name is a plain file name inside the folder.</summary>
    public static bool TryDelete(string folder, string? fileName)
    {
        var path = SafePath(folder, fileName);
        if (path is null || !File.Exists(path)) return false;
        File.Delete(path);
        return true;
    }

    public static string? SafePath(string folder, string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) || Path.GetFileName(fileName) != fileName) return null;
        var full = Path.GetFullPath(Path.Combine(folder, fileName));
        return full.StartsWith(Path.GetFullPath(folder), StringComparison.Ordinal) ? full : null;
    }

    private static bool SignatureMatches(byte[] h, string contentType) => contentType switch
    {
        "image/jpeg" => h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF,
        "image/png" => h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47,
        "image/gif" => h[0] == (byte)'G' && h[1] == (byte)'I' && h[2] == (byte)'F' && h[3] == (byte)'8',
        "image/webp" => h[0] == (byte)'R' && h[1] == (byte)'I' && h[2] == (byte)'F' && h[3] == (byte)'F'
                        && h[8] == (byte)'W' && h[9] == (byte)'E' && h[10] == (byte)'B' && h[11] == (byte)'P',
        _ => false,
    };
}
