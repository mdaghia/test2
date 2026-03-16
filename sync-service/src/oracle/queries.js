'use strict';
/**
 * Query Oracle ACSOR
 *
 * Schema ACSOR standard per Comuni italiani:
 *   ACSOR.SOGGETTI    — anagrafica contribuenti (persone fisiche e giuridiche)
 *   ACSOR.IMMOBILI    — unità immobiliari catastali
 *   ACSOR.POSSESSI    — tabella di associazione soggetto-immobile con % possesso
 *
 * Le query sono parametrizzate tramite ORACLE_SCHEMA (default: ACSOR).
 * Per i delta sync si filtra su DATA_MOD >= :since
 */

const SCHEMA = process.env.ORACLE_SCHEMA || 'ACSOR';

// ── Soggetti (Contribuenti) ────────────────────────────────────────────────

const SQL_SOGGETTI_FULL = `
  SELECT
    s.COD_SOGGETTO,
    s.CODICE_FISCALE,
    s.PARTITA_IVA,
    s.TIPO_SOGGETTO,           -- 'F'=persona fisica, 'G'=giuridica
    s.COGNOME,
    s.NOME,
    s.RAGIONE_SOCIALE,
    s.DATA_NASCITA,
    s.COMUNE_NASCITA,
    s.PROV_NASCITA,
    s.SESSO,
    s.INDIRIZZO_RES,
    s.CIVICO_RES,
    s.CAP_RES,
    s.COMUNE_RES,
    s.PROV_RES,
    s.EMAIL,
    s.PEC,
    s.TELEFONO,
    s.DATA_INIZIO_VALIDITA,
    s.DATA_FINE_VALIDITA,
    s.DATA_MOD
  FROM ${SCHEMA}.SOGGETTI s
  WHERE s.DATA_FINE_VALIDITA IS NULL
    OR s.DATA_FINE_VALIDITA > SYSDATE
  ORDER BY s.COD_SOGGETTO
`;

const SQL_SOGGETTI_DELTA = `
  SELECT
    s.COD_SOGGETTO,
    s.CODICE_FISCALE,
    s.PARTITA_IVA,
    s.TIPO_SOGGETTO,
    s.COGNOME,
    s.NOME,
    s.RAGIONE_SOCIALE,
    s.DATA_NASCITA,
    s.COMUNE_NASCITA,
    s.PROV_NASCITA,
    s.SESSO,
    s.INDIRIZZO_RES,
    s.CIVICO_RES,
    s.CAP_RES,
    s.COMUNE_RES,
    s.PROV_RES,
    s.EMAIL,
    s.PEC,
    s.TELEFONO,
    s.DATA_INIZIO_VALIDITA,
    s.DATA_FINE_VALIDITA,
    s.DATA_MOD
  FROM ${SCHEMA}.SOGGETTI s
  WHERE s.DATA_MOD >= :since
  ORDER BY s.COD_SOGGETTO
`;

// ── Immobili (con JOIN possessi per % proprietà) ───────────────────────────

const SQL_IMMOBILI_FULL = `
  SELECT
    i.COD_IMMOBILE,
    p.COD_SOGGETTO,
    p.PERC_POSSESSO,
    p.TIPO_DIRITTO,            -- 'P'=proprietà, 'U'=usufrutto, 'NT'=nuda proprietà
    i.SEZIONE,
    i.FOGLIO,
    i.MAPPALE,                 -- = PARTICELLA
    i.SUBALTERNO,
    i.CATEGORIA,               -- A/2, C/1, D/7, etc.
    i.CLASSE,
    i.CONSISTENZA,
    i.RENDITA,
    i.INDIRIZZO,
    i.CIVICO,
    i.CAP,
    i.COMUNE_CATASTO,
    i.COD_BELFIORE,
    i.PIANO,
    i.DATA_INIZIO_VALIDITA,
    i.DATA_FINE_VALIDITA,
    i.DATA_MOD
  FROM ${SCHEMA}.IMMOBILI i
  JOIN ${SCHEMA}.POSSESSI p ON p.COD_IMMOBILE = i.COD_IMMOBILE
  WHERE (i.DATA_FINE_VALIDITA IS NULL OR i.DATA_FINE_VALIDITA > SYSDATE)
    AND (p.DATA_FINE_VALIDITA IS NULL OR p.DATA_FINE_VALIDITA > SYSDATE)
  ORDER BY i.COD_IMMOBILE
`;

const SQL_IMMOBILI_DELTA = `
  SELECT
    i.COD_IMMOBILE,
    p.COD_SOGGETTO,
    p.PERC_POSSESSO,
    p.TIPO_DIRITTO,
    i.SEZIONE,
    i.FOGLIO,
    i.MAPPALE,
    i.SUBALTERNO,
    i.CATEGORIA,
    i.CLASSE,
    i.CONSISTENZA,
    i.RENDITA,
    i.INDIRIZZO,
    i.CIVICO,
    i.CAP,
    i.COMUNE_CATASTO,
    i.COD_BELFIORE,
    i.PIANO,
    i.DATA_INIZIO_VALIDITA,
    i.DATA_FINE_VALIDITA,
    i.DATA_MOD
  FROM ${SCHEMA}.IMMOBILI i
  JOIN ${SCHEMA}.POSSESSI p ON p.COD_IMMOBILE = i.COD_IMMOBILE
  WHERE i.DATA_MOD >= :since
    OR p.DATA_MOD >= :since
  ORDER BY i.COD_IMMOBILE
`;

// ── Count queries (for pagination / progress) ─────────────────────────────
const SQL_COUNT_SOGGETTI = `SELECT COUNT(*) AS CNT FROM ${SCHEMA}.SOGGETTI WHERE DATA_FINE_VALIDITA IS NULL OR DATA_FINE_VALIDITA > SYSDATE`;
const SQL_COUNT_IMMOBILI = `SELECT COUNT(*) AS CNT FROM ${SCHEMA}.IMMOBILI i JOIN ${SCHEMA}.POSSESSI p ON p.COD_IMMOBILE = i.COD_IMMOBILE WHERE (i.DATA_FINE_VALIDITA IS NULL OR i.DATA_FINE_VALIDITA > SYSDATE)`;

module.exports = {
  SQL_SOGGETTI_FULL,
  SQL_SOGGETTI_DELTA,
  SQL_IMMOBILI_FULL,
  SQL_IMMOBILI_DELTA,
  SQL_COUNT_SOGGETTI,
  SQL_COUNT_IMMOBILI,
};
