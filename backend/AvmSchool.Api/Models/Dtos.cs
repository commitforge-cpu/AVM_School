using System.ComponentModel.DataAnnotations;

namespace AvmSchool.Api.Models;

/// <summary>Register form: all student details + the login account. Sent as multipart/form-data.</summary>
public class RegisterRequest : StudentProfile
{
    [Required, EmailAddress, StringLength(150)] public string Email { get; set; } = "";
    [Required, RegularExpression(@"^[0-9+\-\s]{10,15}$", ErrorMessage = "Enter a valid mobile number.")]
    public string Phone { get; set; } = "";
    [Required, StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters.")]
    public string Password { get; set; } = "";
    [Required, Compare(nameof(Password), ErrorMessage = "Passwords do not match.")]
    public string ConfirmPassword { get; set; } = "";
    [Range(typeof(bool), "true", "true", ErrorMessage = "Please confirm the details are correct.")]
    public bool AcceptDeclaration { get; set; }
}

public class LoginRequest
{
    [Required, EmailAddress] public string Email { get; set; } = "";
    [Required] public string Password { get; set; } = "";
    /// <summary>"Student" or "Admin" – which login tab was used.</summary>
    [Required] public string LoginAs { get; set; } = Roles.Student;
}

public class ChangePasswordRequest
{
    [Required] public string CurrentPassword { get; set; } = "";
    [Required, StringLength(100, MinimumLength = 8)] public string NewPassword { get; set; } = "";
}

public class ResetPasswordRequest
{
    [Required, StringLength(100, MinimumLength = 8)] public string NewPassword { get; set; } = "";
}

/// <summary>Admin edit of a student: every profile field plus status/remarks.</summary>
public class StudentAdminUpdate : StudentProfile
{
    [Required] public string AdmissionStatus { get; set; } = AdmissionStatuses.Pending;
    [StringLength(1000)] public string? AdminRemarks { get; set; }
    [EmailAddress, StringLength(150)] public string? AccountEmail { get; set; }
    [StringLength(20)] public string? AccountPhone { get; set; }
}

public class StatusUpdateRequest
{
    [Required] public string Status { get; set; } = "";
    [StringLength(1000)] public string? Remarks { get; set; }
}

public class GalleryUpdateRequest
{
    [Required, StringLength(150)] public string Title { get; set; } = "";
    [StringLength(500)] public string? Description { get; set; }
    [Required, StringLength(60)] public string Category { get; set; } = "General";
    public int SortOrder { get; set; }
    public bool IsPublished { get; set; } = true;
}

public class EnquiryRequest
{
    [Required, StringLength(120)] public string Name { get; set; } = "";
    [RegularExpression(@"^[0-9+\-\s]{10,15}$", ErrorMessage = "Enter a valid phone number.")]
    public string? Phone { get; set; }
    [Required, EmailAddress, StringLength(150)] public string Email { get; set; } = "";
    [Required, StringLength(2000, MinimumLength = 5)] public string Message { get; set; } = "";
}

public class CareerRequest
{
    [Required, StringLength(60)] public string FirstName { get; set; } = "";
    [Required, StringLength(60)] public string LastName { get; set; } = "";
    [Required, EmailAddress, StringLength(150)] public string Email { get; set; } = "";
    [RegularExpression(@"^[0-9+\-\s]{10,15}$", ErrorMessage = "Enter a valid phone number.")]
    public string? Phone { get; set; }
    [Required, StringLength(100)] public string Position { get; set; } = "";
    [Url, StringLength(400)] public string? CvLink { get; set; }
}

public class CreateAdminRequest
{
    [Required, StringLength(120)] public string FullName { get; set; } = "";
    [Required, EmailAddress, StringLength(150)] public string Email { get; set; } = "";
    [StringLength(20)] public string? Phone { get; set; }
    [Required, StringLength(100, MinimumLength = 8)] public string Password { get; set; } = "";
}

public record UserView(int Id, string FullName, string Email, string? Phone, string Role, bool IsActive, DateTime CreatedAt, DateTime? LastLoginAt)
{
    public static UserView From(User u) => new(u.Id, u.FullName, u.Email, u.Phone, u.Role, u.IsActive, u.CreatedAt, u.LastLoginAt);
}
