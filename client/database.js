const SchoolSyncDB = (() => {
    const sessionKey = 'schoolsync_session';
    // Always use relative URLs so API calls go to whichever host/port the page
    // was loaded from — works on localhost, LAN IP, and phone access alike.
    const apiBase = '';

    async function request(path, options = {}) {
        const response = await fetch(`${apiBase}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'The server could not complete that request.');
        return body;
    }

    return {
        async register(account) {
            try { return await request('/api/auth/register', { method: 'POST', body: JSON.stringify(account) }); }
            catch (error) { return { error: error.message }; }
        },
        async authenticate(email, password) {
            try {
                const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
                localStorage.setItem(sessionKey, JSON.stringify(result.account));
                return result;
            } catch (error) { return { error: error.message }; }
        },
        async updateProfile(profile) {
            try {
                const result = await request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(profile) });
                localStorage.setItem(sessionKey, JSON.stringify(result.account));
                return result;
            } catch (error) { return { error: error.message }; }
        },
        getSession() {
            try { return JSON.parse(localStorage.getItem(sessionKey)); }
            catch { return null; }
        },
        signOut() { localStorage.removeItem(sessionKey); },
        savePreviousSession(account) {
            localStorage.setItem('schoolsync_prev_session', JSON.stringify(account));
        },
        popPreviousSession() {
            try {
                const prev = JSON.parse(localStorage.getItem('schoolsync_prev_session'));
                localStorage.removeItem('schoolsync_prev_session');
                return prev;
            } catch { return null; }
        },
        async getLogs() { return (await request('/api/attendance')).logs; },
        async getUsers() { return (await request('/api/students')).students; },
        async saveUser(user) { return request('/api/students', { method: 'POST', body: JSON.stringify(user) }); },
        async getTeachers() { return (await request('/api/teachers')).teachers; },
        async saveTeacher(teacher) { return request('/api/teachers', { method: 'POST', body: JSON.stringify(teacher) }); },
        async removeTeacher(id) { return request(`/api/teachers/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
        async saveLog(log) { return request('/api/attendance', { method: 'POST', body: JSON.stringify(log) }); },
        async removeStudent(id) { return request(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
        async clearLogs() { return request('/api/attendance', { method: 'DELETE' }); },
        async getTodayAttendance() {
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            return (await request(`/api/attendance?date=${dateStr}`)).logs;
        },
        async updateAttendanceStatus(id, status) {
            return request(`/api/attendance/${encodeURIComponent(id)}`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
        },
        async removeLog(id) {
            return request(`/api/attendance/${encodeURIComponent(id)}`, { method: 'DELETE' });
        },
        async getSchedules(teacherId) {
            const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : '';
            return (await request(`/api/schedules${qs}`)).schedules;
        },
        async saveSchedule(schedule) {
            return request('/api/schedules', { method: 'POST', body: JSON.stringify(schedule) });
        },
        async removeSchedule(scheduleId, teacherId) {
            return request(`/api/schedules/${encodeURIComponent(scheduleId)}`, {
                method: 'DELETE',
                body: JSON.stringify({ teacherId })
            });
        }
    };
})();
