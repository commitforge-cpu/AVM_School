using AvmSchool.Api.Data;
using AvmSchool.Api.Models;
using AvmSchool.Api.Security;

namespace AvmSchool.Api.Services;

public static class DataSeeder
{
    /// <summary>Creates the first admin account from AdminSeed settings when no admin exists.</summary>
    public static async Task SeedAsync(IServiceProvider services, IConfiguration config, ILogger logger)
    {
        var users = services.GetRequiredService<IRepository<User>>();
        var hasher = services.GetRequiredService<PasswordHasher>();

        var admins = await users.FindAsync(nameof(User.Role), Roles.Admin);
        if (admins.Count > 0) return;

        var email = config["AdminSeed:Email"];
        var password = config["AdminSeed:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("No admin account exists and AdminSeed is not configured.");
            return;
        }

        await users.InsertAsync(new User
        {
            FullName = config["AdminSeed:FullName"] ?? "Administrator",
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = hasher.Hash(password),
            Role = Roles.Admin,
        });
        logger.LogWarning("Created the first admin account {Email}. Change its password after logging in.", email);
    }
}
