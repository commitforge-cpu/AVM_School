using System.Data.Common;

namespace AvmSchool.Api.Data;

/// <summary>The only file that references the SQL Server driver package (Microsoft.Data.SqlClient).</summary>
public static class SqlServerFactory
{
    public static DbProviderFactory Instance => Microsoft.Data.SqlClient.SqlClientFactory.Instance;
}
