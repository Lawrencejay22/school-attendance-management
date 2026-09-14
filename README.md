# 🏫 SchoolSync — Attendance Management System

> Barcode & QR-based school attendance monitoring for admins, teachers, and students.

Built with **Node.js** and **MySQL** — no framework, no bloat. Students scan their QR code to log attendance. Teachers manage their class, edit statuses, and post schedules. Admins oversee everything from a dedicated dashboard.

---

## 📸 Screenshots

| Student Dashboard | Teacher — My Class | Admin Dashboard |
|---|---|---|
| QR ID card · attendance history · class schedule | Per-student QR · editable status · stats | Scanner · logs · student & teacher management |

---

## ✨ Features

### 🔐 Admin
- Register students and auto-generate QR codes
- Register and manage teachers
- Live camera-based QR scanner — auto-records attendance
- Full attendance logs with date filter and bulk clear
- Dashboard stats (present today / total students)
- Profile editor with photo upload

### 👩‍🏫 Teacher
- **My Class** — all students shown as cards with their QR code, attendance badge, and editable status dropdown
- Status auto-set on scan: **Present** (before cutoff) or **Late** (after cutoff) — cutoff time is adjustable
- **Manage Schedule** — add/remove weekly class schedule entries (subject, day, time, room)
- Recent attendance list with inline status editing (Present / Late / Absent)
- Remove students directly from the class view
- Profile editor

### 🎓 Student
- **My ID Card** — personal QR code, full name, department, student ID, today's status
- **Class Schedule** — view all schedules posted by teachers
- Read-only personal attendance history with color-coded status
- Profile editor

### 🔑 Access Control
| Role | Landing | Special |
|---|---|---|
| Admin | `/client/admin/dashboard.html` | Full control |
| Teacher | `client.html` dashboard | My Class + Schedule tools visible |
| Student | `client.html` dashboard | ID card + schedule view only |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ (ESM, no framework) |
| Database | MySQL 8 via `mysql2` |
| Frontend | Vanilla HTML / CSS / JavaScript |
| QR Generation | [qrcodejs](https://github.com/davidshimjs/qrcodejs) |
| QR Scanner | [html5-qrcode](https://github.com/mebjas/html5-qrcode) |
| Icons | [Phosphor Icons](https://phosphoricons.com) |
| Fonts | DM Sans · Space Grotesk (Google Fonts) |
| Hosting | [Render](https://render.com) + [Aiven MySQL](https://aiven.io) |

---

## 📁 Project Structure

```
├── server.js                 # Node HTTP server — all API routes, auth, migrations
├── package.json
├── render.yaml               # Render.com deployment config
├── schema.mysql.sql          # MySQL schema — run once to initialise the DB
├── schema.sql                # SQLite reference schema (not used in production)
├── .env.example              # Environment variable template
└── client/
    ├── client.html           # Public landing page + student/teacher dashboard
    ├── app.js                # Auth flow, dashboard rendering, schedule & class logic
    ├── database.js           # SchoolSyncDB API facade (all fetch calls)
    ├── styles.css            # Full stylesheet
    ├── index.html            # Redirect shim → client.html
    └── admin/
        ├── dashboard.html    # Admin SPA (sidebar navigation)
        ├── app.js            # Admin logic — scanner, students, teachers, logs
        └── styles.css        # Admin-specific styles
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a student or teacher account |
| `POST` | `/api/auth/login` | Sign in — returns account object |
| `PUT` | `/api/auth/profile` | Update name, bio, photo, email, password |

### Students
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/students` | List all registered students |
| `POST` | `/api/students` | Add a student (name, ID, department, adviser) |
| `DELETE` | `/api/students/:id` | Remove a student (cascades attendance) |

### Teachers
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/teachers` | List all teachers |
| `POST` | `/api/teachers` | Add a teacher (name, ID, department) |
| `DELETE` | `/api/teachers/:id` | Remove a teacher |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/attendance` | All logs — optional `?date=YYYY-MM-DD` filter |
| `POST` | `/api/attendance` | Record attendance — auto Present/Late by cutoff time |
| `PUT` | `/api/attendance/:id` | Override status: `Present` / `Late` / `Absent` |
| `DELETE` | `/api/attendance` | Clear all attendance logs |

### Schedules
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/schedules` | All schedules — optional `?teacherId=` filter |
| `POST` | `/api/schedules` | Add entry (teacher accounts only) |
| `DELETE` | `/api/schedules/:id` | Remove entry (owner teacher only) |

---

## 🗄 Database Schema

Five tables — all auto-migrated on server startup if columns are missing.

```
accounts      — id, name, email, password_hash, role, student_id, bio, profile_image, ...
students      — id, name, department, adviser, registered_at
teachers      — id, name, department, registered_at
attendance    — id, student_id (FK), student_name, department, status, attendance_time
schedules     — id, teacher_id, teacher_name, subject, day_of_week, start_time, end_time, room
```

Full SQL in [`schema.mysql.sql`](./schema.mysql.sql).

---

## 🚀 Local Setup

### Prerequisites
- Node.js **20.6+**
- MySQL **8+** (WAMP / XAMPP / standalone)

### 1 — Clone & install

```bash
git clone https://github.com/Lawrencejay22/School-attendance-management-.git
cd School-attendance-management-
npm install
```

### 2 — Create the database

Open MySQL Workbench (or any client), create the database and run the schema:

```sql
CREATE DATABASE IF NOT EXISTS ADMIN_attendance
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then run the full [`schema.mysql.sql`](./schema.mysql.sql) file.

### 3 — Configure environment

```bash
cp .env.example .env
```

```env
PORT=3000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=ADMIN_attendance
```

### 4 — Start

```bash
npm start
```

Open **http://localhost:3000**

### 5 — Default admin account

| Field | Value |
|---|---|
| Email | `admin@schoolsync.local` |
| Password | `admin123` |

> ⚠️ Change this password immediately after first login via the profile modal.

---

## ☁️ Deployment — Render + Aiven

### Step 1 — Free MySQL on Aiven

1. Sign up at [aiven.io](https://aiven.io)
2. Create a **MySQL** service (free plan)
3. Once running, go to **Connection information** and note: Host, Port, User, Password, Database

### Step 2 — Run the schema on Aiven

Connect via MySQL Workbench using the Aiven credentials, then run `schema.mysql.sql` once.

### Step 3 — Deploy on Render

1. Sign up at [render.com](https://render.com)
2. **New → Web Service** → connect your GitHub account → select this repo
3. Render auto-reads `render.yaml` — verify:
   - **Build:** `npm install`
   - **Start:** `npm start`
   - **Node:** 20.6+
4. Add environment variables in the Render dashboard:

| Variable | Value |
|---|---|
| `MYSQL_HOST` | Aiven host |
| `MYSQL_PORT` | Aiven port |
| `MYSQL_USER` | Aiven user |
| `MYSQL_PASSWORD` | Aiven password |
| `MYSQL_DATABASE` | Aiven database name |

5. Click **Deploy** — your app goes live at `https://schoolsync-attendance.onrender.com`

> **Note:** Render free tier sleeps after 15 min of inactivity. First request after idle takes ~30 s to wake. Upgrade to a paid plan to keep it always-on.

---

## 🔄 How It Works — End to End

```
Admin registers student  →  QR code generated (student ID encoded)
                               ↓
Student scans QR (admin scanner / phone camera)
                               ↓
Server records attendance — Present if before cutoff, Late if after
                               ↓
Teacher opens My Class  →  sees student cards with QR + status badge
Teacher edits status    →  PUT /api/attendance/:id  →  badge updates live
                               ↓
Student opens dashboard →  sees My ID Card (QR), Class Schedule, own attendance history
```

---

## 👥 Contributing

Pull requests are welcome. For major changes please open an issue first.

---

## 📄 License

MIT — free to use and modify for educational purposes.
