import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { validateOffer } from '../src/offer.mjs';
import { assertSupported, buildContent, renderComparisonPage, renderUseCasePage, renderIntegrationPage, toHtml, toMarkdown } from '../src/content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async relative => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
const offer = await load('config/commercial-offer.json');
const evidence = await load('data/market-evidence.json');
const clone = value => JSON.parse(JSON.stringify(value));
const TODAY = '2026-11-02';

test('the offer has exactly three services and no published price', () => {
  assert.equal(validateOffer(offer).services.length, 3);
  for (const service of offer.services) {
    assert.equal(service.priceStatus, 'PENDING_OWNER_DECISION');
    assert.equal(service.price, null);
  }
  assert.throws(() => validateOffer({ ...clone(offer), services: offer.services.slice(0, 2) }), e => e.code === 'INVALID_OFFER');
  assert.throws(() => validateOffer({ ...clone(offer), services: offer.services.map((service, index) => index === 0 ? { ...service, price: 100 } : service) }), e => e.code === 'PRICE_POLICY');
  assert.throws(() => validateOffer({ ...clone(offer), services: offer.services.map((service, index) => index === 0 ? { ...service, priceStatus: 'APPROVED' } : service) }), e => e.code === 'PRICE_POLICY');
});

test('evidence is accepted only when every external claim is cited and dated', () => {
  assert.equal(assertSupported(evidence, { today: TODAY }), evidence);

  const missingSource = clone(evidence);
  delete missingSource.competitors[0].dimensions[0].themSource;
  assert.throws(() => assertSupported(missingSource, { today: TODAY }), e => e.code === 'UNSUPPORTED_CLAIM');

  const missingDate = clone(evidence);
  delete missingDate.competitors[0].dimensions[0].observedAt;
  assert.throws(() => assertSupported(missingDate, { today: TODAY }), e => e.code === 'UNSUPPORTED_CLAIM');

  const future = clone(evidence);
  future.competitors[0].dimensions[0].observedAt = '2027-01-01';
  assert.throws(() => assertSupported(future, { today: TODAY }), e => e.code === 'UNSUPPORTED_CLAIM');

  const invalidSource = clone(evidence);
  invalidSource.competitors[0].dimensions[0].themSource = 'porque lo digo yo';
  assert.throws(() => assertSupported(invalidSource, { today: TODAY }), e => e.code === 'UNSUPPORTED_CLAIM');

  const roleWithoutBasis = clone(evidence);
  delete roleWithoutBasis.roles[0].basis;
  assert.throws(() => assertSupported(roleWithoutBasis, { today: TODAY }), e => e.code === 'UNSUPPORTED_CLAIM');
});

test('unverified performance, price and superlative claims are rejected', () => {
  const performance = clone(evidence);
  performance.competitors[0].dimensions[0].us = 'Aumentamos las ventas 40% en tres meses.';
  assert.throws(() => assertSupported(performance, { today: TODAY }), e => e.code === 'FORBIDDEN_CLAIM');

  const price = clone(evidence);
  price.competitors[0].dimensions[0].us = 'Desde USD 900 por mes.';
  assert.throws(() => assertSupported(price, { today: TODAY }), e => e.code === 'FORBIDDEN_CLAIM');

  const guarantee = clone(evidence);
  guarantee.competitors[0].dimensions[0].us = 'Garantizamos resultados.';
  assert.throws(() => assertSupported(guarantee, { today: TODAY }), e => e.code === 'FORBIDDEN_CLAIM');

  const superlative = clone(evidence);
  superlative.competitors[0].dimensions[0].them = 'Somos líderes del mercado.';
  assert.throws(() => assertSupported(superlative, { today: TODAY }), e => e.code === 'FORBIDDEN_CLAIM');
});

test('role pages use the real service, label hypotheses and never mention competitors', () => {
  const role = evidence.roles.find(item => item.id === 'ventas');
  const service = offer.services.find(item => item.id === role.serviceId);
  const document = renderUseCasePage(role, service);
  const markdown = toMarkdown(document);
  assert.match(markdown, new RegExp(service.name));
  assert.match(markdown, /Hipótesis de trabajo/);
  assert.match(markdown, /solicitar demo/i);
  assert.match(markdown, /Precio: pendiente de decisión del propietario/);
  assert.ok(!markdown.includes('Relevance AI'));
  assert.ok(!markdown.includes('Langflow'));
  assert.equal(document.route, '/funciones/ventas/');
  assert.ok(document.sections.some(section => section.table === undefined));
});

test('comparison pages cite source and observation date for every dimension', () => {
  const competitor = evidence.competitors[0];
  const document = renderComparisonPage(competitor);
  const markdown = toMarkdown(document);
  assert.equal(document.route, `/vs/${competitor.id}/`);
  for (const dimension of competitor.dimensions) {
    assert.ok(markdown.includes(dimension.label));
    assert.ok(markdown.includes(dimension.themSource));
    assert.ok(markdown.includes(dimension.observedAt));
  }
  assert.match(markdown, /## Fuentes/);
  assert.match(markdown, /No se comparan resultados de negocio/);
});

test('generated html escapes untrusted text and stays out of search engines by default', () => {
  const role = { ...evidence.roles[0], label: '<script>alert(1)</script>', problem: 'Problema & <b>riesgo</b>' };
  const service = offer.services.find(item => item.id === role.serviceId);
  const html = toHtml(renderUseCasePage(role, service));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&amp; &lt;b&gt;riesgo&lt;/b&gt;'));
  assert.match(html, /noindex, nofollow/);

  const indexable = toHtml(renderUseCasePage(role, service), { indexable: true });
  assert.match(indexable, /content="index, follow"/);
});

test('buildContent writes draft pages plus a verifiable manifest', async t => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'clonador-content-'));
  t.after(async () => { await rm(outDir, { recursive: true, force: true }); });
  const generatedAt = '2026-11-02T12:00:00.000Z';
  const manifest = await buildContent({ offer, evidence, outDir, generatedAt });

  assert.equal(manifest.status, 'DRAFT_PENDING_HUMAN_REVIEW');
  assert.equal(manifest.indexable, false);
  assert.equal(manifest.documents.length, evidence.roles.length + evidence.competitors.length + 1);
  assert.equal(new Set(manifest.documents.map(document => document.route)).size, manifest.documents.length);

  for (const document of manifest.documents) {
    assert.equal(document.sha256.length, 64);
    const markdown = await readFile(path.join(outDir, document.markdown), 'utf8');
    assert.equal(createHash('sha256').update(markdown).digest('hex'), document.sha256);
    await stat(path.join(outDir, document.html));
    assert.ok(!markdown.includes('$'));
  }

  const stored = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8'));
  assert.deepEqual(stored, manifest);
  const index = await readFile(path.join(outDir, 'index.md'), 'utf8');
  for (const document of manifest.documents.filter(item => item.kind !== 'index')) assert.ok(index.includes(document.route));
  const comparison = await readFile(path.join(outDir, 'vs', 'relevance-ai', 'index.md'), 'utf8');
  assert.match(comparison, /https:\/\/relevanceai\.com\/pricing/);
  assert.match(comparison, /2026-11-02/);
});

test('buildContent refuses unknown services and published prices', async t => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'clonador-content-bad-'));
  t.after(async () => { await rm(outDir, { recursive: true, force: true }); });

  const unknown = clone(evidence);
  unknown.roles[0].serviceId = 'does-not-exist';
  await assert.rejects(buildContent({ offer, evidence: unknown, outDir }), e => e.code === 'UNKNOWN_SERVICE');

  const priced = clone(offer);
  priced.services[0].price = 900;
  await assert.rejects(buildContent({ offer: priced, evidence, outDir }), e => e.code === 'PRICE_POLICY');
});

test('integration pages cannot be published as available without a verification', () => {
  const planned = renderIntegrationPage({ id: 'hubspot', name: 'HubSpot', system: 'CRM', status: 'PLANNED', summary: 'Sincronización de contactos.', source: 'https://example.com/docs', observedAt: TODAY });
  assert.match(toMarkdown(planned), /En preparación/);

  const withIntegration = clone(evidence);
  withIntegration.integrations = [{ id: 'hubspot', name: 'HubSpot', system: 'CRM', status: 'AVAILABLE', summary: 'Sincronización de contactos.', source: 'https://example.com/docs', observedAt: TODAY }];
  assert.throws(() => assertSupported(withIntegration, { today: TODAY }), e => e.code === 'UNSUPPORTED_CLAIM');

  withIntegration.integrations[0].verifiedAt = 'https://example.com/test-run';
  withIntegration.integrations[0].testRef = 'run-1';
  assert.equal(assertSupported(withIntegration, { today: TODAY }), withIntegration);
});
