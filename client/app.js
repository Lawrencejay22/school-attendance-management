const publicView = document.getElementById('public-view');
const dashboardView = document.getElementById('dashboard-view');
const authModal = document.getElementById('auth-modal');
const authMessage = document.getElementById('auth-message');
const authTitle = document.getElementById('auth-title');
const authDescription = document.getElementById('auth-description');
const authTabs = document.getElementById('auth-tabs');
const signInSubmit = document.getElementById('signin-submit');
const signInForm = document.getElementById('signin-form');
const signUpForm = document.getElementById('signup-form');
const signupRole = document.getElementById('signup-role');
const studentSignupFields = document.getElementById('student-signup-fields');
const signupStudentId = document.getElementById('signup-student-id');
const signupDepartment = document.getElementById('signup-department');
const signupSection = document.getElementById('signup-section');
const signupYear = document.getElementById('signup-year');
const teacherSignupFields = document.getElementById('teacher-signup-fields');
const signupTeacherId = document.getElementById('signup-teacher-id');
const signupTeacherDepartment = document.getElementById('signup-teacher-department');
const guestActions = document.getElementById('guest-actions');
const profileTrigger = document.getElementById('profile-trigger');
const headerLogout = document.getElementById('header-logout');
const profileModal = document.getElementById('profile-modal');
const profileForm = document.getElementById('profile-form');
const editProfileButton = document.getElementById('edit-profile');
const cancelProfileEdit = document.getElementById('cancel-profile-edit');
const openPrivacyButton = document.getElementById('open-privacy');
const goAdminButton = document.getElementById('go-admin');
const privacyModal = document.getElementById('privacy-modal');
const privacyForm = document.getElementById('privacy-form');
const privacyMessage = document.getElementById('privacy-message');
const profileMessage = document.getElementById('profile-message');
const profileImageInput = document.getElementById('profile-image');
const profileImagePreview = document.getElementById('profile-image-preview');
let currentAccount = null;
let adminLoginMode = false;
const classQrInstances = {};

function updateMobileMenu(account) {
    const signedIn = Boolean(account);
    const mobileLogoutBtn = document.getElementById('mobile-logout');
    const mobileGuest = document.getElementById('mobile-guest-actions');
    if (mobileLogoutBtn) mobileLogoutBtn.classList.toggle('hidden', !signedIn);
    if (mobileGuest) mobileGuest.classList.toggle('hidden', signedIn);
}

function accountInitials(account) {
    return account.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'SS';
}

function setImagePreview(element, account) {
    element.textContent = account.profileImage ? '' : accountInitials(account);
    element.style.backgroundImage = account.profileImage ? `url(${account.profileImage})` : '';
}

function setHeaderAccount(account) {
    currentAccount = account;
    const signedIn = Boolean(account);
    guestActions.classList.toggle('hidden', signedIn);
    profileTrigger.classList.toggle('hidden', !signedIn);
    headerLogout.classList.toggle('hidden', !signedIn);
    goAdminButton.classList.toggle('hidden', !signedIn || account.role !== 'admin');
    // Hide Admin access footer link only for students
    const adminFooterLink = document.getElementById('admin-footer-link');
    if (adminFooterLink) {
        adminFooterLink.classList.toggle('hidden', signedIn && account.role === 'student');
    }
    // Sync mobile menu
    updateMobileMenu(account);
    if (!signedIn) return;
    document.getElementById('header-profile-initials').textContent = accountInitials(account);
    document.getElementById('header-profile-name').textContent = account.name.split(' ')[0];
    setImagePreview(document.getElementById('header-profile-initials'), account);
}

function openProfile() {
    if (!currentAccount) return;
    const roleLabel = currentAccount.role.charAt(0).toUpperCase() + currentAccount.role.slice(1);
    document.getElementById('profile-edit-name').value = currentAccount.name;
    document.getElementById('profile-edit-bio').value = currentAccount.bio || '';
    profileImagePreview.dataset.image = currentAccount.profileImage || '';
    setImagePreview(profileImagePreview, currentAccount);
    document.getElementById('profile-summary-name').textContent = currentAccount.name;
    document.getElementById('profile-summary-role').textContent = roleLabel;
    const studentId = document.getElementById('profile-summary-student-id');
    studentId.textContent = currentAccount.role === 'student' && currentAccount.studentId ? `Student ID: ${currentAccount.studentId}` : '';
    studentId.classList.toggle('hidden', !studentId.textContent);
    document.getElementById('profile-summary-bio').textContent = currentAccount.bio || 'Add a short bio to tell your school community about you.';
    const contactLink = document.getElementById('profile-summary-contact');
    contactLink.href = currentAccount.showEmail ? `mailto:${currentAccount.email}` : '#';
    contactLink.textContent = currentAccount.showEmail ? currentAccount.email : 'Email hidden by privacy settings';
    setImagePreview(document.getElementById('profile-summary-avatar'), currentAccount);
    profileForm.classList.add('hidden');
    editProfileButton.classList.remove('hidden');
    profileMessage.textContent = '';
    profileMessage.classList.remove('error');
    profileModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closeProfile() {
    profileModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    profileForm.reset();
    profileImageInput.value = '';
    delete profileImagePreview.dataset.image;
    profileForm.classList.add('hidden');
    editProfileButton.classList.remove('hidden');
}

function openPrivacy() {
    if (!currentAccount) return;
    document.getElementById('profile-visibility').value = currentAccount.profileVisibility || 'public';
    document.getElementById('show-email').checked = currentAccount.showEmail !== false;
    document.getElementById('privacy-email').value = currentAccount.email;
    document.getElementById('privacy-current-password').value = '';
    document.getElementById('privacy-new-password').value = '';
    document.getElementById('privacy-confirm-password').value = '';
    privacyMessage.textContent = '';
    privacyMessage.classList.remove('error');
    privacyModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closePrivacy() {
    privacyModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    privacyForm.reset();
}

function updateStudentSignupFields() {
    const isStudent = signupRole.value === 'student';
    const isTeacher = signupRole.value === 'teacher';
    studentSignupFields.classList.toggle('hidden', !isStudent);
    teacherSignupFields.classList.toggle('hidden', !isTeacher);
    signupStudentId.required = isStudent;
    signupDepartment.required = isStudent;
    signupSection.required = isStudent;
    signupYear.required = isStudent;
    signupTeacherId.required = isTeacher;
    signupTeacherDepartment.required = isTeacher;
}

function openAuth(mode = 'signin') {
    authModal.classList.remove('hidden');
    setAuthMode(mode);
    document.body.classList.add('modal-open');
}

function closeAuth() {
    authModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    authMessage.textContent = '';
    signInForm.reset();
    signUpForm.reset();
}

function setAuthMode(mode) {
    adminLoginMode = mode === 'admin';
    const isSignIn = adminLoginMode || mode === 'signin';
    authTabs.classList.toggle('hidden', adminLoginMode);
    document.querySelectorAll('[data-auth-tab]').forEach(tab => tab.classList.toggle('active', tab.dataset.authTab === mode));
    signInForm.classList.toggle('hidden', !isSignIn);
    signUpForm.classList.toggle('hidden', isSignIn);
    authTitle.textContent = adminLoginMode ? 'Admin sign in.' : isSignIn ? 'Welcome back.' : 'Make attendance clearer.';
    authDescription.textContent = adminLoginMode ? 'Sign in to manage attendance, students, and teachers.' : isSignIn ? 'Sign in to continue to your attendance space.' : 'Create a student or teacher account in under a minute.';
    signInSubmit.innerHTML = adminLoginMode ? 'Admin sign in <i class="ph-bold ph-arrow-right"></i>' : 'Sign in <i class="ph-bold ph-arrow-right"></i>';
    authMessage.textContent = '';
}

function showMessage(message, isError = true) {
    authMessage.textContent = message;
    authMessage.classList.toggle('error', isError);
}

function redirectForRole(account) {
    if (window.location.hash === '#login' || window.location.hash === '#admin-login') {
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
    setHeaderAccount(account);
    if (account.role === 'admin') {
        window.location.href = '/client/admin/dashboard.html';
        return;
    }
    closeAuth();
    publicView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    renderDashboard(account);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Schedule helpers ───────────────────────────────────────────────────────

function formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ── Student ID card ────────────────────────────────────────────────────────
// Shows the student's QR code + name + course + ID in the third dashboard card.
let studentQrRendered = false;

async function renderStudentIdCard(account, allLogs) {
    const card = document.getElementById('schedule-card');
    const body = document.getElementById('schedule-card-body');

    // Relabel for students
    const label = card.querySelector('.card-label span');
    if (label) label.textContent = 'My ID Card';
    const labelIcon = card.querySelector('.card-label i');
    if (labelIcon) labelIcon.className = 'ph ph-identification-card';

    // Try to find the student's DB record — by studentId first, then by name fallback
    let studentRecord = null;
    try {
        const users = await SchoolSyncDB.getUsers();
        if (account.studentId) {
            studentRecord = users.find(u => u.id === account.studentId);
        }
        // Fallback: match by name (admin may have registered them separately)
        if (!studentRecord) {
            studentRecord = users.find(u => u.name.trim().toLowerCase() === account.name.trim().toLowerCase());
        }
    } catch (e) { /* silent */ }

    // Use the ID from the DB record if available (most reliable), else fall back to account.studentId
    const scanId = studentRecord?.id || account.studentId || null;
    const dept = studentRecord?.grade || '';
    const section = studentRecord?.adviser || '';
    const year = studentRecord?.year || '';

    const today = new Date().toLocaleDateString();
    const myLogs = allLogs.filter(l => l.userId === scanId);
    const todayLog = myLogs
        .filter(l => new Date(l.timestamp).toLocaleDateString() === today)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;

    const todayStatus = todayLog ? todayLog.status : 'Not scanned';
    const statusCls = todayStatus === 'Present' ? 'status-present'
        : todayStatus === 'Late' ? 'status-late'
            : todayStatus === 'Absent' ? 'status-absent'
                : 'status-none';
    const statusIconCls = todayStatus === 'Present' ? 'ph-fill ph-check-circle'
        : todayStatus === 'Late' ? 'ph-fill ph-clock'
            : todayStatus === 'Absent' ? 'ph-fill ph-x-circle'
                : 'ph ph-minus-circle';

    if (!scanId) {
        body.innerHTML = `<div class="schedule-empty-state"><i class="ph ph-identification-card"></i><p>No student ID linked to your account.<br>Ask your administrator to register you.</p></div>`;
        return;
    }

    const qrWrapperId = 'student-id-qr';
    body.innerHTML = `
        <div class="student-id-card">
            <div class="student-id-qr-wrap">
                <div id="${qrWrapperId}"></div>
            </div>
            <div class="student-id-info">
                <div class="student-id-name">${account.name}</div>
                <div class="student-id-meta">${scanId}</div>
                ${dept ? `<div class="student-id-dept">${dept}${section ? ' · ' + section : ''}${year ? ' · ' + year : ''}</div>` : ''}
                <span class="class-status-badge ${statusCls} student-id-status">
                    <i class="${statusIconCls}"></i>
                    Today: ${todayStatus}
                    ${todayLog ? `<small>· ${new Date(todayLog.timestamp).toLocaleTimeString([], { timeStyle: 'short' })}</small>` : ''}
                </span>
            </div>
        </div>`;

    const scanUrl = `${window.location.origin}/scan.html?id=${scanId}`;
    setTimeout(() => {
        const qrEl = document.getElementById(qrWrapperId);
        if (qrEl) {
            qrEl.innerHTML = '';
            new QRCode(qrEl, {
                text: scanUrl,
                width: 110,
                height: 110,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }, 50);


    if (!account.studentId && scanId) {
        account.studentId = scanId;
    }
}
// Format 24-hour time to 12-hour AM/PM
function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${m} ${ampm}`;
}

// Render schedules into the small dashboard card (teachers only)
function renderScheduleCard(schedules) {
    const body = document.getElementById('schedule-card-body');
    if (!schedules.length) {
        body.innerHTML = `<div class="schedule-empty-state"><i class="ph ph-calendar-blank"></i><p>No schedule entries yet.</p></div>`;
        return;
    }
    body.innerHTML = schedules.map(s => `
        <div class="schedule-row">
            <span class="sched-day-badge">${s.dayOfWeek.slice(0, 3)}</span>
            <div class="sched-info">
                <div class="sched-subject">${s.subject}</div>
                <div class="sched-meta">${formatTime(s.startTime)} – ${formatTime(s.endTime)}${s.room ? ` · ${s.room}` : ''}</div>
            </div>
        </div>`).join('');
}

// Render the editable schedule list inside the teacher management panel
function renderScheduleList(schedules, teacherId) {
    const list = document.getElementById('schedule-list');
    if (!schedules.length) {
        list.innerHTML = `<div class="schedule-empty-state"><i class="ph ph-calendar-blank"></i><p>No schedule entries yet. Add one above.</p></div>`;
        return;
    }
    list.innerHTML = schedules.map(s => `
        <div class="schedule-entry" data-id="${s.id}">
            <span class="sched-day-badge">${s.dayOfWeek.slice(0, 3)}</span>
            <div class="sched-details">
                <div class="sched-subject">${s.subject}</div>
                <div class="sched-meta">${formatTime(s.startTime)} – ${formatTime(s.endTime)}${s.room ? ` · ${s.room}` : ''}</div>
            </div>
            <button class="sched-remove-btn" aria-label="Remove ${s.subject}" data-schedule-id="${s.id}" data-teacher-id="${teacherId}">
                <i class="ph ph-trash"></i>
            </button>
        </div>`).join('');

    list.querySelectorAll('.sched-remove-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const sid = btn.dataset.scheduleId;
            const tid = btn.dataset.teacherId;
            try {
                await SchoolSyncDB.removeSchedule(sid, tid);
                const updated = await SchoolSyncDB.getSchedules(tid);
                renderScheduleCard(updated);
                renderScheduleList(updated, tid);
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

async function renderDashboard(account) {
    const [logs, users] = await Promise.all([SchoolSyncDB.getLogs(), SchoolSyncDB.getUsers()]);
    const today = new Date().toLocaleDateString();
    const presentToday = new Set(logs.filter(log => new Date(log.timestamp).toLocaleDateString() === today).map(log => log.userId));
    const totalStudents = users.length;
    const attendance = totalStudents ? Math.round((presentToday.size / totalStudents) * 100) : 0;
    const roleLabel = account.role.charAt(0).toUpperCase() + account.role.slice(1);

    // Build a map: studentId → { profileImage, name } for log row avatars
    const profileMap = {};
    users.forEach(u => { profileMap[u.id] = { profileImage: u.profileImage || '', name: u.name }; });

    function logAvatar(userId, fallbackName, status) {
        const info = profileMap[userId] || { profileImage: '', name: fallbackName || '?' };
        const initials = info.name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
        if (info.profileImage) {
            return `<span class="log-avatar log-avatar-${status}" style="background-image:url('${info.profileImage}');background-size:cover;background-position:center;background-repeat:no-repeat;">&ZeroWidthSpace;</span>`;
        }
        return `<span class="log-avatar log-avatar-${status}">${initials}</span>`;
    }

    document.getElementById('dashboard-greeting').textContent = `Welcome, ${account.name.split(' ')[0]}.`;
    document.getElementById('dashboard-subtitle').textContent = `${roleLabel} view · ${account.email}`;
    document.getElementById('dashboard-role').textContent = roleLabel;
    document.getElementById('dashboard-attendance').textContent = `${attendance}%`;
    document.getElementById('dashboard-progress').style.width = `${attendance}%`;
    document.getElementById('dashboard-attendance-note').textContent = totalStudents ? `${presentToday.size} of ${totalStudents} students checked in today.` : 'Your school has no registered students yet.';

    const logList = document.getElementById('dashboard-logs');
    const recentLogs = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // For students: resolve their real student DB id (in case account.studentId is blank)
    if (account.role === 'student' && !account.studentId) {
        const allUsers = await SchoolSyncDB.getUsers();
        const matched = allUsers.find(u => u.name.trim().toLowerCase() === account.name.trim().toLowerCase());
        if (matched) account.studentId = matched.id;
    }

    if (account.role === 'student') {
        // Students: read-only view of their own attendance records
        const myLogs = recentLogs.filter(log => log.userId === account.studentId).slice(0, 8);
        logList.innerHTML = myLogs.length
            ? myLogs.map(log => {
                const st = (log.status || 'Present').toLowerCase();
                return `<div class="log-row">
                    ${logAvatar(log.userId, account.name, st)}
                    <div>
                        <strong>${new Date(log.timestamp).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                        <small>${new Date(log.timestamp).toLocaleTimeString([], { timeStyle: 'short' })}${log.grade ? ` · ${log.grade}` : ''}${log.section ? ` · ${log.section}` : ''}${log.year ? ` · ${log.year}` : ''}${log.subject ? ` · <strong>${log.subject}</strong>` : ''}</small>
                    </div>
                    <span class="log-status log-status-${st}">${log.status || 'Present'}</span>
                </div>`;
            }).join('')
            : '<div class="empty-log">No attendance records for you yet.</div>';
    } else {

        const top8 = recentLogs.slice(0, 8);
        logList.innerHTML = top8.length
            ? top8.map(log => {
                const st = (log.status || 'Present').toLowerCase();
                return `<div class="log-row log-row-editable" data-log-id="${log.id}">
                    ${logAvatar(log.userId, log.userName, st)}
                    <div class="log-row-info">
                        <strong>${log.userName}</strong>
                        <small>${new Date(log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}${log.grade ? ` · ${log.grade}` : ''}${log.section ? ` · ${log.section}` : ''}${log.year ? ` · ${log.year}` : ''}${log.subject ? ` · <strong>${log.subject}</strong>` : ''}</small>
                    </div>
                    <select class="log-status-select log-status-${st}" data-log-id="${log.id}">
                        <option value="Present" ${log.status === 'Present' ? 'selected' : ''}>Present</option>
                        <option value="Late"    ${log.status === 'Late' ? 'selected' : ''}>Late</option>
                        <option value="Absent"  ${log.status === 'Absent' ? 'selected' : ''}>Absent</option>
                    </select>
                    <button class="log-remove-btn" data-log-id="${log.id}" title="Remove this record" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:4px 6px;border-radius:6px;font-size:1rem;line-height:1;transition:background 0.15s;" aria-label="Remove attendance record">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>`;
            }).join('')
            : '<div class="empty-log">No attendance scans yet.</div>';

        // Bind change handlers for teacher editable log
        logList.querySelectorAll('.log-status-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                const newStatus = sel.value;
                const lid = sel.dataset.logId;
                try {
                    await SchoolSyncDB.updateAttendanceStatus(lid, newStatus);
                    // Update the color class on the select and avatar ring
                    sel.className = `log-status-select log-status-${newStatus.toLowerCase()}`;
                    const avatar = sel.closest('.log-row').querySelector('.log-avatar');
                    if (avatar) {
                        avatar.className = avatar.className.replace(/log-avatar-\w+/, `log-avatar-${newStatus.toLowerCase()}`);
                    }
                    // Refresh My Class panel if visible
                    if (account.role === 'teacher') await updateClassStats();
                } catch (err) {
                    alert(err.message);
                }
            });
        });

        // Remove individual log entry
        logList.querySelectorAll('.log-remove-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const lid = btn.dataset.logId;
                if (!confirm('Remove this attendance record?')) return;
                try {
                    await SchoolSyncDB.removeLog(lid);
                    btn.closest('.log-row').remove();
                    if (account.role === 'teacher') await updateClassStats();
                } catch (err) {
                    alert(err.message);
                }
            });
        });
    }

    // Third card: students get their ID card w/ QR, teachers get their schedule
    if (account.role === 'student') {
        document.getElementById('schedule-card').classList.remove('hidden');
        await renderStudentIdCard(account, logs);
        // Show the student schedule card and populate with all teachers' schedules
        const studentSchedCard = document.getElementById('student-schedule-card');
        studentSchedCard.classList.remove('hidden');
        const allSchedules = await SchoolSyncDB.getSchedules();
        const studentSchedBody = document.getElementById('student-schedule-card-body');
        if (!allSchedules.length) {
            studentSchedBody.innerHTML = `<div class="schedule-empty-state"><i class="ph ph-calendar-blank"></i><p>No schedule posted yet.</p></div>`;
        } else {
            studentSchedBody.innerHTML = allSchedules.map(s => `
                <div class="schedule-row">
                    <span class="sched-day-badge">${s.dayOfWeek.slice(0, 3)}</span>
                    <div class="sched-info">
                        <div class="sched-subject">${s.subject}</div>
                        <div class="sched-meta">${formatTime(s.startTime)} – ${formatTime(s.endTime)}${s.room ? ` · ${s.room}` : ''}<span class="sched-teacher"> · ${s.teacherName}</span></div>
                    </div>
                </div>`).join('');
        }
    } else {
        document.getElementById('student-schedule-card').classList.add('hidden');
        const card = document.getElementById('schedule-card');
        card.classList.remove('hidden');
        const label = card.querySelector('.card-label span');
        if (label) label.textContent = 'Schedule';
        const labelIcon = card.querySelector('.card-label i');
        if (labelIcon) labelIcon.className = 'ph ph-calendar';
    }

    const teacherSection = document.getElementById('teacher-schedule-section');
    const classSection = document.getElementById('teacher-class-section');
    if (account.role === 'teacher') {
        teacherSection.classList.remove('hidden');
        classSection.classList.remove('hidden');
        const schedules = await SchoolSyncDB.getSchedules(account.id);
        renderScheduleCard(schedules);
        renderScheduleList(schedules, account.id);
        initScheduleForm(account);
        await renderClassView(account);
        initClassView(account);
    } else {
        teacherSection.classList.add('hidden');
        classSection.classList.add('hidden');
    }
}

let scheduleFormInitialized = false;
let classViewInitialized = false;

function getCutoffTime() {
    const raw = document.getElementById('cutoff-time').value || '08:00';
    const [h, m] = raw.split(':').map(Number);
    return { hour: h, minute: m };
}

function statusFromTime(timestamp) {
    const cutoff = getCutoffTime();
    const d = new Date(timestamp);
    const isLate = d.getHours() > cutoff.hour ||
        (d.getHours() === cutoff.hour && d.getMinutes() > cutoff.minute);
    return isLate ? 'Late' : 'Present';
}

function statusClass(status) {
    if (status === 'Present') return 'status-present';
    if (status === 'Late') return 'status-late';
    if (status === 'Absent') return 'status-absent';
    return 'status-none';
}

function statusIcon(status) {
    if (status === 'Present') return '<i class="ph-fill ph-check-circle"></i>';
    if (status === 'Late') return '<i class="ph-fill ph-clock"></i>';
    if (status === 'Absent') return '<i class="ph-fill ph-x-circle"></i>';
    return '<i class="ph ph-minus-circle"></i>';
}

async function renderClassView(account) {
    // Use the date picker value if set, otherwise today
    const picker = document.getElementById('class-date-picker');
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    if (picker && !picker.value) picker.value = todayStr;
    const selectedDate = (picker && picker.value) ? picker.value : todayStr;

    const [students, allLogs] = await Promise.all([
        SchoolSyncDB.getUsers(),
        SchoolSyncDB.getLogs()
    ]);

    // Filter logs for selected date
    const dateLogs = allLogs.filter(log => {
        const d = new Date(log.timestamp);
        const dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        return dStr === selectedDate;
    });

    const displayDate = new Date(selectedDate + 'T00:00:00');
    document.getElementById('class-today-date').textContent =
        displayDate.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const logMap = {};
    for (const log of dateLogs) {
        if (!logMap[log.userId] || new Date(log.timestamp) > new Date(logMap[log.userId].timestamp)) {
            logMap[log.userId] = log;
        }
    }

    const grid = document.getElementById('class-student-grid');
    const emptyState = document.getElementById('class-empty-state');
    emptyState.style.display = students.length ? 'none' : 'flex';

    grid.querySelectorAll('.class-student-card').forEach(c => c.remove());

    let countPresent = 0, countLate = 0, countAbsent = 0;

    students.forEach(student => {
        const log = logMap[student.id] || null;
        let displayStatus, logId, scanTime;

        if (log) {
            displayStatus = log.status;
            logId = log.id;
            scanTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            displayStatus = 'Absent';
            logId = null;
            scanTime = null;
        }

        if (displayStatus === 'Present') countPresent++;
        else if (displayStatus === 'Late') countLate++;
        else countAbsent++;

        const card = document.createElement('div');
        card.className = 'class-student-card';
        card.dataset.studentId = student.id;
        if (logId) card.dataset.logId = logId;

        const qrContainerId = `class-qr-${student.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

        const avatarStyle = student.profileImage
            ? `style="background-image:url('${student.profileImage}');background-size:cover;background-position:center;background-repeat:no-repeat;"`
            : '';
        const avatarText = student.profileImage ? '' : student.name.charAt(0).toUpperCase();

        card.innerHTML = `
            <div class="class-student-avatar" ${avatarStyle}>${avatarText}</div>
            <div class="class-student-name">${student.name}</div>
            <div class="class-student-id">${student.id}</div>
            <div class="class-student-qr" id="${qrContainerId}"></div>
            <div class="class-status-wrap">
                <span class="class-status-badge ${statusClass(displayStatus)}">
                    ${statusIcon(displayStatus)} ${displayStatus}
                </span>
                ${scanTime ? `<div class="class-status-time">Scanned at ${scanTime}</div>` : `<div class="class-status-time">Not yet scanned</div>`}
            </div>`;

        grid.appendChild(card);

        const selectedSubject = (document.getElementById('class-subject')?.value || '').trim();
        const scanUrl = selectedSubject
            ? `${window.location.origin}/scan.html?id=${encodeURIComponent(student.id)}&subject=${encodeURIComponent(selectedSubject)}`
            : `${window.location.origin}/scan.html?id=${encodeURIComponent(student.id)}`;
        setTimeout(() => {
            const qrEl = document.getElementById(qrContainerId);
            if (qrEl) {
                qrEl.innerHTML = '';
                new QRCode(qrEl, {
                    text: scanUrl,
                    width: 100,
                    height: 100,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        }, 50);
    });

    // Update stat chips
    document.getElementById('stat-class-present').textContent = countPresent;
    document.getElementById('stat-class-late').textContent = countLate;
    document.getElementById('stat-class-absent').textContent = countAbsent;
    document.getElementById('stat-class-total').textContent = students.length;

    // Bind status-select change handlers

    // Bind remove-student handlers

}

async function updateClassStats() {
    const todayLogs = await SchoolSyncDB.getTodayAttendance();
    const students = await SchoolSyncDB.getUsers();

    const logMap = {};
    for (const log of todayLogs) {
        if (!logMap[log.userId] || new Date(log.timestamp) > new Date(logMap[log.userId].timestamp)) {
            logMap[log.userId] = log;
        }
    }

    let present = 0, late = 0, absent = 0;
    students.forEach(s => {
        const status = logMap[s.id]?.status || 'Absent';
        if (status === 'Present') present++;
        else if (status === 'Late') late++;
        else absent++;
    });

    document.getElementById('stat-class-present').textContent = present;
    document.getElementById('stat-class-late').textContent = late;
    document.getElementById('stat-class-absent').textContent = absent;
    document.getElementById('stat-class-total').textContent = students.length;
}

function initClassView(account) {
    if (classViewInitialized) return;
    classViewInitialized = true;

    document.getElementById('refresh-class-btn').addEventListener('click', () => {
        renderClassView(account);
    });

    // Refresh when cutoff time changes so status badges recalculate
    document.getElementById('cutoff-time').addEventListener('change', () => {
        renderClassView(account);
    });

    // Refresh when date picker changes
    document.getElementById('class-date-picker').addEventListener('change', () => {
        renderClassView(account);
    });

    // Re-render QR codes when subject changes (embeds subject into scan URL)
    document.getElementById('class-subject').addEventListener('change', () => {
        renderClassView(account);
    });
}

function initScheduleForm(account) {
    if (scheduleFormInitialized) return;
    scheduleFormInitialized = true;

    const form = document.getElementById('schedule-form');
    const msg = document.getElementById('schedule-form-message');

    form.addEventListener('submit', async event => {
        event.preventDefault();
        msg.textContent = '';
        msg.classList.remove('error');

        const subject = document.getElementById('sched-subject').value.trim();
        const dayOfWeek = document.getElementById('sched-day').value;
        const startTime = document.getElementById('sched-start').value;
        const endTime = document.getElementById('sched-end').value;
        const room = document.getElementById('sched-room').value.trim();

        if (startTime >= endTime) {
            msg.textContent = 'End time must be after start time.';
            msg.classList.add('error');
            return;
        }

        try {
            await SchoolSyncDB.saveSchedule({
                teacherId: account.id,
                teacherName: account.name,
                subject,
                dayOfWeek,
                startTime,
                endTime,
                room
            });
            form.reset();
            const updated = await SchoolSyncDB.getSchedules(account.id);
            renderScheduleCard(updated);
            renderScheduleList(updated, account.id);
        } catch (err) {
            msg.textContent = err.message;
            msg.classList.add('error');
        }
    });
}

document.querySelectorAll('[data-open-auth]').forEach(button => button.addEventListener('click', () => openAuth(button.dataset.openAuth)));
document.querySelectorAll('[data-close-auth]').forEach(button => button.addEventListener('click', closeAuth));
document.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => setAuthMode(button.dataset.authTab)));
document.getElementById('admin-footer-link').addEventListener('click', event => {
    event.preventDefault();
    const currentSession = SchoolSyncDB.getSession();
    if (currentSession) {
        if (currentSession.role === 'admin') {
            window.location.href = '/client/admin/dashboard.html';
        } else if (currentSession.role === 'teacher') {
            window.location.hash = 'admin-login';
            openAuth('admin');
        } else {
            // student - should never see this button but block just in case
            alert('Admin access is restricted to admin and teacher accounts.');
        }
        return;
    }
    window.location.hash = 'admin-login';
    openAuth('admin');
});
goAdminButton.addEventListener('click', () => {
    if (!currentAccount || currentAccount.role !== 'admin') return;
    SchoolSyncDB.savePreviousSession(currentAccount);
    window.location.href = '/client/admin/dashboard.html';
});
profileTrigger.addEventListener('click', openProfile);
document.querySelectorAll('[data-close-profile]').forEach(button => button.addEventListener('click', closeProfile));
editProfileButton.addEventListener('click', () => {
    profileForm.classList.remove('hidden');
    editProfileButton.classList.add('hidden');
});
signupRole.addEventListener('change', updateStudentSignupFields);
updateStudentSignupFields();
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !authModal.classList.contains('hidden')) closeAuth(); });

signInForm.addEventListener('submit', async event => {
    event.preventDefault();
    const result = await SchoolSyncDB.authenticate(document.getElementById('signin-email').value.trim(), document.getElementById('signin-password').value);
    if (result.error) { showMessage(result.error); return; }
    if (adminLoginMode && result.account.role === 'student') {
        SchoolSyncDB.signOut();
        showMessage('Access denied. Only admin and teacher accounts can use this login.');
        return;
    }
    if (!adminLoginMode && result.account.role === 'admin') {
        SchoolSyncDB.signOut();
        showMessage('Use Admin access to sign in with an admin account.');
        return;
    }
    redirectForRole(result.account);
});

signUpForm.addEventListener('submit', async event => {
    event.preventDefault();
    const result = await SchoolSyncDB.register({
        name: document.getElementById('signup-name').value.trim(),
        email: document.getElementById('signup-email').value.trim(),
        password: document.getElementById('signup-password').value,
        role: signupRole.value,
        studentId: signupStudentId.value.trim(),
        department: signupDepartment.value,
        adviser: signupSection.value,
        year: signupYear.value,
        teacherId: signupTeacherId.value.trim(),
        teacherDepartment: signupTeacherDepartment.value
    });
    if (result.error) { showMessage(result.error); return; }
    const login = await SchoolSyncDB.authenticate(document.getElementById('signup-email').value.trim(), document.getElementById('signup-password').value);
    if (login.error) { showMessage(login.error); return; }
    redirectForRole(login.account);
});

profileImageInput.addEventListener('change', () => {
    const [file] = profileImageInput.files;
    if (!file) return;
    if (file.size > 1_800_000) {
        profileMessage.textContent = 'Please choose an image smaller than 1.8 MB.';
        profileMessage.classList.add('error');
        profileImageInput.value = '';
        return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
        profileImagePreview.textContent = '';
        profileImagePreview.style.backgroundImage = `url(${reader.result})`;
        profileImagePreview.dataset.image = reader.result;
    });
    reader.readAsDataURL(file);
});

profileForm.addEventListener('submit', async event => {
    event.preventDefault();
    const result = await SchoolSyncDB.updateProfile({
        id: currentAccount.id,
        name: document.getElementById('profile-edit-name').value.trim(),
        email: currentAccount.email,
        bio: document.getElementById('profile-edit-bio').value,
        profileImage: profileImagePreview.dataset.image || currentAccount.profileImage || '',
        profileVisibility: currentAccount.profileVisibility,
        showEmail: currentAccount.showEmail,
        currentPassword: '',
        newPassword: ''
    });
    if (result.error) {
        profileMessage.textContent = result.error;
        profileMessage.classList.add('error');
        return;
    }
    setHeaderAccount(result.account);
    const roleLabel = result.account.role.charAt(0).toUpperCase() + result.account.role.slice(1);
    document.getElementById('profile-summary-name').textContent = result.account.name;
    document.getElementById('profile-summary-role').textContent = roleLabel;
    const updatedStudentId = document.getElementById('profile-summary-student-id');
    updatedStudentId.textContent = result.account.role === 'student' && result.account.studentId ? `Student ID: ${result.account.studentId}` : '';
    updatedStudentId.classList.toggle('hidden', !updatedStudentId.textContent);
    document.getElementById('profile-summary-bio').textContent = result.account.bio || 'Add a short bio to tell your school community about you.';
    document.getElementById('profile-summary-contact').href = result.account.showEmail ? `mailto:${result.account.email}` : '#';
    document.getElementById('profile-summary-contact').textContent = result.account.showEmail ? result.account.email : 'Email hidden by privacy settings';
    setImagePreview(document.getElementById('profile-summary-avatar'), result.account);
    closeProfile();
});

openPrivacyButton.addEventListener('click', openPrivacy);
document.querySelectorAll('[data-close-privacy]').forEach(button => button.addEventListener('click', closePrivacy));
cancelProfileEdit.addEventListener('click', closeProfile);

privacyForm.addEventListener('submit', async event => {
    event.preventDefault();
    const newPassword = document.getElementById('privacy-new-password').value;
    const confirmPassword = document.getElementById('privacy-confirm-password').value;
    if (newPassword !== confirmPassword) {
        privacyMessage.textContent = 'The new password and confirmation do not match.';
        privacyMessage.classList.add('error');
        return;
    }
    const result = await SchoolSyncDB.updateProfile({
        id: currentAccount.id,
        name: currentAccount.name,
        email: document.getElementById('privacy-email').value.trim(),
        bio: currentAccount.bio || '',
        profileImage: currentAccount.profileImage || '',
        profileVisibility: document.getElementById('profile-visibility').value,
        showEmail: document.getElementById('show-email').checked,
        currentPassword: document.getElementById('privacy-current-password').value,
        newPassword
    });
    if (result.error) {
        privacyMessage.textContent = result.error;
        privacyMessage.classList.add('error');
        return;
    }
    setHeaderAccount(result.account);
    closePrivacy();
});

function signOut() {
    SchoolSyncDB.signOut();
    setHeaderAccount(null);
    scheduleFormInitialized = false;
    classViewInitialized = false;
    dashboardView.classList.add('hidden');
    publicView.classList.remove('hidden');
    window.location.hash = 'home';
    openAuth('signin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

headerLogout.addEventListener('click', signOut);

// ── Mobile hamburger menu ──────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileDrawer = document.getElementById('mobile-nav-drawer');
const mobileLogout = document.getElementById('mobile-logout');
let mobileOverlay = null;

function openMobileMenu() {
    mobileDrawer.classList.remove('hidden');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    hamburgerBtn.innerHTML = '<i class="ph ph-x"></i>';
    mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'mobile-nav-overlay';
    mobileOverlay.addEventListener('click', closeMobileMenu);
    document.body.appendChild(mobileOverlay);
    document.body.classList.add('modal-open');
}

function closeMobileMenu() {
    mobileDrawer.classList.add('hidden');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    hamburgerBtn.innerHTML = '<i class="ph ph-list"></i>';
    if (mobileOverlay) { mobileOverlay.remove(); mobileOverlay = null; }
    document.body.classList.remove('modal-open');
}

hamburgerBtn?.addEventListener('click', () => {
    if (mobileDrawer.classList.contains('hidden')) openMobileMenu();
    else closeMobileMenu();
});

mobileDrawer?.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('click', closeMobileMenu);
});


mobileLogout?.addEventListener('click', signOut);



// ── About nav link → dedicated page ──────────────────────────
document.getElementById('about-nav-link')?.addEventListener('click', e => {
    // Let the default href navigation happen (goes to about.html)
});

document.getElementById('refresh-dashboard-btn')?.addEventListener('click', async () => {
    if (currentAccount) await renderDashboard(currentAccount);
});

document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('theme-dark');
    localStorage.setItem('schoolsync_theme', isDark ? 'dark' : 'light');
});
if (localStorage.getItem('schoolsync_theme') === 'dark') document.body.classList.add('theme-dark');

const existingSession = SchoolSyncDB.getSession();
if (existingSession) {
    setHeaderAccount(existingSession);
}
if (existingSession && existingSession.role !== 'admin') {
    publicView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    renderDashboard(existingSession).catch(error => showMessage(error.message));
}
window.addEventListener('hashchange', () => {
    if (!SchoolSyncDB.getSession()) {
        if (window.location.hash === '#admin-login') openAuth('admin');
        else if (window.location.hash === '#login') openAuth('signin');
    }
});


if (!existingSession) {
    if (window.location.hash === '#admin-login') openAuth('admin');
    else if (window.location.hash === '#login') openAuth('signin');
}
