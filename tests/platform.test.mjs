import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MarketingWorkflow } from '../src/marketing.mjs';
import { OpportunityRegistry } from '../src/opportunities.mjs';
import { normalizeSubmission, supportedChannels } from '../src/channels.mjs';
import { computeMetrics } from '../src/metrics.mjs';
import { ObjectiveRunner } from '../src/agent.mjs';
import { A2AClient, validateAgentCard } from '../src/a2a-client.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = {
  operatorOrganization: 'Boltech Group', commercialDomain: 'https://boltech-group.vercel.app',
  offerings: ['Agentes preelaborados', 'Agentes a medida']
};
const event = (changes = {}) => ({
  eventId: 'evt-001', tenantId: 'tenant-a', partnerId: 'partner-a', partnerName: 'Socio A',
  subject: 'Consulta', message: 'Queremos conocer Boltech.', type: 'a2a.partner.received',
  source: 'external-a2a', sourceReceipt: 'rcpt-001', language: 'es', ...changes
});
async function setup(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'clonador-platform-'));
  t.after(async () => { await rm(dir, { recursive: true, force: true }); });
  return {
    dir,
    workflow: new MarketingWorkflow({ stateDir: dir, config, now: () => '2026-11-02T10:00:00Z' }),
    registry: new OpportunityRegistry({ stateDir: dir, now: () => '2026-11-02T10:00:00Z' }),
    runner: new ObjectiveRunner({ stateDir: dir, workflow: new MarketingWorkflow({ stateDir: dir, config }), registry: new OpportunityRegistry({ stateDir: dir }), now: () => '2026-11-02T10:00:00Z' })
  };
}

test('capture deduplicates by channel reference and rejects changed data', async t => {
  const { registry } = await setup(t);
  const input = { tenantId: 'tenant-a', channel: 'web_form', externalRef: 'form-1:sub-9', company: 'Acme', contactEmail: 'ana@acme.test', provenance: 'synthetic' };
  const first = await registry.capture(input);
  assert.equal(first.stage, 'CAPTURED');
  assert.equal(first.provenance, 'synthetic');
  assert.equal(first.contact.email, 'an***@acme.test');
  const replay = await registry.capture(input);
  assert.equal(replay.replay, true);
  await assert.rejects(registry.capture({ ...input, company: 'Other Co' }), e => e.code === 'OPPORTUNITY_CONFLICT');
  await assert.rejects(registry.capture({ ...input, channel: 'fax' }), e => e.code === 'INVALID_CHANNEL');
});

test('stage transitions are enforced and WON requires verified revenue', async t => {
  const { registry } = await setup(t);
  const record = await registry.capture({ tenantId: 'tenant-a', channel: 'manual', externalRef: 'ref-1', company: 'Acme' });
  await assert.rejects(registry.transition('tenant-a', record.opportunityId, 'PROPOSAL_PREPARED'), e => e.code === 'BAD_STAGE');
  await registry.transition('tenant-a', record.opportunityId, 'QUALIFIED');
  await registry.transition('tenant-a', record.opportunityId, 'MATERIAL_READY');
  await registry.transition('tenant-a', record.opportunityId, 'PROPOSAL_PREPARED');
  await registry.transition('tenant-a', record.opportunityId, 'PROPOSAL_AUTHORIZED');
  await assert.rejects(registry.transition('tenant-a', record.opportunityId, 'SENT'), e => e.code === 'SEND_REQUIRES_ADAPTER');
  await assert.rejects(registry.transition('tenant-a', record.opportunityId, 'WON'), e => e.code === 'BAD_STAGE');
  await assert.rejects(registry.markSent('tenant-a', record.opportunityId, { status: 'REJECTED' }), e => e.code === 'INVALID_RECEIPT');
  const sent = await registry.markSent('tenant-a', record.opportunityId, { status: 'DELIVERED', adapter: 'a2a-http', messageId: 'idem-9' });
  assert.equal(sent.stage, 'SENT');
  await registry.transition('tenant-a', record.opportunityId, 'REPLIED');
  await registry.transition('tenant-a', record.opportunityId, 'NEGOTIATION');
  await assert.rejects(registry.transition('tenant-a', record.opportunityId, 'WON'), e => e.code === 'REVENUE_REQUIRED');
  const won = await registry.transition('tenant-a', record.opportunityId, 'WON', { revenue: { amount: 1500, currency: 'USD', evidenceRef: 'contract-9' } });
  assert.equal(won.revenue.verified, true);
  assert.equal(won.history.length, 9);
});

test('every channel adapter feeds the same contract', async t => {
  const { registry } = await setup(t);
  const samples = {
    a2a: event({ eventId: 'e-1' }),
    demo_request: { requestId: 'd1', company: 'Acme', name: 'Ana', email: 'a@acme.test', consent: true },
    web_form: { formId: 'f1', submissionId: 's1', company: 'Acme', email: 'a@acme.test' },
    inbound_email: { messageId: 'm1', company: 'Acme', from: 'a@acme.test' },
    referral: { referralId: 'r1', company: 'Acme', referrer: 'Aliado' },
    partner_program: { applicationId: 'p1', company: 'Acme' },
    marketplace: { marketplace: 'mk', listingId: 'l1', company: 'Acme' },
    directory: { directory: 'dir', profileId: 'pr1', company: 'Acme' },
    manual: { reference: 'ref-1', company: 'Acme' }
  };
  assert.deepEqual(supportedChannels().sort(), Object.keys(samples).sort());
  for (const channel of supportedChannels()) {
    const normalized = normalizeSubmission(channel, samples[channel], { tenantId: 'tenant-a', provenance: 'synthetic' });
    const record = await registry.capture(normalized);
    assert.equal(record.channel, channel);
    assert.equal(record.tenantId, 'tenant-a');
    assert.ok(record.externalRef.length > 0);
    assert.ok(record.company.length > 0);
  }
});

test('metrics report null rates when there is no data and never invent revenue', async t => {
  const { registry, workflow } = await setup(t);
  const empty = await computeMetrics({ registry, workflow });
  assert.equal(empty.funnel.captured, 0);
  assert.equal(empty.conversion.overallCaptureToWon, null);
  assert.deepEqual(empty.revenue.verifiedByCurrency, {});
  assert.ok(empty.unavailable.some(x => x.metric === 'operatingCosts'));
  const record = await registry.capture({ tenantId: 'tenant-a', channel: 'a2a', externalRef: 'x-1', company: 'Acme' });
  await registry.transition('tenant-a', record.opportunityId, 'QUALIFIED');
  const one = await computeMetrics({ registry, workflow });
  assert.equal(one.conversion.captureToQualified, 1);
});

test('objective runner completes, records the human gate and is idempotent', async t => {
  const { runner, workflow, registry } = await setup(t);
  const input = {
    goal: 'prepare-partner-material', tenantId: 'tenant-a', event: event(),
    opportunity: { channel: 'a2a', externalRef: 'evt-001', company: 'Socio A', provenance: 'synthetic' }
  };
  const first = await runner.start(input);
  assert.equal(first.status, 'COMPLETED');
  assert.equal(first.humanGate.required, true);
  assert.equal(first.result.requiresHumanApproval, true);
  const job = await workflow.read('tenant-a', 'evt-001');
  assert.equal(job.state, 'DRAFT_REVIEW_REQUIRED');
  assert.equal(job.approval, null);
  const again = await runner.start(input);
  assert.equal(again.replay, true);
  assert.equal((await workflow.status()).jobs, 1);
  assert.equal((await registry.list({ tenantId: 'tenant-a' })).length, 1);
  await assert.rejects(runner.start({ ...input, goal: 'other-goal' }), e => e.code === 'OBJECTIVE_CONFLICT');
});

test('a2a client is dry by default, requires authorization, allowlist and an intact envelope', async t => {
  let calls = 0;
  const card = { name: 'Partner Agent', url: 'https://partner.example/a2a', protocolVersion: '1.0', capabilities: ['message/send'] };
  const client = new A2AClient({ fetchImpl: async () => { calls += 1; return { ok: true, status: 200 }; } });
  const envelope = client.prepare({ card, tenantId: 'tenant-a', opportunityId: 'opp-1', subject: 'Hola', message: 'Mensaje', idempotencyKey: 'idem-1' });
  const dry = await client.send(envelope);
  assert.equal(dry.status, 'DRY_RUN_NOT_SENT');
  assert.equal(calls, 0);
  const live = new A2AClient({ dryRun: false, allowlist: ['partner.example'], fetchImpl: async () => { calls += 1; return { ok: true, status: 200 }; } });
  await assert.rejects(live.send(envelope), e => e.code === 'NOT_AUTHORIZED');
  const authorized = live.authorize(envelope, { approvedBy: 'director' });
  const tampered = { ...authorized, message: 'Mensaje alterado' };
  await assert.rejects(live.send(tampered), e => e.code === 'TAMPERED_ENVELOPE');
  const receipt = await live.send(authorized);
  assert.equal(receipt.status, 'DELIVERED');
  assert.equal(calls, 1);
  const blocked = new A2AClient({ dryRun: false, allowlist: ['other.example'], fetchImpl: async () => { calls += 1; return { ok: true, status: 200 }; } });
  await assert.rejects(blocked.send(authorized), e => e.code === 'DESTINATION_NOT_ALLOWLISTED');
});

test('agent cards must be well formed and secure', () => {
  assert.throws(() => validateAgentCard({}), e => e.code === 'INVALID_AGENT_CARD');
  assert.throws(() => validateAgentCard({ name: 'Bad', url: 'http://partner.example', protocolVersion: '1.0', capabilities: ['message/send'] }), e => e.code === 'INSECURE_AGENT_CARD');
  assert.throws(() => validateAgentCard({ name: 'Bad', url: 'https://partner.example', protocolVersion: 'one', capabilities: ['message/send'] }), e => e.code === 'INVALID_AGENT_CARD');
  assert.throws(() => validateAgentCard({ name: 'Bad', url: 'https://partner.example', protocolVersion: '1.0', capabilities: ['tasks/get'] }), e => e.code === 'INVALID_AGENT_CARD');
  const ok = validateAgentCard({ name: 'Partner Agent', url: 'https://partner.example/a2a', protocolVersion: '1.0', capabilities: ['message/send'] });
  assert.equal(ok.digest.length, 64);
});

test('bridge runs end to end as a separate process over HTTP', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'clonador-bridge-'));
  t.after(async () => { await rm(dir, { recursive: true, force: true }); });
  const child = spawn(process.execPath, [path.join(root, 'src/bridge.mjs')], {
    env: { ...process.env, CLONADOR_A2A_TOKEN: 'a'.repeat(40), CLONADOR_OPERATOR_TOKEN: 'b'.repeat(40), CLONADOR_STATE_DIR: dir, CLONADOR_BRIDGE_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => { child.kill(); });
  const port = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('bridge did not start')), 15000);
    child.stdout.on('data', chunk => {
      buffer += chunk.toString();
      const line = buffer.split('\n').find(x => x.includes('LISTENING_LOCAL_ONLY'));
      if (line) { clearTimeout(timer); resolve(JSON.parse(line).port); }
    });
    child.on('exit', code => { clearTimeout(timer); reject(new Error(`bridge exited ${code}`)); });
  });
  const call = async (uri, body, token) => {
    const response = await fetch(`http://127.0.0.1:${port}${uri}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  assert.equal((await call('/v1/a2a/events', event(), 'a'.repeat(40))).status, 200);
  const approved = await call('/v1/operator/approve', { tenantId: 'tenant-a', eventId: 'evt-001', operatorId: 'director' }, 'b'.repeat(40));
  assert.equal(approved.status, 200, JSON.stringify(approved.data));
  assert.equal((await call('/v1/operator/handoff', { tenantId: 'tenant-a', eventId: 'evt-001' }, 'b'.repeat(40))).status, 200);
  const material = await call('/v1/a2a/materials', { tenantId: 'tenant-a', eventId: 'evt-001', partnerId: 'partner-a' }, 'a'.repeat(40));
  assert.equal(material.status, 200);
  assert.equal(material.data.handoff.instruction, 'QUEUE_FOR_REVIEW_ONLY_NO_EXTERNAL_SEND');
});
