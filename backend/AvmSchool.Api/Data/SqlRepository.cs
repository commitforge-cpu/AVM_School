using System.Data;
using System.Data.Common;
using System.Globalization;
using System.Reflection;
using AvmSchool.Api.Models;

namespace AvmSchool.Api.Data;

public sealed record SqlConnectionInfo(DbProviderFactory Factory, string ConnectionString);

/// <summary>
/// SQL Server repository. Column names = C# property names, exactly as created by
/// database/01_create_database.sql. Every value is sent as a parameter (no string-built SQL values).
/// </summary>
public sealed class SqlRepository<T>(SqlConnectionInfo db) : IRepository<T> where T : class, IEntity, new()
{
    private static readonly string Table = $"[dbo].[{EntityMeta<T>.Table}]";
    private static readonly PropertyInfo[] WriteColumns =
        EntityMeta<T>.Columns.Where(c => c.Name != nameof(IEntity.Id)).ToArray();

    private static readonly string InsertSql =
        $"INSERT INTO {Table} ({string.Join(", ", WriteColumns.Select(c => $"[{c.Name}]"))}) " +
        $"OUTPUT INSERTED.[Id] VALUES ({string.Join(", ", WriteColumns.Select(c => "@" + c.Name))});";

    private static readonly string UpdateSql =
        $"UPDATE {Table} SET {string.Join(", ", WriteColumns.Select(c => $"[{c.Name}] = @{c.Name}"))} WHERE [Id] = @Id;";

    private async Task<DbConnection> OpenAsync(CancellationToken ct)
    {
        var conn = db.Factory.CreateConnection() ?? throw new InvalidOperationException("Could not create a database connection.");
        conn.ConnectionString = db.ConnectionString;
        await conn.OpenAsync(ct);
        return conn;
    }

    private static void Add(DbCommand cmd, string name, object? value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = "@" + name;
        switch (value)
        {
            case null: p.Value = DBNull.Value; break;
            case DateOnly d: p.DbType = DbType.Date; p.Value = d.ToDateTime(TimeOnly.MinValue); break;
            case DateTime dt: p.DbType = DbType.DateTime2; p.Value = dt; break;
            default: p.Value = value; break;
        }
        cmd.Parameters.Add(p);
    }

    private static object? FromDb(object value, Type type)
    {
        if (value is DBNull) return null;
        var t = Nullable.GetUnderlyingType(type) ?? type;
        if (t.IsInstanceOfType(value)) return value;
        if (t == typeof(DateOnly)) return value is DateTime dt ? DateOnly.FromDateTime(dt) : DateOnly.Parse(value.ToString()!, CultureInfo.InvariantCulture);
        return Convert.ChangeType(value, t, CultureInfo.InvariantCulture);
    }

    private static async Task<List<T>> ReadAllAsync(DbCommand cmd, CancellationToken ct)
    {
        var list = new List<T>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        var map = Enumerable.Range(0, reader.FieldCount)
            .Select(i => (Index: i, Prop: EntityMeta<T>.Columns.FirstOrDefault(c => c.Name.Equals(reader.GetName(i), StringComparison.OrdinalIgnoreCase))))
            .Where(x => x.Prop is not null).ToArray();
        while (await reader.ReadAsync(ct))
        {
            var row = new T();
            foreach (var (i, prop) in map) prop!.SetValue(row, FromDb(reader.GetValue(i), prop.PropertyType));
            list.Add(row);
        }
        return list;
    }

    private async Task<List<T>> QueryAsync(string sql, Action<DbCommand>? bind, CancellationToken ct)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        bind?.Invoke(cmd);
        return await ReadAllAsync(cmd, ct);
    }

    public Task<List<T>> GetAllAsync(CancellationToken ct = default) =>
        QueryAsync($"SELECT * FROM {Table} ORDER BY [Id] DESC;", null, ct);

    public async Task<T?> GetByIdAsync(int id, CancellationToken ct = default) =>
        (await QueryAsync($"SELECT * FROM {Table} WHERE [Id] = @Id;", c => Add(c, "Id", id), ct)).FirstOrDefault();

    public Task<List<T>> FindAsync(string column, object? value, CancellationToken ct = default)
    {
        var col = EntityMeta<T>.Column(column).Name; // whitelisted
        var sql = value is null
            ? $"SELECT * FROM {Table} WHERE [{col}] IS NULL ORDER BY [Id] DESC;"
            : $"SELECT * FROM {Table} WHERE [{col}] = @Value ORDER BY [Id] DESC;";
        return QueryAsync(sql, c => { if (value is not null) Add(c, "Value", value); }, ct);
    }

    public async Task<T?> FindFirstAsync(string column, object? value, CancellationToken ct = default) =>
        (await FindAsync(column, value, ct)).FirstOrDefault();

    public async Task<int> CountAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT COUNT(*) FROM {Table};";
        return Convert.ToInt32(await cmd.ExecuteScalarAsync(ct), CultureInfo.InvariantCulture);
    }

    public async Task<int> InsertAsync(T entity, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = InsertSql;
        foreach (var c in WriteColumns) Add(cmd, c.Name, c.GetValue(entity));
        entity.Id = Convert.ToInt32(await cmd.ExecuteScalarAsync(ct), CultureInfo.InvariantCulture);
        return entity.Id;
    }

    public async Task UpdateAsync(T entity, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = UpdateSql;
        foreach (var c in WriteColumns) Add(cmd, c.Name, c.GetValue(entity));
        Add(cmd, "Id", entity.Id);
        if (await cmd.ExecuteNonQueryAsync(ct) == 0)
            throw new KeyNotFoundException($"{EntityMeta<T>.Table} #{entity.Id} not found.");
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"DELETE FROM {Table} WHERE [Id] = @Id;";
        Add(cmd, "Id", id);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
