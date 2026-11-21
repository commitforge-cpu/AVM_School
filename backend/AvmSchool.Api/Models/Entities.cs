using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Reflection;

namespace AvmSchool.Api.Models;

/// <summary>Every table has an INT IDENTITY primary key called Id.</summary>
public interface IEntity
{
    int Id { get; set; }
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string Student = "Student";
}

public static class AdmissionStatuses
{
    public const string Pending = "Pending";
    public const string UnderReview = "Under Review";
    public const string Approved = "Approved";
    public const string Waitlisted = "Waitlisted";
    public const string Rejected = "Rejected";

    public static readonly string[] All = [Pending, UnderReview, Approved, Waitlisted, Rejected];
}

/* ------------------------------------------------------------------ */
/*  Table: Users  (login accounts for students and admins)             */
/* ------------------------------------------------------------------ */
[Table("Users")]
public class User : IEntity
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = Roles.Student;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
}

/* ------------------------------------------------------------------ */
/*  Everything a parent fills in on the Register form.                 */
/*  Shared by the register request, the admin edit request and the     */
/*  Students table, so validation rules live in one place.             */
/* ------------------------------------------------------------------ */
public class StudentProfile
{
    private const string PhonePattern = @"^[0-9+\-\s]{10,15}$";
    private const string PhoneMessage = "Enter a valid phone number (10 to 15 digits).";

    // Student
    [Required, StringLength(60)] public string FirstName { get; set; } = "";
    [StringLength(60)] public string? MiddleName { get; set; }
    [Required, StringLength(60)] public string LastName { get; set; } = "";
    [Required] public DateOnly? DateOfBirth { get; set; }
    [Required, StringLength(20)] public string Gender { get; set; } = "";
    [StringLength(5)] public string? BloodGroup { get; set; }
    [StringLength(40)] public string? Nationality { get; set; }
    [StringLength(40)] public string? Religion { get; set; }
    [StringLength(20)] public string? Category { get; set; }
    [StringLength(40)] public string? MotherTongue { get; set; }
    [RegularExpression(@"^\d{12}$", ErrorMessage = "Aadhaar number must be exactly 12 digits.")]
    public string? AadhaarNumber { get; set; }

    // Admission & previous schooling
    [Required, StringLength(40)] public string ClassApplyingFor { get; set; } = "";
    [Required, StringLength(20)] public string AcademicYear { get; set; } = "";
    [StringLength(150)] public string? PreviousSchool { get; set; }
    [StringLength(40)] public string? PreviousClass { get; set; }
    [StringLength(60)] public string? PreviousBoard { get; set; }
    [StringLength(20)] public string? PreviousPercentage { get; set; }

    // Health
    [StringLength(500)] public string? MedicalConditions { get; set; }
    [StringLength(300)] public string? Allergies { get; set; }
    [StringLength(200)] public string? IdentificationMarks { get; set; }

    // Address
    [Required, StringLength(200)] public string AddressLine1 { get; set; } = "";
    [StringLength(200)] public string? AddressLine2 { get; set; }
    [Required, StringLength(60)] public string City { get; set; } = "";
    [Required, StringLength(60)] public string State { get; set; } = "";
    [Required, RegularExpression(@"^\d{6}$", ErrorMessage = "Pincode must be 6 digits.")]
    public string Pincode { get; set; } = "";

    // Father
    [Required, StringLength(120)] public string FatherName { get; set; } = "";
    [StringLength(100)] public string? FatherOccupation { get; set; }
    [StringLength(100)] public string? FatherQualification { get; set; }
    [RegularExpression(PhonePattern, ErrorMessage = PhoneMessage)] public string? FatherPhone { get; set; }
    [EmailAddress, StringLength(150)] public string? FatherEmail { get; set; }

    // Mother
    [Required, StringLength(120)] public string MotherName { get; set; } = "";
    [StringLength(100)] public string? MotherOccupation { get; set; }
    [StringLength(100)] public string? MotherQualification { get; set; }
    [RegularExpression(PhonePattern, ErrorMessage = PhoneMessage)] public string? MotherPhone { get; set; }
    [EmailAddress, StringLength(150)] public string? MotherEmail { get; set; }

    // Guardian (optional)
    [StringLength(120)] public string? GuardianName { get; set; }
    [StringLength(40)] public string? GuardianRelation { get; set; }
    [RegularExpression(PhonePattern, ErrorMessage = PhoneMessage)] public string? GuardianPhone { get; set; }

    // Emergency & other
    [Required, StringLength(120)] public string EmergencyContactName { get; set; } = "";
    [Required, RegularExpression(PhonePattern, ErrorMessage = PhoneMessage)]
    public string EmergencyContactPhone { get; set; } = "";
    [StringLength(40)] public string? AnnualFamilyIncome { get; set; }
    public bool TransportRequired { get; set; }
    [StringLength(200)] public string? SiblingInSchool { get; set; }

    private static readonly PropertyInfo[] ProfileProperties =
        typeof(StudentProfile).GetProperties(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Where(p => p.CanRead && p.CanWrite).ToArray();

    /// <summary>Copies only the parent-editable fields (never Id, UserId, status, etc.).</summary>
    public void CopyProfileTo(StudentProfile target)
    {
        foreach (var p in ProfileProperties)
        {
            var value = p.GetValue(this);
            if (value is string s) value = string.IsNullOrWhiteSpace(s) ? null : s.Trim();
            // Required strings must never become null
            if (value is null && p.PropertyType == typeof(string) && p.IsDefined(typeof(RequiredAttribute))) value = "";
            p.SetValue(target, value);
        }
    }
}

/* ------------------------------------------------------------------ */
/*  Table: Students  (one row per registered student / application)    */
/* ------------------------------------------------------------------ */
[Table("Students")]
public class Student : StudentProfile, IEntity
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string ApplicationNo { get; set; } = "";
    public string? PhotoFileName { get; set; }
    public string AdmissionStatus { get; set; } = AdmissionStatuses.Pending;
    public string? AdminRemarks { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/* ------------------------------------------------------------------ */
/*  Table: GalleryPhotos  (image files live in the Gallery folder)     */
/* ------------------------------------------------------------------ */
[Table("GalleryPhotos")]
public class GalleryPhoto : IEntity
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string Category { get; set; } = "General";
    public string FileName { get; set; } = "";
    public string? OriginalFileName { get; set; }
    public string ContentType { get; set; } = "image/jpeg";
    public long FileSizeBytes { get; set; }
    public int SortOrder { get; set; }
    public bool IsPublished { get; set; } = true;
    public int? UploadedByUserId { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

/* ------------------------------------------------------------------ */
/*  Table: SiteContent  (editable page content stored as JSON)         */
/* ------------------------------------------------------------------ */
[Table("SiteContent")]
public class SiteContent : IEntity
{
    public int Id { get; set; }
    public string ContentKey { get; set; } = "";
    public string ContentJson { get; set; } = "{}";
    public int? UpdatedByUserId { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/* ------------------------------------------------------------------ */
/*  Table: ContactEnquiries  (Connect page form)                       */
/* ------------------------------------------------------------------ */
[Table("ContactEnquiries")]
public class ContactEnquiry : IEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public string Email { get; set; } = "";
    public string Message { get; set; } = "";
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/* ------------------------------------------------------------------ */
/*  Table: CareerApplications  (Career page form)                      */
/* ------------------------------------------------------------------ */
[Table("CareerApplications")]
public class CareerApplication : IEntity
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string Position { get; set; } = "";
    public string? CvLink { get; set; }
    public string Status { get; set; } = "New";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
