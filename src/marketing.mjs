import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export class WorkflowError extends Error {
  constructor(code, message) { super(message); this.name = 'WorkflowError'; this.code = code; }
}
export const hash = value => createHash('sha256').update(value).digest('hex');
const safe = value => JSON.stringify(value, null, 2) + '\n';
const allowedEvents = new Set([
  'a2a.partner.received', 'a2a.partner.reply.received', 'marketing.a2a.material.requested'
]);
const statuses = new Set(['DRAFT_REVIEW_REQUIRED', 'APPROVED_FOR_HANDOFF', 'QUEUED_FOR_A2A', 'REPLY_REVIEW_REQUIRED']);
const LOCK_STALE_MS = 5 * 60 * 1000;
const UNREADABLE_LOCK_STALE_MS = 30 * 1000;
const exact = (value, name, limit = 200) => {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new WorkflowError('INVALID_INPUT', `${name} must be 1-${limit} characters`);
  return value.trim();
};
const optional = (value, name, limit = 1000) => value === undefined || value === null ? '' : exact(value, name, limit);
const selectLang = lang => lang === 'en' ? 'en' : lang === 'es' || lang === undefined ? 'es' : (() => { throw new WorkflowError('INVALID_LANGUAGE', 'Only es/en are supported'); })();

export function normalizeEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event) || !allowedEvents.has(event.type)) throw new WorkflowError('INVALID_EVENT', 'Unsupported marketing/A2A event');
  const normalized = {
    eventId: exact(event.eventId, 'eventId', 120),
    type: event.type,
    tenantId: exact(event.tenantId, 'tenantId', 120),
    partnerId: exact(event.partnerId, 'partnerId', 120),
    partnerName: exact(event.partnerName, 'partnerName', 120),
    subject: exact(event.subject, 'subject', 160),
    message: exact(event.message, 'message', 5000),
    language: selectLang(event.language),
    reference: optional(event.reference, 'reference', 120),
    source: exact(event.source, 'source', 80),
    sourceReceipt: optional(event.sourceReceipt, 'sourceReceipt', 240),
    consentToShareDetails: event.consentToShareDetails === true
  };
  if (event.consentToShareDetails !== undefined && typeof event.consentToShareDetails !== 'boolean') throw new WorkflowError('INVALID_CONSENT', 'Consent must be boolean');
  if (event.source === 'external-a2a' && !normalized.sourceReceipt) throw new WorkflowError('MISSING_RECEIPT', 'Authenticated A2A receipt required for external message');
  if (event.source !== 'external-a2a' && event.source !== 'operator') throw new WorkflowError('INVALID_SOURCE', 'Only operator or verified external-a2a sources accepted');
  return normalized;
}

function sanitizeExternal(text) {
  // Until disclosure consent is verified by a human, mask possible identifying details.
  // Horizontal characters only: a vertical \s would mask figures across line breaks.
  return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo reservado]')
    .replace(/\+?\d[\d \t().-]{7,}\d/g, '[teléfono reservado]')
    .replace(/https?:\/\/\S+/gi, '[enlace pendiente de revisión]');
}

export function createMaterial(event, config) {
  const context = sanitizeExternal(event.message).slice(0, 800);
  const sender = sanitizeExternal(event.partnerName);
  const brand = config.operatorOrganization || 'Boltech Group';
  const offered = event.language === 'en' && Array.isArray(config.offeringsEn) ? config.offeringsEn : config.offerings;
  const offer = Array.isArray(offered) ? offered.slice(0, 3) : [];
  if (!offer.length || !config.commercialDomain?.startsWith('https://')) throw new WorkflowError('INVALID_CONFIG', 'Offerings and official company website required');
  const en = event.language === 'en';
  const followUp = event.type === 'a2a.partner.reply.received';
  const subject = en ? `${brand} | ${followUp ? 'Partnership follow-up' : 'Partnership introduction'}` : `${brand} | ${followUp ? 'Seguimiento de alianza' : 'Presentación de alianza'}`;
  const body = en ? [
    `Hello ${sender},`, '',
    `Thank you for ${followUp ? 'your reply' : 'the opportunity to connect'}. ${brand} develops business-oriented AI agents.`,
    'Our current service categories are:', ...offer.map(x => `- ${x}`), '',
    `Context shared for review: ${context}`,
    'We would welcome a conversation to validate technical fit, scope, and mutually agreed conditions.',
    `Official website: ${config.commercialDomain}`, '',
    'This draft requires human approval. It does not commit either organization to a partnership.'
  ].join('\n') : [
    `Hola ${sender}:`, '',
    `Gracias por ${followUp ? 'tu respuesta' : 'la oportunidad de conversar'}. ${brand} desarrolla agentes de IA orientados a procesos empresariales.`,
    'Nuestras líneas de servicio actuales son:', ...offer.map(x => `- ${x}`), '',
    `Contexto recibido para evaluación: ${context}`,
    'Podemos revisar el encaje técnico, el alcance y las condiciones que ambas organizaciones acuerden.',
    `Sitio oficial: ${config.commercialDomain}`, '',
    'Borrador sujeto a aprobación humana. No establece compromisos comerciales.'
  ].join('\n');
  return { subject, body, format: 'text/plain', audience: 'partner-agent', language: event.language, claims: 'ONLY_CONFIGURED_OFFERINGS' };
}

const fileName = (tenant, event) => hash(JSON.stringify([tenant, event]));
async function loadJson(file) { return JSON.parse(await readFile(file, 'utf8')); }
async function readJsonOrNull(file) { try { return await loadJson(file); } catch { return null; } }
async function writeAtomic(file, value) {
  const temp = `${file}.${randomUUID()}.tmp`;
  const fd = await open(temp, 'wx', 0o600);
  try { await fd.writeFile(safe(value)); await fd.sync(); } finally { await fd.close(); }
  await rename(temp, file);
}
async function ensureDir(dir) { await mkdir(dir, { recursive: true, mode: 0o700 }); }

const isProcessAlive = pid => {
  try { process.kill(pid, 0); return true; } catch (error) { return error?.code === 'EPERM'; }
};

// A lock is reclaimable only when its owner cannot still be running: dead PID on
// this host, older than the TTL, or unreadable long enough that no writer is mid-create.
async function lockIsStale(lock) {
  const info = await readJsonOrNull(lock);
  if (info === null) {
    try { const details = await stat(lock); return Date.now() - details.mtimeMs > UNREADABLE_LOCK_STALE_MS; }
    catch { return false; }
  }
  const sameHost = !info.host || info.host === os.hostname();
  if (typeof info.pid === 'number' && sameHost && !isProcessAlive(info.pid)) return true;
  return typeof info.startedAt === 'number' && Date.now() - info.startedAt > LOCK_STALE_MS;
}

async function acquireLock(lock) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = await open(lock, 'wx', 0o600);
      try {
        await fd.writeFile(JSON.stringify({ pid: process.pid, host: os.hostname(), startedAt: Date.now() }) + '\n');
        await fd.sync();
      } finally { await fd.close(); }
      return;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      if (attempt === 0 && await lockIsStale(lock)) { await unlink(lock).catch(() => {}); continue; }
      throw new WorkflowError('BUSY', 'Operation in progress; run reconcile if no process is active');
    }
  }
  throw new WorkflowError('BUSY', 'Operation in progress; run reconcile if no process is active');
}

export class MarketingWorkflow {
  constructor({ stateDir, config, now = () => new Date().toISOString() }) {
    if (!path.isAbsolute(stateDir)) throw new WorkflowError('INVALID_STORAGE', 'Absolute state path is required');
    this.base = stateDir;
    this.config = config;
    this.now = now;
  }
  folder(tenantId, eventId) { return path.join(this.base, 'jobs', fileName(tenantId, eventId)); }
  async receive(rawEvent) {
    const event = normalizeEvent(rawEvent);
    const folder = this.folder(event.tenantId, event.eventId);
    const fingerprint = hash(JSON.stringify(event));
    await ensureDir(path.join(this.base, 'jobs'));
    try { await mkdir(folder, { recursive: false, mode: 0o700 }); }
    catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const prior = await this.read(event.tenantId, event.eventId);
      if (!prior) throw new WorkflowError('INCOMPLETE_EVENT', 'Existing event processing incomplete; run "cli reconcile --apply" before retry');
      if (prior.fingerprint !== fingerprint) throw new WorkflowError('EVENT_CONFLICT', 'Same event ID was submitted with changed contents');
      return { ...prior, replay: true };
    }
    const draft = createMaterial(event, this.config);
    const record = {
      schemaVersion: 1, jobId: fileName(event.tenantId, event.eventId),
      tenantId: event.tenantId, eventId: event.eventId, fingerprint,
      partnerId: event.partnerId, partnerName: event.partnerName,
      originType: event.type, source: event.source,
      sourceReceipt: event.sourceReceipt || null, replyTo: event.reference || null,
      state: 'DRAFT_REVIEW_REQUIRED', draft, approval: null,
      handoff: null, createdAt: this.now(), updatedAt: this.now()
    };
    await writeAtomic(path.join(folder, 'state.json'), record);
    return record;
  }
  async read(tenantId, eventId) {
    try { return await loadJson(path.join(this.folder(tenantId, eventId), 'state.json')); }
    catch(e) { if (e?.code === 'ENOENT') return null; throw e; }
  }
  async update(tenantId, eventId, expectedState, updater) {
    const dir = this.folder(tenantId, eventId);
    const lock = path.join(dir, 'operation.lock');
    try { await acquireLock(lock); }
    catch (error) {
      if (error?.code === 'ENOENT') throw new WorkflowError('NOT_FOUND', 'Unknown event');
      throw error;
    }
    try {
      const record = await this.read(tenantId, eventId);
      if (!record) throw new WorkflowError('NOT_FOUND', 'Unknown event');
      if (record.state !== expectedState) throw new WorkflowError('BAD_STATE', `Expected ${expectedState}; got ${record.state}`);
      const next = updater(record);
      if (!statuses.has(next.state)) throw new WorkflowError('BAD_STATE', 'Invalid workflow state');
      next.updatedAt = this.now();
      await writeAtomic(path.join(dir, 'state.json'), next);
      return next;
    } finally { await unlink(lock).catch(() => {}); }
  }
  async approve(tenantId, eventId, operatorId) {
    const human = exact(operatorId, 'operatorId', 120);
    return await this.update(tenantId, eventId, 'DRAFT_REVIEW_REQUIRED', record => ({
      ...record, state: 'APPROVED_FOR_HANDOFF', approval: { operatorId: human, approvedAt: this.now(), draftDigest: hash(safe(record.draft)) }
    }));
  }
  async handoff(tenantId, eventId) {
    return await this.update(tenantId, eventId, 'APPROVED_FOR_HANDOFF', record => {
      if (!record.approval || record.approval.draftDigest !== hash(safe(record.draft))) throw new WorkflowError('APPROVAL_INVALID', 'Approved draft digest changed');
      const envelope = {
        protocol: 'clonador.internal.a2a.v1', messageId: `marketing-${record.jobId}`,
        tenantId, recipientAgent: 'clonador-a2a', partnerId: record.partnerId,
        subject: record.draft.subject, message: record.draft.body,
        approval: record.approval, sourceEventId: eventId,
        instruction: 'QUEUE_FOR_REVIEW_ONLY_NO_EXTERNAL_SEND'
      };
      return { ...record, state: 'QUEUED_FOR_A2A', handoff: envelope };
    });
  }
  async incomingReply(rawEvent) {
    if (rawEvent?.type !== 'a2a.partner.reply.received') throw new WorkflowError('INVALID_EVENT', 'Partner reply event expected');
    const event = normalizeEvent(rawEvent);
    if (!event.reference) throw new WorkflowError('MISSING_REFERENCE', 'Reply requires a reference');
    return await this.receive(event);
  }
  async status() {
    const root = path.join(this.base, 'jobs');
    const byState = {}; let jobs = 0;
    let entries;
    try { entries = await readdir(root, { withFileTypes: true }); }
    catch(e) { if (e?.code === 'ENOENT') return { jobs: 0, byState, stateDir: this.base }; throw e; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
      jobs += 1;
      const record = await readJsonOrNull(path.join(root, entry.name, 'state.json'));
      const state = record && statuses.has(record.state) ? record.state : 'UNREADABLE_OR_INCOMPLETE';
      byState[state] = (byState[state] || 0) + 1;
    }
    return { jobs, byState, stateDir: this.base };
  }
  // Repairs interrupted work. Without apply it only reports what would change.
  async reconcile({ apply = false } = {}) {
    const root = path.join(this.base, 'jobs');
    const report = { applied: apply, scanned: 0, staleLocks: [], tempFiles: [], quarantined: [] };
    let entries;
    try { entries = await readdir(root, { withFileTypes: true }); }
    catch(e) { if (e?.code === 'ENOENT') return report; throw e; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
      report.scanned += 1;
      const dir = path.join(root, entry.name);
      const files = await readdir(dir);
      const lock = path.join(dir, 'operation.lock');
      if (files.includes('operation.lock') && await lockIsStale(lock)) {
        report.staleLocks.push(entry.name);
        if (apply) await unlink(lock).catch(() => {});
      }
      const temps = files.filter(name => name.endsWith('.tmp'));
      if (temps.length) {
        report.tempFiles.push({ job: entry.name, files: temps });
        if (apply) for (const name of temps) await unlink(path.join(dir, name)).catch(() => {});
      }
      const record = await readJsonOrNull(path.join(dir, 'state.json'));
      if (!record || !statuses.has(record.state)) {
        report.quarantined.push(entry.name);
        if (apply) {
          const archive = path.join(root, '_orphaned');
          await ensureDir(archive);
          await rename(dir, path.join(archive, `${entry.name}.${Date.now()}`)).catch(() => {});
        }
      }
    }
    return report;
  }
}
