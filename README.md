# AVM School Portal

A 3D web portal for **Achala Vidya Mandira (AVM School), Rajajinagar, Bengaluru**. It has every page of avmschoolindia.com, plus student registration, student and admin login, a gallery managed by admins, and an editor for the page text.

| Part | Technology | Folder |
|---|---|---|
| Website (3D, all pages, login/register, admin panel) | Next.js 16, React 19, three.js / React Three Fiber | `frontend/` |
| API (accounts, students, gallery uploads, page content) | ASP.NET Core Web API (.NET 10) | `backend/AvmSchool.Api/` |
| Database script (not connected yet) | SQL Server | `database/01_create_database.sql` |

---

## 1. Requirements

- **.NET 10 SDK**: https://dotnet.microsoft.com/download
- **Node.js 20.9 or newer (LTS)**: https://nodejs.org
- SQL Server 2016 or newer (Express is fine), only when you connect the database later

## 2. Build and run

**Windows**
```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1   # build everything once
.\start.ps1                                            # start API + website (dev mode)
```

**macOS / Linux**
```bash
chmod +x setup.sh start.sh
./setup.sh
./start.sh
```

Then open **http://localhost:3000**. The API runs on **http://localhost:5080**.

Manual alternative:
```bash
cd backend/AvmSchool.Api && dotnet run              # terminal 1
cd frontend && cp .env.local.example .env.local && npm install && npm run dev   # terminal 2
```

## 3. First admin login

On first start the API creates an admin account from `AdminSeed` in `backend/AvmSchool.Api/appsettings.json`:

- Email: `admin@avmschoolindia.com`
- Password: `Avm@Admin2026`

**Change this password** before going live. Either edit `AdminSeed` before the first start, or log in and use Admin → Accounts → *Set password*.

Go to **Log in → Admin tab**, or open http://localhost:3000/login?as=admin.

## 4. What's included

### Public pages (same structure as avmschoolindia.com)
| Menu | Page |
|---|---|
| Home | `/`: 3D hero, Our school, Beanstalk, Facilities, Events, Awards, Associations, Alumni, Admissions |
| About us | `/leadership`: Principal's message, Faculty |
| School life | `/school-life`: Our approach, Learning partners, Activities, Student council, Sports, Visual arts |
| Alumni | `/alumni` |
| Admission | `/admission`: Process, Uniform, Attendance |
| Media | `/media`: Events, Read & reflect, Press |
| Gallery | `/gallery`: 3D photo carousel, category filter, lightbox (photos come from the Gallery folder) |
| Connect | `/contact`, `/careers`, `/faq` (the Contact and Career forms save to the database) |
| **Login** | `/login`: two tabs, **Student** and **Admin** |
| **Register** | `/register`: 5-step form that collects all student details (below) |
| Student dashboard | `/dashboard`: application number, status, school's remarks, details, change password |

### Register collects
Student photo, first/middle/last name, date of birth, gender, blood group, nationality, religion, category, mother tongue, Aadhaar number, class applying for, academic year, previous school/class/board/result, medical conditions, allergies, identification marks, sibling at AVM, transport needed, full address with pincode, father's and mother's name/occupation/qualification/phone/email, guardian name/relation/phone, emergency contact, annual family income, login email, mobile and password, plus a declaration. Each new registration gets an application number like `AVM26-00001`.

### Admin panel (`/admin`)
- **Overview**: counts by status and class, latest registrations
- **Students**: search and filter, download CSV, open a student to **view and edit every field**, set the admission status (Pending, Under Review, Approved, Waitlisted, Rejected) with remarks the parent sees, replace the photo, or delete
- **Gallery**: upload several photos at once (saved to the **`Gallery`** folder), edit title/category/order, hide/show, **delete** (also deletes the file), *Check Gallery folder* (adds photos copied straight into the folder)
- **Page content**: edit the **home (index) page** and every other page: headings, paragraphs, lists, links, image URLs, logo, phone numbers and address. Changes show on the site immediately; *Restore original text* undoes them.
- **Enquiries** and **Career applications**: read, mark, change status, delete
- **Accounts**: all logins, deactivate/activate, set a new password, add more admins

## 5. Folders the API writes to

| Folder (inside `backend/AvmSchool.Api/`) | What's in it |
|---|---|
| `Gallery/` | Gallery photos, served publicly at `http://localhost:5080/Gallery/<file>` |
| `StudentPhotos/` | Photos from the Register form, **private** (only admins and that parent can see them) |
| `App_Data/` | Data files while the database is not connected, plus login-token keys |

You can change these paths in `appsettings.json` → `Storage`.

## 6. Connecting SQL Server later

The portal runs now **without a database**: data is saved as JSON files in `App_Data/`. When you're ready:

1. Run `database/01_create_database.sql` in SSMS (or `sqlcmd -S localhost -E -i database/01_create_database.sql`). It creates the **AvmSchoolDb** database with tables `Users`, `Students`, `GalleryPhotos`, `SiteContent`, `ContactEnquiries`, `CareerApplications` and the view `vw_StudentApplications`.
2. In `backend/AvmSchool.Api/appsettings.json` set:
   ```json
   "Database": { "Provider": "SqlServer" },
   "ConnectionStrings": {
     "AvmSchoolDb": "Server=localhost;Database=AvmSchoolDb;Trusted_Connection=True;TrustServerCertificate=True"
   }
   ```
   With SQL logins: `Server=YOURSERVER;Database=AvmSchoolDb;User Id=avm_app;Password=...;TrustServerCertificate=True`
3. Restart the API. It creates the first admin account in SQL Server automatically.

Data entered while running on JSON files is not copied to SQL Server automatically. Connect the database before real registrations start.

## 7. Logo and images

The school logo, Beanstalk logo and the photos on the content pages currently load from the existing avmschoolindia.com (Wix) site. To host them yourself:
1. Save them into `frontend/public/images/` (e.g. `frontend/public/images/avm-logo.png`).
2. In Admin → Page content → *School details, logo & contact*, change **Logo URL** to `/images/avm-logo.png`. Do the same for other image URLs.

For gallery photos, use Admin → Gallery → *Copy link* and paste the link into any image URL field.

## 8. Going live (checklist)

- Change the admin password and `AdminSeed:Password`.
- Set `Cors:AllowedOrigins` to your real website address (e.g. `https://www.avmschoolindia.com`).
- Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to the public API address, then `npm run build`.
- Serve both over **HTTPS** (IIS, Nginx or Azure App Service for the API; `npm run start` behind IIS or Nginx as a reverse proxy, or Vercel, for the website).
- Back up the `Gallery`, `StudentPhotos` and `App_Data/keys` folders along with the database.

## 9. API reference (short)

| Method | Endpoint | Who |
|---|---|---|
| POST | `/api/auth/register` (multipart) | public |
| POST | `/api/auth/login` `{ email, password, loginAs: "Student" \| "Admin" }` | public |
| GET | `/api/auth/me`, POST `/api/auth/change-password` | logged in |
| GET / PUT / PATCH / DELETE | `/api/students`, `/api/students/{id}`, `/{id}/status`, `/{id}/photo` | admin |
| GET | `/api/students/me` | student |
| GET | `/api/gallery`, `/api/gallery/categories` | public |
| GET / POST / PUT / DELETE | `/api/gallery/all`, `/api/gallery`, `/api/gallery/{id}`, POST `/api/gallery/sync` | admin |
| GET | `/api/content/{key}` | public |
| PUT / DELETE | `/api/content/{key}` | admin |
| POST | `/api/enquiries`, `/api/careers` | public |
| GET / PATCH / DELETE | `/api/enquiries…`, `/api/careers…`, `/api/users…`, `/api/dashboard/stats` | admin |

Passwords are hashed with PBKDF2-SHA256. Login and register are rate-limited, uploads are checked by file signature (not just the extension), and deactivated or deleted accounts are signed out immediately.
