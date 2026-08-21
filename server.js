/**
 * Khenat Hospital & Prastuti Gruha — JavaScript (Node.js) Backend API & Web Server
 * Runs with Zero External Dependencies using Node.js Native HTTP & FS Modules.
 * 
 * Usage: node server.js
 * Listens on: http://localhost:5000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'khenat_hospital_db.json');

// ---- DATABASE FILE STORAGE HELPER ----
function loadDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialData = { appointments: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file:", err);
    return { appointments: [] };
  }
}

function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}

function makeBookingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// MIME TYPES FOR STATIC FILES
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// HELPER TO PARSE JSON REQUEST BODY
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', err => reject(err));
  });
}

// HTTP SERVER CREATION
const server = http.createServer(async (req, res) => {
  // SET CORS & ENTERPRISE SECURITY HEADERS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HANDLE PREFLIGHT OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // ---- API ENDPOINTS ----

  // 1. GET /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, server: 'Node.js JS Backend' }));
    return;
  }

  // 2. GET /api/appointments
  if (pathname === '/api/appointments' && req.method === 'GET') {
    const db = loadDb();
    db.appointments.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ appointments: db.appointments }));
    return;
  }

  // 3. POST /api/appointments
  if (pathname === '/api/appointments' && req.method === 'POST') {
    try {
      const data = await getRequestBody(req);
      const name = (data.name || '').trim();
      const phone = (data.phone || '').trim();
      const email = (data.email || '').trim();
      const reason = (data.reason || '').trim();
      const preferredDate = (data.preferredDate || '').trim() || 'Not specified';

      if (!name || !phone || !reason) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'name, phone, and reason are required' }));
        return;
      }

      const db = loadDb();

      // Check slot conflict if date provided
      if (preferredDate !== 'Not specified') {
        const exists = db.appointments.some(a => a.preferredDate === preferredDate);
        if (exists) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'This date and time slot is already booked. Please choose another slot.' }));
          return;
        }
      }

      const newId = db.appointments.length > 0 ? Math.max(...db.appointments.map(a => a.id)) + 1 : 1;
      const bookingId = makeBookingId();

      const newAppointment = {
        id: newId,
        bookingId: bookingId,
        name: name,
        phone: phone,
        email: email,
        reason: reason,
        preferredDate: preferredDate,
        status: 'Pending',
        rxNotes: (data.rxNotes || '').trim(),
        submittedAt: new Date().toISOString()
      };

      db.appointments.unshift(newAppointment);
      saveDb(db);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newAppointment));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 4. PATCH /api/appointments/:id
  const patchMatch = pathname.match(/^\/api\/appointments\/(\d+)$/);
  if (patchMatch && req.method === 'PATCH') {
    try {
      const id = parseInt(patchMatch[1], 10);
      const data = await getRequestBody(req);
      const db = loadDb();
      const item = db.appointments.find(a => a.id === id);

      if (!item) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'appointment not found' }));
        return;
      }

      if (data.status) {
        const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
        if (validStatuses.includes(data.status)) {
          item.status = data.status;
        }
      }

      if (data.rxNotes !== undefined) {
        item.rxNotes = data.rxNotes.trim();
      }

      saveDb(db);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(item));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 5. DELETE /api/appointments/:id
  const deleteMatch = pathname.match(/^\/api\/appointments\/(\d+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    try {
      const id = parseInt(deleteMatch[1], 10);
      const db = loadDb();
      const index = db.appointments.findIndex(a => a.id === id);

      if (index === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'appointment not found' }));
        return;
      }

      db.appointments.splice(index, 1);
      saveDb(db);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id: id }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ---- STATIC FILE SERVER ----
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Security check to prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

// START NODE.JS SERVER WITH AUTO PORT FALLBACK
let currentPort = PORT;

function startServer(portToTry) {
  currentPort = portToTry;
  server.listen(portToTry, () => {
    console.log(`\n🏥 Khenat Hospital Node.js Backend Server Running!`);
    console.log(`👉 Patient Web Portal: http://localhost:${portToTry}/index.html`);
    console.log(`👉 Staff Admin Panel:  http://localhost:${portToTry}/admin.html`);
    console.log(`👉 Waiting Lounge TV:  http://localhost:${portToTry}/khenat-hospital-token-display.html`);
    console.log(`👉 Health Check Endpoint: http://localhost:${portToTry}/api/health\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️ Port ${currentPort} is busy. Trying fallback port ${currentPort + 1}...`);
    startServer(currentPort + 1);
  } else {
    console.error('Server error:', err);
  }
});

startServer(PORT);
