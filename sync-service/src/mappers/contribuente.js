'use strict';
/**
 * Mapper ACSOR.SOGGETTI → MongoDB Contribuente schema
 *
 * Contribuente fields: tipo, nome, cognome, dataNascita, luogoNascita, sesso,
 *   ragioneSociale, codiceFiscale, partitaIva, email, pec, telefono,
 *   residenza { via, civico, cap, comune, provincia }, acsorId
 */
function mapContribuente(row) {
  const isFisico = (row.TIPO_SOGGETTO || 'F').toUpperCase() === 'F';

  const doc = {
    acsorId:       String(row.COD_SOGGETTO || '').trim(),
    codiceFiscale: (row.CODICE_FISCALE || '').trim().toUpperCase(),
    tipo:          isFisico ? 'persona_fisica' : 'persona_giuridica',
  };

  if (row.PARTITA_IVA?.trim()) doc.partitaIva = row.PARTITA_IVA.trim();

  if (isFisico) {
    doc.cognome     = (row.COGNOME || '').trim();
    doc.nome        = (row.NOME    || '').trim();
    doc.sesso       = (row.SESSO   || '').toUpperCase() || undefined;
    doc.dataNascita = row.DATA_NASCITA ? new Date(row.DATA_NASCITA) : undefined;
    doc.luogoNascita = row.COMUNE_NASCITA
      ? [row.COMUNE_NASCITA.trim(), row.PROV_NASCITA?.trim()].filter(Boolean).join(' ')
      : undefined;
  } else {
    doc.ragioneSociale = (row.RAGIONE_SOCIALE || '').trim();
  }

  // Contatti
  if (row.EMAIL?.trim())    doc.email    = row.EMAIL.trim();
  if (row.PEC?.trim())      doc.pec      = row.PEC.trim();
  if (row.TELEFONO?.trim()) doc.telefono = row.TELEFONO.trim();

  // Residenza / sede legale → residenza.via (not indirizzo)
  doc.residenza = {
    via:       (row.INDIRIZZO_RES || '').trim(),
    civico:    (row.CIVICO_RES    || '').trim(),
    cap:       (row.CAP_RES       || '').trim(),
    comune:    (row.COMUNE_RES    || '').trim(),
    provincia: (row.PROV_RES      || '').trim().toUpperCase(),
  };

  return doc;
}

module.exports = { mapContribuente };
