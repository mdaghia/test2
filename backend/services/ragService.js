'use strict';
/**
 * RAG Service — gestisce indicizzazione documenti e retrieval vettoriale
 * Stack: Voyage AI (embeddings) + Qdrant (vector store)
 */
const { QdrantClient } = require('@qdrant/js-client-rest');
const { VoyageAIClient } = require('voyageai');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const COLLECTION   = 'tributi_docs';
const VECTOR_SIZE  = 1024;          // voyage-3 output dimension
const CHUNK_SIZE   = 800;           // chars per chunk
const CHUNK_OVERLAP = 100;          // chars overlap

// ── Clients ────────────────────────────────────────────────────────────────
const qdrant = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });

const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

// ── Collection bootstrap ───────────────────────────────────────────────────
async function ensureCollection() {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(c => c.name === COLLECTION);
  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
    });
    logger.info(`Qdrant collection "${COLLECTION}" created`);
  }
}

// ── Text extraction ────────────────────────────────────────────────────────
async function extractText(buffer, mimetype) {
  if (mimetype === 'application/pdf' || mimetype === 'application/x-pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  // plain text / markdown
  return buffer.toString('utf-8');
}

// ── Chunking ───────────────────────────────────────────────────────────────
function chunkText(text) {
  const chunks = [];
  let start = 0;
  const clean = text.replace(/\s+/g, ' ').trim();
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter(c => c.trim().length > 20);
}

// ── Embedding ──────────────────────────────────────────────────────────────
async function embedTexts(texts) {
  const res = await voyage.embed({ input: texts, model: 'voyage-3' });
  return res.data.map(d => d.embedding);
}

// ── Index document ─────────────────────────────────────────────────────────
async function indexDocument(buffer, mimetype, meta) {
  await ensureCollection();

  const text   = await extractText(buffer, mimetype);
  const chunks = chunkText(text);

  if (chunks.length === 0) throw new Error('Nessun testo estraibile dal documento');

  // Batch embed (Voyage max 128 per request)
  const allEmbeddings = [];
  for (let i = 0; i < chunks.length; i += 64) {
    const batch = chunks.slice(i, i + 64);
    const embs  = await embedTexts(batch);
    allEmbeddings.push(...embs);
  }

  const ids = chunks.map(() => uuidv4());

  const points = chunks.map((chunk, idx) => ({
    id: ids[idx],
    vector: allEmbeddings[idx],
    payload: {
      documentoId: meta.documentoId,
      titolo:      meta.titolo,
      tipo:        meta.tipo,
      tributo:     meta.tributo,
      anno:        meta.anno,
      chunkIndex:  idx,
      testo:       chunk,
    },
  }));

  await qdrant.upsert(COLLECTION, { points });

  logger.info(`Indexed ${chunks.length} chunks for doc ${meta.documentoId}`);
  return { chunks: chunks.length, qdrantIds: ids };
}

// ── Query RAG ─────────────────────────────────────────────────────────────
async function queryRAG(query, { tributo, anno } = {}, topK = 6) {
  await ensureCollection();

  const [queryEmb] = await embedTexts([query]);

  const filter = { must: [] };
  if (tributo && tributo !== 'entrambi') {
    filter.must.push({
      should: [
        { key: 'tributo', match: { value: tributo } },
        { key: 'tributo', match: { value: 'entrambi' } },
      ],
    });
  }
  if (anno) {
    filter.must.push({
      should: [
        { key: 'anno', match: { value: anno } },
        { key: 'anno', is_null: true },
      ],
    });
  }

  const searchParams = {
    vector: queryEmb,
    limit: topK,
    with_payload: true,
    score_threshold: 0.35,
  };
  if (filter.must.length > 0) searchParams.filter = filter;

  const results = await qdrant.search(COLLECTION, searchParams);
  return results.map(r => ({
    documentoId: r.payload.documentoId,
    titolo:      r.payload.titolo,
    tipo:        r.payload.tipo,
    punteggio:   r.score,
    estratto:    r.payload.testo,
  }));
}

// ── Delete document vectors ────────────────────────────────────────────────
async function deleteDocumentVectors(documentoId) {
  await qdrant.delete(COLLECTION, {
    filter: { must: [{ key: 'documentoId', match: { value: documentoId } }] },
  });
}

module.exports = { indexDocument, queryRAG, deleteDocumentVectors, ensureCollection };
