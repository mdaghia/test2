'use strict';
const multer = require('multer');
const RagDocument = require('../models/RagDocument');
const { indexDocument, deleteDocumentVectors } = require('../services/ragService');
const logger = require('../utils/logger');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── List ───────────────────────────────────────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { tipo, tributo, anno } = req.query;
    const q = {};
    if (tipo) q.tipo = tipo;
    if (tributo) q.tributo = tributo;
    if (anno) q.anno = Number(anno);

    const docs = await RagDocument.find(q)
      .sort({ createdAt: -1 })
      .populate('caricatoDa', 'username nome cognome')
      .lean();
    res.json({ data: docs, total: docs.length });
  } catch (err) { next(err); }
};

// ── Upload & Index ─────────────────────────────────────────────────────────
exports.upload = [
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'File mancante (PDF o testo)' });
      const { titolo, tipo = 'delibera', tributo = 'entrambi', anno, descrizione, tags } = req.body;
      if (!titolo) return res.status(400).json({ message: 'Campo "titolo" obbligatorio' });

      // Create DB record
      const doc = await RagDocument.create({
        titolo,
        tipo,
        tributo,
        anno: anno ? Number(anno) : undefined,
        descrizione,
        nomeFile: req.file.originalname,
        mimeType: req.file.mimetype,
        dimensione: req.file.size,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        caricatoDa: req.user._id,
        stato: 'in_elaborazione',
      });

      // Async indexing (non-blocking response)
      indexDocument(req.file.buffer, req.file.mimetype, {
        documentoId: doc._id.toString(),
        titolo,
        tipo,
        tributo,
        anno: anno ? Number(anno) : null,
      })
        .then(async ({ chunks, qdrantIds }) => {
          doc.stato = 'indicizzato';
          doc.numeroChunks = chunks;
          doc.qdrantIds = qdrantIds;
          await doc.save();
          logger.info(`RAG doc ${doc._id} indexed: ${chunks} chunks`);
        })
        .catch(async err => {
          doc.stato = 'errore';
          doc.errore = err.message;
          await doc.save();
          logger.error(`RAG indexing error for ${doc._id}`, err);
        });

      res.status(202).json({ data: doc, message: 'Documento ricevuto, indicizzazione in corso' });
    } catch (err) { next(err); }
  },
];

// ── Get One ────────────────────────────────────────────────────────────────
exports.getOne = async (req, res, next) => {
  try {
    const doc = await RagDocument.findById(req.params.id).populate('caricatoDa', 'username').lean();
    if (!doc) return res.status(404).json({ message: 'Documento non trovato' });
    res.json({ data: doc });
  } catch (err) { next(err); }
};

// ── Delete ─────────────────────────────────────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    const doc = await RagDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Documento non trovato' });

    await deleteDocumentVectors(doc._id.toString());
    await doc.deleteOne();

    res.json({ message: 'Documento rimosso dall\'indice' });
  } catch (err) { next(err); }
};

// ── Re-index ──────────────────────────────────────────────────────────────
exports.reindex = async (req, res, next) => {
  // Only possible if file re-uploaded; here just returns status
  res.json({ message: 'Funzione non disponibile: effettuare un nuovo caricamento del documento' });
};
