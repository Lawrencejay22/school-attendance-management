-- SchoolSync SQLite database schema (legacy / reference only)
-- The active database is MySQL — see schema.mysql.sql.
-- This file is kept for reference and local development without MySQL.

-- ── accounts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
    id                 TEXT    PRIMARY KEY,
    name               TEXT    NOT NULL,
    email              TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash      TEXT    NOT NULL,
    role               TEXT    NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    student_id         TEXT,
    bio                TEXT    NOT NULL DEFAULT '',
    profile_image      TEXT,
    profile_visibility TEXT    NOT NULL DEFAULT 'public',
    show_email         INTEGER NOT NULL DEFAULT 1,
    created_at         TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── students ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id            TEXT    PRIMARY KEY,
    name          TEXT    NOT NULL,
    department    TEXT    NOT NULL,
    adviser       TEXT    NOT NULL DEFAULT 'Not assigned',
    registered_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── teachers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
    id            TEXT    PRIMARY KEY,
    name          TEXT    NOT NULL,
    department    TEXT    NOT NULL,
    registered_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── attendance ─────────────────────────────────────────────────────────────
-- status values: 'Present' | 'Late' | 'Absent'
CREATE TABLE IF NOT EXISTS attendance (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id      TEXT    NOT NULL,
    student_name    TEXT    NOT NULL,
    department      TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'Present',
    attendance_time TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ── schedules ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
    id           TEXT    PRIMARY KEY,
    teacher_id   TEXT    NOT NULL,
    teacher_name TEXT    NOT NULL,
    subject      TEXT    NOT NULL,
    day_of_week  TEXT    NOT NULL,
    start_time   TEXT    NOT NULL,
    end_time     TEXT    NOT NULL,
    room         TEXT    NOT NULL DEFAULT '',
    created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
