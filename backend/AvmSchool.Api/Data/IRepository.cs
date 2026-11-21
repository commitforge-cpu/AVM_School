using System.ComponentModel.DataAnnotations.Schema;
using System.Reflection;
using AvmSchool.Api.Models;

namespace AvmSchool.Api.Data;

/// <summary>
/// One repository per table. Two implementations:
///  - JsonRepository     : local JSON files in App_Data (default, no database needed)
///  - SqlRepository      : SQL Server tables created by database/01_create_database.sql
/// Switch with "Database:Provider" in appsettings.json.
/// </summary>
public interface IRepository<T> where T : class, IEntity, new()
{
    Task<List<T>> GetAllAsync(CancellationToken ct = default);
    Task<T?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<List<T>> FindAsync(string column, object? value, CancellationToken ct = default);
    Task<T?> FindFirstAsync(string column, object? value, CancellationToken ct = default);
    Task<int> CountAsync(CancellationToken ct = default);
    Task<int> InsertAsync(T entity, CancellationToken ct = default);
    Task UpdateAsync(T entity, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}

/// <summary>Reflection metadata: table name + column (property) list for an entity type.</summary>
public static class EntityMeta<T> where T : class, IEntity, new()
{
    public static readonly string Table =
        typeof(T).GetCustomAttribute<TableAttribute>()?.Name ?? typeof(T).Name + "s";

    public static readonly PropertyInfo[] Columns =
        typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.CanRead && p.CanWrite && p.GetIndexParameters().Length == 0
                        && !p.IsDefined(typeof(NotMappedAttribute)))
            .ToArray();

    private static readonly Dictionary<string, PropertyInfo> ByName =
        Columns.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);

    /// <summary>Only real column names are accepted – prevents SQL injection through the column argument.</summary>
    public static PropertyInfo Column(string name) =>
        ByName.TryGetValue(name, out var p)
            ? p
            : throw new ArgumentException($"'{name}' is not a column of {Table}.", nameof(name));
}
