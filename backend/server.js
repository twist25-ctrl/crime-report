require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── Body parsing ───────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Proxy Trust (for Railway/Vercel) ───────────────────────
app.set('trust proxy', 1);

// ── CORS ───────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:5001',
  'https://crime-report-flax.vercel.app'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ── Session ────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave:            false,
  saveUninitialized: false,
  proxy:             true,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   7_200_000, 
  },
}));

// ── Static files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ── API routes ─────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/categories',require('./routes/categories'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/anonymous', require('./routes/anonymous'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api',           require('./routes/files'));

// ── HTML page routes ───────────────────────────────────────
const send = (file) => (_, res) =>
  res.sendFile(path.join(__dirname, '../frontend/public', file));

app.get('/',                    send('index.html'));
app.get('/login',               send('login.html'));
app.get('/register',            send('register.html'));
app.get('/dashboard-public',    send('dashboard-public.html'));
app.get('/dashboard-staff',     send('dashboard-staff.html'));
app.get('/dashboard-admin',     send('dashboard-admin.html'));
app.get('/report-detail',       send('report-detail.html'));
app.get('/anonymous',           send('anonymous.html'));
app.get('/track-report',        send('track-report.html'));
app.get('/analytics',           send('analytics.html'));

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const map = { admin: '/dashboard-admin', staff: '/dashboard-staff', user: '/dashboard-public' };
  res.redirect(map[req.session.role] || '/dashboard-public');
});

// ── Global error handler ───────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`server is running `)
);

module.exports = app;