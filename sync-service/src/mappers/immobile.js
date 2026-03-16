'use strict';
/**
 * Mapper ACSOR.IMMOBILI + POSSESSI → MongoDB Immobile schema
 *
 * Immobile fields: foglio, particella, subalterno, sezione, categoriaCatastale,
 *   classe, consistenza, renditaCatastale, indirizzo, civico, cap, comune,
 *   provincia, tipoUtilizzo, possessori[{contribuente,quota,diritto,dataInizio}],
 *   acsorCodSoggetto (for backend lookup → ObjectId)
 */

// ACSOR stores 'A/2', Mongo needs 'A2'
function normalizzaCategoria(cat) {
  return (cat || '').replace('/', '').trim().toUpperCase();
}

// ACSOR tipo utilizzo → MongoDB enum
const UTILIZZO_MAP = {
  'ABP':  'abitazione_principale',
  'ABS':  'abitazione_secondaria',
  'LOC':  'locato',
  'COM':  'comodato',
  'STR':  'strumentale',
  'PP':   'pertinenza_principale',
  'PS':   'pertinenza_secondaria',
  'ES':   'esente',
};

function mapTipoUtilizzo(acsVal) {
  if (!acsVal) return 'abitazione_secondaria';
  const v = acsVal.toUpperCase().trim();
  return UTILIZZO_MAP[v] || 'altro';
}

// ACSOR tipo diritto → MongoDB enum
const DIRITTO_MAP = {
  P:  'proprieta',
  C:  'proprieta',   // comproprietà → proprieta
  U:  'usufrutto',
  NT: 'proprieta',   // nuda proprietà — nessun enum dedicato, usiamo proprieta + note
  S:  'superficie',
};

function mapImmobile(row) {
  return {
    // identità catastale
    acsorId:          String(row.COD_IMMOBILE || '').trim(),
    acsorCodSoggetto: String(row.COD_SOGGETTO || '').trim(),  // backend lookup → _id

    foglio:           (row.FOGLIO    || '').trim(),
    particella:       (row.MAPPALE   || row.PARTICELLA || '').trim(),
    subalterno:       (row.SUBALTERNO || '').trim() || undefined,
    sezione:          (row.SEZIONE   || '').trim() || undefined,
    categoriaCatastale: normalizzaCategoria(row.CATEGORIA),
    classe:           (row.CLASSE    || '').trim() || undefined,
    consistenza:      row.CONSISTENZA ? String(row.CONSISTENZA) : undefined,
    renditaCatastale: row.RENDITA    ? Number(row.RENDITA)    : 0,

    // localizzazione
    indirizzo: (row.INDIRIZZO || '').trim(),
    civico:    (row.CIVICO   || '').trim() || undefined,
    cap:       (row.CAP      || '').trim() || undefined,
    comune:    (row.COMUNE_CATASTO || '').trim(),
    provincia: undefined,  // non sempre presente in ACSOR catasto

    // utilizzo
    tipoUtilizzo: mapTipoUtilizzo(row.TIPO_UTILIZZO),

    // possesso (singolo da JOIN POSSESSI)
    percentualePossesso: row.PERC_POSSESSO ? Number(row.PERC_POSSESSO) : 100,
    diritto: DIRITTO_MAP[(row.TIPO_DIRITTO || 'P').toUpperCase()] || 'proprieta',
    dataInizioPossesso: row.DATA_INIZIO_VALIDITA ? new Date(row.DATA_INIZIO_VALIDITA) : new Date('2000-01-01'),
  };
}

module.exports = { mapImmobile };
