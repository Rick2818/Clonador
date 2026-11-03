import { createHash } from 'node:crypto';
import { WorkflowError } from './marketing.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

// Agent Cards are untrusted input: validate shape and endpoint before use.
export function validateAgentCard(card) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) throw new WorkflowError('INVALID_AGENT_CARD', 'Agent Card must be an object');
  const name = typeof card.name === 'string' ? card.name.trim() : '';
  if (name.length < 3 || name.length > 120) throw new WorkflowError('INVALID_AGENT_CARD', 'Agent Card name must be 3-120 characters');
  let parsed;
  try { parsed = new URL(String(card.url || card.endpoint || '')); }
  catch { throw new WorkflowError('INVALID_AGENT_CARD', 'Agent Card url must be an absolute URL'); }
  if (parsed.protocol !== 'https:' && !LOOPBACK.has(parsed.hostname)) {
    throw new WorkflowError('INSECURE_AGENT_CARD', 'Agent Card url must use https (loopback allowed only for local tests)');
  }
  const protocolVersion = String(card.protocolVersion || '');
  if (!/^\d+\.\d+$/.test(protocolVersion)) throw new WorkflowError('INVALID_AGENT_CARD', 'protocolVersion like "0.3" or "1.0" is required');
  const capabilities = Array.isArray(card.capabilities) ? card.capabilities.filter(x => typeof x === 'string') : [];
  if (!capabilities.some(x => ['message/send', 'tasks/send', 'a2a.message'].includes(x))) {
    throw new WorkflowError('INVALID_AGENT_CARD', 'Agent Card must declare a supported messaging capability');
  }
  return { name, url: parsed.toString(), protocolVersion, capabilities: [...capabilities].sort(), digest: digest([name, parsed.toString(), protocolVersion, [...capabilities].sort()]) };
}

export class A2AClient {
  constructor({ allowlist = [], dryRun = true, fetchImpl = globalThis.fetch, now = () => new Date().toISOString() } = {}) {
    this.allowlist = new Set(allowlist.map(x => String(x).toLowerCase()));
    this.dryRun = dryRun !== false;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.receipts = [];
  }
  prepare({ card, tenantId, opportunityId, subject, message, idempotencyKey }) {
    const agent = validateAgentCard(card);
    if (!tenantId || !opportunityId || !idempotencyKey) throw new WorkflowError('INVALID_REQUEST', 'tenantId, opportunityId and idempotencyKey are required');
    const envelope = {
      protocol: 'a2a', protocolVersion: agent.protocolVersion, recipient: agent.url,
      agentDigest: agent.digest, tenantId, opportunityId, idempotencyKey,
      subject: String(subject).slice(0, 160), message: String(message).slice(0, 5000),
      createdAt: this.now(), authorization: 'NOT_AUTHORIZED'
    };
    envelope.digest = digest(envelope);
    return envelope;
  }
  authorize(envelope, { approvedBy, expiresAt } = {}) {
    if (!approvedBy) throw new WorkflowError('INVALID_APPROVAL', 'approvedBy is required');
    const copy = { ...envelope, authorization: 'AUTHORIZED_HUMAN', approval: { approvedBy, approvedAt: this.now(), expiresAt: expiresAt || null } };
    delete copy.digest;
    copy.digest = digest(copy);
    return copy;
  }
  async send(envelope) {
    const body = { ...envelope };
    delete body.digest;
    if (this.dryRun) return { status: 'DRY_RUN_NOT_SENT', adapter: 'a2a-http', envelopeDigest: envelope.digest, recipient: envelope.recipient };
    if (envelope?.authorization !== 'AUTHORIZED_HUMAN') throw new WorkflowError('NOT_AUTHORIZED', 'Human authorization is required before any external send');
    if (envelope.digest !== digest(body)) throw new WorkflowError('TAMPERED_ENVELOPE', 'Envelope changed after authorization');
    const host = new URL(envelope.recipient).hostname.toLowerCase();
    if (!this.allowlist.has(host)) throw new WorkflowError('DESTINATION_NOT_ALLOWLISTED', `Destination ${host} is not allowlisted`);
    const response = await this.fetchImpl(envelope.recipient, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const receipt = { status: response.ok ? 'DELIVERED' : 'REJECTED', adapter: 'a2a-http', messageId: envelope.idempotencyKey, httpStatus: response.status, at: this.now() };
    this.receipts.push(receipt);
    return receipt;
  }
}
