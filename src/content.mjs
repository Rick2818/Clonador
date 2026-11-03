import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { WorkflowError } from './marketing.mjs';
import { validateOffer, findService } from './offer.mjs';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SOURCE = /^(https:\/\/|docs\/|config\/|data\/|artefacto REA ev_[a-f0-9]{8,64})/;
const KINDS = new Set(['use-case', 'comparison', 'integration', 'index']);

// Claims that are never allowed, whoever makes them.
const FORBIDDEN_ANY = [
  /\bgarantizamos\b/i,
  /\b(resultados? garantizados?|líder(?:es)? del mercado|el mejor del mercado|número 1|#1)\b/i
];
// Claims we cannot make about ourselves without a verified measurement.
const FORBIDDEN_OURS = [
  /\b\d+(?:[.,]\d+)?\s*%/,
  /(?:USD|EUR|MXN|\$)\s?\d/i,
  /\b\d+\s*(?:clientes|empresas|usuarios|oportunidades|demos|contratos)\b/i,
  /\b(?:ingresos|facturación|ARR|MRR|revenue)\b/i
];

const exact = (value, field, max = 2000) => {
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError('INVALID_EVIDENCE', `${field} must be a non-empty string`);
  if (value.length > max) throw new WorkflowError('INVALID_EVIDENCE', `${field} exceeds ${max} characters`);
  return value.trim();
};

const slug = (value, field) => {
  const id = exact(value, field, 64);
  if (!SLUG.test(id)) throw new WorkflowError('INVALID_EVIDENCE', `${field} must be a lowercase slug`);
  return id;
};

const assertSource = (value, field) => {
  const source = exact(value, field, 300);
  if (!SOURCE.test(source)) throw new WorkflowError('UNSUPPORTED_CLAIM', `${field} must be a public URL, a repo path or a REA artifact id`);
  return source;
};

const assertObservedAt = (value, field, today) => {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) throw new WorkflowError('UNSUPPORTED_CLAIM', `${field} must use YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new WorkflowError('UNSUPPORTED_CLAIM', `${field} is not a valid date`);
  if (value > today) throw new WorkflowError('UNSUPPORTED_CLAIM', `${field} cannot be in the future`);
  return value;
};

const assertClaimsAllowed = (value, field, { ours = false } = {}) => {
  for (const rule of FORBIDDEN_ANY) {
    if (rule.test(value)) throw new WorkflowError('FORBIDDEN_CLAIM', `${field} contains a forbidden claim (${rule})`);
  }
  if (!ours) return value;
  for (const rule of FORBIDDEN_OURS) {
    if (rule.test(value)) throw new WorkflowError('FORBIDDEN_CLAIM', `${field} states an unverified number (${rule})`);
  }
  return value;
};

const integrationStatus = new Set(['PLANNED', 'AVAILABLE']);

function assertIntegration(entry, field, today) {
  const id = slug(entry?.id, `${field}.id`);
  const status = exact(entry?.status, `${field}.status`, 20);
  if (!integrationStatus.has(status)) throw new WorkflowError('INVALID_EVIDENCE', `${field}.status must be PLANNED or AVAILABLE`);
  assertClaimsAllowed(exact(entry?.summary, `${field}.summary`), `${field}.summary`, { ours: true });
  assertSource(entry?.source, `${field}.source`);
  assertObservedAt(entry?.observedAt, `${field}.observedAt`, today);
  if (status === 'AVAILABLE') {
    if (!entry?.verifiedAt || !entry?.testRef) throw new WorkflowError('UNSUPPORTED_CLAIM', `${field}.AVAILABLE requires verifiedAt and testRef`);
    assertSource(entry.verifiedAt, `${field}.verifiedAt`);
    exact(entry.testRef, `${field}.testRef`, 200);
  }
  return { id, name: exact(entry?.name, `${field}.name`, 120), system: exact(entry?.system, `${field}.system`, 120), status, summary: entry.summary, source: entry.source, observedAt: entry.observedAt, verifiedAt: entry.verifiedAt, testRef: entry.testRef };
}

// Evidence is only usable when every external claim carries its source and the
// date it was observed. Anything unverifiable fails the build instead of shipping.
export function assertSupported(evidence, { today = new Date().toISOString().slice(0, 10) } = {}) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) throw new WorkflowError('INVALID_EVIDENCE', 'Evidence must be an object');
  if (evidence.schemaVersion !== 1) throw new WorkflowError('INVALID_EVIDENCE', 'Evidence schemaVersion must be 1');
  if (!Array.isArray(evidence.roles) || evidence.roles.length === 0) throw new WorkflowError('INVALID_EVIDENCE', 'At least one role is required');
  if (!Array.isArray(evidence.competitors) || evidence.competitors.length === 0) throw new WorkflowError('INVALID_EVIDENCE', 'At least one competitor is required');

  const roleIds = new Set();
  for (const [index, role] of evidence.roles.entries()) {
    const field = `roles[${index}]`;
    const id = slug(role?.id, `${field}.id`);
    if (roleIds.has(id)) throw new WorkflowError('INVALID_EVIDENCE', `Duplicate role id: ${id}`);
    roleIds.add(id);
    exact(role?.label, `${field}.label`, 120);
    exact(role?.problem, `${field}.problem`);
    assertClaimsAllowed(role.problem, `${field}.problem`, { ours: true });
    slug(role?.serviceId, `${field}.serviceId`);
    if (role.basis === 'OBSERVED') {
      assertSource(role?.basisSource, `${field}.basisSource`);
      assertObservedAt(role?.observedAt, `${field}.observedAt`, today);
    } else if (role.basis !== 'HYPOTHESIS') {
      throw new WorkflowError('UNSUPPORTED_CLAIM', `${field}.basis must be HYPOTHESIS or OBSERVED`);
    } else if (role.basisSource) {
      assertSource(role.basisSource, `${field}.basisSource`);
    }
  }

  const competitorIds = new Set();
  for (const [index, competitor] of evidence.competitors.entries()) {
    const field = `competitors[${index}]`;
    const id = slug(competitor?.id, `${field}.id`);
    if (competitorIds.has(id)) throw new WorkflowError('INVALID_EVIDENCE', `Duplicate competitor id: ${id}`);
    competitorIds.add(id);
    exact(competitor?.name, `${field}.name`, 120);
    if (!Array.isArray(competitor?.dimensions) || competitor.dimensions.length === 0) throw new WorkflowError('INVALID_EVIDENCE', `${field}.dimensions must not be empty`);
    for (const [position, dimension] of competitor.dimensions.entries()) {
      const claim = `${field}.dimensions[${position}]`;
      for (const key of ['label', 'us', 'them', 'usSource', 'themSource', 'observedAt']) {
        if (!dimension?.[key]) throw new WorkflowError('UNSUPPORTED_CLAIM', `${claim} is missing ${key}`);
      }
      exact(dimension.label, `${claim}.label`, 160);
      assertClaimsAllowed(exact(dimension.us, `${claim}.us`), `${claim}.us`, { ours: true });
      assertClaimsAllowed(exact(dimension.them, `${claim}.them`), `${claim}.them`);
      assertSource(dimension.usSource, `${claim}.usSource`);
      assertSource(dimension.themSource, `${claim}.themSource`);
      assertObservedAt(dimension.observedAt, `${claim}.observedAt`, today);
    }
  }

  if (evidence.integrations !== undefined) {
    if (!Array.isArray(evidence.integrations)) throw new WorkflowError('INVALID_EVIDENCE', 'integrations must be an array');
    const ids = new Set();
    for (const [index, entry] of evidence.integrations.entries()) {
      const normalized = assertIntegration(entry, `integrations[${index}]`, today);
      if (ids.has(normalized.id)) throw new WorkflowError('INVALID_EVIDENCE', `Duplicate integration id: ${normalized.id}`);
      ids.add(normalized.id);
    }
  }
  return evidence;
}

const page = ({ route, kind, title, description, sections }) => {
  if (!KINDS.has(kind)) throw new WorkflowError('INVALID_PAGE', `Unknown page kind: ${kind}`);
  if (!/^\/[a-z0-9/-]*$/.test(route) || route.includes('..') || route.includes('//')) throw new WorkflowError('INVALID_PAGE', `Unsafe route: ${route}`);
  return { route, kind, title, description, sections };
};

const withOfferSource = sections => [
  ...sections,
  { heading: 'Fuente de la oferta', paragraphs: ['Los alcances y exclusiones provienen de `config/commercial-offer.json`. Los importes no se publican hasta que el propietario los apruebe por escrito.'] }
];

export function renderUseCasePage(role, service, { generatedAt = new Date().toISOString() } = {}) {
  const hypothesis = role.basis === 'HYPOTHESIS';
  const sections = [
    { heading: 'Para quién es', paragraphs: [`${role.label}. Servicio asociado: ${service.name}.`] },
    {
      heading: 'El problema que resuelve',
      paragraphs: [role.problem],
      note: hypothesis
        ? 'Hipótesis de trabajo, no un dato observado. Se valida con cada prospecto antes de tratarla como hecho.'
        : `Observado en una fuente pública el ${role.observedAt}.`
    },
    { heading: 'Qué incluye', bullets: service.deliverables },
    { heading: 'Qué no incluye', bullets: service.exclusions },
    { heading: 'Cuándo encaja', bullets: service.qualification },
    { heading: 'Cómo empezar', paragraphs: ['Solicita una demo. La solicitud se registra como oportunidad con su canal y procedencia, y una persona responde antes de cualquier propuesta.'], bullets: ['CTA: solicitar demo', 'Precio: pendiente de decisión del propietario. No se publica ningún importe.'] },
    { heading: 'Alcance del servicio', paragraphs: [service.scope] }
  ];
  if (role.basisSource) sections[1].paragraphs.push(`Base de la segmentación: ${role.basisSource}.`);
  return page({
    route: `/funciones/${role.id}/`,
    kind: 'use-case',
    title: `${role.label} — agente de IA para ${role.label.toLowerCase()}`,
    description: `${service.name} para ${role.label.toLowerCase()}. ${role.problem}`,
    sections: withOfferSource(sections)
  });
}

export function renderComparisonPage(competitor, { generatedAt = new Date().toISOString() } = {}) {
  const sources = new Map();
  for (const dimension of competitor.dimensions) sources.set(dimension.themSource, dimension.observedAt);
  const rows = competitor.dimensions.map(dimension => [
    dimension.label,
    dimension.us,
    dimension.them,
    dimension.themSource,
    dimension.observedAt
  ]);
  return page({
    route: `/vs/${competitor.id}/`,
    kind: 'comparison',
    title: `Boltech Group vs ${competitor.name}`,
    description: `Comparación por dimensiones verificables. Cada afirmación sobre ${competitor.name} cita su fuente y la fecha de observación.`,
    sections: [
      {
        heading: 'Cómo leer esta comparación',
        paragraphs: [
          'No se comparan resultados de negocio, ingresos ni tasas de conversión: no hay datos públicos que los sostengan.',
          `Solo se afirma lo que fue observado en una fuente citada. La columna de Boltech Group describe nuestro diseño actual, no un resultado medido.`
        ]
      },
      { heading: 'Dimensiones', table: { headers: ['Dimensión', 'Boltech Group', competitor.name, 'Fuente', 'Observado'], rows } },
      {
        heading: 'Método y límites',
        bullets: [
          'Las afirmaciones sobre el competidor provienen de páginas públicas consultadas en la fecha indicada.',
          'Una página pública no prueba contratos, ingresos ni conversiones.',
          'La información del competidor puede cambiar después de la observación.',
          'No existe afiliación, patrocinio ni relación comercial con el competidor.'
        ],
        note: 'Si una dimensión no tiene fuente, no se publica.'
      },
      { heading: 'Fuentes', bullets: [...sources].map(([source, date]) => `${source} — consultado el ${date}`) },
      { heading: 'Siguiente paso', paragraphs: ['Solicita una demo para contrastar tu caso concreto con lo que aquí se describe.'] }
    ]
  });
}

export function renderIntegrationPage(entry, { generatedAt = new Date().toISOString() } = {}) {
  const planned = entry.status === 'PLANNED';
  return page({
    route: `/integraciones/${entry.id}/`,
    kind: 'integration',
    title: `${entry.name} — integración`,
    description: entry.summary,
    sections: [
      { heading: 'Sistema', paragraphs: [`${entry.system}. Estado: ${planned ? 'en preparación' : 'disponible y verificada'}.`] },
      { heading: 'Qué cubre', paragraphs: [entry.summary] },
      {
        heading: 'Estado real',
        paragraphs: [
          planned
            ? 'En preparación. Todavía no existe una integración verificada con este sistema y no se ofrece como disponible.'
            : `Verificada el ${entry.verifiedAt} con la prueba ${entry.testRef}.`
        ],
        note: `Fuente consultada: ${entry.source} (${entry.observedAt}).`
      },
      { heading: 'Siguiente paso', paragraphs: ['Solicita una demo si quieres evaluar este caso.'] }
    ]
  });
}

function renderIndexPage(documents, { generatedAt }) {
  const groups = [
    ['Funciones', documents.filter(document => document.kind === 'use-case')],
    ['Comparaciones', documents.filter(document => document.kind === 'comparison')],
    ['Integraciones', documents.filter(document => document.kind === 'integration')]
  ];
  const sections = groups.filter(([, items]) => items.length > 0).map(([heading, items]) => ({
    heading,
    bullets: items.map(item => `${item.title} — ${item.route}`)
  }));
  sections.push({
    heading: 'Estado editorial',
    paragraphs: ['Borrador generado localmente. Ninguna página se publica sin revisión humana y aprobación del propietario.'],
    note: `Generado el ${generatedAt}.`
  });
  return page({
    route: '/',
    kind: 'index',
    title: 'Boltech Group — contenido comercial',
    description: 'Índice de páginas por función, comparaciones e integraciones generadas desde evidencia citada.',
    sections
  });
}

const cell = value => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();

export function toMarkdown(document) {
  const out = [`# ${document.title}`, '', document.description, ''];
  for (const section of document.sections) {
    if (section.heading) out.push(`## ${section.heading}`, '');
    for (const paragraph of section.paragraphs || []) out.push(paragraph, '');
    if (section.bullets) {
      for (const item of section.bullets) out.push(`- ${item}`);
      out.push('');
    }
    if (section.table) {
      out.push(`| ${section.table.headers.map(cell).join(' | ')} |`);
      out.push(`| ${section.table.headers.map(() => '---').join(' | ')} |`);
      for (const row of section.table.rows) out.push(`| ${row.map(cell).join(' | ')} |`);
      out.push('');
    }
    if (section.note) out.push(`> ${section.note}`, '');
  }
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function toHtml(document, { indexable = false, generatedAt = new Date().toISOString() } = {}) {
  const body = [];
  for (const section of document.sections) {
    if (section.heading) body.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    for (const paragraph of section.paragraphs || []) body.push(`<p>${escapeHtml(paragraph)}</p>`);
    if (section.bullets) body.push(`<ul>${section.bullets.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    if (section.table) {
      const head = section.table.headers.map(value => `<th>${escapeHtml(value)}</th>`).join('');
      const rows = section.table.rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('');
      body.push(`<div class="scroll"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`);
    }
    if (section.note) body.push(`<p class="note">${escapeHtml(section.note)}</p>`);
  }
  const robots = indexable ? 'index, follow' : 'noindex, nofollow';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="${robots}">
<title>${escapeHtml(document.title)}</title>
<meta name="description" content="${escapeHtml(document.description)}">
<style>
:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;background:#0b0d12;color:#e8eaf0}
main{max-width:60rem;margin:0 auto;padding:3rem 1.25rem 5rem}h1{font-size:clamp(1.8rem,4vw,2.6rem);line-height:1.15;margin:0 0 .75rem}
h2{margin:2.5rem 0 .75rem;font-size:1.25rem;color:#9ecbff}.lead{font-size:1.1rem;color:#c3c8d4}
.badge{display:inline-block;margin:0 0 1.5rem;padding:.25rem .6rem;border:1px solid #3a4254;border-radius:999px;font-size:.78rem;color:#9aa3b5}
table{width:100%;border-collapse:collapse;font-size:.92rem}.scroll{overflow-x:auto}
th,td{border:1px solid #2a3140;padding:.6rem .7rem;text-align:left;vertical-align:top}th{background:#151a24}
.note{border-left:3px solid #f0b429;padding:.5rem .9rem;background:#1a1710;color:#f4dc9a}
a{color:#7cc4ff}footer{margin-top:4rem;padding-top:1.5rem;border-top:1px solid #232936;color:#8891a3;font-size:.85rem}
</style>
</head>
<body>
<main>
<p class="badge">Borrador interno · pendiente de revisión y aprobación</p>
<h1>${escapeHtml(document.title)}</h1>
<p class="lead">${escapeHtml(document.description)}</p>
${body.join('\n')}
<footer>Generado el ${escapeHtml(generatedAt)}. Fuente de la oferta: <code>config/commercial-offer.json</code>. Evidencia: <code>data/market-evidence.json</code>.</footer>
</main>
</body>
</html>
`;
}

// Builds every page plus a manifest. Nothing is deployed: the output is a local
// draft that still requires human review before publication.
export async function buildContent({ offer, evidence, outDir, generatedAt = new Date().toISOString(), indexable = false }) {
  validateOffer(offer);
  const today = generatedAt.slice(0, 10);
  assertSupported(evidence, { today });
  const documents = [];
  for (const role of evidence.roles) documents.push(renderUseCasePage(role, findService(offer, role.serviceId), { generatedAt }));
  for (const competitor of evidence.competitors) documents.push(renderComparisonPage(competitor, { generatedAt }));
  for (const entry of evidence.integrations || []) documents.push(renderIntegrationPage(entry, { generatedAt }));
  documents.push(renderIndexPage(documents, { generatedAt }));

  const manifest = {
    schemaVersion: 1,
    generatedAt,
    owner: offer.owner,
    indexable,
    status: 'DRAFT_PENDING_HUMAN_REVIEW',
    sources: { offer: 'config/commercial-offer.json', evidence: 'data/market-evidence.json' },
    documents: []
  };
  for (const document of documents) {
    const markdown = toMarkdown(document);
    const html = toHtml(document, { indexable, generatedAt });
    const base = path.join(outDir, ...document.route.split('/').filter(Boolean), 'index');
    await mkdir(path.dirname(base), { recursive: true });
    await writeFile(`${base}.md`, markdown, 'utf8');
    await writeFile(`${base}.html`, html, 'utf8');
    manifest.documents.push({
      kind: document.kind,
      route: document.route,
      title: document.title,
      markdown: `${path.relative(outDir, `${base}.md`).split(path.sep).join('/')}`,
      html: `${path.relative(outDir, `${base}.html`).split(path.sep).join('/')}`,
      sha256: createHash('sha256').update(markdown).digest('hex')
    });
  }
  await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}
