module.exports = function auth(req, res, next) {
  // placeholder auth middleware
  req.user = null;
  next();
};
