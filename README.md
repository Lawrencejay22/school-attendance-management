# 🏫 SchoolSync — Attendance Monitoring System

> Barcode & QR-based school attendance monitoring for admins, teachers, and students.

Built with **Node.js** and **MySQL** — no framework, no bloat. Students scan their QR code to log attendance. Teachers monitor their class and manage schedules. Admins oversee everything from a dedicated dashboard.

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
- **My Class** — all students shown as cards with QR code, attendance badge, and date picker
- Status auto-set on scan: **Present** (before cutoff) or **Late** (after cutoff) — adjustable cutoff time
- One scan per student per day — duplicate scans are blocked
- **Manage Schedule** — add/remove weekly class entries (subject, day, time, room)
- Recent attendance list with inline status editing and remove button
- Access to admin panel via footer link

### 🎓 Student
- **My ID Card** — personal QR code, name, department, section, student ID, today's status
- **Class Schedule** — view all schedules posted by teachers
- Read-only personal attendance history
- Profile editor

### 🔑 Access Control

| Role | Access |
|---|---|
| Admin | Full control — student/teacher management, scanner, all logs |
| Teacher | My Class + Schedule tools + Admin panel access |
| Student | ID card + own attendance + class schedule only |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ (ESM, no framework) |
| Database | MySQL 9 via `mysql2` |
| Frontend | Vanilla HTML / CSS / JavaScript |
| QR Generation | [qrcodejs](https://github.com/davidshimjs/qrcodejs) |
| QR Scanner | [html5-qrcode](https://github.com/mebjas/html5-qrcode) |
| Icons | [Phosphor Icons](https://phosphoricons.com) |
| Fonts | DM Sans · Space Grotesk (Google Fonts) |
| Hosting | [Railway](https://railway.app) |

---

## 📁 Project Structure

```
├── server/
│   ├── server.js             # Node HTTP server — all API routes, auth, migrations
│   └── database/
│       └── schema.mysql.sql  # MySQL schema reference (tables auto-created on startup)
├── client/
│   ├── client.html           # Public landing page + student/teacher dashboard
│   ├── app.js                # Auth flow, dashboard rendering, schedule & class logic
│   ├── database.js           # SchoolSyncDB API facade (all fetch calls)
│   ├── styles.css            # Full stylesheet
│   ├── index.html            # Redirect shim → client.html
│   ├── scan.html             # QR scan landing page
│   └── admin/
│       ├── dashboard.html    # Admin SPA (sidebar navigation)
│       ├── app.js            # Admin logic — scanner, students, teachers, logs
│       └── styles.css        # Admin-specific styles
├── package.json
├── railway.json              # Railway deployment config
├── render.yaml               # Render deployment config (legacy)
└── server/.env.example       # Environment variable template
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
| `POST` | `/api/students` | Add a student (name, ID, department, section) |
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
| `POST` | `/api/attendance` | Record attendance — auto Present/Late, blocks duplicates |
| `PUT` | `/api/attendance/:id` | Override status: `Present` / `Late` / `Absent` |
| `DELETE` | `/api/attendance/:id` | Remove a single attendance record |
| `DELETE` | `/api/attendance` | Clear all attendance logs |

### Schedules
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/schedules` | All schedules — optional `?teacherId=` filter |
| `POST` | `/api/schedules` | Add entry (teacher accounts only) |
| `DELETE` | `/api/schedules/:id` | Remove entry (owner teacher only) |

---

## 🗄 Database Schema

Five tables — all created automatically on server startup.

```
accounts      — id, name, email, password_hash, role, student_id, bio, profile_image, ...
students      — id, name, department, adviser (section), registered_at
teachers      — id, name, department, registered_at
attendance    — id, student_id (FK), student_name, department, status, attendance_time
schedules     — id, teacher_id, teacher_name, subject, day_of_week, start_time, end_time, room
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js **20.6+**
- MySQL **8+** (WAMP / XAMPP / standalone)

### 1 — Clone & install

```bash
git clone https://github.com/Lawrencejay22/school-attendance-management.git
cd school-attendance-management
npm install
```

### 2 — Configure environment

Copy the example and fill in your local MySQL credentials:

```bash
cp server/.env.example .env
```

```env
PORT=3000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=railway
```

### 3 — Start

```bash
npm start
```

Open **http://localhost:3000**

The server creates all tables automatically on first run — no need to run the schema manually.

### 4 — Default admin account

| Field | Value |
|---|---|
| Email | `admin@schoolsync.local` |
| Password | `admin123` |

> ⚠️ Change this password after first login via the profile modal.

---

## ☁️ Deployment — Railway

Railway hosts both the Node.js server and the MySQL database in one project.

### Step 1 — Create a Railway project

1. Sign up at [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo** → select this repo
3. Railway detects Node.js automatically and deploys using `npm start`

### Step 2 — Add a MySQL database

1. In your Railway project canvas, click **+ New** → **Database** → **MySQL**
2. Railway provisions a MySQL 9 instance — no configuration needed

### Step 3 — Link the database to your app

1. Click your app service → **Variables** tab → **Raw Editor**
2. Paste exactly:

```
MYSQL_HOST=${{MySQL.MYSQLHOST}}
MYSQL_PORT=${{MySQL.MYSQLPORT}}
MYSQL_USER=${{MySQL.MYSQLUSER}}
MYSQL_PASSWORD=${{MySQL.MYSQLPASSWORD}}
MYSQL_DATABASE=${{MySQL.MYSQLDATABASE}}
```

3. Click **Update** — Railway redeploys automatically

### Step 4 — Get your public URL

In your app service → **Settings** → **Networking** → **Generate Domain**

Your app is now live. The server creates all tables on first boot.

---

## 🔄 How It Works

```
Admin registers student  →  QR code generated (student ID encoded)
                               ↓
Student scans QR (admin scanner / phone camera)
                               ↓
Server checks for duplicate scan today — blocks if already scanned
Server records attendance — Present (before cutoff) or Late (after cutoff)
                               ↓
Teacher opens My Class  →  sees student cards with QR + status badge
Teacher picks a past date  →  sees attendance for that day
                               ↓
Student opens dashboard →  sees My ID Card (QR), Class Schedule, own attendance history
```

---

## 📄 License

MIT — free to use and modify for educational purposes.
