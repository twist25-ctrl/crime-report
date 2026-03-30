/* ============================================================
   Crime Report System — Main JavaScript
   Vanilla JS, Fetch API, no frameworks or libraries
   ============================================================ */

'use strict';

// Detect environment and set the API URL accordingly
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5001/api'
  : 'https://crime-report-backend.up.railway.app/api'; // <-- REPLACE THIS with your actual Railway App URL (e.g., https://your-app.up.railway.app/api)

// ─────────────────────────────────────────────
// Modern UI Interactions (Homepage & Global)
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Navbar Scroll Logic
  const navbar = document.getElementById('mainNavbar');
  const updateNavbar = () => {
    if (window.scrollY > 20) navbar?.classList.add('scrolled');
    else navbar?.classList.remove('scrolled');
  };
  window.addEventListener('scroll', updateNavbar);
  updateNavbar(); // Initialize on load


  // Scroll Reveal Observer
  const revealElements = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Reveal once
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  revealElements.forEach(el => observer.observe(el));

  // Feature Card Interactivity
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(card => {
    card.addEventListener('click', () => {
      const isExpanded = card.classList.contains('expanded');
      
      // Optional: Collapse others when one is opened
      featureCards.forEach(c => c.classList.remove('expanded'));
      
      if (!isExpanded) {
        card.classList.add('expanded');
      }
    });
  });

  // Sidebar Logic
  const menuBtn = document.getElementById('menuBtn');
  const closeSidebar = document.getElementById('closeSidebar');
  const sidebarDrawer = document.getElementById('sidebarDrawer');
  const profileForm = document.getElementById('profileForm');

  if (menuBtn && sidebarDrawer) {
    menuBtn.addEventListener('click', async () => {
      sidebarDrawer.classList.add('open');
      await fetchProfile();
    });

    closeSidebar.addEventListener('click', () => {
      sidebarDrawer.classList.remove('open');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (sidebarDrawer.classList.contains('open') && 
          !sidebarDrawer.contains(e.target) && 
          !menuBtn.contains(e.target)) {
        sidebarDrawer.classList.remove('open');
      }
    });
  }

  async function fetchProfile() {
    try {
      const res = await fetch('/api/users/profile');
      const user = await res.json();
      if (res.ok) {
        document.getElementById('profName').value = user.name || '';
        document.getElementById('profPhone').value = user.phone || '';
        document.getElementById('profPhoneAlt').value = user.phone_alt || '';
        document.getElementById('profPref').value = user.preferred_contact || 'email';
        document.getElementById('profNotes').value = user.contact_notes || '';
      }
    } catch (err) { console.error('Error fetching profile:', err); }
  }

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        name: document.getElementById('profName').value,
        phone: document.getElementById('profPhone').value,
        phone_alt: document.getElementById('profPhoneAlt').value,
        preferred_contact: document.getElementById('profPref').value,
        contact_notes: document.getElementById('profNotes').value
      };

      try {
        const res = await fetch('/api/users/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (res.ok) {
          alert('Profile updated successfully!');
          document.getElementById('navUserName').innerText = data.name;
        } else {
          alert(result.error || 'Update failed');
        }
      } catch (err) {
        console.error('Update error:', err);
        alert('An error occurred. Please try again.');
      }
    });
  }
});

/**
 * Switch tabs on the homepage (Quick Stats section)
 */
function switchHomeTab(tabId, btn) {
  // Update Buttons
  const container = btn.closest('.interactive-tabs');
  container.querySelectorAll('.tab-trigger').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Update Panels
  container.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('home-tab-' + tabId).classList.add('active');

  // Trigger counters if stats are revealed
  if (tabId === 'stats') {
    setTimeout(animateCounters, 100);
  }
}

/**
 * Numerical Counter Animation for stats
 */
function animateCounters() {
  const counters = document.querySelectorAll('.stat-num, .hero-stat-num');
  counters.forEach(counter => {
    const text = counter.innerText;
    const suffix = text.replace(/[0-9.]/g, '');
    const target = parseFloat(text.replace(/[^0-9.]/g, ''));
    
    if (isNaN(target)) return;
    
    let count = 0;
    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();
    
    const updateCount = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutExpo
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      count = target * easedProgress;
      
      if (target % 1 === 0) {
        counter.innerText = Math.floor(count).toLocaleString() + suffix;
      } else {
        counter.innerText = count.toFixed(1) + suffix;
      }
      
      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        counter.innerText = text; // Ensure final value is exact string
      }
    };
    
    requestAnimationFrame(updateCount);
  });
}



// ─────────────────────────────────────────────
// Map Integration (Leaflet.js + OpenStreetMap)
// ─────────────────────────────────────────────
let gMap = null, gMarker = null;
let gLatInput = null, gLngInput = null, gLocInput = null;

/**
 * Initialize Leaflet map for location picking.
 * @param {string} containerId - Map div ID
 * @param {string} inputId     - Text location input ID
 * @param {string} wrapperId   - Map wrapper div ID
 * @param {string} latId       - Hidden lat input ID
 * @param {string} lngId       - Hidden lng input ID
 */
function initCrimeMap(containerId, inputId, wrapperId, latId, lngId) {
  const container = document.getElementById(containerId);
  const input     = document.getElementById(inputId);
  const wrapper   = document.getElementById(wrapperId);
  gLatInput       = document.getElementById(latId);
  gLngInput       = document.getElementById(lngId);
  gLocInput       = input;

  if (!container || !input) return;

  const defaultCenter = [26.1158, 91.7086]; // Default: Guwahati

  try {
    // If map already initialized for same container, just resize
    if (gMap && gMap._container && gMap._container.id === containerId) {
      setTimeout(() => gMap.invalidateSize(), 200);
      return;
    }

    // Cleanup previous map
    if (gMap) { gMap.remove(); gMap = null; gMarker = null; }

    gMap = L.map(containerId, { scrollWheelZoom: true }).setView(defaultCenter, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(gMap);

    gMarker = L.marker(defaultCenter, { draggable: true }).addTo(gMap);

    // On marker drag → update coords + reverse geocode
    gMarker.on('dragend', () => {
      const pos = gMarker.getLatLng();
      setCoords(pos.lat, pos.lng);
      reverseGeocode(pos.lat, pos.lng);
    });

    // On map click → move marker + update
    gMap.on('click', (e) => {
      gMarker.setLatLng(e.latlng);
      setCoords(e.latlng.lat, e.latlng.lng);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    // Fix map rendering after container becomes visible
    setTimeout(() => gMap.invalidateSize(), 300);

  } catch (err) {
    console.warn('Map failed to load:', err);
  }
}

/** Store coordinates in hidden inputs */
function setCoords(lat, lng) {
  if (gLatInput) gLatInput.value = lat;
  if (gLngInput) gLngInput.value = lng;
}

/** Reverse geocode and fill the location text input */
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    const data = await res.json();
    if (data && data.display_name && gLocInput) {
      gLocInput.value = data.display_name;
    }
  } catch (err) {
    console.error('Geocoding error:', err);
    // At minimum set coordinate text if reverse geocode fails
    if (gLocInput) gLocInput.value = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
  }
}

/**
 * Robust geolocation with high→low accuracy fallback
 */
function getRobustLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser'));
    }

    const tryPosition = (highAccuracy) => {
      navigator.geolocation.getCurrentPosition(resolve, (err) => {
        if (highAccuracy && err.code === 2) {
          // Retry with standard accuracy
          console.warn('High accuracy unavailable, retrying with standard...');
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, timeout: 15000, maximumAge: 0
          });
        } else {
          reject(err);
        }
      }, {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 8000 : 15000,
        maximumAge: 0
      });
    };

    tryPosition(true);
  });
}

/**
 * "Use Current Location" button handler
 */
async function detectUserLocation(inputId, latId, lngId) {
  const input = document.getElementById(inputId);
  const latIn = document.getElementById(latId);
  const lngIn = document.getElementById(lngId);
  const btn   = document.querySelector('.btn-locate');

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Detecting...'; }
  toast('Detecting your location...', 'info');

  try {
    const pos = await getRobustLocation();
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    // Update hidden inputs
    if (latIn) latIn.value = lat;
    if (lngIn) lngIn.value = lng;

    // Move map & marker
    if (gMap && gMarker) {
      gMap.setView([lat, lng], 16);
      gMarker.setLatLng([lat, lng]);
    }

    // Also store in global refs
    setCoords(lat, lng);

    // Reverse geocode for readable address
    await reverseGeocode(lat, lng);
    toast('Location detected successfully!', 'success');
  } catch (err) {
    let msg = 'Unknown error';
    if (err.code === 1) msg = 'Location access denied. Please allow location in your browser.';
    else if (err.code === 2) msg = 'Location unavailable. Try clicking on the map instead.';
    else if (err.code === 3) msg = 'Location request timed out. Try again.';
    toast('Could not detect location: ' + msg, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📍 Use Current Location'; }
  }
}

// ─────────────────────────────────────────────
// Core API helper
// ─────────────────────────────────────────────
async function api(endpoint, options = {}) {
  const defaults = {
    credentials: 'include',
    headers: {},
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    defaults.headers['Content-Type'] = 'application/json';
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const config = { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } };

  const res = await fetch(API + endpoint, config);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }

  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

// ─────────────────────────────────────────────
// Toast notifications
// ─────────────────────────────────────────────
function toast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icons[type] || '•'}</span><span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

// ─────────────────────────────────────────────
// Alert box inside forms
// ─────────────────────────────────────────────
function showAlert(boxId, message, type = 'error') {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function clearAlert(boxId) {
  const box = document.getElementById(boxId);
  if (box) box.innerHTML = '';
}

// ─────────────────────────────────────────────
// Tab management
// ─────────────────────────────────────────────
function showTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('tab-' + name);
  if (panel) panel.classList.add('active');
  if (btn)   btn.classList.add('active');

  // Map Init for createReport tab
  if (name === 'createReport') {
    setTimeout(() => {
      initCrimeMap('cr_map', 'cr_location', 'cr_map_wrapper', 'cr_lat', 'cr_lng');
    }, 100);
  }
}

// ─────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}
function statusBadge(s) {
  const map = { pending: 'badge-pending', investigating: 'badge-investigating', resolved: 'badge-resolved', rejected: 'badge-rejected' };
  return `<span class="badge ${map[s] || ''}">${s || '—'}</span>`;
}
function priorityBadge(p) {
  return `<span class="badge badge-${p}">${p || '—'}</span>`;
}
function roleBadge(r) {
  return `<span class="role-badge ${r}">${r}</span>`;
}
function truncate(str, len = 120) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// ─────────────────────────────────────────────
// Auth state helpers
// ─────────────────────────────────────────────
let currentUser = null;

async function loadCurrentUser() {
  try {
    const data = await api('/auth/me');
    currentUser = data.user;
    return currentUser;
  } catch {
    return null;
  }
}

async function requireAuth(allowedRoles = []) {
  const user = await loadCurrentUser();
  if (!user) { window.location.href = '/login'; return null; }
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    window.location.href = '/dashboard';
    return null;
  }
  return user;
}

function setNavUser(user) {
  const nameEl = document.getElementById('navUserName');
  const badgeEl = document.getElementById('navRoleBadge');
  if (nameEl) nameEl.textContent = user.name;
  if (badgeEl) {
    badgeEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    badgeEl.className = `role-badge ${user.role}`;
  }
}

async function logoutUser() {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  window.location.href = '/login';
}

// ─────────────────────────────────────────────
// Categories cache
// ─────────────────────────────────────────────
let cachedCategories = null;

async function getCategories() {
  if (cachedCategories) return cachedCategories;
  cachedCategories = await api('/categories');
  return cachedCategories;
}

function populateCategorySelect(selectId) {
  getCategories().then(cats => {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.icon} ${c.name}`;
      sel.appendChild(opt);
    });
  });
}

// ─────────────────────────────────────────────
// Image upload handling (public dashboard)
// ─────────────────────────────────────────────
let selectedFiles = [];

function handleImageSelect(files) {
  const remaining = 10 - selectedFiles.length;
  const newFiles  = Array.from(files).slice(0, remaining);

  newFiles.forEach(file => {
    if (file.size > 5 * 1024 * 1024) { toast(`"${file.name}" exceeds 5MB limit.`, 'warning'); return; }
    selectedFiles.push(file);
  });

  renderPreviews('imagePreviewGrid', selectedFiles, idx => {
    selectedFiles.splice(idx, 1);
    renderPreviews('imagePreviewGrid', selectedFiles, idx2 => { selectedFiles.splice(idx2, 1); renderPreviews('imagePreviewGrid', selectedFiles); });
  });

  // Reset file input so same file can be re-selected
  document.getElementById('cr_images').value = '';
}

function renderPreviews(gridId, files, onRemove) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
  files.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = e => {
      const item = document.createElement('div');
      item.className = 'preview-item';
      item.innerHTML = `
        <img src="${e.target.result}" alt="${file.name}">
        <button class="preview-remove" title="Remove">✕</button>`;
      item.querySelector('.preview-remove').onclick = () => {
        if (onRemove) onRemove(i);
      };
      grid.appendChild(item);
    };
    reader.readAsDataURL(file);
  });
}

// Anonymous image upload
let anonSelectedFiles = [];
function handleAnonImageSelect(files) {
  const remaining = 10 - anonSelectedFiles.length;
  const newFiles  = Array.from(files).slice(0, remaining);
  newFiles.forEach(file => {
    if (file.size > 5 * 1024 * 1024) { toast(`"${file.name}" exceeds 5MB limit.`, 'warning'); return; }
    anonSelectedFiles.push(file);
  });
  renderPreviews('anonPreviewGrid', anonSelectedFiles, idx => {
    anonSelectedFiles.splice(idx, 1);
    renderPreviews('anonPreviewGrid', anonSelectedFiles);
  });
  document.getElementById('an_images').value = '';
}

// ─────────────────────────────────────────────
// Debounce
// ─────────────────────────────────────────────
let searchTimer = null;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (document.getElementById('searchInput'))      loadMyReports();
    else if (document.getElementById('staffSearch')) loadStaffReports();
  }, 400);
}
function debounceSearchAdmin() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadAdminReports(), 400);
}

// ─────────────────────────────────────────────
// Render report list (shared helper)
// ─────────────────────────────────────────────
function renderReportList(containerId, reports, showReporter = false) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!reports.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>No Reports Found</h3><p>No reports match your current filters.</p></div>`;
    return;
  }

  el.innerHTML = reports.map(r => {
    const coordsShort = (r.latitude && r.longitude) 
      ? `<span title="Coordinates: ${r.latitude}, ${r.longitude}">🌐 ${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}</span>`
      : '';
    return `
    <div class="report-card" onclick="window.location.href='/report-detail?id=${r.id}'">
      <div class="report-card-header">
        <div>
          <div class="report-card-badges">
            ${statusBadge(r.status)}
            ${priorityBadge(r.priority)}
            ${r.escalated ? '<span class="badge badge-escalated">🚨 Escalated</span>' : ''}
            ${r.is_anonymous ? '<span class="badge" style="background:#f3e8ff;color:#6b21a8">🕵️ Anonymous</span>' : ''}
          </div>
          <div class="report-card-title mt-1">${r.title}</div>
        </div>
        <div class="text-muted text-small">#${r.id}</div>
      </div>
      <div class="report-card-desc">${truncate(r.description)}</div>
      <div class="report-card-meta">
        <span>${r.category_icon || ''} ${r.category_name || '—'}</span>
        <span>📍 ${r.location}</span>
        ${coordsShort}
        <span>📅 ${fmtDate(r.incident_date)}</span>
        ${showReporter ? `<span>👤 ${r.is_anonymous ? 'Anonymous' : (r.reporter_name || 'Unknown')}</span>` : ''}
        ${r.image_count > 0 ? `<span>📷 ${r.image_count} image${r.image_count > 1 ? 's' : ''}</span>` : ''}
        <span class="text-muted" style="margin-left:auto">Submitted ${fmtDateTime(r.created_at)}</span>
      </div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// ── LOGIN PAGE
// ─────────────────────────────────────────────
function initLoginPage() {
  // Redirect if already logged in
  api('/auth/me').then(d => {
    const map = { admin: '/dashboard-admin', staff: '/dashboard-staff', user: '/dashboard-public' };
    window.location.href = map[d.user.role] || '/dashboard-public';
  }).catch(() => {});

  document.getElementById('loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert('alertBox');

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn      = document.getElementById('loginBtn');
    const spinner  = document.getElementById('loginSpinner');

    if (!email || !password) return showAlert('alertBox', 'Please enter your email and password.');

    btn.disabled = true;
    spinner?.classList.remove('hidden');

    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } });
      const map  = { admin: '/dashboard-admin', staff: '/dashboard-staff', user: '/dashboard-public' };
      window.location.href = map[data.user.role] || '/dashboard-public';
    } catch (err) {
      showAlert('alertBox', err.message);
    } finally {
      btn.disabled = false;
      spinner?.classList.add('hidden');
    }
  });
}

// ─────────────────────────────────────────────
// ── REGISTER PAGE
// ─────────────────────────────────────────────
function initRegisterPage() {
  document.getElementById('registerForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert('alertBox');

    const name    = document.getElementById('name').value.trim();
    const email   = document.getElementById('email').value.trim();
    const pass    = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;
    const btn     = document.getElementById('registerBtn');
    const spinner = document.getElementById('registerSpinner');

    if (!name || !email || !pass || !confirm)
      return showAlert('alertBox', 'All fields are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return showAlert('alertBox', 'Please enter a valid email address.');
    if (pass.length < 6)
      return showAlert('alertBox', 'Password must be at least 6 characters.');
    if (pass !== confirm)
      return showAlert('alertBox', 'Passwords do not match.');

    btn.disabled = true;
    spinner?.classList.remove('hidden');

    try {
      await api('/auth/register', { method: 'POST', body: { name, email, password: pass } });
      showAlert('alertBox', '✅ Account created! Redirecting to login...', 'success');
      setTimeout(() => window.location.href = '/login', 1500);
    } catch (err) {
      showAlert('alertBox', err.message);
    } finally {
      btn.disabled = false;
      spinner?.classList.add('hidden');
    }
  });
}

// ─────────────────────────────────────────────
// ── PUBLIC DASHBOARD
// ─────────────────────────────────────────────
async function initPublicDashboard() {
  const user = await requireAuth(['user']);
  if (!user) return;

  document.getElementById('navUserName').textContent = user.name;
  document.getElementById('welcomeName').textContent = user.name;
  populateCategorySelect('filterCategory');
  populateCategorySelect('cr_category');
  await loadMyReports();

  // Detect location listener
  document.getElementById('btnDetectLocation')?.addEventListener('click', () => {
    detectUserLocation('cr_location', 'cr_lat', 'cr_lng');
  });

  // Set max date for incident to today
  document.getElementById('cr_date').max = new Date().toISOString().split('T')[0];

  await loadMyReports();

  // Drag-and-drop support
  const uploadArea = document.getElementById('uploadArea');
  if (uploadArea) {
    uploadArea.addEventListener('dragover',  e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      handleImageSelect(e.dataTransfer.files);
    });
  }

  // Create report form
  document.getElementById('createReportForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert('createAlertBox');

    const category_id    = document.getElementById('cr_category').value;
    const title          = document.getElementById('cr_title').value.trim();
    const description    = document.getElementById('cr_description').value.trim();
    const location       = document.getElementById('cr_location').value.trim();
    const incident_date  = document.getElementById('cr_date').value;
    const incident_time  = document.getElementById('cr_time').value;
    const priority       = document.getElementById('cr_priority').value;

    if (!category_id || !title || !description || !location || !incident_date || !incident_time)
      return showAlert('createAlertBox', 'Please fill in all required fields.');

    const btn     = document.getElementById('submitReportBtn');
    const spinner = document.getElementById('submitSpinner');
    btn.disabled  = true;
    spinner?.classList.remove('hidden');

    try {
      const fd = new FormData();
      fd.append('category_id',   category_id);
      fd.append('title',         title);
      fd.append('description',   description);
      fd.append('location',      location);
      const crLat = document.getElementById('cr_lat')?.value;
      const crLng = document.getElementById('cr_lng')?.value;
      if (crLat) fd.append('latitude', crLat);
      if (crLng) fd.append('longitude', crLng);
      fd.append('incident_date', incident_date);
      fd.append('incident_time', incident_time);
      fd.append('priority',      priority);
      selectedFiles.forEach(f => fd.append('images', f));

      const data = await api('/reports', { method: 'POST', body: fd });
      toast(`Report #${data.id} submitted successfully!`, 'success');
      document.getElementById('createReportForm').reset();
      selectedFiles = [];
      document.getElementById('imagePreviewGrid').innerHTML = '';

      // Switch to My Reports tab and reload
      showTab('myReports', document.querySelector('.tab-btn'));
      await loadMyReports();
    } catch (err) {
      showAlert('createAlertBox', err.message);
    } finally {
      btn.disabled = false;
      spinner?.classList.add('hidden');
    }
  });
}

async function loadMyReports() {
  const search   = document.getElementById('searchInput')?.value.trim() || '';
  const category = document.getElementById('filterCategory')?.value    || '';
  const status   = document.getElementById('filterStatus')?.value       || '';
  const params   = new URLSearchParams();
  if (search)   params.set('search',   search);
  if (category) params.set('category', category);
  if (status)   params.set('status',   status);

  document.getElementById('reportsList').innerHTML =
    `<div class="loading-overlay"><div class="spinner"></div> Loading...</div>`;

  try {
    const reports = await api('/reports?' + params);

    // Update stat cards
    document.getElementById('statTotal').textContent        = reports.length;
    document.getElementById('statPending').textContent      = reports.filter(r => r.status === 'pending').length;
    document.getElementById('statInvestigating').textContent = reports.filter(r => r.status === 'investigating').length;
    document.getElementById('statResolved').textContent     = reports.filter(r => r.status === 'resolved').length;
    
    animateCounters();
    renderReportList('reportsList', reports);
  } catch (err) {
    document.getElementById('reportsList').innerHTML =
      `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ─────────────────────────────────────────────
// ── STAFF DASHBOARD
// ─────────────────────────────────────────────
async function initStaffDashboard() {
  const user = await requireAuth(['staff']);
  if (!user) return;
  document.getElementById('navUserName').textContent = user.name;
  populateCategorySelect('filterCategory');
  populateCategorySelect('staffFilterCat');
  await loadStaffOverview();
  await loadStaffReports();
}

async function loadStaffOverview() {
  try {
    const data = await api('/analytics/stats');
    const t = data.totals;
    document.getElementById('ss_total').textContent        = t.total;
    document.getElementById('ss_pending').textContent      = t.pending;
    document.getElementById('ss_investigating').textContent = t.investigating;
    document.getElementById('ss_resolved').textContent     = t.resolved;
    document.getElementById('ss_critical').textContent     = t.critical;

    animateCounters();
    // Category breakdown
    const breakdown = document.getElementById('categoryBreakdown');
    if (breakdown) {
      breakdown.innerHTML = '';
      const maxCount = Math.max(...data.byCategory.map(c => c.count), 1);
      data.byCategory.forEach(c => {
        const pct = Math.round((c.count / maxCount) * 100);
        breakdown.innerHTML += `
          <div style="margin-bottom:12px">
            <div class="d-flex align-center justify-between mb-1">
              <span>${c.icon} ${c.name}</span>
              <span class="fw-bold">${c.count}</span>
            </div>
            <div style="background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${c.color || '#3b82f6'};border-radius:4px;transition:width .5s"></div>
            </div>
          </div>`;
      });
    }

    // Recent activity
    const actEl = document.getElementById('recentActivityList');
    if (actEl && data.recentActivity.length) {
      actEl.classList.remove('loading-overlay');
      actEl.innerHTML = data.recentActivity.map(a => `
        <div class="activity-item">
          <div class="activity-icon">📌</div>
          <div class="activity-content">
            <div class="activity-action">${a.action}</div>
            <div class="activity-meta">${a.description || ''} — ${a.actor || 'System'} · ${fmtDateTime(a.created_at)}</div>
          </div>
        </div>`).join('');
    } else if (actEl) {
      actEl.innerHTML = '<p class="text-muted text-small">No recent activity.</p>';
    }
  } catch (err) {
    toast('Could not load statistics: ' + err.message, 'error');
  }
}

async function loadStaffReports() {
  const search   = document.getElementById('staffSearch')?.value.trim()          || '';
  const category = document.getElementById('staffFilterCat')?.value              || '';
  const status   = document.getElementById('staffFilterStatus')?.value            || '';
  const priority = document.getElementById('staffFilterPriority')?.value          || '';
  const dateFrom = document.getElementById('staffDateFrom')?.value                || '';
  const dateTo   = document.getElementById('staffDateTo')?.value                  || '';

  const params = new URLSearchParams();
  if (search)   params.set('search',   search);
  if (category) params.set('category', category);
  if (status)   params.set('status',   status);
  if (priority) params.set('priority', priority);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo)   params.set('dateTo',   dateTo);

  document.getElementById('staffReportsList').innerHTML =
    `<div class="loading-overlay"><div class="spinner"></div> Loading...</div>`;

  try {
    const reports = await api('/reports?' + params);
    renderReportList('staffReportsList', reports, true);
  } catch (err) {
    document.getElementById('staffReportsList').innerHTML =
      `<div class="alert alert-error">${err.message}</div>`;
  }
}

// ─────────────────────────────────────────────
// ── ADMIN DASHBOARD
// ─────────────────────────────────────────────
async function initAdminDashboard() {
  const user = await requireAuth(['admin']);
  if (!user) return;
  document.getElementById('navUserName').textContent = user.name;
  await loadAdminOverview();
  await loadAdminReports();
  await loadUsers();
}

async function loadAdminOverview() {
  try {
    const data = await api('/analytics/stats');
    const t = data.totals;
    document.getElementById('adm_total').textContent     = t.total;
    document.getElementById('adm_escalated').textContent = t.escalated;
    document.getElementById('adm_critical').textContent  = t.critical;
    document.getElementById('adm_resolved').textContent  = t.resolved;
    document.getElementById('adm_anon').textContent      = t.anonymous;

    animateCounters();
    const breakdown = document.getElementById('adminCategoryBreakdown');
    if (breakdown) {
      const maxCount = Math.max(...data.byCategory.map(c => c.count), 1);
      breakdown.innerHTML = data.byCategory.map(c => {
        const pct = Math.round((c.count / maxCount) * 100);
        return `
          <div style="margin-bottom:12px">
            <div class="d-flex align-center justify-between mb-1">
              <span>${c.icon} ${c.name}</span><span class="fw-bold">${c.count}</span>
            </div>
            <div style="background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${c.color || '#3b82f6'};border-radius:4px"></div>
            </div>
          </div>`;
      }).join('');
    }
  } catch (err) {
    toast('Could not load stats: ' + err.message, 'error');
  }
}

async function loadAdminReports() {
  const search = document.getElementById('adminSearch')?.value.trim() || '';
  const status = document.getElementById('adminFilterStatus')?.value  || '';
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  document.getElementById('adminReportsList').innerHTML =
    `<div class="loading-overlay"><div class="spinner"></div> Loading...</div>`;
  try {
    const reports = await api('/reports?' + params);
    renderReportList('adminReportsList', reports, true);
  } catch (err) {
    document.getElementById('adminReportsList').innerHTML =
      `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function loadUsers() {
  try {
    const users = await api('/users');
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td>${roleBadge(u.role)}</td>
        <td>${fmtDate(u.created_at)}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openRoleModal(${u.id}, '${u.name}', '${u.role}')">✏️ Role</button>
        </td>
      </tr>`).join('');
  } catch (err) {
    toast('Could not load users: ' + err.message, 'error');
  }
}

function openRoleModal(id, name, role) {
  document.getElementById('roleModalUserId').value   = id;
  document.getElementById('roleModalUserName').textContent = name;
  document.getElementById('roleModalSelect').value   = role;
  document.getElementById('roleModal').classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
async function submitRoleChange() {
  const id   = document.getElementById('roleModalUserId').value;
  const role = document.getElementById('roleModalSelect').value;
  try {
    await api(`/users/${id}`, { method: 'PATCH', body: { role } });
    toast('User role updated!', 'success');
    closeModal('roleModal');
    await loadUsers();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function loadActivityLog() {
  try {
    const logs = await api('/analytics/activity');
    const tbody = document.getElementById('activityLogBody');
    if (!tbody) return;
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td class="text-small">${fmtDateTime(l.created_at)}</td>
        <td>${l.actor_name || 'Anonymous'} ${l.actor_role ? roleBadge(l.actor_role) : ''}</td>
        <td><code style="font-size:.8rem;background:#f1f5f9;padding:2px 6px;border-radius:4px">${l.action}</code></td>
        <td class="text-small">${truncate(l.description, 80)}</td>
        <td class="text-small text-muted">${l.ip_address || '—'}</td>
      </tr>`).join('');
  } catch (err) {
    toast('Could not load activity log: ' + err.message, 'error');
  }
}

// Init admin create-user form
function initAdminCreateUserForm() {
  document.getElementById('createUserForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert('createUserAlert');

    const name     = document.getElementById('cu_name').value.trim();
    const email    = document.getElementById('cu_email').value.trim();
    const password = document.getElementById('cu_password').value;
    const phone    = document.getElementById('cu_phone').value.trim();
    const role     = document.getElementById('cu_role').value;

    if (!name || !email || !password)
      return showAlert('createUserAlert', 'Name, email, and password are required.');
    if (password.length < 6)
      return showAlert('createUserAlert', 'Password must be at least 6 characters.');

    try {
      const data = await api('/users', { method: 'POST', body: { name, email, password, phone, role } });
      showAlert('createUserAlert', `${role} account created successfully!`, 'success');
      document.getElementById('createUserForm').reset();
      await loadUsers();
    } catch (err) {
      showAlert('createUserAlert', err.message);
    }
  });
}

// ─────────────────────────────────────────────
// ── REPORT DETAIL PAGE
// ─────────────────────────────────────────────
let detailReportId = null;
let detailRole     = null;

async function initReportDetailPage() {
  const user = await requireAuth();
  if (!user) return;
  detailRole = user.role;
  setNavUser(user);

  const params = new URLSearchParams(window.location.search);
  detailReportId = params.get('id');

  if (!detailReportId) {
    document.getElementById('detailLoading').classList.add('hidden');
    document.getElementById('detailError').classList.remove('hidden');
    return;
  }

  await loadReportDetail();
}

async function loadReportDetail() {
  try {
    const data    = document.getElementById('detailContent');
    const loading = document.getElementById('detailLoading');
    const errEl   = document.getElementById('detailError');

    const result = await api(`/reports/${detailReportId}`);
    const { report, images, comments, activity } = result;

    loading.classList.add('hidden');
    data.classList.remove('hidden');

    // Badges
    const badges = document.getElementById('detailBadges');
    badges.innerHTML = statusBadge(report.status) + ' ' + priorityBadge(report.priority) +
      (report.escalated ? ' <span class="badge badge-escalated">🚨 Escalated</span>' : '') +
      (report.is_anonymous ? ' <span class="badge" style="background:#f3e8ff;color:#6b21a8">🕵️ Anonymous</span>' : '');

    document.getElementById('detailTitle').textContent    = report.title;
    document.getElementById('detailCategory').textContent = `${report.category_icon || ''} ${report.category_name || ''}`;
    document.getElementById('detailDescription').textContent = report.description;

    // Meta grid
    const coordsText = (report.latitude && report.longitude)
      ? `<div class="coords-display"><span class="coords-label">GPS:</span> ${Number(report.latitude).toFixed(6)}, ${Number(report.longitude).toFixed(6)}</div>`
      : '';
    document.getElementById('detailMeta').innerHTML = `
      <div class="detail-meta-item"><label>Report ID</label><span>#${report.id}</span></div>
      <div class="detail-meta-item"><label>Location</label><span>📍 ${report.location}</span>${coordsText}</div>
      <div class="detail-meta-item"><label>Incident Date</label><span>📅 ${fmtDate(report.incident_date)}</span></div>
      <div class="detail-meta-item"><label>Incident Time</label><span>🕐 ${fmtTime(report.incident_time)}</span></div>
      <div class="detail-meta-item"><label>Reported By</label><span>${report.is_anonymous ? '🕵️ Anonymous' : (report.reporter_name || '—')}</span></div>
      <div class="detail-meta-item"><label>Submitted</label><span>${fmtDateTime(report.created_at)}</span></div>
      <div class="detail-meta-item"><label>Last Updated</label><span>${fmtDateTime(report.updated_at)}</span></div>
      ${report.tracking_number ? `<div class="detail-meta-item"><label>Tracking</label><span>${report.tracking_number}</span></div>` : ''}
      ${report.notes ? `<div class="detail-meta-item" style="grid-column:1/-1"><label>Notes</label><span style="white-space:pre-wrap">${report.notes}</span></div>` : ''}
    `;

    // Location panel with map (staff/admin)
    const locPanel = document.getElementById('locationPanel');
    const locInfo  = document.getElementById('locationInfo');
    const mapCont  = document.getElementById('detailMapContainer');
    if (locPanel && (report.latitude && report.longitude)) {
      locPanel.classList.remove('hidden');
      locInfo.innerHTML = `
        <div class="loc-detail-row">
          <div class="loc-detail-item">
            <span class="loc-detail-label">📍 Address</span>
            <span class="loc-detail-value">${report.location}</span>
          </div>
          <div class="loc-detail-item">
            <span class="loc-detail-label">🌐 Coordinates</span>
            <span class="loc-detail-value loc-coords">${Number(report.latitude).toFixed(6)}, ${Number(report.longitude).toFixed(6)}</span>
          </div>
        </div>
      `;
      // Render mini Leaflet map
      if (mapCont && typeof L !== 'undefined') {
        mapCont.innerHTML = ''; // clear previous
        const miniMap = L.map(mapCont, { scrollWheelZoom: false, zoomControl: true, dragging: true }).setView([report.latitude, report.longitude], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19
        }).addTo(miniMap);
        L.marker([report.latitude, report.longitude]).addTo(miniMap)
          .bindPopup(`<b>${report.title}</b><br>${report.location}`).openPopup();
        setTimeout(() => miniMap.invalidateSize(), 300);
      }
    } else if (locPanel) {
      // Show location panel with text only (no map)
      locPanel.classList.remove('hidden');
      locInfo.innerHTML = `
        <div class="loc-detail-row">
          <div class="loc-detail-item">
            <span class="loc-detail-label">📍 Address</span>
            <span class="loc-detail-value">${report.location}</span>
          </div>
          <div class="loc-detail-item">
            <span class="loc-detail-label">🌐 Coordinates</span>
            <span class="loc-detail-value text-muted">Not available</span>
          </div>
        </div>
      `;
      if (mapCont) mapCont.style.display = 'none';
    }

    // Images
    const gallery = document.getElementById('imageGallery');
    document.getElementById('imageCount').textContent = images.length ? `${images.length} image(s)` : '';
    if (images.length) {
      gallery.innerHTML = images.map(img => `
        <div class="gallery-item" onclick="openLightbox(${img.id})">
          <img src="/api/image/${img.id}" alt="Evidence image" loading="lazy">
        </div>`).join('');
    } else {
      gallery.innerHTML = '<p class="text-muted text-small">No images attached.</p>';
    }

    // Staff/Admin update panel
    if (detailRole === 'staff' || detailRole === 'admin') {
      document.getElementById('updatePanel').classList.remove('hidden');
      document.getElementById('commentPanel').classList.remove('hidden');
      document.getElementById('updateStatus').value   = report.status;
      document.getElementById('updatePriority').value = report.priority;
      document.getElementById('updateNotes').value    = report.notes || '';

      // Show escalate button for staff on non-escalated reports
      const escBtn = document.getElementById('escalateBtn');
      if (detailRole === 'staff' && !report.escalated) escBtn.style.display = 'inline-flex';
    }

    // Comments
    renderComments(comments);

    // Activity log
    renderDetailActivity(activity);

  } catch (err) {
    document.getElementById('detailLoading').classList.add('hidden');
    document.getElementById('detailError').classList.remove('hidden');
  }
}

function renderComments(comments) {
  const el = document.getElementById('commentsList');
  if (!el) return;
  if (!comments.length) {
    el.innerHTML = '<p class="text-muted text-small">No comments yet.</p>';
    return;
  }
  el.innerHTML = comments.map(c => `
    <div class="activity-item">
      <div class="activity-icon">${c.author_role === 'admin' ? '🔴' : c.author_role === 'staff' ? '🔵' : '👤'}</div>
      <div class="activity-content">
        <div class="activity-action">${c.author_name || 'Unknown'} ${c.is_internal ? '<span class="badge badge-investigating" style="font-size:.7rem">Internal</span>' : ''}</div>
        <div style="margin-top:4px;font-size:.9rem">${c.comment}</div>
        <div class="activity-meta">${fmtDateTime(c.created_at)}</div>
      </div>
    </div>`).join('');
}

function renderDetailActivity(activity) {
  const el = document.getElementById('activityLogList');
  if (!el) return;
  if (!activity.length) {
    el.innerHTML = '<p class="text-muted text-small">No activity recorded.</p>';
    return;
  }
  el.innerHTML = activity.map(a => `
    <div class="activity-item">
      <div class="activity-icon">📌</div>
      <div class="activity-content">
        <div class="activity-action">${a.action}</div>
        <div class="activity-meta">${a.description || ''} · ${a.actor_name || 'System'} · ${fmtDateTime(a.created_at)}</div>
      </div>
    </div>`).join('');
}

async function submitUpdate() {
  clearAlert('updateAlertBox');
  const status   = document.getElementById('updateStatus').value;
  const priority = document.getElementById('updatePriority').value;
  const notes    = document.getElementById('updateNotes').value.trim();

  try {
    await api(`/reports/${detailReportId}`, { method: 'PATCH', body: { status, priority, notes } });
    toast('Report updated successfully!', 'success');
    await loadReportDetail();
  } catch (err) {
    showAlert('updateAlertBox', err.message);
  }
}

async function escalateReport() {
  if (!confirm('Escalate this report to Admin? It will no longer be visible to staff.')) return;
  try {
    await api(`/reports/${detailReportId}`, { method: 'PATCH', body: { escalated: true } });
    toast('Report escalated to Admin.', 'success');
    setTimeout(() => history.back(), 1500);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function addComment() {
  const comment     = document.getElementById('commentText').value.trim();
  const is_internal = document.getElementById('commentInternal').checked;
  if (!comment) return toast('Comment cannot be empty.', 'warning');

  try {
    await api(`/reports/${detailReportId}/comments`, { method: 'POST', body: { comment, is_internal } });
    document.getElementById('commentText').value = '';
    toast('Comment added.', 'success');
    await loadReportDetail();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function exportPDF() {
  toast('Generating PDF...', 'info');
  window.open(`/api/reports/${detailReportId}/export`, '_blank');
}

function openLightbox(imageId) {
  document.getElementById('lightboxImg').src = `/api/image/${imageId}`;
  document.getElementById('lightboxOverlay').classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightboxOverlay').classList.remove('open');
  document.getElementById('lightboxImg').src = '';
}

// ─────────────────────────────────────────────
// ── ANONYMOUS PAGE
// ─────────────────────────────────────────────
function initAnonPage() {
  populateCategorySelect('an_category');
  document.getElementById('an_date').max = new Date().toISOString().split('T')[0];

  // Initialize Map
  initCrimeMap('an_map', 'an_location', 'an_map_wrapper', 'an_lat', 'an_lng');

  // Detect location listener
  document.getElementById('btnDetectAnonym')?.addEventListener('click', () => {
    detectUserLocation('an_location', 'an_lat', 'an_lng');
  });

  const uploadArea = document.getElementById('anonUploadArea');
  if (uploadArea) {
    uploadArea.addEventListener('dragover',  e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault(); uploadArea.classList.remove('drag-over');
      handleAnonImageSelect(e.dataTransfer.files);
    });
  }

  document.getElementById('anonForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert('anonAlertBox');

    const category_id  = document.getElementById('an_category').value;
    const title        = document.getElementById('an_title').value.trim();
    const description  = document.getElementById('an_description').value.trim();
    const location     = document.getElementById('an_location').value.trim();
    const incident_date = document.getElementById('an_date').value;
    const incident_time = document.getElementById('an_time').value;
    const priority     = document.getElementById('an_priority').value;
    const contact      = document.getElementById('an_contact').value.trim();

    if (!category_id || !title || !description || !location || !incident_date || !incident_time)
      return showAlert('anonAlertBox', 'Please fill all required fields.');

    const btn     = document.getElementById('anonSubmitBtn');
    const spinner = document.getElementById('anonSpinner');
    btn.disabled  = true;
    spinner?.classList.remove('hidden');

    try {
      const fd = new FormData();
      fd.append('category_id',  category_id);
      fd.append('title',        title);
      fd.append('description',  description);
      fd.append('location',     location);
      const anLat = document.getElementById('an_lat')?.value;
      const anLng = document.getElementById('an_lng')?.value;
      if (anLat) fd.append('latitude', anLat);
      if (anLng) fd.append('longitude', anLng);
      fd.append('incident_date', incident_date);
      fd.append('incident_time', incident_time);
      fd.append('priority',     priority);
      if (contact) fd.append('anonymous_contact', contact);
      anonSelectedFiles.forEach(f => fd.append('images', f));

      const data = await api('/anonymous/report', { method: 'POST', body: fd });

      document.getElementById('trackingNumber').textContent = data.tracking_number;
      document.getElementById('anonFormCard').classList.add('hidden');
      document.getElementById('successPanel').classList.remove('hidden');
    } catch (err) {
      showAlert('anonAlertBox', err.message);
    } finally {
      btn.disabled = false;
      spinner?.classList.add('hidden');
    }
  });
}

function resetAnonForm() {
  document.getElementById('anonForm').reset();
  anonSelectedFiles = [];
  document.getElementById('anonPreviewGrid').innerHTML = '';
  document.getElementById('anonFormCard').classList.remove('hidden');
  document.getElementById('successPanel').classList.add('hidden');
  clearAlert('anonAlertBox');
}

// ─────────────────────────────────────────────
// ── ANALYTICS PAGE
// ─────────────────────────────────────────────
let charts = {};

async function initAnalyticsPage() {
  const user = await requireAuth(['staff', 'admin']);
  if (!user) return;
  setNavUser(user);
  await refreshAnalytics();
}

const ANALYTICS_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981',
  '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
  '#f97316', '#0ea5e9', '#6b7280', '#065f46'
];

async function refreshAnalytics() {
  try {
    const [stats, trends] = await Promise.all([
      api('/analytics/stats'),
      api('/analytics/trends'),
    ]);

    const t = stats.totals;
    document.getElementById('an_total').textContent        = t.total;
    document.getElementById('an_pending').textContent      = t.pending;
    document.getElementById('an_investigating').textContent = t.investigating;
    document.getElementById('an_resolved').textContent     = t.resolved;
    document.getElementById('an_rejected').textContent     = t.rejected;

    animateCounters();
    buildStatusChart(t);
    buildPriorityChart(stats.byPriority);
    buildCategoryChart(stats.byCategory);
    buildTrendChart(trends.monthly);
    renderAnalyticsActivity(stats.recentActivity);
  } catch (err) {
    toast('Could not load analytics: ' + err.message, 'error');
  }
}

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function buildStatusChart(t) {
  destroyChart('status');
  const ctx = document.getElementById('statusChart')?.getContext('2d');
  if (!ctx) return;
  charts.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Investigating', 'Resolved', 'Rejected'],
      datasets: [{
        data: [t.pending, t.investigating, t.resolved, t.rejected],
        backgroundColor: ['rgba(245,158,11,0.1)','rgba(59,130,246,0.1)','rgba(16,185,129,0.1)','rgba(239,68,68,0.1)'],
        borderColor:     ['#f59e0b','#3b82f6','#10b981','#ef4444'],
        borderWidth: 2,
        hoverOffset: 12,
        borderRadius: 4,
      }],
    },
    options: { plugins: { legend: { position: 'bottom' } }, cutout: '60%' },
  });
}

function buildPriorityChart(byPriority) {
  destroyChart('priority');
  const ctx = document.getElementById('priorityChart')?.getContext('2d');
  if (!ctx) return;
  const map = { low: 0, medium: 0, high: 0, critical: 0 };
  byPriority.forEach(p => { map[p.priority] = p.count; });
  charts.priority = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Low', 'Medium', 'High', 'Critical'],
      datasets: [{
        label: 'Reports',
        data: [map.low, map.medium, map.high, map.critical],
        backgroundColor: ['rgba(16,185,129,0.2)','rgba(245,158,11,0.2)','rgba(249,115,22,0.2)','rgba(239,68,68,0.2)'],
        borderColor:     ['#10b981','#f59e0b','#f97316','#ef4444'],
        borderWidth: 2,
        borderRadius: 8,
      }],
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
  });
}

function buildCategoryChart(byCategory) {
  destroyChart('category');
  const ctx = document.getElementById('categoryChart')?.getContext('2d');
  if (!ctx) return;
  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: byCategory.map(c => `${c.icon} ${c.name}`),
      datasets: [{
        data: byCategory.map(c => c.count),
        backgroundColor: ANALYTICS_COLORS.map(c => `${c}22`),
        borderColor:     ANALYTICS_COLORS,
        borderWidth: 2,
        hoverOffset: 12,
        borderRadius: 4,
      }],
    },
    options: { 
      plugins: { 
        legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } 
      }, 
      cutout: '60%' 
    },
  });
}

function buildTrendChart(monthly) {
  destroyChart('trend');
  const ctx = document.getElementById('trendChart')?.getContext('2d');
  if (!ctx) return;
  charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthly.map(m => m.month),
      datasets: [{
        label: 'Reports',
        data: monthly.map(m => m.count),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 4,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
}

function renderAnalyticsActivity(activity) {
  // Analytics page doesn't have a dedicated activity panel, this is a no-op
  // Activity is already rendered in the staff/admin dashboards
}

// ─────────────────────────────────────────────
// ── TRACKING PAGE
// ─────────────────────────────────────────────
async function initTrackPage() {
  const form = document.getElementById('trackForm');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const tracking = document.getElementById('trackNumber').value.trim();
    if (!tracking) return;

    await searchAnonymousReport(tracking);
  });

  // Check URL params if any
  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('id');
  if (trackId) {
    document.getElementById('trackNumber').value = trackId;
    await searchAnonymousReport(trackId);
  }
}

async function searchAnonymousReport(tracking) {
  clearAlert('trackAlertBox');
  const results = document.getElementById('trackResults');
  const empty   = document.getElementById('trackEmpty');
  const btn     = document.getElementById('trackBtn');
  if (!results || !empty || !btn) return;

  results.classList.add('hidden');
  empty.classList.add('hidden');
  btn.disabled = true;

  try {
    const report = await api(`/anonymous/track/${tracking}`);
    
    // Fill details
    const res_title    = document.getElementById('res_title');
    const res_id       = document.getElementById('res_id');
    const res_category = document.getElementById('res_category');
    const res_priority = document.getElementById('res_priority');
    const res_created  = document.getElementById('res_created');
    const res_updated  = document.getElementById('res_updated');
    const statusBadge  = document.getElementById('res_status_badge');

    if (res_title) res_title.textContent = report.title;
    if (res_id) res_id.textContent    = tracking;
    if (res_category) res_category.innerHTML = `<span>${report.category_icon}</span> ${report.category_name}`;
    if (res_priority) res_priority.innerHTML = `<span class="badge badge-${report.priority}">${report.priority}</span>`;
    if (res_created) res_created.textContent  = fmtDateTime(report.created_at);
    if (res_updated) res_updated.textContent  = fmtDateTime(report.updated_at);
    if (statusBadge) statusBadge.innerHTML = `<span class="badge badge-${report.status}" style="font-size:.9rem;padding:6px 14px">${report.status.toUpperCase()}</span>`;

    results.classList.remove('hidden');
  } catch (err) {
    if (err.message && err.message.includes('No report found')) {
      empty.classList.remove('hidden');
    } else {
      showAlert('trackAlertBox', err.message || 'Error tracking report');
    }
  } finally {
    if(btn) btn.disabled = false;
  }
}

// ─────────────────────────────────────────────
// ── EMERGENCY SOS
// ─────────────────────────────────────────────
function showSosModal() {
  const overlay = document.getElementById('sosOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

function closeSosModal() {
  const overlay = document.getElementById('sosOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
    // Reset view
    document.getElementById('sosMsg').classList.remove('hidden');
    document.getElementById('sosActions').classList.remove('hidden');
    document.getElementById('sosResult').classList.add('hidden');
  }
}

async function confirmSos() {
  const btn = document.querySelector('.btn-sos-confirm');
  if(btn) btn.disabled = true;
  toast('Detecting emergency location...', 'info');

  try {
    const pos = await getRobustLocation(true);
    sendSosData(pos.coords.latitude, pos.coords.longitude, null);
  } catch (err) {
    let msg = 'Location unavailable';
    if (err.code === 1) msg = 'Location access denied';
    else if (err.code === 2) msg = 'Position unavailable';
    else if (err.code === 3) msg = 'Location timeout';
    sendSosData(null, null, msg);
  }
}

async function sendSosData(lat, lng, fallbackInfo) {
  try {
    const payload = {
      latitude: lat,
      longitude: lng,
      location_text: fallbackInfo
    };

    const res = await api('/emergency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    document.getElementById('sosMsg').classList.add('hidden');
    document.getElementById('sosActions').classList.add('hidden');
    
    const resultDiv = document.getElementById('sosResult');
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `
      <p style="color: #065f46; font-weight: 600; font-size: 1.1rem; margin-bottom: 8px;">✅ SOS Alert Sent Successfully</p>
      <p style="color: var(--text-muted); font-size: 0.9rem;">Help is on the way. Save this tracking number:</p>
      <div class="sos-tracking">${res.tracking_number}</div>
      <p style="font-size: 0.85rem; margin-top: 12px;"><a href="/track-report?id=${res.tracking_number}" style="color: #dc2626; font-weight: 600;">Track Status →</a></p>
    `;
    toast('Emergency SOS sent!', 'success');
  } catch (err) {
    toast('SOS Failed: ' + err.message, 'error');
    const btn = document.querySelector('.btn-sos-confirm');
    if(btn) btn.disabled = false;
  }
}