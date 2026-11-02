import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MarketingWorkflow, WorkflowError } from './marketing.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function secureMatch(provided, expected) {
  const a = Buffer.from(String(provided || ''));
  const b = Buffer.from(String(expected || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}
function reply(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}
async function parseBody(req) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new WorkflowError('INVALID_CONTENT_TYPE', 'application/json required');
  let data = '', size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw new WorkflowError('TOO_LARGE', 'Payload exceeds 16KiB');
    data += chunk.toString('utf8');
  }
  try { return JSON.parse(data); } catch { throw new WorkflowError('INVALID_JSON', 'Valid JSON required'); }
}
export function createMarketingBridge({ workflow, a2aToken, operatorToken }) {
  if (!a2aToken || a2aToken.length < 32 || !operatorToken || operatorToken.length < 32 || a2aToken === operatorToken) {
    throw new WorkflowError('MISSING_SECRETS', 'Distinct A2A and operator secrets of at least 32 characters are required');
  }
  return createServer(async (req, res) => {
    if (req.method !== 'POST') return reply(res, 405, { error: 'METHOD_NOT_ALLOWED' });
    const uri = String(req.url || '').split('?')[0];
    const a2aRoutes = new Set(['/v1/a2a/events', '/v1/a2a/materials']);
    const operatorRoutes = new Set(['/v1/operator/approve', '/v1/operator/handoff', '/v1/operator/receipt']);
    if (!a2aRoutes.has(uri) && !operatorRoutes.has(uri)) return reply(res, 404, { error: 'NOT_FOUND' });
    const required = a2aRoutes.has(uri) ? a2aToken : operatorToken;
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ') || !secureMatch(auth.slice(7), required)) return reply(res, 401, { error: 'UNAUTHORIZED' });
    try {
      const body = await parseBody(req);
      if (uri === '/v1/a2a/events') {
        if (body?.source !== 'external-a2a') throw new WorkflowError('INVALID_SOURCE', 'Only verified A2A-origin events are allowed here');
        if (body.type === 'a2a.partner.reply.received' && !body.reference) throw new WorkflowError('MISSING_REFERENCE', 'Reply requires reference');
        const record = await workflow.receive(body);
        return reply(res, 200, { status: record.state, jobId: record.jobId, replay: Boolean(record.replay) });
      }
      if (uri === '/v1/a2a/materials') {
        const record = await workflow.read(body?.tenantId, body?.eventId);
        if (!record || record.tenantId !== body?.tenantId || record.partnerId !== body?.partnerId) return reply(res, 404, { error: 'NOT_FOUND' });
        if (record.state !== 'QUEUED_FOR_A2A') return reply(res, 409, { status: record.state, error: 'MATERIAL_NOT_APPROVED' });
        return reply(res, 200, { status: record.state, handoff: record.handoff });
      }
      if (uri === '/v1/operator/approve') {
        const result = await workflow.approve(body?.tenantId, body?.eventId, body?.operatorId);
        return reply(res, 200, { status: result.state, jobId: result.jobId, approval: result.approval });
      }
      if (uri === '/v1/operator/handoff') {
        const result = await workflow.handoff(body?.tenantId, body?.eventId);
        return reply(res, 200, { status: result.state, jobId: result.jobId });
      }
      if (uri === '/v1/operator/receipt') {
        const record = await workflow.read(body?.tenantId, body?.eventId);
        return record ? reply(res, 200, record) : reply(res, 404, { error: 'NOT_FOUND' });
      }
    } catch (e) {
      return reply(res, e instanceof WorkflowError ? 400 : 503, {
        error: e.code || 'INTERNAL_ERROR', message: e instanceof WorkflowError ? e.message : 'Local bridge failed' });
    }
  });
}
export async function startLocalBridge({ stateDir, port = 8789 } = {}) {
  const a2aToken = process.env.CLONADOR_A2A_TOKEN;
  const operatorToken = process.env.CLONADOR_OPERATOR_TOKEN;
  const config = JSON.parse(await readFile(path.join(root, 'config/marketing-agent.json'), 'utf8'));
  const workflow = new MarketingWorkflow({ stateDir: stateDir || path.join(root, '.clonador'), config });
  const server = createMarketingBridge({ workflow, a2aToken, operatorToken });
  await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve));
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const server = await startLocalBridge({ port: Number(process.env.CLONADOR_BRIDGE_PORT || 8789) });
    process.stdout.write(JSON.stringify({ status: 'LISTENING_LOCAL_ONLY', host: '127.0.0.1', port: server.address().port, externalSendingEnabled: false }) + '\n');
  } catch(e) { console.error(e.code || e.message); process.exitCode = 1; }
}