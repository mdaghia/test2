'use strict';
const ChatSession = require('../models/ChatSession');
const { streamChat } = require('../services/claudeChat');

// ── List sessions ──────────────────────────────────────────────────────────
exports.listSessions = async (req, res, next) => {
  try {
    const sessions = await ChatSession.find({ operatore: req.user._id, stato: 'attiva' })
      .sort({ updatedAt: -1 })
      .select('titolo tributoContesto annoContesto updatedAt createdAt')
      .lean();
    res.json({ data: sessions });
  } catch (err) { next(err); }
};

// ── Create session ─────────────────────────────────────────────────────────
exports.createSession = async (req, res, next) => {
  try {
    const { tributoContesto = 'entrambi', annoContesto } = req.body;
    const session = await ChatSession.create({
      operatore: req.user._id,
      tributoContesto,
      annoContesto: annoContesto || new Date().getFullYear(),
    });
    res.status(201).json({ data: session });
  } catch (err) { next(err); }
};

// ── Get session with messages ──────────────────────────────────────────────
exports.getSession = async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      operatore: req.user._id,
    }).lean();
    if (!session) return res.status(404).json({ message: 'Sessione non trovata' });
    res.json({ data: session });
  } catch (err) { next(err); }
};

// ── Archive session ────────────────────────────────────────────────────────
exports.archiveSession = async (req, res, next) => {
  try {
    await ChatSession.findOneAndUpdate(
      { _id: req.params.id, operatore: req.user._id },
      { stato: 'archiviata' }
    );
    res.json({ message: 'Sessione archiviata' });
  } catch (err) { next(err); }
};

// ── Stream chat message (SSE) ─────────────────────────────────────────────
exports.sendMessage = async (req, res, next) => {
  try {
    const { sessionId, contenuto } = req.body;
    if (!contenuto?.trim()) return res.status(400).json({ message: 'Messaggio vuoto' });

    // Load or create session
    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, operatore: req.user._id });
      if (!session) return res.status(404).json({ message: 'Sessione non trovata' });
    } else {
      session = await ChatSession.create({
        operatore: req.user._id,
        annoContesto: req.body.annoContesto || new Date().getFullYear(),
        tributoContesto: req.body.tributoContesto || 'entrambi',
      });
    }

    // Append user message
    session.messaggi.push({ ruolo: 'user', contenuto });

    // Auto-title from first message
    if (session.messaggi.length === 1 && session.titolo === 'Nuova conversazione') {
      session.titolo = contenuto.slice(0, 60) + (contenuto.length > 60 ? '…' : '');
    }

    // Build messages array for Claude (last 20 turns max)
    const history = session.messaggi.slice(-20).map(m => ({
      role: m.ruolo === 'user' ? 'user' : 'assistant',
      contenuto: m.contenuto,
    }));

    // Stream response — this ends the HTTP response
    const { risposta, fonti } = await streamChat(
      history,
      { anno: session.annoContesto, tributo: session.tributoContesto },
      res
    );

    // Persist assistant response after stream ends
    session.messaggi.push({ ruolo: 'assistant', contenuto: risposta, fonti });
    session.updatedAt = new Date();
    await session.save();

  } catch (err) {
    // If headers already sent (streaming started), can't send JSON error
    if (!res.headersSent) next(err);
    else res.end();
  }
};

// ── Get session ID from stream (before streaming starts) ───────────────────
exports.initMessage = async (req, res, next) => {
  try {
    const { tributoContesto = 'entrambi', annoContesto } = req.body;
    const session = await ChatSession.create({
      operatore: req.user._id,
      tributoContesto,
      annoContesto: annoContesto || new Date().getFullYear(),
    });
    res.status(201).json({ data: { sessionId: session._id } });
  } catch (err) { next(err); }
};
