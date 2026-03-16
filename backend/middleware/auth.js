const jwt = require('jsonwebtoken');
const Utente = require('../models/Utente');

exports.protect = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1] : null;
  if (!token) return res.status(401).json({ success: false, message: 'Token mancante' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const utente = await Utente.findById(decoded.id);
    if (!utente || !utente.attivo) return res.status(401).json({ success: false, message: 'Utente non autorizzato' });
    req.utente = utente;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token non valido' });
  }
};

exports.authorize = (...ruoli) => (req, res, next) => {
  if (!ruoli.includes(req.utente.ruolo)) {
    return res.status(403).json({ success: false, message: 'Permessi insufficienti' });
  }
  next();
};
