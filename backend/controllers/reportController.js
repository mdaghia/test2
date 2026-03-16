'use strict';
const mongoose = require('mongoose');
const VersamentoIMU    = require('../models/VersamentoIMU');
const VersamentoTARI   = require('../models/VersamentoTARI');
const DichiarazioneIMU = require('../models/DichiarazioneIMU');
const DichiarazioneTARI = require('../models/DichiarazioneTARI');
const AttoProvvedimento = require('../models/AttoProvvedimento');
const Contribuente      = require('../models/Contribuente');
const { generateCSV, generateExcel } = require('../services/exportService');

// ── Riepilogo KPI per anno ─────────────────────────────────────────────────
exports.riepilogo = async (req, res, next) => {
  try {
    const anno = req.query.anno ? Number(req.query.anno) : new Date().getFullYear();

    const [verIMU, verTARI, nDichIMU, nDichTARI, atti, verIMUPagati, verTARIPagati] = await Promise.all([
      VersamentoIMU.aggregate([
        { $match: { annoImposta: anno, stato: { $ne: 'annullato' } } },
        { $group: { _id: null, totale: { $sum: '$importoVersato' }, count: { $sum: 1 } } },
      ]),
      VersamentoTARI.aggregate([
        { $match: { annoImposta: anno, stato: { $ne: 'annullato' } } },
        { $group: { _id: null, totale: { $sum: '$importoVersato' }, count: { $sum: 1 } } },
      ]),
      DichiarazioneIMU.countDocuments({ annoImposta: anno, stato: { $ne: 'annullata' } }),
      DichiarazioneTARI.countDocuments({ anno, stato: { $ne: 'annullata' } }),
      AttoProvvedimento.aggregate([
        { $match: { annoImposta: anno, stato: { $ne: 'annullato' } } },
        { $group: { _id: '$tipoAtto', count: { $sum: 1 }, totale: { $sum: '$totaleRichiesto' } } },
      ]),
      VersamentoIMU.countDocuments({ annoImposta: anno, stato: 'pagato' }),
      VersamentoTARI.countDocuments({ annoImposta: anno, stato: 'pagato' }),
    ]);

    const attiMap = atti.reduce((acc, a) => {
      acc[a._id] = { count: a.count, totale: a.totale || 0 };
      return acc;
    }, {});

    res.json({
      data: {
        anno,
        imu: {
          entrate:       verIMU[0]?.totale || 0,
          versamenti:    verIMU[0]?.count  || 0,
          versamentiPagati: verIMUPagati,
          dichiarazioni: nDichIMU,
        },
        tari: {
          entrate:       verTARI[0]?.totale || 0,
          versamenti:    verTARI[0]?.count  || 0,
          versamentiPagati: verTARIPagati,
          dichiarazioni: nDichTARI,
        },
        atti: attiMap,
        totaleEntrate: (verIMU[0]?.totale || 0) + (verTARI[0]?.totale || 0),
      },
    });
  } catch (err) { next(err); }
};

// ── Versamenti mensili (per grafico) ──────────────────────────────────────
exports.versamentiMensili = async (req, res, next) => {
  try {
    const anno = req.query.anno ? Number(req.query.anno) : new Date().getFullYear();

    const [imu, tari] = await Promise.all([
      VersamentoIMU.aggregate([
        { $match: { annoImposta: anno, stato: { $ne: 'annullato' } } },
        { $group: { _id: { $month: '$dataVersamento' }, totale: { $sum: '$importoVersato' } } },
        { $sort: { _id: 1 } },
      ]),
      VersamentoTARI.aggregate([
        { $match: { annoImposta: anno, stato: { $ne: 'annullato' } } },
        { $group: { _id: { $month: '$dataVersamento' }, totale: { $sum: '$importoVersato' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const months = Array.from({ length: 12 }, (_, i) => ({
      mese:  i + 1,
      label: ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][i],
      imu:   imu.find(x => x._id === i + 1)?.totale  || 0,
      tari:  tari.find(x => x._id === i + 1)?.totale || 0,
    }));

    res.json({ data: months });
  } catch (err) { next(err); }
};

// ── Estratto conto contribuente ───────────────────────────────────────────
exports.estrattoConto = async (req, res, next) => {
  try {
    const { contribuenteId, anno } = req.query;
    if (!contribuenteId) return res.status(400).json({ message: 'contribuenteId obbligatorio' });
    if (!mongoose.Types.ObjectId.isValid(contribuenteId))
      return res.status(400).json({ message: 'contribuenteId non valido' });

    const oid = new mongoose.Types.ObjectId(contribuenteId);
    const matchIMU  = { contribuente: oid, ...(anno ? { annoImposta: Number(anno) } : {}) };
    const matchTARI = { contribuente: oid, ...(anno ? { anno: Number(anno) } : {}) };
    const matchAtto = { contribuente: oid, ...(anno ? { annoImposta: Number(anno) } : {}) };

    const [contribuente, dichIMU, verIMU, dichTARI, verTARI, atti] = await Promise.all([
      Contribuente.findById(contribuenteId).lean(),
      DichiarazioneIMU.find(matchIMU).sort({ annoImposta: -1 }).lean(),
      VersamentoIMU.find(matchIMU).sort({ dataVersamento: -1 }).lean(),
      DichiarazioneTARI.find(matchTARI).sort({ anno: -1 }).lean(),
      VersamentoTARI.find({ contribuente: oid, ...(anno ? { annoImposta: Number(anno) } : {}) }).sort({ dataVersamento: -1 }).lean(),
      AttoProvvedimento.find(matchAtto).sort({ annoImposta: -1, dataEmissione: -1 }).lean(),
    ]);

    if (!contribuente) return res.status(404).json({ message: 'Contribuente non trovato' });

    // Summary totals
    const totIMU  = verIMU.reduce((s, v)  => s + (v.importoVersato || 0), 0);
    const totTARI = verTARI.reduce((s, v) => s + (v.importoVersato || 0), 0);

    res.json({
      data: {
        contribuente,
        imu:  { dichiarazioni: dichIMU,  versamenti: verIMU,  totaleVersato: totIMU  },
        tari: { dichiarazioni: dichTARI, versamenti: verTARI, totaleVersato: totTARI },
        atti,
        totaleVersato: totIMU + totTARI,
      },
    });
  } catch (err) { next(err); }
};

// ── Libro dei ruoli ────────────────────────────────────────────────────────
exports.libroRuoli = async (req, res, next) => {
  try {
    const { anno, tipoAtto, stato, page = 1, limit = 50 } = req.query;
    const q = {};
    if (anno)    q.annoImposta = Number(anno);
    if (tipoAtto) q.tipoAtto = tipoAtto;
    if (stato)   q.stato = stato;

    const skip = (Number(page) - 1) * Number(limit);
    const [atti, total] = await Promise.all([
      AttoProvvedimento.find(q)
        .populate('contribuente', 'codiceFiscale nome cognome ragioneSociale')
        .sort({ annoImposta: -1, dataEmissione: -1 })
        .skip(skip).limit(Number(limit)).lean(),
      AttoProvvedimento.countDocuments(q),
    ]);

    res.json({ data: atti, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
};

// ── Export CSV / Excel ─────────────────────────────────────────────────────
exports.exportDati = async (req, res, next) => {
  try {
    const { tipo = 'versamenti-imu', anno, format = 'csv' } = req.query;
    const annoNum = anno ? Number(anno) : null;
    let records = [];

    const popC = 'codiceFiscale nome cognome ragioneSociale';

    switch (tipo) {
      case 'versamenti-imu':
        records = await VersamentoIMU.find(annoNum ? { annoImposta: annoNum } : {})
          .populate('contribuente', popC).sort({ annoImposta: -1, dataVersamento: -1 }).lean();
        break;
      case 'versamenti-tari':
        records = await VersamentoTARI.find(annoNum ? { annoImposta: annoNum } : {})
          .populate('contribuente', popC).sort({ annoImposta: -1, dataVersamento: -1 }).lean();
        break;
      case 'dichiarazioni-imu':
        records = await DichiarazioneIMU.find(annoNum ? { annoImposta: annoNum } : {})
          .populate('contribuente', popC).sort({ annoImposta: -1 }).lean();
        break;
      case 'dichiarazioni-tari':
        records = await DichiarazioneTARI.find(annoNum ? { anno: annoNum } : {})
          .populate('contribuente', popC).sort({ anno: -1 }).lean();
        break;
      case 'libro-ruoli':
        records = await AttoProvvedimento.find(annoNum ? { annoImposta: annoNum } : {})
          .populate('contribuente', popC).sort({ annoImposta: -1, dataEmissione: -1 }).lean();
        break;
      default:
        return res.status(400).json({ message: 'tipo non supportato' });
    }

    const suffix = anno || 'tutti';

    if (format === 'excel') {
      const buffer = await generateExcel(tipo, records, anno);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${tipo}-${suffix}.xlsx"`);
      return res.send(buffer);
    }

    const csv = generateCSV(tipo, records);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${tipo}-${suffix}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) { next(err); }
};
