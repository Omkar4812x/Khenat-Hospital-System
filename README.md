# 🏥 Khenat Hospital Management & Token Queue System

> **Full-stack healthcare management web system featuring online patient appointments, digital OPD token queue display, doctor administration portal, and Node.js backend.**

---

## ✨ Features

- 🏥 **Patient Portal & Appointment Booking** (`index.html`)
  - Patients can browse medical departments, book OPD appointments, select doctors, and view available time slots.

- 📺 **Live Digital Token Queue Display Board** (`khenat-hospital-token-display.html`)
  - Real-time OPD token status display for hospital waiting rooms, updating active tokens dynamically.

- 👨‍⚕️ **Doctor & Admin Management Console** (`admin.html`)
  - Doctor dashboard to manage appointments, issue OPD tokens, update patient medical logs, and manage hospital capacity.

- ⚙️ **Node.js Express Server & JSON DB** (`server.js`)
  - Lightweight REST API server providing patient booking, token queue management, and file-based data persistence (`khenat_hospital_db.json`).

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 (Flexbox/Grid, CSS Variables), PWA Manifest
- **Backend**: Node.js, Express.js, File-based JSON DB

---

## 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Omkar4812x/Khenat-Hospital-System.git
   cd Khenat-Hospital-System
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start Backend Server**:
   ```bash
   npm start
   ```

4. **Access Applications**:
   - Patient Portal: `http://localhost:3000`
   - Admin Console: `http://localhost:3000/admin.html`
   - Token Display Board: `http://localhost:3000/khenat-hospital-token-display.html`

---

## 📄 License

Distributed under the MIT License.
