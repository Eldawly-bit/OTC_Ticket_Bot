const crypto = require('crypto');

function csrfProtection(req, res, next) {
  if (!req.session) {
    return next();
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;
  req.csrfToken = () => req.session.csrfToken;

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
  if (!token || token !== req.session.csrfToken) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }
    return res.status(403).send('Forbidden: Invalid CSRF Token');
  }

  next();
}

module.exports = { csrfProtection };
