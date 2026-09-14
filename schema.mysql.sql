-- SchoolSync MySQL database schema
-- Run this script in MySQL Workbench or any MySQL client.
-- Last updated: reflects all server.js migrations and feature additions.

CREATE DATABASE IF NOT EXISTS ADMIN_attendance
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ADMIN_attendance;

-- ── accounts ───────────────────────────────────────────────────────────────
-- Unified auth table for all roles: admin, teacher, student.
-- student_id links to students.id for student accounts.
CREATE TABLE IF NOT EXISTS accounts (
    id               VARCHAR(36)  PRIMARY KEY,
    name             VARCHAR(120) NOT NULL,
    email            VARCHAR(255) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    role             ENUM('admin', 'teacher', 'student') NOT NULL,
    student_id       VARCHAR(100) NULL,               -- only for role='student'
    bio              TEXT         NOT NULL DEFAULT '',
    profile_image    LONGTEXT     NULL,
    profile_visibility VARCHAR(20) NOT NULL DEFAULT 'public',
    show_email       TINYINT(1)  NOT NULL DEFAULT 1,
    created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

-- ── students ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id               VARCHAR(100) PRIMARY KEY,
    name             VARCHAR(120) NOT NULL,
    department       VARCHAR(120) NOT NULL,
    adviser          VARCHAR(120) NOT NULL DEFAULT 'Not assigned',
    registered_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

-- ── teachers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
    id               VARCHAR(100) PRIMARY KEY,
    name             VARCHAR(120) NOT NULL,
    department       VARCHAR(120) NOT NULL,
    registered_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

-- ── attendance ─────────────────────────────────────────────────────────────
-- status values: 'Present' | 'Late' | 'Absent'
-- Auto-assigned on scan based on cutoff time; teacher can override via PUT /api/attendance/:id.
CREATE TABLE IF NOT EXISTS attendance (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id       VARCHAR(100) NOT NULL,
    student_name     VARCHAR(120) NOT NULL,
    department       VARCHAR(120) NOT NULL,
    status           VARCHAR(30)  NOT NULL DEFAULT 'Present',
    attendance_time  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX attendance_student_idx (student_id),
    INDEX attendance_time_idx    (attendance_time),
    CONSTRAINT attendance_student_fk
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB;

-- ── schedules ──────────────────────────────────────────────────────────────
-- Teacher-managed class schedule. Only accounts with role='teacher' can write.
CREATE TABLE IF NOT EXISTS schedules (
    id               VARCHAR(36)  PRIMARY KEY,
    teacher_id       VARCHAR(36)  NOT NULL,   -- references accounts.id (role='teacher')
    teacher_name     VARCHAR(120) NOT NULL,
    subject          VARCHAR(120) NOT NULL,
    day_of_week      VARCHAR(20)  NOT NULL,   -- 'Monday' … 'Saturday'
    start_time       VARCHAR(10)  NOT NULL,   -- 'HH:MM' (24-hour)
    end_time         VARCHAR(10)  NOT NULL,
    room             VARCHAR(80)  NOT NULL DEFAULT '',
    created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX schedules_teacher_idx (teacher_id)
) ENGINE = InnoDB;

-- ── Verify ─────────────────────────────────────────────────────────────────
SHOW TABLES;
DESCRIBE accounts;
DESCRIBE students;
DESCRIBE teachers;
DESCRIBE attendance;
DESCRIBE schedules;
