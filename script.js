const API_BASE = "http://localhost:5000";
let cachedBookedSlots = [];

// Fallback Local Storage Data Sync for Live Static Hosting
function getLocalAppointments() {
  try {
    const raw = localStorage.getItem("khenat_hospital_appointments");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalAppointment(appointment) {
  try {
    const list = getLocalAppointments();
    list.unshift(appointment);
    localStorage.setItem("khenat_hospital_appointments", JSON.stringify(list));
  } catch (e) {
    console.error("Local storage save error:", e);
  }
}

function makeRandomToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Mobile Menu Toggle
const mobileToggle = document.getElementById("mobileToggle");
const mobileMenu = document.getElementById("mobileMenu");
if (mobileToggle && mobileMenu) {
  mobileToggle.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
  });
}

// Gallery Category Filter
function filterGallery(category) {
  const tabs = document.querySelectorAll(".gallery-tabs .tab-btn");
  tabs.forEach((tab) => {
    tab.classList.remove("active");
    if (tab.getAttribute("onclick").includes(`'${category}'`)) {
      tab.classList.add("active");
    }
  });

  const cards = document.querySelectorAll(".gallery-card");
  cards.forEach((card) => {
    const cardCat = card.getAttribute("data-cat");
    if (category === "all" || cardCat === category) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

// Gallery Lightbox Modal
function openLightbox(src, title, desc) {
  const modal = document.getElementById("lightboxModal");
  const img = document.getElementById("lightboxImg");
  const titleEl = document.getElementById("lightboxTitle");
  const descEl = document.getElementById("lightboxDesc");

  img.src = src;
  titleEl.textContent = title;
  descEl.textContent = desc;
  modal.classList.add("open");
}

function closeLightbox() {
  document.getElementById("lightboxModal").classList.remove("open");
}

// FAQ Accordion Toggle
document.querySelectorAll(".faq-question").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.parentElement;
    item.classList.toggle("open");
  });
});

// Pre-fill doctor choice
function selectDoctor(docName) {
  const select = document.getElementById("consultReason");
  if (!select) return;
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value.includes(docName)) {
      select.selectedIndex = i;
      break;
    }
  }
}

// Datetime input minimum configuration
const preferredDateInput = document.getElementById("preferredDate");
if (preferredDateInput) {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  preferredDateInput.min = now.toISOString().slice(0, 16);
}

// LOAD & DISPLAY ALREADY BOOKED TIME SLOTS
async function loadBookedSlots() {
  const listEl = document.getElementById("bookedSlotsList");
  if (!listEl) return;

  listEl.innerHTML = '<span style="color:#64748b;">Loading booked slots...</span>';

  let appointments = [];
  try {
    const res = await fetch(API_BASE + "/api/appointments");
    if (res.ok) {
      const data = await res.json();
      appointments = data.appointments || [];
    } else {
      appointments = getLocalAppointments();
    }
  } catch (err) {
    appointments = getLocalAppointments();
  }

  cachedBookedSlots = appointments
    .map(a => a.preferredDate ? a.preferredDate.trim() : "")
    .filter(d => d && d !== "Not specified");

  if (cachedBookedSlots.length === 0) {
    listEl.innerHTML = '<span style="color:#059669;font-weight:normal;">No slots booked yet. All time slots are open!</span>';
    return;
  }

  // Render unique booked slot badges
  const uniqueSlots = Array.from(new Set(cachedBookedSlots));
  listEl.innerHTML = uniqueSlots.map(slot => `
    <span style="background:#ffe4e6;border:1px solid #fca5a5;padding:3px 9px;border-radius:6px;font-size:0.76rem;" title="Already Booked Slot">
      ⏰ ${escapeHtml(slot)}
    </span>
  `).join('');

  checkSlotAvailability();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// REAL-TIME SLOT AVAILABILITY CHECKER
function checkSlotAvailability() {
  const input = document.getElementById("preferredDate");
  const notice = document.getElementById("slotNotice");
  if (!input || !notice) return;

  const val = input.value.trim();
  if (!val) {
    notice.style.display = "none";
    input.style.borderColor = "#cbd5e1";
    return;
  }

  // Normalize selected value for comparison
  const formattedVal = val.replace("T", " ");

  const isBooked = cachedBookedSlots.some(slot => {
    return slot === val || slot === formattedVal || slot.startsWith(formattedVal) || formattedVal.startsWith(slot);
  });

  if (isBooked) {
    notice.style.display = "block";
    notice.style.color = "#dc2626";
    notice.innerHTML = `❌ Slot "${formattedVal}" is ALREADY BOOKED by another patient! Please choose a different time slot.`;
    input.style.borderColor = "#dc2626";
    input.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.2)";
  } else {
    notice.style.display = "block";
    notice.style.color = "#059669";
    notice.innerHTML = `✓ Slot "${formattedVal}" is AVAILABLE!`;
    input.style.borderColor = "#059669";
    input.style.boxShadow = "0 0 0 3px rgba(5, 150, 105, 0.2)";
  }
}

// Appointment Form Submission
const aptForm = document.getElementById("aptForm");
if (aptForm) {
  const errorSummary = document.getElementById("errorSummary");
  const errorList = document.getElementById("errorList");
  const submitBtn = document.getElementById("submitBtn");

  aptForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorSummary) errorSummary.style.display = "none";
    if (errorList) errorList.innerHTML = "";

    const name = document.getElementById("patientName").value.trim();
    const phone = document.getElementById("patientPhone").value.trim();
    const email = document.getElementById("patientEmail").value.trim();
    const reason = document.getElementById("consultReason").value;
    const date = document.getElementById("preferredDate").value.trim();
    const formattedDate = date.replace("T", " ");

    const errors = [];
    if (!name) errors.push("Patient name is required.");
    if (!phone || !/^[0-9]{10}$/.test(phone)) errors.push("Please enter a valid 10-digit mobile number.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Please enter a valid email address.");
    if (!reason) errors.push("Please select a medical specialty / reason.");
    if (!date) errors.push("Please select a preferred date and time.");

    // Check duplicate slot client-side
    const isAlreadyBooked = cachedBookedSlots.some(slot => {
      return slot === date || slot === formattedDate || slot.startsWith(formattedDate) || formattedDate.startsWith(slot);
    });

    if (isAlreadyBooked) {
      errors.push(`⚠️ Slot "${formattedDate}" is ALREADY BOOKED by another patient. Please choose a different date or time slot.`);
    }

    if (errors.length > 0) {
      if (errorSummary && errorList) {
        errorSummary.style.display = "block";
        errors.forEach(err => {
          const li = document.createElement("li");
          li.textContent = err;
          errorList.appendChild(li);
        });
        errorSummary.focus();
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Booking & Dispatching Confirmation...";
    }

    let bookingToken = makeRandomToken();

    try {
      const res = await fetch(API_BASE + "/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, reason, preferredDate: formattedDate })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "This date/time slot is unavailable. Please select another slot.");
      }
      bookingToken = data.bookingId || bookingToken;

      // SUCCESS: Open confirmation modal
      openSuccessModal({
        bookingId: bookingToken,
        name: name,
        email: email,
        reason: reason,
        preferredDate: formattedDate
      });
      aptForm.reset();
      document.getElementById("slotNotice").style.display = "none";
      await loadBookedSlots();

    } catch (err) {
      console.warn("Booking error:", err.message);
      if (errorSummary && errorList) {
        errorSummary.style.display = "block";
        const li = document.createElement("li");
        li.textContent = err.message;
        errorList.appendChild(li);
        errorSummary.focus();
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm OPD Appointment";
      }
    }
  });
}

function openSuccessModal(data) {
  const emailEl = document.getElementById("modalPatientEmail");
  const tokenEl = document.getElementById("modalBookingId");
  const nameEl = document.getElementById("modalPatientName");
  const reasonEl = document.getElementById("modalReason");
  const dateEl = document.getElementById("modalDate");
  const modal = document.getElementById("bookingSuccessModal");

  if (emailEl) emailEl.textContent = data.email || "patient@example.com";
  if (tokenEl) tokenEl.textContent = "#" + (data.bookingId || "TOKEN");
  if (nameEl) nameEl.textContent = data.name || "";
  if (reasonEl) reasonEl.textContent = data.reason || "";
  if (dateEl) dateEl.textContent = data.preferredDate || "";
  if (modal) modal.classList.add("open");
}

function closeSuccessModal() {
  const modal = document.getElementById("bookingSuccessModal");
  if (modal) modal.classList.remove("open");
}

function openLookupModal() {
  const modal = document.getElementById("lookupModal");
  const res = document.getElementById("lookupResult");
  const query = document.getElementById("lookupQuery");

  if (modal) modal.style.display = "flex";
  if (res) res.innerHTML = "";
  if (query) query.value = "";
}

function closeLookupModal() {
  const modal = document.getElementById("lookupModal");
  if (modal) modal.style.display = "none";
}

async function performStatusLookup() {
  const query = document.getElementById("lookupQuery").value.trim().toLowerCase();
  const resultContainer = document.getElementById("lookupResult");
  if (!query) {
    resultContainer.innerHTML = '<div style="color:#dc2626;font-size:0.88rem;">Please enter a Booking Token ID or Phone Number.</div>';
    return;
  }

  resultContainer.innerHTML = '<div style="color:#64748b;font-size:0.88rem;">Searching hospital records...</div>';

  let appointments = [];

  try {
    const res = await fetch(API_BASE + "/api/appointments");
    if (res.ok) {
      const data = await res.json();
      appointments = data.appointments || [];
    } else {
      appointments = getLocalAppointments();
    }
  } catch (err) {
    appointments = getLocalAppointments();
  }

  const match = appointments.find(a => 
    (a.bookingId || '').toLowerCase() === query || 
    (a.phone || '').includes(query)
  );

  if (match) {
    let statusColor = "#d97706";
    if (match.status === "Confirmed") statusColor = "#059669";
    if (match.status === "Completed") statusColor = "#2563eb";
    if (match.status === "Cancelled") statusColor = "#dc2626";

    resultContainer.innerHTML = `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:12px;font-size:0.9rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="color:#0c4a6e;font-family:'JetBrains Mono',monospace;">Token #${match.bookingId || match.id}</strong>
          <span style="background:${statusColor};color:#ffffff;font-size:0.75rem;font-weight:700;padding:3px 10px;border-radius:9999px;">${match.status}</span>
        </div>
        <div><strong>Patient:</strong> ${escapeHtml(match.name)}</div>
        <div><strong>Department / Doctor:</strong> ${escapeHtml(match.reason)}</div>
        <div><strong>Scheduled Slot:</strong> ${escapeHtml(match.preferredDate)}</div>
        ${match.rxNotes ? `<div style="margin-top:8px;padding:8px;background:#e0f2fe;color:#0284c7;border-radius:6px;font-size:0.85rem;"><strong>Doctor Notes:</strong> ${escapeHtml(match.rxNotes)}</div>` : ''}
      </div>
    `;
  } else {
    resultContainer.innerHTML = '<div style="color:#dc2626;font-size:0.88rem;">No appointment found with that Token ID or Phone number.</div>';
  }
}

// Initial Load of Booked Slots
loadBookedSlots();
