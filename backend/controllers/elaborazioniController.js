const ElaborazioneMassiva = require('../models/ElaborazioneMassiva');
const kafkaProducer = require('../services/kafkaProducer');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, tipo, stato } = req.query;
  const query = {};
  if (tipo)  query.tipoElaborazione = tipo;
  if (stato) query.stato = stato;
  const [data, total] = await Promise.all([
    ElaborazioneMassiva.find(query)
      .populate('richiestoDA', 'nome cognome')
      .sort({ dataRichiesta: -1 })
      .skip((page - 1) * limit).limit(Number(limit)),
    ElaborazioneMassiva.countDocuments(query),
  ]);
  res.json({ success: true, data, total });
});

exports.getOne = asyncHandler(async (req, res) => {
  const elab = await ElaborazioneMassiva.findById(req.params.id).populate('richiestoDA', 'nome cognome');
  if (!elab) return res.status(404).json({ success: false, message: 'Elaborazione non trovata' });
  res.json({ success: true, data: elab });
});

exports.avviaCalcoloMassivo = asyncHandler(async (req, res) => {
  const elab = await ElaborazioneMassiva.create({
    tipoElaborazione: 'calcolo_massivo_imu',
    descrizione: `Calcolo massivo IMU anno ${req.body.annoImposta}`,
    parametri: req.body,
    richiestoDA: req.utente._id,
  });
  await kafkaProducer.richiestaCalcolo(elab._id.toString(), req.body);
  res.status(202).json({ success: true, data: elab, message: 'Calcolo massivo accodato' });
});

exports.avviaStampaMassiva = asyncHandler(async (req, res) => {
  const { tipoStampa, ...parametri } = req.body;
  const elab = await ElaborazioneMassiva.create({
    tipoElaborazione: tipoStampa,
    descrizione: `Stampa massiva: ${tipoStampa}`,
    parametri,
    richiestoDA: req.utente._id,
  });
  await kafkaProducer.richiestaSammeMassive(elab._id.toString(), tipoStampa, parametri);
  res.status(202).json({ success: true, data: elab, message: 'Stampa massiva accodata' });
});

exports.annullaElaborazione = asyncHandler(async (req, res) => {
  const elab = await ElaborazioneMassiva.findById(req.params.id);
  if (!elab) return res.status(404).json({ success: false, message: 'Elaborazione non trovata' });
  if (!['in_coda'].includes(elab.stato)) {
    return res.status(400).json({ success: false, message: 'Non è possibile annullare un\'elaborazione già avviata' });
  }
  elab.stato = 'annullata';
  await elab.save();
  res.json({ success: true, data: elab });
});

exports.scaricaOutput = asyncHandler(async (req, res) => {
  const elab = await ElaborazioneMassiva.findById(req.params.id);
  if (!elab || !elab.fileOutput) return res.status(404).json({ success: false, message: 'File non disponibile' });
  res.download(elab.fileOutput);
});
