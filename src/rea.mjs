import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, WorkflowError } from './marketing.mjs';

const targets = Object.freeze({
  langflow: { organization: 'Langflow', origin: 'https://www.langflow.org' },
  'relevance-ai': { organization: 'Relevance AI', origin: 'https://relevanceai.com' }
});
const slug = id => /^[a-zA-Z0-9_-]{3,80}$/.test(id || '');
const requiredText = (value, name, limit = 2048) => {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) {
    throw new WorkflowError('INCOMPLETE_EVIDENCE', `${name} is required to register REA evidence`);
  }
  return value.trim();
};
// The manifest must prove provenance: an evidence ID alone cannot be reviewed later.
function sourceHostAllowed(url, targetId) {
  const allowed = new URL(targets[targetId].origin).hostname.replace(/^www\./i, '').toLowerCase();
  const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  return host === allowed || host.endsWith(`.${allowed}`);
}
export function reaTargets() { return structuredClone(targets); }
export async function stageReaEvidence({ file, targetId, evidenceId, localEvidenceDir, sourceUrl, coverage, limitations, capturedAt }) {
  if (!Object.hasOwn(targets, targetId)) throw new WorkflowError('INVALID_TARGET', 'Unknown research platform');
  if (!slug(evidenceId)) throw new WorkflowError('INVALID_EVIDENCE_ID', 'Evidence ID required');
  const bytes = await readFile(file);
  if (bytes.length < 40 || bytes.length > 20 * 1024 * 1024) throw new WorkflowError('INVALID_EVIDENCE', 'Evidence must be 40 bytes to 20 MiB');
  let document;
  try { document = JSON.parse(bytes.toString('utf8')); } catch { throw new WorkflowError('INVALID_EVIDENCE', 'REA evidence must be JSON'); }
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw new WorkflowError('INVALID_EVIDENCE', 'REA output must be an object');
  // A declared evidence id is checked only for consistency. It does not prove that REA executed.
  const declared = document.evidence_id ?? document.evidenceId ?? document?.normalized_result?.evidence_id;
  if (declared && declared !== evidenceId) throw new WorkflowError('EVIDENCE_CONFLICT', 'Declared evidenceId differs from requested ID');

  const url = requiredText(sourceUrl, 'sourceUrl');
  let parsed;
  try { parsed = new URL(url); } catch { throw new WorkflowError('INVALID_SOURCE_URL', 'sourceUrl must be a valid https URL'); }
  if (parsed.protocol !== 'https:') throw new WorkflowError('INVALID_SOURCE_URL', 'sourceUrl must use https');
  if (!sourceHostAllowed(url, targetId)) throw new WorkflowError('EVIDENCE_TARGET_MISMATCH', `sourceUrl must belong to ${targets[targetId].organization}`);
  const scope = requiredText(coverage, 'coverage', 500);
  const limits = requiredText(limitations, 'limitations', 1000);
  const captured = capturedAt === undefined ? new Date() : new Date(capturedAt);
  if (Number.isNaN(captured.getTime())) throw new WorkflowError('INVALID_CAPTURED_AT', 'capturedAt must be an ISO date');

  await mkdir(localEvidenceDir, { recursive: true, mode: 0o700 });
  const name = `${targetId}-${evidenceId}`;
  const ledger = {
    schemaVersion: 2, targetId, organization: targets[targetId].organization,
    evidenceId, capturedAt: captured.toISOString(), sourceUrl: url,
    coverage: scope, limitations: limits,
    artifactSha256: hash(bytes), originalFileName: path.basename(file),
    status: 'IMPORTED_PENDING_HUMAN_REVIEW',
    note: 'Hash verifies this imported artifact only; it does not authenticate REA execution, coverage or third-party behavior.'
  };
  const record = path.join(localEvidenceDir, `${name}.manifest.json`);
  try { await writeFile(record, JSON.stringify(ledger, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error?.code === 'EEXIST') throw new WorkflowError('EEXIST', 'Evidence ID already imported; keep the original manifest');
    throw error;
  }
  return ledger;
}
