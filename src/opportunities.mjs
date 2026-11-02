import { mkdir, open, readFile, readdir, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { hash, WorkflowError } from './marketing.mjs';

// A2A is one channel among several. Each channel feeds the same registry.
export const CHANNELS = Object.freeze([
  'a2a', 'web_form', 'partner_program', 'marketplace', 'directory', 'referral', 'inbound_email', 'manual'
]);
export const STAGES = Object.freeze([
  'CAPTURED', 'QUALIFIED', 'MATERIAL_READY', 'PROPOSAL_PREPARED',
  'PROPOSAL_AUTHORIZED', 'SENT', 'REPLIED', 'NEGOTIATION', 'WON', 'LOST', 'DISQUALIFIED'
]);
const transitions = {
  CAPTURED: ['QUALIFIED', 'DISQUALIFIED', 'LOST'],
  QUALIFIED: ['MATERIAL_READY', 'DISQUALIFIED', 'LOST'],
  MATERIAL_READY: ['PROPOSAL_PREPARED', 'DISQUALIFIED', 'LOST'],
  PROPOSAL_PREPARED: ['PROPOSAL_AUTHORIZED', 'DISQUALIFIED', 'LOST'],
  // SENT is only reachable through an authorized outbound adapter, never automatically.
  PROPOSAL_AUTHORIZED: ['SENT', 'DISQUALIFIED', 'LOST'],
  SENT: ['REPLIED', 'LOST'],
  REPLIED: ['NEGOTIATION', 'LOST'],
  NEGOTIATION: ['WON', 'LOST'],
  WON: [], LOST: [], DISQUALIFIED: []
};

const text = (value, name, limit = 200) => {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new WorkflowError('INVALID_INPUT', `${name} must be 1-${limit} characters`);
  return value.trim();
};
const optionalText = (value, name, limit = 500) => value === undefined || value === null || value === '' ? null : text(value, name, limit);

function maskEmail(value) {
  if (!value) return null;
  const [user, domain] = String(value).split('@');
  if (!domain) return '[contacto reservado]';
  return `${user.slice(0, 2)}***@${domain}`;
}
function maskPhone(value) {
  if (!value) return null;
  return `***${String(value).replace(/\D/g, '').slice(-3)}`;
}

export class OpportunityRegistry {
  constructor({ stateDir, now = () => new Date().toISOString() }) {
    if (!path.isAbsolute(stateDir)) throw new WorkflowError('INVALID_STORAGE', 'Absolute state path is required');
    this.base = path.join(stateDir, 'opportunities');
    this.now = now;
  }
  tenantDir(tenantId) { return path.join(this.base, hash(tenantId).slice(0, 24)); }
  file(tenantId, opportunityId) { return path.join(this.tenantDir(tenantId), `${opportunityId}.json`); }
  static id(tenantId, channel, externalRef) { return hash(JSON.stringify([tenantId, channel, externalRef])).slice(0, 32); }

  async read(tenantId, opportunityId) {
    try { return JSON.parse(await readFile(this.file(tenantId, opportunityId), 'utf8')); }
    catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
  }
  async write(record) {
    const dir = this.tenantDir(record.tenantId);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const target = this.file(record.tenantId, record.opportunityId);
    const temp = `${target}.${randomUUID()}.tmp`;
    const fd = await open(temp, 'wx', 0o600);
    try { await fd.writeFile(JSON.stringify(record, null, 2) + '\n'); await fd.sync(); } finally { await fd.close(); }
    await rename(temp, target);
    return record;
  }

  async capture(input) {
    const tenantId = text(input.tenantId, 'tenantId', 120);
    const channel = input.channel;
    if (!CHANNELS.includes(channel)) throw new WorkflowError('INVALID_CHANNEL', `channel must be one of ${CHANNELS.join(', ')}`);
    const provenance = input.provenance === 'synthetic' ? 'synthetic' : 'real';
    if (input.provenance !== undefined && !['real', 'synthetic'].includes(input.provenance)) {
      throw new WorkflowError('INVALID_PROVENANCE', 'provenance must be real or synthetic');
    }
    const externalRef = text(input.externalRef, 'externalRef', 160);
    const company = text(input.company, 'company', 160);
    const contact = { name: optionalText(input.contactName, 'contactName', 120), email: maskEmail(input.contactEmail), phone: maskPhone(input.contactPhone) };
    const opportunityId = OpportunityRegistry.id(tenantId, channel, externalRef);
    const fingerprint = hash(JSON.stringify([tenantId, channel, externalRef, company, contact, input.sourceUrl || null]));
    const existing = await this.read(tenantId, opportunityId);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new WorkflowError('OPPORTUNITY_CONFLICT', 'Same reference captured with different data');
      return { ...existing, replay: true };
    }
    const sourceUrl = optionalText(input.sourceUrl, 'sourceUrl', 500);
    if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) throw new WorkflowError('INVALID_SOURCE_URL', 'sourceUrl must use https');
    const record = {
      schemaVersion: 1, opportunityId, tenantId, channel, externalRef, company, contact,
      consentToContact: input.consentToContact === true,
      provenance, sourceUrl, fingerprint, stage: 'CAPTURED',
      revenue: null, notes: optionalText(input.notes, 'notes', 1000),
      createdAt: this.now(), updatedAt: this.now(),
      history: [{ stage: 'CAPTURED', at: this.now(), actor: optionalText(input.actor, 'actor', 120) || channel }]
    };
    return await this.write(record);
  }

  async transition(tenantId, opportunityId, next, { actor, reason, revenue } = {}) {
    if (!STAGES.includes(next)) throw new WorkflowError('INVALID_STAGE', 'Unknown stage');
    const record = await this.read(text(tenantId, 'tenantId', 120), text(opportunityId, 'opportunityId', 64));
    if (!record) throw new WorkflowError('NOT_FOUND', 'Unknown opportunity');
    if (!transitions[record.stage].includes(next)) throw new WorkflowError('BAD_STAGE', `${record.stage} cannot move to ${next}`);
    if (next === 'SENT') throw new WorkflowError('SEND_REQUIRES_ADAPTER', 'External sending is only allowed through an authorized outbound adapter');
    if (next === 'WON') {
      if (!revenue || typeof revenue.amount !== 'number' || !Number.isFinite(revenue.amount) || revenue.amount < 0) throw new WorkflowError('REVENUE_REQUIRED', 'WON requires a verified numeric revenue');
      if (!revenue.currency || !/^[A-Z]{3}$/.test(revenue.currency)) throw new WorkflowError('REVENUE_REQUIRED', 'WON requires an ISO currency');
      if (!revenue.evidenceRef) throw new WorkflowError('REVENUE_REQUIRED', 'WON requires evidence for the revenue');
      record.revenue = { amount: revenue.amount, currency: revenue.currency, evidenceRef: revenue.evidenceRef, verified: true, recordedAt: this.now() };
    }
    record.stage = next;
    record.updatedAt = this.now();
    record.history.push({ stage: next, at: this.now(), actor: optionalText(actor, 'actor', 120) || 'system', reason: optionalText(reason, 'reason', 300) });
    return await this.write(record);
  }

  async markSent(tenantId, opportunityId, receipt) {
    const record = await this.read(text(tenantId, 'tenantId', 120), text(opportunityId, 'opportunityId', 64));
    if (!record) throw new WorkflowError('NOT_FOUND', 'Unknown opportunity');
    if (record.stage !== 'PROPOSAL_AUTHORIZED') throw new WorkflowError('BAD_STAGE', 'Only an authorized proposal can be sent');
    if (!receipt || receipt.status !== 'DELIVERED' || !receipt.adapter || !receipt.messageId) throw new WorkflowError('INVALID_RECEIPT', 'A delivered adapter receipt is required');
    record.stage = 'SENT';
    record.transport = { adapter: receipt.adapter, messageId: receipt.messageId, at: this.now() };
    record.updatedAt = this.now();
    record.history.push({ stage: 'SENT', at: this.now(), actor: receipt.adapter, reason: 'adapter_receipt' });
    return await this.write(record);
  }

  async list({ tenantId, channel, stage } = {}) {
    const roots = tenantId ? [this.tenantDir(text(tenantId, 'tenantId', 120))] : await this.allTenantDirs();
    const records = [];
    for (const dir of roots) {
      let files;
      try { files = await readdir(dir); } catch (error) { if (error?.code === 'ENOENT') continue; throw error; }
      for (const name of files) {
        if (!name.endsWith('.json')) continue;
        const record = JSON.parse(await readFile(path.join(dir, name), 'utf8'));
        if (channel && record.channel !== channel) continue;
        if (stage && record.stage !== stage) continue;
        records.push(record);
      }
    }
    return records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  async allTenantDirs() {
    try { return (await readdir(this.base, { withFileTypes: true })).filter(x => x.isDirectory()).map(x => path.join(this.base, x.name)); }
    catch (error) { if (error?.code === 'ENOENT') return []; throw error; }
  }
}
