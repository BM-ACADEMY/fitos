const jwt = require('jsonwebtoken');

/**
 * JWT auth middleware with role gate.
 * Usage: router.get('/route', auth(['gym_admin']), handler)
 * Roles: gym_admin | trainer | member | master_admin | super_admin
 * Empty array = any authenticated user.
 */
function auth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // { id, role, gym_id, name }
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

module.exports = auth;
