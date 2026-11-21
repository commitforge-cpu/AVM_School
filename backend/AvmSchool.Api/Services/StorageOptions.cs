namespace AvmSchool.Api.Services;

/// <summary>Absolute paths of the folders the API writes to.</summary>
public sealed class StorageOptions
{
    /// <summary>Public gallery photos. Served at /Gallery/&lt;file&gt;.</summary>
    public required string GalleryFolder { get; init; }

    /// <summary>Student photos from the Register form. Private: only admins and the student can fetch them.</summary>
    public required string StudentPhotoFolder { get; init; }

    /// <summary>JSON data files (when Provider = Json) and data-protection keys.</summary>
    public required string DataFolder { get; init; }

    public static StorageOptions From(IConfiguration config, IHostEnvironment env)
    {
        string Resolve(string key, string fallback)
        {
            var value = config[$"Storage:{key}"];
            if (string.IsNullOrWhiteSpace(value)) value = fallback;
            return Path.GetFullPath(Path.IsPathRooted(value) ? value : Path.Combine(env.ContentRootPath, value));
        }

        return new StorageOptions
        {
            GalleryFolder = Resolve("GalleryFolder", "Gallery"),
            StudentPhotoFolder = Resolve("StudentPhotoFolder", "StudentPhotos"),
            DataFolder = Resolve("DataFolder", "App_Data"),
        };
    }

    public void EnsureFolders()
    {
        Directory.CreateDirectory(GalleryFolder);
        Directory.CreateDirectory(StudentPhotoFolder);
        Directory.CreateDirectory(DataFolder);
    }
}
