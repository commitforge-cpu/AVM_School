using System.Security.Claims;
using AvmSchool.Api.Data;
using AvmSchool.Api.Models;
using Microsoft.AspNetCore.Authentication.BearerToken;

namespace AvmSchool.Api.Security;

public static class AuthExtensions
{
    public static int? GetUserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public static ClaimsPrincipal ToPrincipal(this User user) =>
        new(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
        ], BearerTokenDefaults.AuthenticationScheme));

    /// <summary>
    /// Rejects tokens of accounts that were deleted or deactivated after the token was issued,
    /// and tokens whose role no longer matches the account.
    /// </summary>
    public static IApplicationBuilder UseActiveUserCheck(this IApplicationBuilder app) =>
        app.Use(async (ctx, next) =>
        {
            if (ctx.User.Identity?.IsAuthenticated == true)
            {
                var id = ctx.User.GetUserId();
                var users = ctx.RequestServices.GetRequiredService<IRepository<User>>();
                var account = id is null ? null : await users.GetByIdAsync(id.Value, ctx.RequestAborted);
                if (account is null || !account.IsActive || !ctx.User.IsInRole(account.Role))
                {
                    ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await ctx.Response.WriteAsJsonAsync(new { title = "Your session has ended. Please log in again." });
                    return;
                }
            }
            await next();
        });
}
