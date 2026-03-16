'use strict';
/**
 * Claude Chat Service — RAG-augmented conversational assistant
 * Usa Claude claude-haiku-4-5 per risposte veloci + context da Qdrant + MongoDB
 */
const Anthropic = require('@anthropic-ai/sdk');
const { queryRAG } = require('./ragService');
const logger = require('../utils/logger');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_BASE = `Sei un assistente esperto in tributi comunali italiani, specializzato in IMU e TARI.
Lavori per il sistema di gestione tributaria del Comune.
Rispondi in italiano, con precisione normativa, citando articoli di legge quando pertinenti.

Normativa di riferimento che conosci:
- IMU: D.Lgs. 504/1992, D.L. 201/2011 art.13, L. 160/2019 (nuova IMU)
- TARI: L. 147/2013 art.1 c.641-668, DPR 158/1999 (metodo normalizzato)
- Catasto: DM 701/1994 (moltiplicatori categorie catastali)
- Ravvedimento: D.Lgs. 472/1997 art.13
- F24: codici tributo IMU (3912-3930), TARI (3944-3946)

Comportamento:
- Se hai contesto dai documenti del Comune (delibere, regolamenti), usalo in priorità
- Se hai i parametri live (aliquote, tariffe), usali per i calcoli
- Se non hai informazioni sufficienti, dillo chiaramente
- Fornisci calcoli passo-passo quando richiesto
- Non inventare delibere o numeri che non hai nel contesto`;

// ── Fetch live DB context ──────────────────────────────────────────────────
async function fetchLiveContext(anno) {
  try {
    const AliquotaIMU  = require('../models/AliquotaIMU');
    const TariffaTARI  = require('../models/TariffaTARI');
    const [aliquote, tariffe] = await Promise.all([
      AliquotaIMU.find({ anno, stato: { $ne: 'annullata' } }).lean().limit(20),
      TariffaTARI.find({ anno, stato: { $ne: 'annullata' } }).lean().limit(30),
    ]);
    return { aliquote, tariffe };
  } catch (err) {
    logger.warn('fetchLiveContext error', err.message);
    return { aliquote: [], tariffe: [] };
  }
}

function formatLiveContext({ aliquote, tariffe }, anno) {
  let ctx = '';
  if (aliquote.length > 0) {
    ctx += `\n## Aliquote IMU ${anno} (dal database comunale)\n`;
    aliquote.forEach(a => {
      ctx += `- ${a.tipoImmobile}: ${a.aliquota}‰`;
      if (a.detrazione) ctx += `, detrazione €${a.detrazione}`;
      if (a.esente) ctx += ` [ESENTE]`;
      ctx += '\n';
    });
  }
  if (tariffe.length > 0) {
    ctx += `\n## Tariffe TARI ${anno} (dal database comunale)\n`;
    tariffe.slice(0, 10).forEach(t => {
      ctx += `- ${t.tipo} cat.${t.categoria}: Ka=${t.ka}, Kb=${t.kb}`;
      if (t.kc) ctx += `, Kc=${t.kc}, Kd=${t.kd}`;
      ctx += '\n';
    });
  }
  return ctx;
}

function formatRagContext(chunks) {
  if (!chunks.length) return '';
  let ctx = '\n## Documenti normativi del Comune (estratti rilevanti)\n';
  chunks.forEach((c, i) => {
    ctx += `\n### [${i + 1}] ${c.titolo} (score: ${c.punteggio.toFixed(2)})\n`;
    ctx += c.estratto + '\n';
  });
  return ctx;
}

// ── Main streaming function ───────────────────────────────────────────────
/**
 * @param {Array}  messages   Array of {role, content} (ultima = domanda utente)
 * @param {Object} options    { anno, tributo }
 * @param {Object} res        Express response (SSE)
 * @returns {Object}          { risposta, fonti }
 */
async function streamChat(messages, options = {}, res) {
  const { anno = new Date().getFullYear(), tributo = 'entrambi' } = options;
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';

  // Parallel: RAG + DB context
  const [ragChunks, liveCtx] = await Promise.all([
    queryRAG(lastUserMsg, { tributo, anno }),
    fetchLiveContext(anno),
  ]);

  const contextSection =
    formatRagContext(ragChunks) +
    formatLiveContext(liveCtx, anno);

  const systemPrompt = SYSTEM_BASE +
    (contextSection ? `\n\n# CONTESTO DISPONIBILE\n${contextSection}` : '');

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send sources before streaming text
  res.write(`data: ${JSON.stringify({ type: 'fonti', fonti: ragChunks })}\n\n`);

  // Stream from Claude
  let fullText = '';
  try {
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.contenuto || m.content })),
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        const text = chunk.delta.text;
        fullText += text;
        res.write(`data: ${JSON.stringify({ type: 'token', text })}\n\n`);
      }
    }
  } catch (err) {
    logger.error('Claude stream error', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Errore nella generazione della risposta' })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();

  return { risposta: fullText, fonti: ragChunks };
}

module.exports = { streamChat };
