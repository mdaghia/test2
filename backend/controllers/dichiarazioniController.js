const DichiarazioneIMU = require('../models/DichiarazioneIMU');
const { calcolaDichiarazioneIMU } = require('../services/calcoloIMU');
const kafkaProducer = require('../services/kafkaProducer');
const stampaService = require('../services/stampaService');
const asyncHandler = require('../utils/asyncHandler');

// ── LIST ───────────────────────────────────────────────────────────────────
exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, annoImposta, stato, contribuente, search } = req.query;
  const query = {};

  if (annoImposta)  query.annoImposta = Number(annoImposta);
  if (stato)        query.stato = stato;
  if (contribuente) query.contribuente = contribuente;

  const [data, total] = await Promise.all([
    DichiarazioneIMU.find(query)
      .populate('contribuente', 'codiceFiscale cognome nome ragioneSociale')
      .populate('operatore', 'nome cognome')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit)),
    DichiarazioneIMU.countDocuments(query),
  ]);

  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ── GET ONE ────────────────────────────────────────────────────────────────
exports.getOne = asyncHandler(async (req, res) => {
  const dich = await DichiarazioneIMU.findById(req.params.id)
    .populate('contribuente')
    .populate('righe.immobile')
    .populate('operatore', 'nome cognome')
    .populate('storiaStati.utente', 'nome cognome');
  if (!dich) return res.status(404).json({ success: false, message: 'Dichiarazione non trovata' });
  res.json({ success: true, data: dich });
});

// ── CREATE ─────────────────────────────────────────────────────────────────
exports.create = asyncHandler(async (req, res) => {
  const dich = await DichiarazioneIMU.create({
    ...req.body,
    operatore: req.utente._id,
    storiaStati: [{ stato: 'bozza', utente: req.utente._id, nota: 'Creazione' }],
  });

  await kafkaProducer.dichiarazioneCreata(dich);
  res.status(201).json({ success: true, data: dich });
});

// ── UPDATE ─────────────────────────────────────────────────────────────────
exports.update = asyncHandler(async (req, res) => {
  const dich = await DichiarazioneIMU.findById(req.params.id);
  if (!dich) return res.status(404).json({ success: false, message: 'Dichiarazione non trovata' });
  if (['annullata', 'definita'].includes(dich.stato)) {
    return res.status(400).json({ success: false, message: `Impossibile modificare una dichiarazione in stato: ${dich.stato}` });
  }

  const { stato, ...dati } = req.body;
  Object.assign(dich, dati, { modificatoDA: req.utente._id });
  await dich.save();
  res.json({ success: true, data: dich });
});

// ── ANNULLA (cancellazione logica) ─────────────────────────────────────────
exports.annulla = asyncHandler(async (req, res) => {
  const dich = await DichiarazioneIMU.findById(req.params.id);
  if (!dich) return res.status(404).json({ success: false, message: 'Dichiarazione non trovata' });
  if (dich.stato === 'annullata') return res.status(400).json({ success: false, message: 'Già annullata' });

  dich.stato = 'annullata';
  dich.motivoAnnullamento = req.body.motivazione || 'Annullamento operatore';
  dich.modificatoDA = req.utente._id;
  dich.storiaStati.push({ stato: 'annullata', utente: req.utente._id, nota: dich.motivoAnnullamento });
  await dich.save();
  res.json({ success: true, data: dich });
});

// ── CAMBIA STATO ───────────────────────────────────────────────────────────
exports.cambiaStato = asyncHandler(async (req, res) => {
  const { stato, nota } = req.body;
  const TRANSIZIONI = {
    bozza:         ['presentata', 'annullata'],
    presentata:    ['in_lavorazione', 'annullata'],
    in_lavorazione:['definita', 'annullata'],
    definita:      ['rettificata'],
    rettificata:   ['definita', 'annullata'],
  };

  const dich = await DichiarazioneIMU.findById(req.params.id);
  if (!dich) return res.status(404).json({ success: false, message: 'Dichiarazione non trovata' });

  const permessi = TRANSIZIONI[dich.stato] || [];
  if (!permessi.includes(stato)) {
    return res.status(400).json({ success: false, message: `Transizione non ammessa: ${dich.stato} → ${stato}` });
  }

  dich.stato = stato;
  if (stato === 'presentata') dich.dataPresentazione = new Date();
  dich.storiaStati.push({ stato, utente: req.utente._id, nota });
  await dich.save();
  res.json({ success: true, data: dich });
});

// ── CALCOLA IMU ────────────────────────────────────────────────────────────
exports.calcola = asyncHandler(async (req, res) => {
  const dich = await DichiarazioneIMU.findById(req.params.id).populate('righe.immobile');
  if (!dich) return res.status(404).json({ success: false, message: 'Dichiarazione non trovata' });

  const comune = req.body.comune || process.env.COMUNE_NOME || 'Comune';
  const calc = await calcolaDichiarazioneIMU(dich, comune, dich.annoImposta);

  // Aggiorna dichiarazione con i calcoli
  Object.assign(dich, {
    righe:            calc.righe,
    totaleImponibile: calc.totaleImponibile,
    totaleImposta:    calc.totaleImposta,
    totaleDovuto:     calc.totaleDovuto,
    importoAcconto:   calc.importoAcconto,
    importoSaldo:     calc.importoSaldo,
  });
  await dich.save();

  res.json({ success: true, data: dich, calcolo: calc });
});

// ── STAMPA ─────────────────────────────────────────────────────────────────
exports.stampa = asyncHandler(async (req, res) => {
  const dich = await DichiarazioneIMU.findById(req.params.id)
    .populate('contribuente').populate('righe.immobile').populate('operatore');
  if (!dich) return res.status(404).json({ success: false, message: 'Dichiarazione non trovata' });

  const filePath = await stampaService.stampaDichiarazioneIMU(dich);
  res.download(filePath);
});
