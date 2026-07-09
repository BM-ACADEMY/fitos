const jwt = require('jsonwebtoken');

/** Master admin gate — only master_admin / super_admin tokens pass. */
function masterAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['master_admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Master admin access only' });
    }
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = masterAuth;
