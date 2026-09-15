import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import mysql from 'mysql2/promise';

const root = fileURLToPath(new URL('.', import.meta.url));
const clientRoot = join(root, '..', 'client');
const port = Number(process.env.PORT || 3000);
const pool = mysql.createPool({
    host:     process.env.MYSQL_HOST     || process.env.MYSQLHOST     || '127.0.0.1',
    port:     Number(process.env.MYSQL_PORT     || process.env.MYSQLPORT     || 3306),
    user:     process.env.MYSQL_USER     || process.env.MYSQLUSER     || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'railway',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
    ssl: (process.env.MYSQL_HOST || '').includes('aivencloud') ? { rejectUnauthorized: false } : undefined
});

const jsonHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
    return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password, storedHash) {
    const [salt, expected] = storedHash.split(':');
    if (!salt || !expected) return false;
    const actual = scryptSync(password, salt, 64);
    return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

function sendJson(response, status, payload) {
    response.writeHead(status, jsonHeaders);
    response.end(JSON.stringify(payload));
}

async function readBody(request) {
    let body = '';
    for await (const chunk of request) body += chunk;
    try { return JSON.parse(body || '{}'); } catch { return null; }
}

function publicAccount(account) {
    return {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        studentId: account.student_id || '',
        bio: account.bio || '',
        profileImage: account.profile_image || '',
        profileVisibility: account.profile_visibility || 'public',
        showEmail: Boolean(account.show_email)
    };
}

async function ensureTables() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS accounts (
            id                 VARCHAR(36)  PRIMARY KEY,
            name               VARCHAR(120) NOT NULL,
            email              VARCHAR(255) NOT NULL UNIQUE,
            password_hash      VARCHAR(255) NOT NULL,
            role               ENUM('admin','teacher','student') NOT NULL,
            student_id         VARCHAR(100) NULL,
            bio                TEXT         NULL,
            profile_image      LONGTEXT     NULL,
            profile_visibility VARCHAR(20)  NOT NULL DEFAULT 'public',
            show_email         TINYINT(1)   NOT NULL DEFAULT 1,
            created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE = InnoDB
    `);
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS students (
            id            VARCHAR(100) PRIMARY KEY,
            name          VARCHAR(120) NOT NULL,
            department    VARCHAR(120) NOT NULL,
            adviser       VARCHAR(120) NOT NULL DEFAULT 'Not assigned',
            year          VARCHAR(20)  NOT NULL DEFAULT '',
            registered_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE = InnoDB
    `);
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS teachers (
            id            VARCHAR(100) PRIMARY KEY,
            name          VARCHAR(120) NOT NULL,
            department    VARCHAR(120) NOT NULL,
            registered_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE = InnoDB
    `);
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS attendance (
            id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            student_id      VARCHAR(100) NOT NULL,
            student_name    VARCHAR(120) NOT NULL,
            department      VARCHAR(120) NOT NULL,
            status          VARCHAR(30)  NOT NULL DEFAULT 'Present',
            attendance_time TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            INDEX attendance_student_idx (student_id),
            INDEX attendance_time_idx    (attendance_time),
            CONSTRAINT attendance_student_fk
                FOREIGN KEY (student_id) REFERENCES students(id)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE = InnoDB
    `);
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS schedules (
            id           VARCHAR(36)  PRIMARY KEY,
            teacher_id   VARCHAR(36)  NOT NULL,
            teacher_name VARCHAR(120) NOT NULL,
            subject      VARCHAR(120) NOT NULL,
            day_of_week  VARCHAR(20)  NOT NULL,
            start_time   VARCHAR(10)  NOT NULL,
            end_time     VARCHAR(10)  NOT NULL,
            room         VARCHAR(80)  NOT NULL DEFAULT '',
            created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX schedules_teacher_idx (teacher_id)
        ) ENGINE = InnoDB
    `);
}

async function ensureProfileColumns() {
    const [columns] = await pool.execute(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'accounts'
          AND COLUMN_NAME IN ('student_id', 'bio', 'profile_image', 'profile_visibility', 'show_email')
    `);
    const existingColumns = new Set(columns.map(column => column.COLUMN_NAME));
    if (!existingColumns.has('student_id')) await pool.execute("ALTER TABLE accounts ADD COLUMN student_id VARCHAR(100) NULL");
    if (!existingColumns.has('bio')) await pool.execute("ALTER TABLE accounts ADD COLUMN bio TEXT NOT NULL");
    if (!existingColumns.has('profile_image')) await pool.execute("ALTER TABLE accounts ADD COLUMN profile_image LONGTEXT NULL");
    if (!existingColumns.has('profile_visibility')) await pool.execute("ALTER TABLE accounts ADD COLUMN profile_visibility VARCHAR(20) NOT NULL DEFAULT 'public'");
    if (!existingColumns.has('show_email')) await pool.execute("ALTER TABLE accounts ADD COLUMN show_email TINYINT(1) NOT NULL DEFAULT 1");
    await pool.execute("UPDATE accounts a JOIN students s ON TRIM(LOWER(s.name)) = TRIM(LOWER(a.name)) SET a.student_id = s.id WHERE a.role = 'student' AND a.student_id IS NULL");
}

async function ensureStudentColumns() {
    const [columns] = await pool.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students'
        AND COLUMN_NAME IN ('adviser','year')
    `);
    const existing = new Set(columns.map(c => c.COLUMN_NAME));
    if (!existing.has('adviser')) await pool.execute("ALTER TABLE students ADD COLUMN adviser VARCHAR(120) NOT NULL DEFAULT 'Not assigned'");
    if (!existing.has('year'))    await pool.execute("ALTER TABLE students ADD COLUMN year VARCHAR(20) NOT NULL DEFAULT ''");
}

async function ensureSchedulesTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS schedules (
            id VARCHAR(36) PRIMARY KEY,
            teacher_id VARCHAR(36) NOT NULL,
            teacher_name VARCHAR(120) NOT NULL,
            subject VARCHAR(120) NOT NULL,
            day_of_week VARCHAR(20) NOT NULL,
            start_time VARCHAR(10) NOT NULL,
            end_time VARCHAR(10) NOT NULL,
            room VARCHAR(80) NOT NULL DEFAULT '',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX schedules_teacher_idx (teacher_id)
        ) ENGINE = InnoDB
    `);
}

async function seedAdmin() {
    const [rows] = await pool.execute('SELECT id FROM accounts WHERE email = ?', ['admin@schoolsync.local']);
    if (!rows.length) {
        await pool.execute('INSERT INTO accounts (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)', [
            'admin-001', 'School Administrator', 'admin@schoolsync.local', hashPassword('admin123'), 'admin'
        ]);
    }
}

async function handleApi(request, response, pathname) {
    if (request.method === 'POST' && pathname === '/api/auth/register') {
        const body = await readBody(request);
        const isStudent = body?.role === 'student';
        if (!body?.name || !body?.email || !body?.password || !['student', 'teacher'].includes(body.role) || (isStudent && (!body.studentId || !body.department))) {
            return sendJson(response, 400, { error: isStudent ? 'Name, email, password, student ID, department, and section are required.' : 'Name, email, password, and role are required.' });
        }
        const account = { id: randomUUID(), name: body.name.trim(), email: body.email.trim().toLowerCase(), passwordHash: hashPassword(body.password), role: body.role, studentId: isStudent ? body.studentId.trim() : '' };
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('INSERT INTO accounts (id, name, email, password_hash, role, student_id) VALUES (?, ?, ?, ?, ?, ?)', [account.id, account.name, account.email, account.passwordHash, account.role, account.studentId || null]);
            if (isStudent) {
                await connection.execute('INSERT INTO students (id, name, department, adviser, year) VALUES (?, ?, ?, ?, ?)', [body.studentId.trim(), account.name, body.department.trim(), (body.adviser || 'Not assigned').trim(), (body.year || '').trim()]);
            }
            await connection.commit();
            return sendJson(response, 201, { account: publicAccount(account) });
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_DUP_ENTRY') return sendJson(response, 409, { error: isStudent ? 'That email or student ID already exists.' : 'An account with that email already exists.' });
            throw error;
        } finally {
            connection.release();
        }
    }

    if (request.method === 'POST' && pathname === '/api/auth/login') {
        const body = await readBody(request);
        const [rows] = await pool.execute('SELECT * FROM accounts WHERE email = ?', [body?.email?.trim().toLowerCase() || '']);
        const account = rows[0];
        if (!account || !verifyPassword(body.password || '', account.password_hash)) return sendJson(response, 401, { error: 'Email or password is incorrect.' });
        return sendJson(response, 200, { account: publicAccount(account) });
    }

    if (request.method === 'PUT' && pathname === '/api/auth/profile') {
        const body = await readBody(request);
        if (!body?.id || !body?.name?.trim()) return sendJson(response, 400, { error: 'Account ID and name are required.' });
        const [accounts] = await pool.execute('SELECT * FROM accounts WHERE id = ?', [body.id]);
        const account = accounts[0];
        if (!account) return sendJson(response, 404, { error: 'Account not found.' });
        const email = body.email?.trim().toLowerCase() || account.email;
        const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
        const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
        if ((email !== account.email || newPassword) && (!currentPassword || !verifyPassword(currentPassword, account.password_hash))) {
            return sendJson(response, 400, { error: 'Your current password is required to change email or password.' });
        }
        if (newPassword && newPassword.length < 6) return sendJson(response, 400, { error: 'The new password must be at least 6 characters.' });
        const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 500) : '';
        const profileImage = typeof body.profileImage === 'string' ? body.profileImage : '';
        const profileVisibility = body.profileVisibility === 'private' ? 'private' : 'public';
        const showEmail = body.showEmail === false ? 0 : 1;
        const passwordHash = newPassword ? hashPassword(newPassword) : account.password_hash;
        if (profileImage.length > 2_500_000) return sendJson(response, 413, { error: 'Profile image is too large.' });
        try {
            await pool.execute('UPDATE accounts SET name = ?, email = ?, password_hash = ?, bio = ?, profile_image = ?, profile_visibility = ?, show_email = ? WHERE id = ?', [body.name.trim(), email, passwordHash, bio, profileImage, profileVisibility, showEmail, body.id]);
            const [rows] = await pool.execute('SELECT * FROM accounts WHERE id = ?', [body.id]);
            return sendJson(response, 200, { account: publicAccount(rows[0]) });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') return sendJson(response, 409, { error: 'That email address is already in use.' });
            throw error;
        }
    }

    if (request.method === 'GET' && pathname === '/api/students') {
        const [students] = await pool.execute('SELECT id, name, department AS grade, adviser, year, registered_at AS registeredAt FROM students ORDER BY registered_at DESC');
        return sendJson(response, 200, { students });
    }

    if (request.method === 'POST' && pathname === '/api/students') {
        const body = await readBody(request);
        if (!body?.id || !body?.name || !body?.grade || !body?.adviser) return sendJson(response, 400, { error: 'Student name, ID, department, and section are required.' });
        try {
            await pool.execute('INSERT INTO students (id, name, department, adviser, year) VALUES (?, ?, ?, ?, ?)', [body.id.trim(), body.name.trim(), body.grade, body.adviser.trim(), (body.year || '').trim()]);
            return sendJson(response, 201, { student: body });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') return sendJson(response, 409, { error: 'A student with this ID already exists.' });
            throw error;
        }
    }

    if (request.method === 'DELETE' && pathname.startsWith('/api/students/')) {
        await pool.execute('DELETE FROM students WHERE id = ?', [decodeURIComponent(pathname.slice('/api/students/'.length))]);
        return sendJson(response, 200, { ok: true });
    }

    if (request.method === 'GET' && pathname === '/api/teachers') {
        const [teachers] = await pool.execute('SELECT id, name, department, registered_at AS registeredAt FROM teachers ORDER BY registered_at DESC');
        return sendJson(response, 200, { teachers });
    }

    if (request.method === 'POST' && pathname === '/api/teachers') {
        const body = await readBody(request);
        if (!body?.id || !body?.name || !body?.department) return sendJson(response, 400, { error: 'Teacher name, ID, and department are required.' });
        try {
            await pool.execute('INSERT INTO teachers (id, name, department) VALUES (?, ?, ?)', [body.id.trim(), body.name.trim(), body.department.trim()]);
            return sendJson(response, 201, { teacher: { id: body.id.trim(), name: body.name.trim(), department: body.department.trim() } });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') return sendJson(response, 409, { error: 'A teacher with this ID already exists.' });
            throw error;
        }
    }

    if (request.method === 'DELETE' && pathname.startsWith('/api/teachers/')) {
        await pool.execute('DELETE FROM teachers WHERE id = ?', [decodeURIComponent(pathname.slice('/api/teachers/'.length))]);
        return sendJson(response, 200, { ok: true });
    }

    if (request.method === 'GET' && pathname === '/api/attendance') {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const dateStr = url.searchParams.get('date');
        if (dateStr) {
            const [logs] = await pool.execute(
                `SELECT a.id, a.student_id AS userId, a.student_name AS userName,
                        a.department AS grade, a.attendance_time AS timestamp, a.status,
                        COALESCE(s.adviser, '') AS section,
                        COALESCE(s.year, '') AS year
                 FROM attendance a
                 LEFT JOIN students s ON s.id = a.student_id
                 WHERE DATE(a.attendance_time) = ?
                 ORDER BY a.attendance_time DESC`,
                [dateStr]
            );
            return sendJson(response, 200, { logs });
        }
        const [logs] = await pool.execute(
            `SELECT a.id, a.student_id AS userId, a.student_name AS userName,
                    a.department AS grade, a.attendance_time AS timestamp, a.status,
                    COALESCE(s.adviser, '') AS section,
                    COALESCE(s.year, '') AS year
             FROM attendance a
             LEFT JOIN students s ON s.id = a.student_id
             ORDER BY a.attendance_time DESC`
        );
        return sendJson(response, 200, { logs });
    }

    if (request.method === 'POST' && pathname === '/api/attendance') {
        const body = await readBody(request);
        const [students] = await pool.execute('SELECT id, name, department FROM students WHERE id = ?', [body?.userId || '']);
        const student = students[0];
        if (!student) return sendJson(response, 404, { error: 'Unknown student ID.' });
        // Block duplicate scans on the same day
        const [existing] = await pool.execute(
            'SELECT id FROM attendance WHERE student_id = ? AND DATE(attendance_time) = CURDATE()',
            [student.id]
        );
        if (existing.length) return sendJson(response, 409, { error: 'Already scanned today.', alreadyScanned: true });
        // Determine status based on time: before cutoff = Present, after = Late
        const now = new Date();
        const cutoffHour = Number(body?.cutoffHour ?? 8);
        const cutoffMinute = Number(body?.cutoffMinute ?? 0);
        const isLate = now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() > cutoffMinute);
        const status = isLate ? 'Late' : 'Present';
        const [result] = await pool.execute(
            'INSERT INTO attendance (student_id, student_name, department, status) VALUES (?, ?, ?, ?)',
            [student.id, student.name, student.department, status]
        );
        return sendJson(response, 201, { ok: true, id: result.insertId, status });
    }

    if (request.method === 'PUT' && pathname.startsWith('/api/attendance/')) {
        const attendanceId = decodeURIComponent(pathname.slice('/api/attendance/'.length));
        const body = await readBody(request);
        const allowed = ['Present', 'Late', 'Absent'];
        if (!allowed.includes(body?.status)) {
            return sendJson(response, 400, { error: 'Status must be Present, Late, or Absent.' });
        }
        const [rows] = await pool.execute('SELECT id FROM attendance WHERE id = ?', [attendanceId]);
        if (!rows.length) return sendJson(response, 404, { error: 'Attendance record not found.' });
        await pool.execute('UPDATE attendance SET status = ? WHERE id = ?', [body.status, attendanceId]);
        return sendJson(response, 200, { ok: true });
    }

    if (request.method === 'DELETE' && pathname.startsWith('/api/attendance/')) {
        const attendanceId = decodeURIComponent(pathname.slice('/api/attendance/'.length));
        await pool.execute('DELETE FROM attendance WHERE id = ?', [attendanceId]);
        return sendJson(response, 200, { ok: true });
    }

    if (request.method === 'DELETE' && pathname === '/api/attendance') {
        await pool.execute('DELETE FROM attendance');
        return sendJson(response, 200, { ok: true });
    }

    // ── Schedules ──────────────────────────────────────────────────────────────
    if (request.method === 'GET' && pathname === '/api/schedules') {
        const teacherId = new URL(request.url, `http://${request.headers.host}`).searchParams.get('teacherId');
        if (teacherId) {
            const [rows] = await pool.execute(
                'SELECT id, teacher_id AS teacherId, teacher_name AS teacherName, subject, day_of_week AS dayOfWeek, start_time AS startTime, end_time AS endTime, room, created_at AS createdAt FROM schedules WHERE teacher_id = ? ORDER BY FIELD(day_of_week,\'Monday\',\'Tuesday\',\'Wednesday\',\'Thursday\',\'Friday\',\'Saturday\',\'Sunday\'), start_time',
                [teacherId]
            );
            return sendJson(response, 200, { schedules: rows });
        }
        const [rows] = await pool.execute(
            'SELECT id, teacher_id AS teacherId, teacher_name AS teacherName, subject, day_of_week AS dayOfWeek, start_time AS startTime, end_time AS endTime, room, created_at AS createdAt FROM schedules ORDER BY FIELD(day_of_week,\'Monday\',\'Tuesday\',\'Wednesday\',\'Thursday\',\'Friday\',\'Saturday\',\'Sunday\'), start_time'
        );
        return sendJson(response, 200, { schedules: rows });
    }

    if (request.method === 'POST' && pathname === '/api/schedules') {
        const body = await readBody(request);
        console.log('Received schedule body:', body);
        if (!body?.teacherId || !body?.teacherName || !body?.subject || !body?.dayOfWeek || !body?.startTime || !body?.endTime) {
            return sendJson(response, 400, { error: 'Subject, day, start time, and end time are required.' });
        }
        // Verify the account exists and is a teacher
        const [accounts] = await pool.execute('SELECT id, role FROM accounts WHERE id = ?', [body.teacherId]);
        if (!accounts.length || accounts[0].role !== 'teacher') {
            return sendJson(response, 403, { error: 'Only teacher accounts can manage schedules.' });
        }
        const id = randomUUID();
        await pool.execute(
            'INSERT INTO schedules (id, teacher_id, teacher_name, subject, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, body.teacherId, body.teacherName.trim(), body.subject.trim(), body.dayOfWeek, body.startTime, body.endTime, (body.room || '').trim()]
        );
        return sendJson(response, 201, { schedule: { id, teacherId: body.teacherId, teacherName: body.teacherName, subject: body.subject, dayOfWeek: body.dayOfWeek, startTime: body.startTime, endTime: body.endTime, room: body.room || '' } });
    }

    if (request.method === 'DELETE' && pathname.startsWith('/api/schedules/')) {
        const scheduleId = decodeURIComponent(pathname.slice('/api/schedules/'.length));
        const body = await readBody(request);
        // Verify the requester is the owning teacher
        const [rows] = await pool.execute('SELECT teacher_id FROM schedules WHERE id = ?', [scheduleId]);
        if (!rows.length) return sendJson(response, 404, { error: 'Schedule not found.' });
        if (body?.teacherId !== rows[0].teacher_id) {
            return sendJson(response, 403, { error: 'You can only remove your own schedule entries.' });
        }
        await pool.execute('DELETE FROM schedules WHERE id = ?', [scheduleId]);
        return sendJson(response, 200, { ok: true });
    }

    return sendJson(response, 404, { error: 'API route not found.' });
}

function resolveRequestedPath(pathname) {
    if (pathname === '/') return '/client/client.html';
    if (pathname === '/about' || pathname === '/about.html') return '/client/about.html';
    if (pathname === '/admin' || pathname === '/admin/') return '/client/admin/dashboard.html';
    if (pathname === '/dashboard' || pathname === '/dashboard.html') return '/client/admin/dashboard.html';

    const base = pathname.startsWith('/client/') ? pathname : `/client${pathname}`;
    const candidatePath = normalize(join(root, '..', base));

    const isDirectory = candidatePath.endsWith('/') || (existsSync(candidatePath) && statSync(candidatePath).isDirectory());
    if (isDirectory) {
        const withoutTrailingSlash = base.endsWith('/') ? base.slice(0, -1) : base;
        const indexPath = normalize(join(root, '..', `${withoutTrailingSlash}/index.html`));
        if (existsSync(indexPath)) return `${withoutTrailingSlash}/index.html`;
        const dashboardPath = normalize(join(root, '..', `${withoutTrailingSlash}/dashboard.html`));
        if (existsSync(dashboardPath)) return `${withoutTrailingSlash}/dashboard.html`;
    }

    return base;
}

async function serveStatic(response, pathname) {
    const requested = resolveRequestedPath(pathname);
    const filePath = normalize(join(root, '..', requested));
    if (!filePath.startsWith(clientRoot) || !existsSync(filePath) || statSync(filePath).isDirectory()) return sendJson(response, 404, { error: 'Page not found.' });
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
    response.end(await readFile(filePath));
}

await pool.query('SELECT 1');
await ensureTables();
await ensureProfileColumns();
await ensureStudentColumns();
await ensureSchedulesTable();
await seedAdmin();

const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    try {
        if (request.method === 'OPTIONS') {
            response.writeHead(204, jsonHeaders);
            response.end();
            return;
        }
        if (url.pathname.startsWith('/api/')) await handleApi(request, response, url.pathname);
        else await serveStatic(response, url.pathname);
    } catch (error) {
        console.error(error);
        sendJson(response, 500, { error: 'Internal server error.' });
    }
});

server.listen(port, '0.0.0.0', () => console.log(`SchoolSync running at http://0.0.0.0:${port}`));
