const currentSession = SchoolSyncDB.getSession();
if (!currentSession || (currentSession.role !== 'admin' && currentSession.role !== 'teacher')) {
    window.location.href = '../client.html';
}

function getProfileInitials(account) {
    return account.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'A';
}

document.getElementById('admin-profile-initials').textContent = getProfileInitials(currentSession);
document.getElementById('admin-profile-name').textContent = currentSession.name;
document.getElementById('admin-profile-role').textContent = currentSession.role;

// Show profile picture in the header immediately on load
// (setAdminHeaderAvatar is defined below — hoisted via function declaration not needed,
//  so we defer with a small inline helper here that mirrors the same logic)
{
    const _el = document.getElementById('admin-profile-initials');
    if (currentSession.profileImage) {
        _el.textContent = '';
        _el.style.backgroundImage = `url(${currentSession.profileImage})`;
    }
}

const adminProfileModal = document.getElementById('admin-profile-modal');
const adminProfileForm = document.getElementById('admin-profile-form');
const adminProfilePreview = document.getElementById('admin-profile-preview');
const adminProfileImage = document.getElementById('admin-profile-image');
const adminProfileMessage = document.getElementById('admin-profile-message');
const adminPrivacyModal = document.getElementById('admin-privacy-modal');
const adminPrivacyForm = document.getElementById('admin-privacy-form');
const adminPrivacyMessage = document.getElementById('admin-privacy-message');

function updateAdminProfileSummary() {
    document.getElementById('admin-profile-summary-name').textContent = currentSession.name;
    document.getElementById('admin-profile-summary-role').textContent = 'Administrator';
    document.getElementById('admin-profile-summary-bio').textContent = currentSession.bio || 'Add a short bio to tell your school community about you.';
    const contact = document.getElementById('admin-profile-summary-contact');
    contact.href = currentSession.showEmail ? `mailto:${currentSession.email}` : '#';
    contact.textContent = currentSession.showEmail ? currentSession.email : 'Email hidden by privacy settings';
}

function setAdminHeaderAvatar(account) {
    const el = document.getElementById('admin-profile-initials');
    if (!el) return;
    if (account.profileImage) {
        el.textContent = '';
        el.style.backgroundImage = `url(${account.profileImage})`;
    } else {
        el.textContent = getProfileInitials(account);
        el.style.backgroundImage = '';
    }
}

function setAdminProfileImage(account) {
    adminProfilePreview.textContent = account.profileImage ? '' : getProfileInitials(account);
    adminProfilePreview.style.backgroundImage = account.profileImage ? `url(${account.profileImage})` : '';
}

document.getElementById('admin-profile-trigger').addEventListener('click', () => {
    document.getElementById('admin-profile-edit-name').value = currentSession.name;
    document.getElementById('admin-profile-edit-bio').value = currentSession.bio || '';
    adminProfilePreview.dataset.image = currentSession.profileImage || '';
    setAdminProfileImage(currentSession);
    adminProfileMessage.textContent = '';
    updateAdminProfileSummary();
    adminProfileForm.classList.add('hidden');
    document.getElementById('admin-edit-profile').classList.remove('hidden');
    adminProfileModal.classList.remove('hidden');
});

document.getElementById('admin-edit-profile').addEventListener('click', () => {
    adminProfileForm.classList.remove('hidden');
    document.getElementById('admin-edit-profile').classList.add('hidden');
});

document.getElementById('admin-welcome').addEventListener('click', () => {
    const prev = SchoolSyncDB.popPreviousSession();
    if (prev && prev.role !== 'admin') {
        localStorage.setItem('schoolsync_session', JSON.stringify(prev));
        window.location.href = '/client/client.html';
    } else {
        window.location.href = '/client/client.html#home';
    }
});

document.getElementById('admin-cancel-profile').addEventListener('click', () => {
    adminProfileForm.reset();
    adminProfileForm.classList.add('hidden');
    document.getElementById('admin-edit-profile').classList.remove('hidden');
});

document.getElementById('admin-open-privacy').addEventListener('click', () => {
    document.getElementById('admin-profile-visibility').value = currentSession.profileVisibility || 'public';
    document.getElementById('admin-show-email').checked = currentSession.showEmail !== false;
    document.getElementById('admin-privacy-email').value = currentSession.email;
    document.getElementById('admin-current-password').value = '';
    document.getElementById('admin-new-password').value = '';
    document.getElementById('admin-confirm-password').value = '';
    adminPrivacyMessage.textContent = '';
    adminPrivacyModal.classList.remove('hidden');
});

document.querySelectorAll('[data-close-admin-privacy]').forEach(button => button.addEventListener('click', () => {
    adminPrivacyModal.classList.add('hidden');
    adminPrivacyForm.reset();
}));

document.querySelectorAll('[data-close-admin-profile]').forEach(button => button.addEventListener('click', () => {
    adminProfileModal.classList.add('hidden');
    adminProfileForm.reset();
    adminProfileImage.value = '';
    delete adminProfilePreview.dataset.image;
}));

adminProfileImage.addEventListener('change', () => {
    const [file] = adminProfileImage.files;
    if (!file) return;
    if (file.size > 1_800_000) {
        adminProfileMessage.textContent = 'Please choose an image smaller than 1.8 MB.';
        adminProfileImage.value = '';
        return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
        adminProfilePreview.textContent = '';
        adminProfilePreview.style.backgroundImage = `url(${reader.result})`;
        adminProfilePreview.dataset.image = reader.result;
    });
    reader.readAsDataURL(file);
});

adminProfileForm.addEventListener('submit', async event => {
    event.preventDefault();
    const result = await SchoolSyncDB.updateProfile({
        id: currentSession.id,
        name: document.getElementById('admin-profile-edit-name').value.trim(),
        email: currentSession.email,
        bio: document.getElementById('admin-profile-edit-bio').value,
        profileImage: adminProfilePreview.dataset.image || currentSession.profileImage || '',
        profileVisibility: currentSession.profileVisibility,
        showEmail: currentSession.showEmail,
        currentPassword: '',
        newPassword: ''
    });
    if (result.error) {
        adminProfileMessage.textContent = result.error;
        return;
    }
    Object.assign(currentSession, result.account);
    document.getElementById('admin-profile-name').textContent = currentSession.name;
    setAdminHeaderAvatar(currentSession);
    setAdminProfileImage(currentSession);
    updateAdminProfileSummary();
    adminProfileModal.classList.add('hidden');
});

adminPrivacyForm.addEventListener('submit', async event => {
    event.preventDefault();
    const newPassword = document.getElementById('admin-new-password').value;
    if (newPassword !== document.getElementById('admin-confirm-password').value) {
        adminPrivacyMessage.textContent = 'The new password and confirmation do not match.';
        return;
    }
    const result = await SchoolSyncDB.updateProfile({
        id: currentSession.id,
        name: currentSession.name,
        email: document.getElementById('admin-privacy-email').value.trim(),
        bio: currentSession.bio || '',
        profileImage: currentSession.profileImage || '',
        profileVisibility: document.getElementById('admin-profile-visibility').value,
        showEmail: document.getElementById('admin-show-email').checked,
        currentPassword: document.getElementById('admin-current-password').value,
        newPassword
    });
    if (result.error) {
        adminPrivacyMessage.textContent = result.error;
        return;
    }
    Object.assign(currentSession, result.account);
    document.getElementById('admin-profile-name').textContent = currentSession.name;
    setAdminHeaderAvatar(currentSession);
    adminPrivacyModal.classList.add('hidden');
});

document.getElementById('logout-btn').addEventListener('click', () => {
    const prev = SchoolSyncDB.popPreviousSession();
    SchoolSyncDB.signOut();
    if (prev && prev.role !== 'admin') {
        // Restore the previous non-admin session and go back to the client dashboard
        localStorage.setItem('schoolsync_session', JSON.stringify(prev));
        window.location.href = '../client.html';
    } else {
        window.location.href = '../client.html#login';
    }
});

const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
const views = document.querySelectorAll('.view');
const pageTitle = document.getElementById('page-title');
const currentTimeEl = document.getElementById('current-time');
let html5QrcodeScanner = null;
let lastScanTime = 0;

setInterval(() => {
    currentTimeEl.textContent = new Date().toLocaleTimeString();
}, 1000);

navItems.forEach(item => {
    item.addEventListener('click', async event => {
        event.preventDefault();
        navItems.forEach(nav => nav.classList.remove('active'));
        views.forEach(view => view.classList.remove('active'));
        // Set active on all items with same data-target (sidebar + bottom nav)
        const targetId = item.getAttribute('data-target');
        document.querySelectorAll(`[data-target="${targetId}"]`).forEach(el => el.classList.add('active'));
        document.getElementById(targetId).classList.add('active');
        pageTitle.textContent = item.getAttribute('data-title');

        if (targetId !== 'scanner-view' && html5QrcodeScanner) stopScanner();
        if (targetId === 'dashboard-view') await updateDashboard();
        if (targetId === 'logs-view') await updateLogsTable();
        if (targetId === 'students-view') await updateStudentsView();
        if (targetId === 'teachers-view') await updateTeachersView();
    });
});

async function updateDashboard() {
    const [users, logs, teachers] = await Promise.all([
        SchoolSyncDB.getUsers(),
        SchoolSyncDB.getLogs(),
        SchoolSyncDB.getTeachers()
    ]);

    const todayStr = new Date().toLocaleDateString();
    const todayLogs = logs.filter(log => new Date(log.timestamp).toLocaleDateString() === todayStr);

    // Unique latest log per student today
    const latestMap = {};
    for (const log of todayLogs) {
        if (!latestMap[log.userId] || new Date(log.timestamp) > new Date(latestMap[log.userId].timestamp)) {
            latestMap[log.userId] = log;
        }
    }
    const presentToday = Object.values(latestMap).filter(l => l.status === 'Present').length;
    const lateToday = Object.values(latestMap).filter(l => l.status === 'Late').length;
    const absentToday = users.length - presentToday - lateToday;

    document.getElementById('stat-present').textContent = presentToday;
    document.getElementById('stat-late').textContent = lateToday;
    document.getElementById('stat-absent').textContent = Math.max(0, absentToday);
    document.getElementById('stat-total').textContent = users.length;
    document.getElementById('stat-teachers').textContent = teachers.length;

    // Recent scans table
    const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const tbody = document.getElementById('recent-scans-body');
    const top8 = sortedLogs.slice(0, 8);
    tbody.innerHTML = top8.length ? top8.map(log => `
        <tr>
            <td>${log.userName}</td>
            <td>${log.userId}</td>
            <td class="hide-mobile">${log.grade || '-'}</td>
            <td class="hide-mobile">${log.section || '-'}</td>
            <td class="hide-mobile">${log.year || '-'}</td>
            <td>${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td><span class="status-badge ${(log.status||'present').toLowerCase()}">${log.status || 'Present'}</span></td>
        </tr>`).join('') : '<tr class="empty-row"><td colspan="7">No recent activity</td></tr>';

    // Overview: all students
    const studBody = document.getElementById('overview-students-body');
    document.getElementById('overview-students-count').textContent = `${users.length} student${users.length !== 1 ? 's' : ''}`;
    studBody.innerHTML = users.length ? users.map(u => `
        <tr><td>${u.name}</td><td>${u.id}</td><td>${u.grade || '-'}</td><td class="hide-mobile">${u.adviser || '-'}</td><td class="hide-mobile">${u.year || '-'}</td></tr>`
    ).join('') : '<tr class="empty-row"><td colspan="5">No students yet</td></tr>';

    // Overview: all teachers
    const teachBody = document.getElementById('overview-teachers-body');
    document.getElementById('overview-teachers-count').textContent = `${teachers.length} teacher${teachers.length !== 1 ? 's' : ''}`;
    teachBody.innerHTML = teachers.length ? teachers.map(t => `
        <tr><td>${t.name}</td><td>${t.id}</td><td>${t.department || '-'}</td></tr>`
    ).join('') : '<tr class="empty-row"><td colspan="3">No teachers yet</td></tr>';

    // Chart: last 7 days attendance
    renderAttendanceChart(logs);
}

let attendanceChart = null;
function renderAttendanceChart(logs) {
    const ctx = document.getElementById('attendance-chart');
    if (!ctx) return;
    const days = [];
    const presentData = [];
    const lateData = [];
    const absentData = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const dateStr = d.toLocaleDateString();
        days.push(label);

        const dayLogs = logs.filter(l => new Date(l.timestamp).toLocaleDateString() === dateStr);
        const latestMap = {};
        for (const log of dayLogs) {
            if (!latestMap[log.userId] || new Date(log.timestamp) > new Date(latestMap[log.userId].timestamp)) {
                latestMap[log.userId] = log;
            }
        }
        presentData.push(Object.values(latestMap).filter(l => l.status === 'Present').length);
        lateData.push(Object.values(latestMap).filter(l => l.status === 'Late').length);
        absentData.push(Object.values(latestMap).filter(l => l.status === 'Absent').length);
    }

    if (attendanceChart) attendanceChart.destroy();
    attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [
                { label: 'Present', data: presentData, backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 6 },
                { label: 'Late',    data: lateData,    backgroundColor: 'rgba(245,158,11,0.75)', borderRadius: 6 },
                { label: 'Absent',  data: absentData,  backgroundColor: 'rgba(239,68,68,0.75)',  borderRadius: 6 }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
            },
            scales: {
                x: { stacked: true, ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { stacked: true, ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
            }
        }
    });
}

function scanUrlFor(id) {
    return `${window.location.origin}/scan.html?id=${encodeURIComponent(id)}`;
}

function decodeScanId(decodedText) {
    const text = String(decodedText || '').trim();
    if (/^https?:\/\//i.test(text)) {
        try {
            return new URL(text).searchParams.get('id') || text;
        } catch (e) {
            return text;
        }
    }
    return text;
}

function downloadQrFrom(container, filename) {
    const canvas = container.querySelector('canvas');
    const img = container.querySelector('img');
    let dataUrl = '';
    if (canvas) dataUrl = canvas.toDataURL('image/png');
    else if (img && img.src) dataUrl = img.src;
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || 'qrcode.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

async function copyText(text, messageEl, okText) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e2) { }
        ta.remove();
    }
    if (messageEl) {
        messageEl.textContent = okText || 'Link copied to clipboard.';
        setTimeout(() => { if (messageEl) messageEl.textContent = ''; }, 2500);
    }
}

const registerForm = document.getElementById('register-form');
const barcodeOutputContainer = document.getElementById('barcode-output-container');
const qrcodeEl = document.getElementById('qrcode');
const barcodeEmptyState = document.getElementById('barcode-empty-state');
const barcodeActions = document.getElementById('barcode-actions');
const printBtn = document.getElementById('print-barcode-btn');
const downloadBtn = document.getElementById('download-barcode-btn');
const copyBtn = document.getElementById('copy-barcode-btn');
let lastRegisteredId = '';

registerForm.addEventListener('submit', async event => {
    event.preventDefault();
    const name = document.getElementById('user-name').value.trim();
    const id = document.getElementById('user-id').value.trim();
    const grade = document.getElementById('user-grade').value;
    const adviser = document.getElementById('user-adviser').value.trim();
    const year = document.getElementById('user-year').value;
    if (!grade) {
        alert('Please select a department.');
        return;
    }
    if (!year) {
        alert('Please select a year level.');
        return;
    }

    try {
        await SchoolSyncDB.saveUser({ name, id, grade, adviser, year });
    } catch (error) {
        alert(error.message);
        return;
    }

    barcodeEmptyState.classList.add('hidden');
    qrcodeEl.style.display = 'block';
    qrcodeEl.innerHTML = '';
    lastRegisteredId = id;
    new QRCode(qrcodeEl, {
        text: scanUrlFor(id),
        width: 150,
        height: 150,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    barcodeActions.classList.remove('hidden');
    alert('Student registered successfully! Share the QR code with the student.');
    registerForm.reset();
    if (document.getElementById('students-view').classList.contains('active')) await updateStudentsView();
    await updateDashboard();
});

downloadBtn.addEventListener('click', () => {
    downloadQrFrom(qrcodeEl, `qrcode-${lastRegisteredId || 'student'}.png`);
});

copyBtn.addEventListener('click', () => {
    copyText(scanUrlFor(lastRegisteredId), null, 'Link copied.');
    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg> Copied!';
    setTimeout(() => {
        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M216,32H88a8,8,0,0,0-8,8V72H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V88H160Zm40-48H176V80a8,8,0,0,0-8-8H96V48H200Z"/></svg> Copy link';
    }, 2000);
});

printBtn.addEventListener('click', () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>Print QR Code</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;">${barcodeOutputContainer.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
});

const startScanBtn = document.getElementById('start-scan-btn');
const stopScanBtn = document.getElementById('stop-scan-btn');
const scanResult = document.getElementById('scan-result');

async function onScanSuccess(decodedText) {
    const now = Date.now();
    if (now - lastScanTime < 3000) return;
    lastScanTime = now;

    const scannedId = decodeScanId(decodedText);
    const users = await SchoolSyncDB.getUsers();
    const user = users.find(item => item.id === scannedId);
    if (user) {
        await SchoolSyncDB.saveLog({ userId: user.id });
        scanResult.innerHTML = `<div class="scan-result-main"><i class="ph-fill ph-check-circle"></i><span>Recorded: <strong>${user.name}</strong></span></div><button class="btn primary-btn scan-details-btn" type="button">View details</button>`;
        scanResult.style.background = 'rgba(16, 185, 129, 0.12)';
        scanResult.style.borderColor = 'rgba(16, 185, 129, 0.45)';
        scanResult.style.color = 'var(--success)';
        const detailsBtn = scanResult.querySelector('.scan-details-btn');
        if (detailsBtn) detailsBtn.addEventListener('click', () => openStudentDetails(user.id));
    } else {
        scanResult.innerHTML = `<div class="scan-result-main"><i class="ph-fill ph-warning-circle"></i><span>Unknown ID: ${scannedId}</span></div>`;
        scanResult.style.background = 'rgba(239, 68, 68, 0.1)';
        scanResult.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        scanResult.style.color = 'var(--danger)';
    }
    scanResult.classList.remove('hidden');
    clearTimeout(scanResult._hideTimer);
    scanResult._hideTimer = setTimeout(() => scanResult.classList.add('hidden'), 8000);
}

function onScanFailure() { }

function stopScanner() {
    if (!html5QrcodeScanner) return;
    html5QrcodeScanner.stop().then(() => {
        startScanBtn.classList.remove('hidden');
        stopScanBtn.classList.add('hidden');
        html5QrcodeScanner = null;
    }).catch(error => console.error('Failed to stop scanner', error));
}

startScanBtn.addEventListener('click', () => {
    if (!html5QrcodeScanner) html5QrcodeScanner = new Html5Qrcode('reader');
    html5QrcodeScanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScanSuccess, onScanFailure)
        .then(() => {
            startScanBtn.classList.add('hidden');
            stopScanBtn.classList.remove('hidden');
        })
        .catch(error => {
            console.error('Error starting scanner', error);
            alert('Could not access the camera. Please ensure permissions are granted.');
        });
});
stopScanBtn.addEventListener('click', stopScanner);

const filterDateInput = document.getElementById('filter-date');
const clearLogsBtn = document.getElementById('clear-logs-btn');

async function updateLogsTable() {
    const logs = await SchoolSyncDB.getLogs();
    const filterDateStr = filterDateInput.value;
    const tbody = document.getElementById('full-logs-body');
    let filtered = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filterDateStr) {
        const [year, month, day] = filterDateStr.split('-');
        filtered = filtered.filter(log => {
            const date = new Date(log.timestamp);
            return date.getFullYear() == year && String(date.getMonth() + 1).padStart(2, '0') == month && String(date.getDate()).padStart(2, '0') == day;
        });
    }

    tbody.innerHTML = filtered.length ? filtered.map(log => {
        const date = new Date(log.timestamp);
        const statusClass = log.status === 'Present' ? 'present' : log.status === 'Late' ? 'late' : 'absent';
        return `<tr>
            <td>${date.toLocaleDateString()}</td>
            <td>${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${log.userId}</td>
            <td>${log.userName}</td>
            <td>${log.grade || '-'}</td>
            <td>${log.section || '-'}</td>
            <td>${log.year || '-'}</td>
            <td><span class="status-badge ${statusClass}">${log.status}</span></td>
        </tr>`;
    }).join('') : '<tr class="empty-row"><td colspan="8">No records found</td></tr>';
}

filterDateInput.addEventListener('change', updateLogsTable);

// ── Export to Excel ──
document.getElementById('export-logs-btn').addEventListener('click', async () => {
    const logs = await SchoolSyncDB.getLogs();
    const filterDateStr = filterDateInput.value;
    let filtered = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filterDateStr) {
        const [yr, mo, dy] = filterDateStr.split('-');
        filtered = filtered.filter(log => {
            const d = new Date(log.timestamp);
            return d.getFullYear() == yr
                && String(d.getMonth() + 1).padStart(2, '0') == mo
                && String(d.getDate()).padStart(2, '0') == dy;
        });
    }

    if (!filtered.length) {
        alert('No records to export.');
        return;
    }

    const rows = filtered.map(log => {
        const d = new Date(log.timestamp);
        return {
            Date: d.toLocaleDateString(),
            Time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            'Student ID': log.userId,
            Name: log.userName,
            Department: log.grade || '',
            Section: log.section || '',
            Year: log.year || '',
            Subject: log.subject || '',
            Status: log.status
        };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    const filename = filterDateStr
        ? `attendance-${filterDateStr}.xlsx`
        : `attendance-all-${new Date().toISOString().slice(0, 10)}.xlsx`;

    XLSX.writeFile(wb, filename);
});

clearLogsBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all attendance logs? This cannot be undone.')) return;
    await SchoolSyncDB.clearLogs();
    await updateLogsTable();
    alert('Logs cleared successfully.');
});

async function updateStudentsView() {
    const users = await SchoolSyncDB.getUsers();
    const grid = document.getElementById('students-grid');
    const empty = document.getElementById('students-empty-state');
    document.getElementById('students-count').textContent = `${users.length} student${users.length !== 1 ? 's' : ''} registered`;
    grid.querySelectorAll('.student-card').forEach(card => card.remove());
    empty.style.display = users.length ? 'none' : 'flex';

    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'student-card glass-panel';
        const qrId = `qr-${user.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
        card.innerHTML = `<div class="student-card-header"><div class="student-avatar">${user.name.charAt(0).toUpperCase()}</div><div class="student-meta"><h4 class="student-name">${user.name}</h4><span class="student-id-badge">${user.id}</span></div></div><div class="student-qr-wrapper"><div id="${qrId}"></div></div><div class="student-share-row"><button class="btn outline-btn student-share-btn" data-download="${user.id}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34A8,8,0,0,0,82.34,109.66Z"/></svg> Download</button><button class="btn outline-btn student-share-btn" data-copy="${user.id}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M216,32H88a8,8,0,0,0-8,8V72H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V88H160Zm40-48H176V80a8,8,0,0,0-8-8H96V48H200Z"/></svg> Copy link</button></div><div class="student-card-footer"><span class="student-grade">${user.grade}${user.adviser ? ' · ' + user.adviser : ''}${user.year ? ' · ' + user.year : ''}</span><div class="student-card-footer-btns"><button class="btn primary-btn student-details-open" data-details="${user.id}">Details</button><button class="btn danger-btn remove-btn" onclick="removeStudent('${user.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/></svg> Remove</button></div></div>`;
        grid.appendChild(card);
        new QRCode(document.getElementById(qrId), { text: scanUrlFor(user.id), width: 120, height: 120, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });

        const dl = card.querySelector('[data-download]');
        if (dl) dl.addEventListener('click', () => downloadQrFrom(document.getElementById(qrId), `qrcode-${user.id}.png`));
        const cp = card.querySelector('[data-copy]');
        if (cp) cp.addEventListener('click', () => {
            copyText(scanUrlFor(user.id));
            cp.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg> Copied!';
            setTimeout(() => { cp.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M216,32H88a8,8,0,0,0-8,8V72H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V88H160Zm40-48H176V80a8,8,0,0,0-8-8H96V48H200Z"/></svg> Copy link'; }, 2000);
        });
        const dt = card.querySelector('[data-details]');
        if (dt) dt.addEventListener('click', () => openStudentDetails(user.id));
    });
}

const studentDetailsModal = document.getElementById('student-details-modal');
const studentDetailsMessage = document.getElementById('student-details-message');
const studentDetailsQr = document.getElementById('student-details-qr');

async function openStudentDetails(userId) {
    const [users, logs] = await Promise.all([SchoolSyncDB.getUsers(), SchoolSyncDB.getLogs()]);
    const user = users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('student-details-avatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('student-details-name').textContent = user.name;
    document.getElementById('student-details-id').textContent = user.id;

    const todayStr = new Date().toLocaleDateString();
    const todayLogs = logs.filter(l => l.userId === userId && new Date(l.timestamp).toLocaleDateString() === todayStr)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const latest = todayLogs[0];

    const rows = [
        ['College / Department', user.grade || '-'],
        ['Section', user.adviser || '-'],
        ['Year Level', user.year || '-'],
        ['Today', latest ? latest.status : 'No scan yet'],
        ['Last scan', latest ? new Date(latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'],
        ['Subject', latest && latest.subject ? latest.subject : '-']
    ];
    document.getElementById('student-details-rows').innerHTML = rows.map(([k, v]) =>
        `<div class="student-details-row"><span>${k}</span><strong>${v}</strong></div>`).join('');

    studentDetailsQr.innerHTML = '';
    new QRCode(studentDetailsQr, { text: scanUrlFor(userId), width: 140, height: 140, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });

    const dl = document.getElementById('student-details-download');
    const cp = document.getElementById('student-details-copy');
    dl.onclick = () => downloadQrFrom(studentDetailsQr, `qrcode-${userId}.png`);
    cp.onclick = () => copyText(scanUrlFor(userId), studentDetailsMessage, 'Link copied to clipboard.');

    studentDetailsMessage.textContent = '';
    studentDetailsModal.classList.remove('hidden');
}

document.querySelectorAll('[data-close-student-details]').forEach(btn =>
    btn.addEventListener('click', () => studentDetailsModal.classList.add('hidden')));

async function removeStudent(userId) {
    const users = await SchoolSyncDB.getUsers();
    const user = users.find(item => item.id === userId);
    if (!user || !confirm(`Remove "${user.name}"? Their attendance logs will be kept.`)) return;
    await SchoolSyncDB.removeStudent(userId);
    await updateStudentsView();
    await updateDashboard();
}

const teacherForm = document.getElementById('teacher-form');
teacherForm.addEventListener('submit', async event => {
    event.preventDefault();
    try {
        await SchoolSyncDB.saveTeacher({
            id: document.getElementById('teacher-id').value.trim(),
            name: document.getElementById('teacher-name').value.trim(),
            department: document.getElementById('teacher-department').value
        });
        teacherForm.reset();
        await updateTeachersView();
        alert('Teacher registered successfully.');
    } catch (error) {
        alert(error.message);
    }
});

async function updateTeachersView() {
    const teachers = await SchoolSyncDB.getTeachers();
    const tbody = document.getElementById('teachers-body');
    document.getElementById('teachers-count').textContent = `${teachers.length} teacher${teachers.length !== 1 ? 's' : ''} registered`;
    tbody.innerHTML = teachers.length ? teachers.map(teacher => `<tr><td>${teacher.name}</td><td>${teacher.id}</td><td>${teacher.department}</td><td><button class="btn danger-btn remove-btn" data-remove-teacher="${teacher.id}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/></svg> Remove</button></td></tr>`).join('') : '<tr class="empty-row"><td colspan="4">No teachers registered yet</td></tr>';
    tbody.querySelectorAll('[data-remove-teacher]').forEach(button => button.addEventListener('click', () => removeTeacher(button.dataset.removeTeacher)));
}

async function removeTeacher(teacherId) {
    const teachers = await SchoolSyncDB.getTeachers();
    const teacher = teachers.find(item => item.id === teacherId);
    if (!teacher || !confirm(`Remove "${teacher.name}"?`)) return;
    await SchoolSyncDB.removeTeacher(teacherId);
    await updateTeachersView();
}

updateDashboard().catch(error => alert(error.message));
