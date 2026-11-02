import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, WorkflowError } from './marketing.mjs';

const targets = Object.freeze({
  langflow: { organization: 'Langflow', origin: 'https://www.langflow.org' },
  'relevance-ai': { organization: 'Relevance AI', origin: 'https://relevanceai.com' }
});
const slug = id => /^[a-zA-Z0-9_-]{3,80}$/.test(id || '');
export function reaTargets() { return structuredClone(targets); }
export async function stageReaEvidence({ file, targetId, evidenceId, localEvidenceDir }) {
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
  await mkdir(localEvidenceDir, { recursive: true, mode: 0o700 });
  const name = `${targetId}-${evidenceId}`;
  const fileHash = hash(bytes);
  const ledger = {
    schemaVersion: 1, targetId, organization: targets[targetId].organization,
    evidenceId, artifactSha256: fileHash, originalFileName: path.basename(file),
    status: 'IMPORTED_PENDING_HUMAN_REVIEW',
    note: 'Hash verifies this imported artifact only; it does not authenticate REA execution, coverage or third-party behavior.'
  };
  const record = path.join(localEvidenceDir, `${name}.manifest.json`);
  await writeFile(record, JSON.stringify(ledger, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return ledger;
}