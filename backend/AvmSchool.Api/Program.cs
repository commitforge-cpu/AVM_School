using System.Threading.RateLimiting;
using AvmSchool.Api.Data;
using AvmSchool.Api.Security;
using AvmSchool.Api.Services;
using Microsoft.AspNetCore.Authentication.BearerToken;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// ---------- Folders (Gallery, StudentPhotos, App_Data) ----------
var storage = StorageOptions.From(builder.Configuration, builder.Environment);
storage.EnsureFolders();
builder.Services.AddSingleton(storage);

// ---------- Data: Json files now, SQL Server later (see appsettings.json) ----------
builder.Services.AddDataStore(builder.Configuration, storage);
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<ImageStorage>();

// ---------- Auth: bearer tokens (built into ASP.NET Core, no extra packages) ----------
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(storage.DataFolder, "keys")))
    .SetApplicationName("AvmSchoolPortal");

builder.Services.AddAuthentication(BearerTokenDefaults.AuthenticationScheme)
    .AddBearerToken(BearerTokenDefaults.AuthenticationScheme, o =>
    {
        o.BearerTokenExpiration = TimeSpan.FromHours(builder.Configuration.GetValue("Auth:TokenHours", 8));
    });
builder.Services.AddAuthorization();

// ---------- CORS for the Next.js frontend ----------
var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:3000"];
builder.Services.AddCors(o => o.AddPolicy("frontend", p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

// ---------- Rate limits for login/register and public forms ----------
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    static RateLimitPartition<string> PerIp(HttpContext ctx, int permits) =>
        RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = permits, Window = TimeSpan.FromMinutes(1) });
    o.AddPolicy("auth", ctx => PerIp(ctx, 10));
    o.AddPolicy("forms", ctx => PerIp(ctx, 5));
});

// ---------- Uploads (several gallery photos at once) ----------
const long maxUpload = 120L * 1024 * 1024;
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = maxUpload);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = maxUpload);

builder.Services.AddControllers();

var app = builder.Build();

await DataSeeder.SeedAsync(app.Services, app.Configuration, app.Logger);

app.UseCors("frontend");

// Gallery photos are public: http://localhost:5080/Gallery/<file>
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(storage.GalleryFolder),
    RequestPath = "/Gallery",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.CacheControl = "public,max-age=86400";
        ctx.Context.Response.Headers.XContentTypeOptions = "nosniff";
    },
});

app.UseRateLimiter();
app.UseAuthentication();
app.UseActiveUserCheck();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/", () => Results.Ok(new
{
    name = "AVM School Portal API",
    provider = app.Configuration["Database:Provider"] ?? "Json",
}));

app.Run();
