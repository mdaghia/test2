const DichiarazioneIMU = require('../models/DichiarazioneIMU');
const VersamentoIMU = require('../models/VersamentoIMU');
const AttoProvvedimento = require('../models/AttoProvvedimento');
const Contribuente = require('../models/Contribuente');
const asyncHandler = require('../utils/asyncHandler');

exports.summary = asyncHandler(async (req, res) => {
  const anno = Number(req.query.anno) || new Date().getFullYear();

  const [dichStats, verStats, attiStats, contribuentiTot] = await Promise.all([
    DichiarazioneIMU.aggregate([
      { $match: { annoImposta: anno } },
      { $group: { _id: '$stato', count: { $sum: 1 }, totaleDovuto: { $sum: '$totaleDovuto' } } },
    ]),
    VersamentoIMU.aggregate([
      { $match: { annoImposta: anno, stato: { $ne: 'annullato' } } },
      { $group: { _id: '$tipoRata', count: { $sum: 1 }, totale: { $sum: '$importoVersato' } } },
    ]),
    AttoProvvedimento.aggregate([
      { $match: { annoImposta: anno } },
      { $group: { _id: '$stato', count: { $sum: 1 }, totale: { $sum: '$totaleRichiesto' } } },
    ]),
    Contribuente.countDocuments({ stato: 'attivo' }),
  ]);

  const dichByStato = Object.fromEntries(dichStats.map(d => [d._id, { count: d.count, totale: d.totaleDovuto }]));
  const verByRata   = Object.fromEntries(verStats.map(v => [v._id,   { count: v.count, totale: v.totale }]));
  const attiByStato = Object.fromEntries(attiStats.map(a => [a._id,  { count: a.count, totale: a.totale }]));

  res.json({
    success: true,
    data: {
      anno,
      contribuenti: contribuentiTot,
      dichiarazioni: dichByStato,
      versamenti: verByRata,
      atti: attiByStato,
    },
  });
});

exports.andamentoVersamenti = asyncHandler(async (req, res) => {
  const anno = Number(req.query.anno) || new Date().getFullYear();
  const data = await VersamentoIMU.aggregate([
    { $match: { annoImposta: anno, stato: { $ne: 'annullato' } } },
    { $group: {
      _id: { mese: { $month: '$dataVersamento' } },
      totaleVersato: { $sum: '$importoVersato' },
      count: { $sum: 1 },
    }},
    { $sort: { '_id.mese': 1 } },
  ]);
  res.json({ success: true, data });
});
