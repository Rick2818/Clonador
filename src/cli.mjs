import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MarketingWorkflow, WorkflowError } from './marketing.mjs';
import { reaTargets, stageReaEvidence } from './rea.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = process.env.CLONADOR_STATE_DIR ? path.resolve(process.env.CLONADOR_STATE_DIR) : path.join(root, '.clonador');
const config = JSON.parse(await readFile(path.join(root, 'config/marketing-agent.json'), 'utf8'));
const workflow = new MarketingWorkflow({ stateDir, config });
const [command, ...args] = process.argv.slice(2);
function get(flag) { const index = args.indexOf(`--${flag}`); return index >= 0 ? args[index + 1] : undefined; }
async function payload(flag) { if (!get(flag)) throw new WorkflowError('MISSING_ARGUMENT', `--${flag} is required`); return JSON.parse(await readFile(path.resolve(get(flag)), 'utf8')); }
function print(value) { process.stdout.write(JSON.stringify(value, null, 2) + '\n'); }
try {
  if (command === 'trigger') print(await workflow.receive(await payload('file')));
  else if (command === 'reply') print(await workflow.incomingReply(await payload('file')));
  else if (command === 'approve') print(await workflow.approve(get('tenant'), get('event'), get('operator')));
  else if (command === 'handoff') print(await workflow.handoff(get('tenant'), get('event')));
  else if (command === 'receipt') print(await workflow.read(get('tenant'), get('event')));
  else if (command === 'status') print(await workflow.status());
  else if (command === 'rea-plan') print({ targets: reaTargets(), state: 'NOT_EXECUTED', setup: 'See docs/REA-WINDOWS.md' });
  else if (command === 'rea-stage') print(await stageReaEvidence({
    file: path.resolve(get('file')), evidenceId: get('evidence-id'), targetId: get('target'),
    localEvidenceDir: path.join(stateDir, 'rea-evidence') }));
  else print({
    usage: 'node src/cli.mjs <command> [arguments]',
    commands: [
      'trigger --file event.json  # valid operator/A2A event -> draft',
      'reply --file event.json    # A2A partner reply -> new draft',
      'approve --tenant T --event E --operator HUMAN  # explicit approval',
      'handoff --tenant T --event E  # INTERNAL QUEUE ONLY; no external requests',
      'receipt --tenant T --event E', 'status', 'rea-plan',
      'rea-stage --target langflow|relevance-ai --evidence-id ID --file evidence.json'
    ]
  });
} catch(e) { console.error(JSON.stringify({ error: e.code || 'ERROR', message: e.message })); process.exitCode = 1; }