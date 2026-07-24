const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const { checkAuth } = require('./middleware/auth');
const { csrfProtection } = require('./middleware/csrf');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/authRoutes');
const createViewRouter = require('./routes/viewRoutes');

const settingsApi = require('./api/settingsApi');
const transcriptsApi = require('./api/transcriptsApi');
const logsApi = require('./api/logsApi');
const statsApi = require('./api/statsApi');
const createControlApi = require('./api/controlApi');

function startDashboard(client) {
  const app = express();

  // Helmet Security
  app.use(helmet({
    contentSecurityPolicy: false, // Allowed inline styles & script CDNs for FontAwesome / Chart.js
    crossOriginEmbedderPolicy: false
  }));

  // Body Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static Assets
  app.use(express.static(path.join(__dirname, 'public')));

  // EJS Layout Engine Setup
  app.use(expressLayouts);
  app.set('layout', 'layout');
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');

  // Secure Sessions
  const sessionSecret = process.env.SESSION_SECRET || 'otc_ticket_bot_secure_secret_key_2026';
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if behind HTTPS reverse proxy
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // CSRF Protection
  app.use(csrfProtection);

  // Rate Limiting
  app.use('/auth', authLimiter);
  app.use('/api', apiLimiter);

  // Authentication & OAuth Routes
  app.use('/auth', authRoutes);

  // Protected View Routes
  const viewRouter = createViewRouter(client);
  app.use('/dashboard', checkAuth(client), viewRouter);

  // Protected API Routes
  app.use('/api/settings', checkAuth(client), settingsApi);
  app.use('/api/transcripts', checkAuth(client), transcriptsApi);
  app.use('/api/logs', checkAuth(client), logsApi);
  app.use('/api/stats', checkAuth(client), statsApi);
  app.use('/api/control', checkAuth(client), createControlApi(client));

  // Redirect root to /dashboard
  app.get('/', (req, res) => res.redirect('/dashboard'));

  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => {
    console.log(`[Dashboard] OTC Ticket Bot Web Dashboard running at http://localhost:${port}`);
  });

  return server;
}

module.exports = { startDashboard };
