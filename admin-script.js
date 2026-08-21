const API_BASE = 'http://localhost:5000';
let allAppointments = [];
let currentQuickFilter = 'all';

function getLocalAppointments() {
  try {
    const raw = localStorage.getItem('khenat_hospital_appointments');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalAppointments(list) {
  try {
    localStorage.setItem('khenat_hospital_appointments', JSON.stringify(list));
  } catch (e) {
    console.error('Local storage save error:', e);
  }
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

function badgeClass(status) {
  return {
    'Pending': 'badge-pending',
    'Confirmed': 'badge-confirmed',
    'Cancelled': 'badge-cancelled',
    'Completed': 'badge-completed'
  }[status] || 'badge-pending';
}

function renderStats(list) {
  const today = new Date().toDateString();
  const elTotal = document.getElementById('statTotal');
  const elPending = document.getElementById('statPending');
  const elConfirmed = document.getElementById('statConfirmed');
  const elToday = document.getElementById('statToday');
  const elKhenat = document.getElementById('statKhenat');
  const elKabir = document.getElementById('statKabir');

  if (elTotal) elTotal.textContent = list.length;
  if (elPending) elPending.textContent = list.filter(a => a.status === 'Pending').length;
  if (elConfirmed) elConfirmed.textContent = list.filter(a => a.status === 'Confirmed').length;
  if (elToday) elToday.textContent = list.filter(a => new Date(a.submittedAt).toDateString() === today).length;
  if (elKhenat) elKhenat.textContent = list.filter(a => (a.reason || '').includes('Narendra') || (a.reason || '').includes('General')).length;
  if (elKabir) elKabir.textContent = list.filter(a => (a.reason || '').includes('Kabir') || (a.reason || '').includes('Wound')).length;
}

function setQuickFilter(type, btnEl) {
  currentQuickFilter = type;
  document.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  render();
}

function clearAllFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterDoctor').value = 'all';
  document.getElementById('filterShift').value = 'all';
  document.getElementById('filterDate').value = '';
  currentQuickFilter = 'all';
  document.querySelectorAll('.pill-tab').forEach(b => b.classList.remove('active'));
  const firstTab = document.querySelector('.pill-tab');
  if (firstTab) firstTab.classList.add('active');
  render();
}

function render() {
  const searchInput = document.getElementById('searchInput');
  const filterDoctor = document.getElementById('filterDoctor');
  const filterShift = document.getElementById('filterShift');
  const filterDate = document.getElementById('filterDate');

  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const docFilter = filterDoctor ? filterDoctor.value : 'all';
  const shiftFilter = filterShift ? filterShift.value : 'all';
  const datePicker = filterDate ? filterDate.value : '';
  const todayStr = new Date().toDateString();

  const filtered = allAppointments.filter(a => {
    const matchSearch = !search || 
      (a.name || '').toLowerCase().includes(search) || 
      (a.phone || '').includes(search) || 
      (a.email || '').toLowerCase().includes(search) || 
      (a.bookingId || '').toLowerCase().includes(search) || 
      (a.reason || '').toLowerCase().includes(search) ||
      (a.status || '').toLowerCase().includes(search);

    const matchDoc = docFilter === 'all' || (a.reason || '').toLowerCase().includes(docFilter.toLowerCase());

    let matchShift = true;
    if (shiftFilter === 'emergency') {
      matchShift = (a.reason || '').toLowerCase().includes('emergency');
    } else if (shiftFilter === 'morning' || shiftFilter === 'evening') {
      const slotHour = new Date(a.preferredDate || a.submittedAt).getHours();
      if (shiftFilter === 'morning') matchShift = slotHour >= 8 && slotHour <= 14;
      if (shiftFilter === 'evening') matchShift = slotHour >= 16 && slotHour <= 22;
    }

    let matchDate = true;
    if (datePicker) {
      const slotDate = new Date(a.preferredDate || a.submittedAt).toISOString().slice(0, 10);
      matchDate = slotDate === datePicker;
    }

    let matchQuick = true;
    if (currentQuickFilter === 'today') {
      matchQuick = new Date(a.submittedAt).toDateString() === todayStr || (a.preferredDate && new Date(a.preferredDate).toDateString() === todayStr);
    } else if (currentQuickFilter !== 'all') {
      matchQuick = a.status === currentQuickFilter;
    }

    return matchSearch && matchDoc && matchShift && matchDate && matchQuick;
  }).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  renderStats(allAppointments);
  const content = document.getElementById('content');

  if (!content) return;

  if (filtered.length === 0) {
    content.innerHTML = `<div class="state-empty"><strong>No matching patient appointments found</strong>Try clearing filters or clicking 'Reset Filters'.</div>`;
    return;
  }

  const rows = filtered.map(a => `
    <tr>
      <td class="id-badge">#${a.bookingId || String(a.id).padStart(6, '0')}</td>
      <td>
        <div class="patient-title">${escapeHtml(a.name)}</div>
        <div class="patient-phone-sub">📞 ${escapeHtml(a.phone)}</div>
        <div class="patient-email-sub">📧 ${escapeHtml(a.email || 'N/A')}</div>
      </td>
      <td>
        <span class="reason-pill">${escapeHtml(a.reason)}</span>
        ${a.rxNotes ? `<div style="font-size:0.78rem;color:#8b5cf6;margin-top:4px;">💊 Rx: ${escapeHtml(a.rxNotes.slice(0, 30))}…</div>` : ''}
      </td>
      <td class="slot-display">${escapeHtml(a.preferredDate || 'Not specified')}</td>
      <td><span class="status-badge ${badgeClass(a.status)}">${a.status}</span></td>
      <td><div>${new Date(a.submittedAt).toLocaleString()}</div><div style="font-size:0.78rem;color:var(--text-soft);">${timeAgo(a.submittedAt)}</div></td>
      <td>
        <div class="table-actions-cell">
          ${a.status !== 'Confirmed' ? `<button class="btn-act btn-act-confirm" onclick="updateStatus(${a.id},'Confirmed')">✓ Confirm</button>` : ''}
          ${a.status !== 'Completed' ? `<button class="btn-act btn-act-complete" onclick="updateStatus(${a.id},'Completed')">💙 Complete</button>` : ''}
          ${a.status !== 'Cancelled' ? `<button class="btn-act btn-act-cancel" onclick="updateStatus(${a.id},'Cancelled')">✕ Cancel</button>` : ''}
          <button class="btn-act btn-act-rx" onclick="openRxModal(${a.id})">💊 Rx Notes</button>
          <button class="btn-act btn-act-email" onclick="sendEmailToPatient(${a.id})">✉️ Email Patient</button>
          <button class="btn-act btn-act-print" onclick="openSlip(${a.id})">🖨️ Slip</button>
          <button class="btn-act btn-act-delete" onclick="deleteAppointment(${a.id})">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  content.innerHTML = `
    <div class="table-card">
      <table class="opd-table">
        <thead><tr>
          <th>Booking ID</th><th>Patient Information</th><th>Specialty / Doctor</th><th>Requested Slot</th><th>Status</th><th>Submitted</th><th>Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function openSlip(id) {
  const item = allAppointments.find(a => a.id === id);
  if (!item) return;
  const body = document.getElementById('receiptBody');
  body.innerHTML = `
    <div class="receipt-row"><label>Booking Token:</label><span>#${item.bookingId || item.id}</span></div>
    <div class="receipt-row"><label>Patient Name:</label><span>${escapeHtml(item.name)}</span></div>
    <div class="receipt-row"><label>Contact Phone:</label><span>${escapeHtml(item.phone)}</span></div>
    <div class="receipt-row"><label>Patient Email:</label><span>${escapeHtml(item.email || 'N/A')}</span></div>
    <div class="receipt-row"><label>Consultation / Doctor:</label><span>${escapeHtml(item.reason)}</span></div>
    <div class="receipt-row"><label>Appointed Slot:</label><span>${escapeHtml(item.preferredDate)}</span></div>
    <div class="receipt-row"><label>Status:</label><span>${item.status}</span></div>
    ${item.rxNotes ? `<div class="receipt-row" style="flex-direction:column;gap:4px;"><label>Doctor Prescription Notes:</label><span style="white-space:pre-wrap;font-weight:normal;color:#0284c7;background:#e0f2fe;padding:8px;border-radius:6px;">${escapeHtml(item.rxNotes)}</span></div>` : ''}
    <div class="receipt-row"><label>Date Requested:</label><span>${new Date(item.submittedAt).toLocaleString()}</span></div>
  `;
  document.getElementById('receiptModal').classList.add('open');
}

function closeModal() {
  document.getElementById('receiptModal').classList.remove('open');
}

function openRxModal(id) {
  const item = allAppointments.find(a => a.id === id);
  if (!item) return;
  document.getElementById('rxAppId').value = id;
  document.getElementById('rxInputNotes').value = item.rxNotes || '';
  document.getElementById('rxModalSub').textContent = `Patient: ${item.name} | Token #${item.bookingId || item.id}`;
  document.getElementById('rxModal').classList.add('open');
}

function closeRxModal() {
  document.getElementById('rxModal').classList.remove('open');
}

async function saveRxNotes() {
  const id = document.getElementById('rxAppId').value;
  const rxNotes = document.getElementById('rxInputNotes').value;

  try {
    const res = await fetch(API_BASE + '/api/appointments/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rxNotes })
    });
    if (!res.ok) throw new Error('Server error');
  } catch (err) {
    const item = allAppointments.find(a => a.id == id);
    if (item) item.rxNotes = rxNotes;
    saveLocalAppointments(allAppointments);
  }

  closeRxModal();
  await loadAppointments();
}

function openWalkinModal() {
  const walkinDate = document.getElementById('walkinDate');
  if (walkinDate) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    walkinDate.min = now.toISOString().slice(0, 16);
    walkinDate.value = now.toISOString().slice(0, 16);
  }
  document.getElementById('walkinModal').classList.add('open');
}

function closeWalkinModal() {
  document.getElementById('walkinModal').classList.remove('open');
}

async function handleWalkinSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('walkinName').value.trim();
  const phone = document.getElementById('walkinPhone').value.trim();
  const email = document.getElementById('walkinEmail').value.trim();
  const reason = document.getElementById('walkinReason').value;
  const preferredDate = document.getElementById('walkinDate').value;

  let token = 'W' + Math.floor(100000 + Math.random() * 900000);

  try {
    const res = await fetch(API_BASE + '/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, reason, preferredDate })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed');
    token = data.bookingId || token;
  } catch (err) {
    const newItem = {
      id: Date.now(),
      bookingId: token,
      name, phone, email, reason, preferredDate,
      status: 'Confirmed',
      submittedAt: new Date().toISOString()
    };
    allAppointments.unshift(newItem);
    saveLocalAppointments(allAppointments);
  }

  alert(`✓ Walk-in Patient Registered Successfully!\n\nBooking Token: #${token}`);
  closeWalkinModal();
  document.getElementById('walkinForm').reset();
  await loadAppointments();
}

async function deleteAppointment(id) {
  if (!confirm('Are you sure you want to delete this patient record?')) return;
  try {
    const res = await fetch(API_BASE + '/api/appointments/' + id, { method: 'DELETE' });
  } catch (err) {
    allAppointments = allAppointments.filter(a => a.id != id);
    saveLocalAppointments(allAppointments);
  }
  await loadAppointments();
}

function sendEmailToPatient(id) {
  const item = allAppointments.find(a => a.id === id);
  if (!item) return;

  const recipient = item.email || '';
  if (!recipient || recipient === 'N/A') {
    alert('No email address was provided for this patient booking.');
    return;
  }

  const subject = `Appointment Confirmation — Khenat Hospital & Prastuti Gruha [Token #${item.bookingId || item.id}]`;
  const body = 
`Dear ${item.name},

Your OPD appointment request has been confirmed at Khenat Hospital & Prastuti Gruha.

---------------------------------------------------------
BOOKING DETAILS & SCHEDULE
---------------------------------------------------------
Booking Token: #${item.bookingId || item.id}
Patient Name: ${item.name}
Phone: ${item.phone}
Department / Doctor: ${item.reason}
Scheduled Slot: ${item.preferredDate}
Status: ${item.status}
${item.rxNotes ? `\nDoctor Prescription Notes:\n${item.rxNotes}\n` : ''}
---------------------------------------------------------
HOSPITAL LOCATION & 24/7 HELPLINE
---------------------------------------------------------
Location: Sai Housing Society, Near State Bank Colony, Karve Nagar Rd, Karvenagar, Pune 411052
24/7 Helpline: (020) 25448451 | +91-9823425152

Thank you for choosing Khenat Hospital & Prastuti Gruha.

Sent from Official Hospital Desk: thisisomkarbhandalkar@gmail.com`;

  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoUrl, '_blank');
}

async function updateStatus(id, status) {
  try {
    const res = await fetch(API_BASE + '/api/appointments/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Server error');
  } catch (err) {
    const item = allAppointments.find(a => a.id == id);
    if (item) item.status = status;
    saveLocalAppointments(allAppointments);
  }
  await loadAppointments();
}

async function loadAppointments() {
  const content = document.getElementById('content');
  if (content) content.innerHTML = '<div class="state-loading">Loading live OPD schedule…</div>';

  try {
    const res = await fetch(API_BASE + '/api/appointments');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    allAppointments = data.appointments || [];
    saveLocalAppointments(allAppointments);
  } catch (err) {
    console.warn('Flask API unreachable, loading local storage cache:', err.message);
    allAppointments = getLocalAppointments();
  }
  render();
}

let pollInterval = null;
function toggleAutoPoll(enable) {
  if (pollInterval) clearInterval(pollInterval);
  if (enable) {
    pollInterval = setInterval(loadAppointments, 15000);
  }
}

function exportToCSV() {
  if (!allAppointments || allAppointments.length === 0) {
    alert("No patient appointment records to export.");
    return;
  }

  const headers = ["Booking ID", "Patient Name", "Phone", "Email", "Reason / Doctor", "Scheduled Slot", "Status", "Rx Notes", "Submitted At"];
  const rows = allAppointments.map(a => [
    `"${a.bookingId || a.id}"`,
    `"${(a.name || '').replace(/"/g, '""')}"`,
    `"${a.phone || ''}"`,
    `"${a.email || ''}"`,
    `"${(a.reason || '').replace(/"/g, '""')}"`,
    `"${a.preferredDate || ''}"`,
    `"${a.status || ''}"`,
    `"${(a.rxNotes || '').replace(/"/g, '""')}"`,
    `"${a.submittedAt || ''}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `khenat_hospital_opd_queue_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const refreshBtn = document.getElementById('refreshBtn');
const filterStatus = document.getElementById('filterStatus');
const filterDoctor = document.getElementById('filterDoctor');
const filterShift = document.getElementById('filterShift');
const filterDate = document.getElementById('filterDate');
const searchInput = document.getElementById('searchInput');

if (refreshBtn) refreshBtn.addEventListener('click', loadAppointments);
if (filterStatus) filterStatus.addEventListener('change', render);
if (filterDoctor) filterDoctor.addEventListener('change', render);
if (filterShift) filterShift.addEventListener('change', render);
if (filterDate) filterDate.addEventListener('change', render);
if (searchInput) searchInput.addEventListener('input', render);

loadAppointments();
toggleAutoPoll(true);
