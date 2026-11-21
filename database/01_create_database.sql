/* =====================================================================
   AVM School Portal - SQL Server database
   Database : AvmSchoolDb
   Tables   : Users, Students, GalleryPhotos, SiteContent,
              ContactEnquiries, CareerApplications
   View     : vw_StudentApplications

   Run in SQL Server Management Studio (SSMS) or Azure Data Studio,
   or:  sqlcmd -S localhost -E -i 01_create_database.sql

   Safe to run more than once: objects are only created if missing.
   The first admin account is created by the API on first start
   (AdminSeed in backend/AvmSchool.Api/appsettings.json).

   Column names match the C# models exactly - don't rename them
   unless you rename the model property too.
   ===================================================================== */

IF DB_ID(N'AvmSchoolDb') IS NULL
    CREATE DATABASE AvmSchoolDb;
GO

USE AvmSchoolDb;
GO

/* ---------------------------------------------------------------------
   Users : login accounts for students (parents) and admins
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        Id              INT IDENTITY(1,1)  NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        FullName        NVARCHAR(150)      NOT NULL,
        Email           NVARCHAR(150)      NOT NULL,
        Phone           NVARCHAR(20)       NULL,
        PasswordHash    NVARCHAR(300)      NOT NULL,          -- PBKDF2-SHA256, never plain text
        Role            NVARCHAR(20)       NOT NULL CONSTRAINT DF_Users_Role DEFAULT (N'Student'),
        IsActive        BIT                NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
        CreatedAt       DATETIME2(7)       NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
        LastLoginAt     DATETIME2(7)       NULL,

        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT CK_Users_Role  CHECK (Role IN (N'Admin', N'Student'))
    );
END
GO

/* ---------------------------------------------------------------------
   Students : everything collected by the Register form
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Students', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Students
    (
        Id                      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Students PRIMARY KEY,
        UserId                  INT               NOT NULL,
        ApplicationNo           NVARCHAR(40)      NOT NULL,       -- e.g. AVM26-00001

        -- Student
        FirstName               NVARCHAR(60)      NOT NULL,
        MiddleName              NVARCHAR(60)      NULL,
        LastName                NVARCHAR(60)      NOT NULL,
        DateOfBirth             DATE              NOT NULL,
        Gender                  NVARCHAR(20)      NOT NULL,
        BloodGroup              NVARCHAR(5)       NULL,
        Nationality             NVARCHAR(40)      NULL,
        Religion                NVARCHAR(40)      NULL,
        Category                NVARCHAR(20)      NULL,           -- General / OBC / SC / ST / Other
        MotherTongue            NVARCHAR(40)      NULL,
        AadhaarNumber           NVARCHAR(12)      NULL,

        -- Admission & previous school
        ClassApplyingFor        NVARCHAR(40)      NOT NULL,
        AcademicYear            NVARCHAR(20)      NOT NULL,       -- e.g. 2027-28
        PreviousSchool          NVARCHAR(150)     NULL,
        PreviousClass           NVARCHAR(40)      NULL,
        PreviousBoard           NVARCHAR(60)      NULL,
        PreviousPercentage      NVARCHAR(20)      NULL,

        -- Health
        MedicalConditions       NVARCHAR(500)     NULL,
        Allergies               NVARCHAR(300)     NULL,
        IdentificationMarks     NVARCHAR(200)     NULL,

        -- Address
        AddressLine1            NVARCHAR(200)     NOT NULL,
        AddressLine2            NVARCHAR(200)     NULL,
        City                    NVARCHAR(60)      NOT NULL,
        State                   NVARCHAR(60)      NOT NULL,
        Pincode                 NVARCHAR(6)       NOT NULL,

        -- Father
        FatherName              NVARCHAR(120)     NOT NULL,
        FatherOccupation        NVARCHAR(100)     NULL,
        FatherQualification     NVARCHAR(100)     NULL,
        FatherPhone             NVARCHAR(15)      NULL,
        FatherEmail             NVARCHAR(150)     NULL,

        -- Mother
        MotherName              NVARCHAR(120)     NOT NULL,
        MotherOccupation        NVARCHAR(100)     NULL,
        MotherQualification     NVARCHAR(100)     NULL,
        MotherPhone             NVARCHAR(15)      NULL,
        MotherEmail             NVARCHAR(150)     NULL,

        -- Guardian
        GuardianName            NVARCHAR(120)     NULL,
        GuardianRelation        NVARCHAR(40)      NULL,
        GuardianPhone           NVARCHAR(15)      NULL,

        -- Emergency & other
        EmergencyContactName    NVARCHAR(120)     NOT NULL,
        EmergencyContactPhone   NVARCHAR(15)      NOT NULL,
        AnnualFamilyIncome      NVARCHAR(40)      NULL,
        TransportRequired       BIT               NOT NULL CONSTRAINT DF_Students_Transport DEFAULT (0),
        SiblingInSchool         NVARCHAR(200)     NULL,

        -- Managed by the school
        PhotoFileName           NVARCHAR(260)     NULL,           -- file in the StudentPhotos folder
        AdmissionStatus         NVARCHAR(20)      NOT NULL CONSTRAINT DF_Students_Status DEFAULT (N'Pending'),
        AdminRemarks            NVARCHAR(1000)    NULL,
        CreatedAt               DATETIME2(7)      NOT NULL CONSTRAINT DF_Students_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt               DATETIME2(7)      NOT NULL CONSTRAINT DF_Students_UpdatedAt DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT UQ_Students_ApplicationNo UNIQUE (ApplicationNo),
        CONSTRAINT FK_Students_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (Id) ON DELETE CASCADE,
        CONSTRAINT CK_Students_Status CHECK (AdmissionStatus IN (N'Pending', N'Under Review', N'Approved', N'Waitlisted', N'Rejected')),
        CONSTRAINT CK_Students_Aadhaar CHECK (AadhaarNumber IS NULL OR AadhaarNumber NOT LIKE N'%[^0-9]%' AND LEN(AadhaarNumber) = 12),
        CONSTRAINT CK_Students_Pincode CHECK (Pincode NOT LIKE N'%[^0-9]%' AND LEN(Pincode) = 6)
    );

    CREATE INDEX IX_Students_UserId           ON dbo.Students (UserId);
    CREATE INDEX IX_Students_AdmissionStatus  ON dbo.Students (AdmissionStatus);
    CREATE INDEX IX_Students_ClassApplyingFor ON dbo.Students (ClassApplyingFor);
END
GO

/* ---------------------------------------------------------------------
   GalleryPhotos : one row per photo; the image file is in the Gallery folder
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.GalleryPhotos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.GalleryPhotos
    (
        Id                INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GalleryPhotos PRIMARY KEY,
        Title             NVARCHAR(150)     NOT NULL,
        Description       NVARCHAR(500)     NULL,
        Category          NVARCHAR(60)      NOT NULL CONSTRAINT DF_GalleryPhotos_Category DEFAULT (N'General'),
        FileName          NVARCHAR(260)     NOT NULL,             -- name inside the Gallery folder
        OriginalFileName  NVARCHAR(260)     NULL,
        ContentType       NVARCHAR(50)      NOT NULL,
        FileSizeBytes     BIGINT            NOT NULL CONSTRAINT DF_GalleryPhotos_Size DEFAULT (0),
        SortOrder         INT               NOT NULL CONSTRAINT DF_GalleryPhotos_Sort DEFAULT (0),
        IsPublished       BIT               NOT NULL CONSTRAINT DF_GalleryPhotos_Published DEFAULT (1),
        UploadedByUserId  INT               NULL,
        UploadedAt        DATETIME2(7)      NOT NULL CONSTRAINT DF_GalleryPhotos_UploadedAt DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT UQ_GalleryPhotos_FileName UNIQUE (FileName),
        CONSTRAINT FK_GalleryPhotos_Users FOREIGN KEY (UploadedByUserId) REFERENCES dbo.Users (Id) ON DELETE SET NULL
    );

    CREATE INDEX IX_GalleryPhotos_Category ON dbo.GalleryPhotos (Category, IsPublished);
END
GO

/* ---------------------------------------------------------------------
   SiteContent : editable page text (index/home page etc.) as JSON
   ContentKey values used by the website:
     site, home, leadership, schoolLife, alumni, admission, media, careers, faq, contact
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.SiteContent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SiteContent
    (
        Id               INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SiteContent PRIMARY KEY,
        ContentKey       NVARCHAR(100)     NOT NULL,
        ContentJson      NVARCHAR(MAX)     NOT NULL,
        UpdatedByUserId  INT               NULL,
        UpdatedAt        DATETIME2(7)      NOT NULL CONSTRAINT DF_SiteContent_UpdatedAt DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT UQ_SiteContent_ContentKey UNIQUE (ContentKey),
        CONSTRAINT CK_SiteContent_IsJson CHECK (ISJSON(ContentJson) = 1),
        CONSTRAINT FK_SiteContent_Users FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.Users (Id) ON DELETE SET NULL
    );
END
GO

/* ---------------------------------------------------------------------
   ContactEnquiries : messages from the Connect page
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.ContactEnquiries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ContactEnquiries
    (
        Id         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ContactEnquiries PRIMARY KEY,
        Name       NVARCHAR(120)     NOT NULL,
        Phone      NVARCHAR(15)      NULL,
        Email      NVARCHAR(150)     NOT NULL,
        Message    NVARCHAR(2000)    NOT NULL,
        IsRead     BIT               NOT NULL CONSTRAINT DF_ContactEnquiries_IsRead DEFAULT (0),
        CreatedAt  DATETIME2(7)      NOT NULL CONSTRAINT DF_ContactEnquiries_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
END
GO

/* ---------------------------------------------------------------------
   CareerApplications : applications from the Career page
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.CareerApplications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CareerApplications
    (
        Id         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CareerApplications PRIMARY KEY,
        FirstName  NVARCHAR(60)      NOT NULL,
        LastName   NVARCHAR(60)      NOT NULL,
        Email      NVARCHAR(150)     NOT NULL,
        Phone      NVARCHAR(15)      NULL,
        Position   NVARCHAR(100)     NOT NULL,
        CvLink     NVARCHAR(400)     NULL,
        Status     NVARCHAR(20)      NOT NULL CONSTRAINT DF_CareerApplications_Status DEFAULT (N'New'),
        CreatedAt  DATETIME2(7)      NOT NULL CONSTRAINT DF_CareerApplications_CreatedAt DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT CK_CareerApplications_Status CHECK (Status IN (N'New', N'Shortlisted', N'Interviewed', N'Hired', N'Not selected'))
    );
END
GO

/* ---------------------------------------------------------------------
   View for reports: each application with its login account
   --------------------------------------------------------------------- */
CREATE OR ALTER VIEW dbo.vw_StudentApplications
AS
SELECT
    s.Id                 AS StudentId,
    s.ApplicationNo,
    CONCAT(s.FirstName, N' ', s.LastName) AS StudentName,
    s.DateOfBirth,
    s.Gender,
    s.ClassApplyingFor,
    s.AcademicYear,
    s.FatherName,
    s.MotherName,
    s.City,
    s.AdmissionStatus,
    u.Email              AS AccountEmail,
    u.Phone              AS AccountPhone,
    u.IsActive           AS AccountActive,
    s.CreatedAt          AS AppliedOn
FROM dbo.Students s
JOIN dbo.Users    u ON u.Id = s.UserId;
GO

PRINT N'AvmSchoolDb is ready.';
GO
