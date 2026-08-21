# Khenat Hospital — Local Booking Backend

Real appointment storage using your local MySQL, so bookings made on the
landing page actually show up on the admin dashboard.

## 1. Create the database

Open MySQL (Workbench, phpMyAdmin, or terminal) and run everything inside
`schema.sql`. Easiest via terminal:

```bash
mysql -u root -p < schema.sql
```

This creates a `khenat_hospital` database with one `appointments` table.

## 2. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

## 3. Set your MySQL password

Open `app.py` and edit this block near the top with your local MySQL
username/password:

```python
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",   # <-- your MySQL password goes here
    "database": "khenat_hospital",
}
```

## 4. Run the server

```bash
python app.py
```

You should see it running at `http://localhost:5000`. Leave this terminal
open — it needs to keep running while you use the website.

## 5. Open the website

Just double-click `khenat-hospital-landing.html` to open it in your
browser (or right-click → Open with → your browser). Same for
`khenat-hospital-admin.html`.

- Book an appointment on the landing page → it's saved to MySQL.
- Open the admin dashboard (or hit "↻ Refresh") → you'll see it there,
  with buttons to mark it Confirmed / Completed / Cancelled.

## API reference (for later, e.g. if you deploy this)

| Method | Endpoint                      | Purpose                     |
|--------|--------------------------------|------------------------------|
| GET    | `/api/appointments`            | List all appointments        |
| POST   | `/api/appointments`            | Create a new appointment     |
| PATCH  | `/api/appointments/<id>`       | Update an appointment status |
| GET    | `/api/health`                  | Check the server is running  |

## Troubleshooting

- **"Could not connect to MySQL"** — check MySQL is running, and that the
  username/password in `DB_CONFIG` are correct.
- **Bookings still not appearing** — make sure `python app.py` is running
  in a terminal the whole time you're testing, and that both HTML files
  are pointing at `http://localhost:5000` (they are, by default).
- **CORS error in browser console** — confirm `flask-cors` installed
  correctly (`pip install flask-cors`) and restart the server.
