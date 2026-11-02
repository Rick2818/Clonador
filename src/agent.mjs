import { mkdir, open, readFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { hash, WorkflowError } from './marketing.mjs';
import { STAGES } from './opportunities.mjs';

const STEP_NAMES = ['capture_opportunity', 'draft_material', 'qualify', 'material_ready', 'verify', 'human_gate'];
const order = stage => STAGES.indexOf(stage);

// Persistent objective engine: plan -> execute -> verify -> recover.
// It never approves or sends anything; the human gate is a recorded step.
export class ObjectiveRunner {
  constructor({ stateDir, workflow, registry, now = () => new Date().toISOString() }) {
    if (!path.isAbsolute(stateDir)) throw new WorkflowError('INVALID_STORAGE', 'Absolute state path is required');
    this.base = path.join(stateDir, 'objectives');
    this.workflow = workflow;
    this.registry = registry;
    this.now = now;
  }
  file(objectiveId) { return path.join(this.base, `${objectiveId}.json`); }
  async load(objectiveId) {
    try { return JSON.parse(await readFile(this.file(objectiveId), 'utf8')); }
    catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
  }
  async persist(state) {
    await mkdir(this.base, { recursive: true, mode: 0o700 });
    const target = this.file(state.objectiveId);
    const temp = `${target}.${randomUUID()}.tmp`;
    const fd = await open(temp, 'wx', 0o600);
    try { await fd.writeFile(JSON.stringify(state, null, 2) + '\n'); await fd.sync(); } finally { await fd.close(); }
    await rename(temp, target);
    return state;
  }
  async start({ goal, tenantId, event, opportunity }) {
    if (!event?.eventId) throw new WorkflowError('INVALID_OBJECTIVE', 'event.eventId is required');
    const objectiveId = hash(JSON.stringify([tenantId, event.eventId])).slice(0, 32);
    const existing = await this.load(objectiveId);
    if (existing) {
      if (existing.goal !== goal) throw new WorkflowError('OBJECTIVE_CONFLICT', 'Same event already runs a different objective');
      return existing.status === 'COMPLETED' ? { ...existing, replay: true } : this.resume(objectiveId);
    }
    const state = {
      schemaVersion: 1, objectiveId, goal, tenantId, eventId: event.eventId,
      status: 'IN_PROGRESS', createdAt: this.now(), updatedAt: this.now(), result: null,
      input: { event, opportunity: { ...opportunity, tenantId } },
      steps: STEP_NAMES.map(name => ({ name, status: 'PENDING' }))
    };
    await this.persist(state);
    return this.execute(state);
  }
  async resume(objectiveId) {
    const state = await this.load(objectiveId);
    if (!state) throw new WorkflowError('NOT_FOUND', 'Unknown objective');
    if (state.status === 'COMPLETED') return state;
    for (const step of state.steps) if (step.status === 'FAILED') step.status = 'PENDING';
    state.status = 'IN_PROGRESS';
    return this.execute(state);
  }
  async execute(state) {
    for (const step of state.steps) {
      if (step.status === 'COMPLETED') continue;
      step.status = 'IN_PROGRESS';
      step.startedAt = this.now();
      await this.persist(state);
      try {
        await this[step.name](state);
        step.status = 'COMPLETED';
        step.completedAt = this.now();
        delete step.error;
      } catch (error) {
        step.status = 'FAILED';
        step.error = { code: error?.code || 'ERROR', message: error?.message || 'step failed' };
        state.status = 'BLOCKED';
        state.updatedAt = this.now();
        await this.persist(state);
        return state;
      }
      state.updatedAt = this.now();
      await this.persist(state);
    }
    state.status = 'COMPLETED';
    state.updatedAt = this.now();
    state.result = {
      opportunityId: state.opportunityId,
      jobId: state.jobId,
      requiresHumanApproval: true,
      note: 'Draft is queued for human review; no approval or external send was performed by the agent.'
    };
    return this.persist(state);
  }
  async advance(tenantId, opportunityId, target, actor) {
    const record = await this.registry.read(tenantId, opportunityId);
    if (!record) throw new WorkflowError('NOT_FOUND', 'Unknown opportunity');
    if (record.stage === target || order(record.stage) > order(target)) return record;
    return this.registry.transition(tenantId, opportunityId, target, { actor, reason: 'objective_execution' });
  }
  async capture_opportunity(state) {
    const record = await this.registry.capture(state.input.opportunity);
    state.opportunityId = record.opportunityId;
    return record;
  }
  async draft_material(state) {
    const record = await this.workflow.receive(state.input.event);
    state.jobId = record.jobId;
    if (record.state !== 'DRAFT_REVIEW_REQUIRED') throw new WorkflowError('UNEXPECTED_STATE', `Draft expected in DRAFT_REVIEW_REQUIRED, got ${record.state}`);
    return record;
  }
  async qualify(state) { return this.advance(state.tenantId, state.opportunityId, 'QUALIFIED', 'objective-agent'); }
  async material_ready(state) { return this.advance(state.tenantId, state.opportunityId, 'MATERIAL_READY', 'objective-agent'); }
  async verify(state) {
    const opportunity = await this.registry.read(state.tenantId, state.opportunityId);
    const job = await this.workflow.read(state.tenantId, state.eventId);
    if (!opportunity || opportunity.stage !== 'MATERIAL_READY') throw new WorkflowError('VERIFICATION_FAILED', 'Opportunity is not in MATERIAL_READY');
    if (!job || job.state !== 'DRAFT_REVIEW_REQUIRED') throw new WorkflowError('VERIFICATION_FAILED', 'Material is not awaiting human review');
    if (job.approval) throw new WorkflowError('VERIFICATION_FAILED', 'Material was approved before the human gate');
    return { opportunity: opportunity.opportunityId, job: job.jobId };
  }
  async human_gate(state) {
    state.humanGate = { required: true, at: this.now(), action: 'operator must approve and hand off explicitly' };
  }
}
