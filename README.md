# 🛡️ Online Crime Reporting System

A full-stack web application for citizens to report crimes securely and for law enforcement staff to manage, investigate, and resolve reports.

## Tech Stack

| Layer     | Technology                       |
|-----------|----------------------------------|
| Backend   | Node.js, Express 4               |
| Database  | MySQL 8 (mysql2 driver)           |
| Frontend  | Vanilla HTML, CSS, JavaScript     |
| Auth      | bcryptjs + express-session        |
| Uploads   | Multer (memory → MySQL BLOB)      |
| Charts    | Chart.js 4 (CDN)                  |
| Email     | Nodemailer (optional SMTP)        |

## Features

- **Role-based dashboards** — Public (citizen), Staff, Admin
- **Crime report CRUD** — Submit, view, update, filter, search
- **Evidence upload** — Images stored as BLOBs in MySQL
- **Anonymous reporting** — No account required, tracking number issued
- **Report escalation** — Staff → Admin for critical cases
- **Comments system** — Public and internal (staff-only) comments
- **Analytics** — Charts for status, priority, category, and monthly trends
- **Activity logging** — Full audit trail of all actions
- **PDF export** — Printable report documents
- **Email notifications** — On report submission and status changes

## Setup

### 1. Prerequisites
- Node.js 18+
- MySQL 8.x running locally

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Configure environment
Edit `backend/.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=crime_report_system
```

### 4. Create database and tables
```bash
cd backend
node setup.js
```

### 5. Start the server
```bash
npm run dev
```

The app will be available at **http://localhost:5000**

## Default Accounts

| Role  | Email                    | Password  |
|-------|--------------------------|-----------|
| Admin | admin@crimereport.com    | admin123  |

## Project Structure

```
crime-report-system/
├── backend/
│   ├── config/database.js       # MySQL connection pool
│   ├── middleware/
│   │   ├── auth.js              # Session-based auth guards
│   │   └── upload.js            # Multer memory storage
│   ├── routes/
│   │   ├── auth.js              # Login, register, logout
│   │   ├── reports.js           # CRUD, comments, export
│   │   ├── users.js             # User management (admin)
│   │   ├── categories.js        # Crime categories
│   │   ├── analytics.js         # Stats, trends, activity
│   │   ├── anonymous.js         # Anonymous submissions
│   │   └── files.js             # Image BLOB serving
│   ├── utils/
│   │   ├── activityLogger.js    # Audit logging
│   │   ├── emailService.js      # SMTP notifications
│   │   ├── pdfGenerator.js      # Report PDF export
│   │   └── smsService.js        # SMS notifications
│   ├── server.js                # Express app entry point
│   └── setup.js                 # Database initialisation
├── frontend/
│   ├── css/style.css            # Component styles
│   ├── js/main.js               # All frontend logic
│   └── public/                  # HTML pages
│       ├── index.html           # Landing page
│       ├── login.html
│       ├── register.html
│       ├── dashboard-public.html
│       ├── dashboard-staff.html
│       ├── dashboard-admin.html
│       ├── report-detail.html
│       ├── anonymous.html
│       └── analytics.html
└── schema.sql                   # Database schema + seeds
```
# crime-report
