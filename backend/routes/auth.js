const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Utente = require('../models/Utente');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/auth');

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Credenziali mancanti' });

  const utente = await Utente.findOne({ username }).select('+password');
  if (!utente || !utente.attivo) return res.status(401).json({ success: false, message: 'Credenziali non valide' });

  const ok = await utente.verificaPassword(password);
  if (!ok) return res.status(401).json({ success: false, message: 'Credenziali non valide' });

  utente.ultimoAccesso = new Date();
  await utente.save();

  const token = jwt.sign({ id: utente._id, ruolo: utente.ruolo }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
  res.json({ success: true, token, utente });
}));

router.get('/me', protect, (req, res) => res.json({ success: true, data: req.utente }));

router.post('/logout', protect, (_req, res) => res.json({ success: true, message: 'Logout effettuato' }));

module.exports = router;
