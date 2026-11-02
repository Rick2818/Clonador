import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadCommercialConfig, commercialAssets, buildCommercialKit, captureCommercial, commercialMetrics } from '../src/commercial.mjs';
import { OpportunityRegistry } from '../src/opportunities.mjs';
import { computeMetrics } from '../src/metrics.mjs';
const config = await loadCommercialConfig();
async function setup(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'clonador-commercial-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { dir, registry: new OpportunityRegistry({ stateDir: dir }) };
}
function request(playbookId, changes = {}) {
  return { tenantId: 'boltech', provenance: 'synthetic', playbookId,
    assetId: playbookId === 'adoption-services' ? 'evaluation-guide' : 'integration-airtable',
    offerId: 'implementation', channel: 'demo_request', payload: {
      requestId: 'req-001', company: 'SYNTHETIC Co', consent: true, email: 'buyer@example.test',
      pageUrl: 'https://boltech-group.vercel.app', topic: 'Evaluar seguimiento' }, ...changes };
}
test('each playbook generates reviewable content and safe request examples without creating leads', async t => {
  const { dir, registry } = await setup(t);
  const first = await buildCommercialKit(config, dir);
  const second = await buildCommercialKit(config, dir);
  assert.notEqual(first.outputDir, second.outputDir);
  assert.equal(first.assets, 22);
  assert.equal(first.published, false);
  assert.equal((await registry.list()).length, 0);
  const manifest = JSON.parse(await readFile(path.join(first.outputDir, 'manifest.json')));
  for (const asset of manifest.assets) {
    const content = await readFile(path.join(first.outputDir, asset.file), 'utf8');
    assert.match(content, /Solicitar evaluación por escrito/);
    const example = JSON.parse(await readFile(path.join(first.outputDir, asset.submissionFile)));
    assert.equal(example.provenance, 'synthetic');
    assert.equal(example.payload.consent, false);
    await assert.rejects(captureCommercial(config, registry, example), /consent/);
  }
});
test('capture persists attribution, remains idempotent, and rejects changed attribution or provenance', async t => {
  const { registry } = await setup(t);
  const input = request('adoption-services');
  const result = await captureCommercial(config, registry, input);
  assert.equal(result.record.attribution.playbookId, input.playbookId);
  assert.equal(result.nextAction.sent, false);
  assert.equal((await captureCommercial(config, registry, input)).record.replay, true);
  await assert.rejects(captureCommercial(config, registry, { ...input, campaign: 'other' }), e => e.code === 'OPPORTUNITY_CONFLICT');
  await assert.rejects(captureCommercial(config, registry, { ...input, provenance: 'real', payload: { ...input.payload, email: 'buyer@business.test' } }), e => e.code === 'OPPORTUNITY_CONFLICT');
  assert.equal((await registry.read('boltech', result.record.opportunityId)).stage, 'CAPTURED');
});
test('wrong playbook, asset, offer, absent provenance, unsupported channel and missing consent are rejected', async t => {
  const { registry } = await setup(t);
  for (const patch of [{ playbookId: '../unknown' }, { assetId: 'integration-airtable' }, { offerId: 'invented' },
    { provenance: undefined }, { channel: 'a2a' }, { payload: { consent: false } }, { provenance: 'real' }]) {
    await assert.rejects(captureCommercial(config, registry, request('adoption-services', patch)));
  }
  await assert.rejects(commercialMetrics(config, registry), /tenant/);
});
test('two real funnels exclude synthetic wins and other tenants, and preserve qualification history', async t => {
  const { registry } = await setup(t);
  for (const playbook of config.playbooks) {
    const synthetic = await captureCommercial(config, registry, request(playbook.id, { payload: { ...request(playbook.id).payload, requestId: `synthetic-${playbook.id}` } }));
    for (const stage of ['QUALIFIED','MATERIAL_READY','PROPOSAL_PREPARED','PROPOSAL_AUTHORIZED']) await registry.transition('boltech', synthetic.record.opportunityId, stage, { actor: 'test' });
    await registry.markSent('boltech', synthetic.record.opportunityId, { status: 'DELIVERED', adapter: 'synthetic', messageId: 'test-only' });
    for (const stage of ['REPLIED', 'NEGOTIATION']) await registry.transition('boltech', synthetic.record.opportunityId, stage, { actor: 'test' });
    await registry.transition('boltech', synthetic.record.opportunityId, 'WON', { actor: 'test', revenue: { amount: 999, currency: 'USD', evidenceRef: 'synthetic-only' } });
    // Provenance-real fixtures exist only in this isolated temporary test directory.
    const real = await captureCommercial(config, registry, request(playbook.id, { provenance: 'real', payload: { requestId: `real-${playbook.id}`, company: 'Fixture', consent: true, pageUrl: 'https://boltech-group.vercel.app' } }));
    await registry.transition('boltech', real.record.opportunityId, 'QUALIFIED', { actor: 'test' });
    await registry.transition('boltech', real.record.opportunityId, 'LOST', { actor: 'test' });
    await captureCommercial(config, registry, request(playbook.id, { tenantId: 'other', provenance: 'real', payload: { requestId: `other-${playbook.id}`, company: 'Other Fixture', consent: true } }));
  }
  const metrics = await commercialMetrics(config, registry, 'boltech');
  for (const playbook of metrics.playbooks) {
    assert.equal(playbook.realOpportunities, 1);
    assert.equal(playbook.syntheticExcluded, 1);
    assert.equal(playbook.qualified, 1);
    assert.equal(playbook.won, 0);
    assert.equal(playbook.captureToQualified, 1);
    assert.deepEqual(playbook.verifiedRevenueByCurrency, {});
    assert.equal(playbook.visitorToRequestRate, null);
  }
  const general = await computeMetrics({ registry, workflow: { status: async () => ({ jobs: 0, byState: {} }) } });
  assert.deepEqual(general.revenue.verifiedByCurrency, {});
});
test('CLI captures a request and returns per-playbook metrics from the same local state', async t => {
  const { dir } = await setup(t);
  const built = await buildCommercialKit(config, dir);
  const input = request('solution-led');
  const { writeFile } = await import('node:fs/promises');
  const file = path.join(dir, 'request.json');
  await writeFile(file, JSON.stringify(input));
  const run = args => {
    const child = spawnSync(process.execPath, ['src/cli.mjs', ...args], { encoding: 'utf8', env: { ...process.env, CLONADOR_STATE_DIR: dir } });
    assert.equal(child.status, 0, child.stderr);
    return JSON.parse(child.stdout);
  };
  assert.equal(run(['commercial-capture', '--file', file]).record.attribution.playbookId, 'solution-led');
  const metrics = run(['commercial-metrics', '--tenant', 'boltech']);
  assert.equal(metrics.playbooks.find(p => p.id === 'solution-led').syntheticExcluded, 1);
  assert.equal(metrics.playbooks.find(p => p.id === 'solution-led').realOpportunities, 0);
  assert.equal(commercialAssets(config).length, built.assets);
});
