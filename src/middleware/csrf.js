const csurf = require('csurf');
const csrfProtection = csurf();

module.exports = [
  csrfProtection,
  (req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
  }
];
