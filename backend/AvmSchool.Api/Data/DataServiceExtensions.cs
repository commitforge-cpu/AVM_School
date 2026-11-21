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

            services.AddSingleton(new SqlConnectionInfo(SqlServerFactory.Instance, cs));
            services.AddSingleton(typeof(IRepository<>), typeof(SqlRepository<>));
        }
        else
        {
            services.AddSingleton(typeof(IRepository<>), typeof(JsonRepository<>));
        }

        return services;
    }
}
