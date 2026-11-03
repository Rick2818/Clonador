import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSubmission } from './channels.mjs';
import { WorkflowError } from './marketing.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function loadCommercialConfig() {
  return JSON.parse(await readFile(path.join(root, 'config/commercial-playbooks.json'), 'utf8'));
}
const fail = message => { throw new WorkflowError('INVALID_COMMERCIAL_INPUT', message); };
function playbookFor(config, id) {
  const result = config.playbooks.find(item => item.id === id);
  if (!result) fail('Unknown playbook');
  return result;
}
export function commercialAssets(config) {
  return [
    { id: 'evaluation-guide', playbookId: 'adoption-services', type: 'guide', title: 'Guía para evaluar una tarea antes de automatizarla', body: 'Describe una tarea repetitiva, identifica sus entradas y define qué debe revisar una persona. Usa un ejemplo sin datos privados y escribe el resultado que aceptarías. Con esa información puedes evaluar el alcance de una implementación.' },
    ...config.roles.flatMap(role => config.playbooks.map(playbook => ({ id: `${playbook.id}-${role.id}`, playbookId: playbook.id, type: 'use-case', title: role.title, body: `${role.task} Comparte el proceso actual y el resultado esperado. Prepararemos una evaluación de alcance antes de proponer una implementación.`, roleId: role.id }))),
    ...config.integrations.map(item => ({ id: `integration-${item.id}`, playbookId: 'solution-led', type: 'integration', title: `Evalúa un flujo con ${item.name}`, body: `Describe qué información necesitas leer o actualizar en ${item.name}. Revisaremos accesos, permisos y compatibilidad antes de ofrecer una integración. Esta ficha describe una posibilidad de servicio; la integración aún requiere validación técnica.`, technicalStatus: item.status })),
    ...config.comparisons.map(item => ({ id: item.id, playbookId: 'solution-led', type: 'comparison', title: `Implementación acompañada o ${item.platform}`, body: item.description, sourceIds: item.sourceIds })),
    ...config.offers.map(item => ({ id: `offer-${item.id}`, playbookId: 'adoption-services', type: 'offer', title: item.title, body: `${item.deliverables.join('. ')}. ${item.pricing}. Costos de terceros y condiciones se revisan antes de contratar.`, offerId: item.id }))
  ];
}
export function commercialPlan(config) {
  const assets = commercialAssets(config);
  return { status: config.status, brand: config.brand, budgetUSD: config.budgetUSD,
    contactMode: config.contactMode, publishingEnabled: false, externalSendEnabled: false,
    playbooks: config.playbooks.map(item => ({ ...item, assets: assets.filter(asset => asset.playbookId === item.id).length })),
    offers: config.offers, assets: assets.map(({ body, ...asset }) => asset),
    sources: config.sources, goals30Days: config.goals30Days,
    activation: 'Local configuration and reviewable material; public capture needs an approved website connector.' };
}
export async function buildCommercialKit(config, stateDir) {
  // Each build gets its own directory so previous operator edits are preserved.
  const base = path.join(stateDir, 'commercial-kit');
  await mkdir(base, { recursive: true });
  const { mkdtemp } = await import('node:fs/promises');
  const outputDir = await mkdtemp(path.join(base, 'review-'));
  const assets = commercialAssets(config);
  const records = [];
  for (const asset of assets) {
    const submission = { tenantId: 'boltech', provenance: 'synthetic',
      playbookId: asset.playbookId, assetId: asset.id, offerId: asset.offerId || 'implementation',
      channel: 'demo_request', payload: { requestId: 'REPLACE-WITH-UNIQUE-REQUEST-ID', company: 'REPLACE-WITH-COMPANY',
        name: 'REPLACE-WITH-NAME', email: 'example@example.test', consent: false,
        topic: 'REPLACE-WITH-REQUEST', pageUrl: 'https://boltech-group.vercel.app' } };
    const sources = (asset.sourceIds || playbookFor(config, asset.playbookId).sourceIds)
      .map(id => config.sources.find(source => source.id === id));
    const sourceLines = sources.map(source => `- ${source.url} (consulta pública ${source.observedAt}; no acredita ingresos ni conversión).`);
    const body = `# ${asset.title}\n\nBoltech Group\n\n${asset.body}\n\n## ${config.primaryCTA}\n\nComparte el proceso, las herramientas que utilizas y el resultado esperado. El siguiente paso es una evaluación por escrito. El precio y la viabilidad se acuerdan después de revisar el alcance.\n\n## Datos para evaluar el alcance\n\n${config.qualificationFields.map(field => `- ${field}`).join('\n')}\n\n---\n\n## Notas internas de revisión\n\nEstado: borrador local. Requiere revisión antes de publicar. Sin afiliación con las plataformas citadas.\n\nReferencias del mecanismo comercial:\n${sourceLines.join('\n')}\n\nPlaybook: ${asset.playbookId}. Asset: ${asset.id}.\nLa ficha de solicitud contigua es sintética; sustituir los campos y registrar procedencia real solo para una solicitud auténtica.\n`;
    await writeFile(path.join(outputDir, `${asset.id}.md`), body, 'utf8');
    await writeFile(path.join(outputDir, `${asset.id}.submission.json`), JSON.stringify(submission, null, 2) + '\n');
    records.push({ ...asset, file: `${asset.id}.md`, submissionFile: `${asset.id}.submission.json` });
  }
  const manifest = { schemaVersion: 1, status: 'REVIEW_REQUIRED', published: false, generatedAt: new Date().toISOString(), assets: records };
  await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(outputDir, 'README.md'), `# Kit comercial Boltech Group\n\n${records.length} materiales propios en borrador. Abrir manifest.json para el índice.\n\nRecorridos: guía/biblioteca → evaluación escrita → implementación/soporte; integración/caso/comparativa → evaluación escrita → propuesta.\n\nLas solicitudes JSON son sintéticas y no se envían. Falta conectar formularios públicos para recibir visitas reales. No se han registrado oportunidades al generar este kit.\n`);
  return { status: 'REVIEW_REQUIRED', outputDir, assets: records.length, published: false, opportunitiesCreated: 0 };
}
export async function captureCommercial(config, registry, submission) {
  const playbook = playbookFor(config, submission.playbookId);
  const asset = commercialAssets(config).find(item => item.id === submission.assetId && item.playbookId === playbook.id);
  if (!asset) fail('Asset does not belong to selected playbook');
  if (!playbook.offerIds.includes(submission.offerId)) fail('Offer does not belong to selected playbook');
  if (!['real', 'synthetic'].includes(submission.provenance)) fail('Explicit real or synthetic provenance is required');
  if (!['demo_request', 'web_form'].includes(submission.channel)) fail('Use demo_request or web_form for a written assessment');
  if (submission.payload?.consent !== true) fail('Explicit contact consent is required');
  if (submission.provenance === 'real' && /REPLACE-WITH|example\.test/i.test(JSON.stringify(submission))) fail('Replace synthetic placeholders before capturing a real request');
  const normalized = normalizeSubmission(submission.channel, submission.payload, { tenantId: submission.tenantId, provenance: submission.provenance });
  const record = await registry.capture({ ...normalized, attribution: {
    playbookId: playbook.id, assetId: asset.id, offerId: submission.offerId,
    campaign: submission.campaign || 'commercial-20261102'
  } });
  return { record, nextAction: { type: 'HUMAN_WRITTEN_QUALIFICATION', requiredFields: config.qualificationFields, sent: false } };
}
const rate = (n, d) => d ? Number((n / d).toFixed(4)) : null;
export async function commercialMetrics(config, registry, tenantId) {
  if (typeof tenantId !== 'string' || !tenantId.trim()) fail('A tenant is required for commercial metrics');
  const all = await registry.list({ tenantId });
  return { tenantId, source: 'persisted real opportunities; synthetic data excluded',
    playbooks: config.playbooks.map(playbook => {
      const attributed = all.filter(item => item.attribution?.playbookId === playbook.id);
      const real = attributed.filter(item => item.provenance === 'real');
      const entered = stage => real.filter(item => item.history.some(event => event.stage === stage)).length;
      const revenueByCurrency = {};
      for (const record of real.filter(item => item.stage === 'WON' && item.revenue?.verified)) {
        const { currency, amount } = record.revenue;
        revenueByCurrency[currency] = (revenueByCurrency[currency] || 0) + amount;
      }
      return { id: playbook.id, realOpportunities: real.length, syntheticExcluded: attributed.length - real.length,
        qualified: entered('QUALIFIED'), proposalsPrepared: entered('PROPOSAL_PREPARED'),
        sent: entered('SENT'), replied: entered('REPLIED'), won: entered('WON'),
        captureToQualified: rate(entered('QUALIFIED'), real.length), captureToWon: rate(entered('WON'), real.length),
        verifiedRevenueByCurrency: revenueByCurrency, visitors: null, visitorToRequestRate: null };
    }), unavailable: ['Public page visits and submission receipts require an approved website connector.'] };
}
