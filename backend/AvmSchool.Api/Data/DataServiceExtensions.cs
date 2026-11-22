using System.Data.Common;
using AvmSchool.Api.Services;

namespace AvmSchool.Api.Data;

public static class DataServiceExtensions
{
    public static IServiceCollection AddDataStore(this IServiceCollection services, IConfiguration config, StorageOptions storage)
    {
        var provider = config["Database:Provider"] ?? "Json";

        if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        {
            var cs = config.GetConnectionString("AvmSchoolDb");
            if (string.IsNullOrWhiteSpace(cs))
                throw new InvalidOperationException(
                    "Database:Provider is SqlServer but ConnectionStrings:AvmSchoolDb is empty. " +
                    "Add your connection string to appsettings.json or set Provider back to Json.");

            services.AddSingleton(new SqlConnectionInfo(SqlServerFactory.Instance, WithPassword(cs, config["Database:Password"])));
            services.AddSingleton(typeof(IRepository<>), typeof(SqlRepository<>));
        }
        else
        {
            services.AddSingleton(typeof(IRepository<>), typeof(JsonRepository<>));
        }

        return services;
    }

    /// <summary>
    /// Adds the SQL login password, which is kept out of appsettings.json because that file is committed to git.
    /// This PC:  in backend/AvmSchool.Api run  dotnet user-secrets set "Database:Password" "&lt;password&gt;"
    /// Server:   set the environment variable  Database__Password
    /// </summary>
    private static string WithPassword(string connectionString, string? password)
    {
        var builder = new DbConnectionStringBuilder { ConnectionString = connectionString };
        if (!string.IsNullOrEmpty(password)) builder["Password"] = password;

        var usesSqlLogin = new[] { "User ID", "UID", "User" }.Any(builder.ContainsKey);
        var hasPassword = new[] { "Password", "PWD" }.Any(builder.ContainsKey);
        if (usesSqlLogin && !hasPassword)
            throw new InvalidOperationException(
                "ConnectionStrings:AvmSchoolDb uses a SQL login but no password is set. In backend/AvmSchool.Api run: " +
                "dotnet user-secrets set \"Database:Password\" \"<password>\"   (on a server, set the environment variable Database__Password).");

        return builder.ConnectionString;
    }
}
