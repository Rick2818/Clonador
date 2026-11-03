import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MarketingWorkflow, WorkflowError } from './marketing.mjs';
import { reaTargets, stageReaEvidence } from './rea.mjs';
import { OpportunityRegistry } from './opportunities.mjs';
import { normalizeSubmission, supportedChannels } from './channels.mjs';
import { computeMetrics } from './metrics.mjs';
import { ObjectiveRunner } from './agent.mjs';
import { validateAgentCard } from './a2a-client.mjs';
import { validateOffer, serviceIndex } from './offer.mjs';
import { buildContent } from './content.mjs';
import { loadCommercialConfig, commercialPlan, buildCommercialKit, captureCommercial, commercialMetrics } from './commercial.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = process.env.CLONADOR_STATE_DIR ? path.resolve(process.env.CLONADOR_STATE_DIR) : path.join(root, '.clonador');
const config = JSON.parse(await readFile(path.join(root, 'config/marketing-agent.json'), 'utf8'));
const workflow = new MarketingWorkflow({ stateDir, config });
const registry = new OpportunityRegistry({ stateDir });
const runner = new ObjectiveRunner({ stateDir, workflow, registry });
const [command, ...args] = process.argv.slice(2);
function get(flag) { const index = args.indexOf(`--${flag}`); return index >= 0 ? args[index + 1] : undefined; }
async function payload(flag) { if (!get(flag)) throw new WorkflowError('MISSING_ARGUMENT', `--${flag} is required`); return JSON.parse(await readFile(path.resolve(get(flag)), 'utf8')); }
function print(value) { process.stdout.write(JSON.stringify(value, null, 2) + '\n'); }
try {
  if (command === 'commercial-plan') print(commercialPlan(await loadCommercialConfig()));
  else if (command === 'commercial-build') print(await buildCommercialKit(await loadCommercialConfig(), stateDir));
  else if (command === 'commercial-capture') print(await captureCommercial(await loadCommercialConfig(), registry, await payload('file')));
  else if (command === 'commercial-metrics') print(await commercialMetrics(await loadCommercialConfig(), registry, get('tenant')));
  else if (command === 'trigger') print(await workflow.receive(await payload('file')));
  else if (command === 'reply') print(await workflow.incomingReply(await payload('file')));
  else if (command === 'approve') print(await workflow.approve(get('tenant'), get('event'), get('operator')));
  else if (command === 'handoff') print(await workflow.handoff(get('tenant'), get('event')));
  else if (command === 'receipt') print(await workflow.read(get('tenant'), get('event')));
  else if (command === 'status') print(await workflow.status());
  else if (command === 'rea-plan') print({ targets: reaTargets(), state: 'NOT_EXECUTED', setup: 'See docs/REA-WINDOWS.md' });
  else if (command === 'reconcile') print(await workflow.reconcile({ apply: args.includes('--apply') }));
  else if (command === 'rea-stage') print(await stageReaEvidence({
    file: path.resolve(get('file')), evidenceId: get('evidence-id'), targetId: get('target'),
    sourceUrl: get('source-url'), coverage: get('coverage'), limitations: get('limitations'),
    capturedAt: get('captured-at'), localEvidenceDir: path.join(stateDir, 'rea-evidence') }));
  else if (command === 'channels') print({ channels: supportedChannels() });
  else if (command === 'capture') {
    const submission = await payload('file');
    print(await registry.capture(normalizeSubmission(submission.channel, submission.payload || submission, {
      tenantId: submission.tenantId, provenance: submission.provenance
    })));
  } else if (command === 'opps') {
    print(await registry.list({ tenantId: get('tenant'), channel: get('channel'), stage: get('stage') }));
  } else if (command === 'advance') {
    print(await registry.transition(get('tenant'), get('opportunity'), get('stage'), { actor: get('actor') || 'operator', reason: get('reason') }));
  } else if (command === 'metrics') print(await computeMetrics({ registry, workflow }));
  else if (command === 'agent-run') print(await runner.start(await payload('file')));
  else if (command === 'agent-resume') print(await runner.resume(get('id')));
  else if (command === 'agent-state') print(await runner.load(get('id')));
  else if (command === 'a2a-card') print(validateAgentCard(await payload('file')));
  else if (command === 'offer') {
    const offer = validateOffer(JSON.parse(await readFile(path.resolve(get('file') || path.join(root, 'config/commercial-offer.json')), 'utf8')));
    print({ owner: offer.owner, commercialIdentity: offer.commercialIdentity, pricePolicy: offer.pricePolicy, services: serviceIndex(offer) });
  } else if (command === 'content-build') {
    const offer = validateOffer(JSON.parse(await readFile(path.resolve(get('file') || path.join(root, 'config/commercial-offer.json')), 'utf8')));
    const evidence = JSON.parse(await readFile(path.resolve(get('evidence') || path.join(root, 'data/market-evidence.json')), 'utf8'));
    print(await buildContent({
      offer, evidence,
      outDir: path.resolve(get('out') || path.join(root, 'content')),
      indexable: args.includes('--indexable')
    }));
  } else print({
    usage: 'node src/cli.mjs <command> [arguments]',
    commands: [
      'trigger --file event.json  # valid operator/A2A event -> draft',
      'reply --file event.json    # A2A partner reply -> new draft',
      'approve --tenant T --event E --operator HUMAN  # explicit approval',
      'handoff --tenant T --event E  # INTERNAL QUEUE ONLY; no external requests',
      'receipt --tenant T --event E', 'status', 'rea-plan',
      'reconcile [--apply]  # report/repair interrupted jobs and stale locks',
      'rea-stage --target langflow|relevance-ai --evidence-id ID --file evidence.json --source-url URL --coverage TEXT --limitations TEXT [--captured-at ISO]',
      'commercial-plan  # two configured commercial playbooks',
      'commercial-build  # generate a new local review kit; no publication',
      'commercial-capture --file submission.json  # consented written request with attribution',
      'commercial-metrics --tenant T  # real-only metrics by playbook',
      'channels  # supported commercial channels',
      'capture --file submission.json  # normalize a channel submission into the registry',
      'opps [--tenant T] [--channel C] [--stage S]',
      'advance --tenant T --opportunity ID --stage STAGE [--actor A] [--reason R]',
      'metrics  # funnel, conversion, verified revenue and unavailable metrics',
      'agent-run --file objective.json  # objective -> opportunity -> draft -> human gate',
      'agent-resume --id ID', 'agent-state --id ID',
      'a2a-card --file card.json  # validate an Agent Card before use',
      'offer [--file config/commercial-offer.json]  # three services, no published price',
      'content-build [--out DIR] [--file OFFER] [--evidence EVIDENCE] [--indexable]  # local draft pages + manifest'
    ]
  });
} catch(e) { console.error(JSON.stringify({ error: e.code || 'ERROR', message: e.message })); process.exitCode = 1; }
