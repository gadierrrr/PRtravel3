require('dotenv').config();
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { initAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine & layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Template locals defaults
app.use((req, res, next) => {
  res.locals.currentCategory = null;
  res.locals.user = null; // will be populated after auth init
  res.locals.STRIPE_ENABLED = process.env.STRIPE_ENABLED === 'true';
  // UI refresh feature flag: default ON in dev unless explicitly disabled; prod requires UI_REFRESH=1
  const envFlag = process.env.UI_REFRESH === '1';
  const isDev = process.env.NODE_ENV !== 'production';
  res.locals.uiRefresh = envFlag || (isDev && process.env.UI_REFRESH !== '0');
  next();
});

// Sessions (before auth init)
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, '..', 'db') }),
  secret: process.env.SESSION_SECRET || 'dev_secret_change',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Auth
initAuth(app);

// Populate user in templates after auth
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.STRIPE_ENABLED = process.env.STRIPE_ENABLED === 'true';
  // if csurf middleware already attached token use it; otherwise blank
  if (req.csrfToken) {
    try { res.locals.csrfToken = req.csrfToken(); } catch { res.locals.csrfToken = ''; }
  } else {
    res.locals.csrfToken = '';
  }
  next();
});

// Routes
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const checkoutRoutes = require('./routes/checkout');
const webhookRoutes = require('./routes/webhooks');

// Mount routes
app.use('/', publicRoutes);
app.use('/', authRoutes);
app.use('/', adminRoutes);
app.use('/', checkoutRoutes);
app.use('/', webhookRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404);
  res.render('home', { title: 'Not Found', deals: [], notFound: true });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err); // eslint-disable-line no-console
  const status = err.status || 500;
  res.status(status);
  res.render('home', { title: 'Error', deals: [], error: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
