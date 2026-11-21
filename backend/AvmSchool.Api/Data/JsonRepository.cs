using System.Text.Json;
using AvmSchool.Api.Models;
using AvmSchool.Api.Services;

namespace AvmSchool.Api.Data;

/// <summary>
/// Stores each table as App_Data/&lt;Table&gt;.json. Thread-safe, writes atomically.
/// Good for development and small deployments before SQL Server is connected.
/// </summary>
public sealed class JsonRepository<T> : IRepository<T> where T : class, IEntity, new()
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    private readonly string _file;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private List<T>? _rows;

    public JsonRepository(StorageOptions storage)
    {
        _file = Path.Combine(storage.DataFolder, EntityMeta<T>.Table + ".json");
    }

    private async Task<List<T>> RowsAsync(CancellationToken ct)
    {
        if (_rows is not null) return _rows;
        if (!File.Exists(_file)) return _rows = [];
        await using var fs = File.OpenRead(_file);
        return _rows = await JsonSerializer.DeserializeAsync<List<T>>(fs, Options, ct) ?? [];
    }

    private async Task SaveAsync(CancellationToken ct)
    {
        var tmp = _file + ".tmp";
        await using (var fs = File.Create(tmp))
            await JsonSerializer.SerializeAsync(fs, _rows, Options, ct);
        File.Move(tmp, _file, overwrite: true);
    }

    // Callers get copies so they can't change the cache without calling UpdateAsync.
    private static T Copy(T e) => JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(e, Options), Options)!;

    private static bool Matches(object? a, object? b) =>
        a is string sa && b is string sb
            ? string.Equals(sa, sb, StringComparison.OrdinalIgnoreCase)
            : Equals(a, b);

    private async Task<TResult> Locked<TResult>(Func<List<T>, Task<TResult>> work, CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try { return await work(await RowsAsync(ct)); }
        finally { _lock.Release(); }
    }

    public Task<List<T>> GetAllAsync(CancellationToken ct = default) =>
        Locked(rows => Task.FromResult(rows.OrderByDescending(r => r.Id).Select(Copy).ToList()), ct);

    public Task<T?> GetByIdAsync(int id, CancellationToken ct = default) =>
        Locked(rows => Task.FromResult(rows.FirstOrDefault(r => r.Id == id) is { } r ? Copy(r) : null), ct);

    public Task<List<T>> FindAsync(string column, object? value, CancellationToken ct = default)
    {
        var prop = EntityMeta<T>.Column(column);
        return Locked(rows => Task.FromResult(
            rows.Where(r => Matches(prop.GetValue(r), value)).OrderByDescending(r => r.Id).Select(Copy).ToList()), ct);
    }

    public async Task<T?> FindFirstAsync(string column, object? value, CancellationToken ct = default) =>
        (await FindAsync(column, value, ct)).FirstOrDefault();

    public Task<int> CountAsync(CancellationToken ct = default) => Locked(rows => Task.FromResult(rows.Count), ct);

    public Task<int> InsertAsync(T entity, CancellationToken ct = default) =>
        Locked(async rows =>
        {
            entity.Id = rows.Count == 0 ? 1 : rows.Max(r => r.Id) + 1;
            rows.Add(Copy(entity));
            await SaveAsync(ct);
            return entity.Id;
        }, ct);

    public Task UpdateAsync(T entity, CancellationToken ct = default) =>
        Locked(async rows =>
        {
            var i = rows.FindIndex(r => r.Id == entity.Id);
            if (i < 0) throw new KeyNotFoundException($"{EntityMeta<T>.Table} #{entity.Id} not found.");
            rows[i] = Copy(entity);
            await SaveAsync(ct);
            return true;
        }, ct);

    public Task DeleteAsync(int id, CancellationToken ct = default) =>
        Locked(async rows =>
        {
            if (rows.RemoveAll(r => r.Id == id) > 0) await SaveAsync(ct);
            return true;
        }, ct);
}
