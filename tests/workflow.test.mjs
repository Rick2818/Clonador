import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { MarketingWorkflow, normalizeEvent, createMaterial } from '../src/marketing.mjs';
import { stageReaEvidence } from '../src/rea.mjs';
import { createMarketingBridge } from '../src/bridge.mjs';

const config = {
  operatorOrganization:'Boltech Group', commercialDomain:'https://boltech-group.vercel.app',
  offerings:['Agentes preelaborados', 'Agentes a medida']
};
const incoming = (changes={}) => ({
  eventId:'real-or-operator-001',tenantId:'tenant-one',partnerId:'partner-one',partnerName:'Example Partner',
  subject:'Partnership inquiry',message:'We want to learn what Boltech provides.',
  type:'a2a.partner.received',source:'external-a2a',sourceReceipt:'a2a-receipt-001',language:'es',...changes
});
async function fixture(t) {
  const dir=await mkdtemp(path.join(os.tmpdir(),'clonador-test-'));
  t.after(async()=>{await rm(dir,{recursive:true,force:true})});
  return {dir, workflow: new MarketingWorkflow({stateDir:dir, config, now:()=> '2026-11-01T20:00:00Z'})};
}
test('A2A inbound creates unapproved ES material with provenance and no send',async t=>{
  const {workflow}=await fixture(t);const record=await workflow.receive(incoming());
  assert.equal(record.state,'DRAFT_REVIEW_REQUIRED');
  assert.equal(record.sourceReceipt,'a2a-receipt-001');
  assert.match(record.draft.body,/Boltech Group/);
  assert.equal(record.handoff,null);
});
test('A2A idempotency preserves original draft and rejects same id changed data',async t=>{
  const {workflow}=await fixture(t);const a=await workflow.receive(incoming());const b=await workflow.receive(incoming());
  assert.equal(a.jobId,b.jobId);assert.equal(b.replay,true);
  await assert.rejects(workflow.receive(incoming({message:'Different text'})),e=>e.code==='EVENT_CONFLICT');
});
test('simultaneous same id never creates two jobs',async t=>{
  const {workflow}=await fixture(t);const r=await Promise.allSettled([workflow.receive(incoming()),workflow.receive(incoming())]);
  assert.equal(r.filter(x=>x.status==='fulfilled'&&!x.value.replay).length,1);
  assert.ok(r.some(x=>x.status==='fulfilled'));
});
test('approve and handoff are distinct internal-only steps',async t=>{
  const {workflow}=await fixture(t);await workflow.receive(incoming());
  await assert.rejects(workflow.handoff('tenant-one','real-or-operator-001'),e=>e.code==='BAD_STATE');
  const approval=await workflow.approve('tenant-one','real-or-operator-001','director');
  assert.equal(approval.state,'APPROVED_FOR_HANDOFF');
  const queued=await workflow.handoff('tenant-one','real-or-operator-001');
  assert.equal(queued.state,'QUEUED_FOR_A2A');
  assert.equal(queued.handoff.instruction,'QUEUE_FOR_REVIEW_ONLY_NO_EXTERNAL_SEND');
  assert.equal(queued.handoff.tenantId,'tenant-one');
  await assert.rejects(workflow.handoff('tenant-one','real-or-operator-001'),e=>e.code==='BAD_STATE');
});
test('reply is another event with preserved parent reference and not automatic transmission',async t=>{
  const {workflow}=await fixture(t);await workflow.receive(incoming());
  const r=await workflow.incomingReply(incoming({eventId:'partner-reply-002',type:'a2a.partner.reply.received',reference:'real-or-operator-001',message:'We are interested'}));
  assert.equal(r.replyTo,'real-or-operator-001');assert.equal(r.state,'DRAFT_REVIEW_REQUIRED');
  assert.equal(r.handoff,null);
});
test('reject invalid receipts, consent, sender and unsupported events',()=>{
  for(const x of [
    {sourceReceipt:''},{consentToShareDetails:'yes'},{source:'unknown'},{type:'future.event'},
    {tenantId:''},{partnerId:''}
  ])assert.throws(()=>normalizeEvent(incoming(x)));
});
test('emails and phone numbers in untrusted context are redacted from generated materials',()=>{
  const draft=createMaterial(normalizeEvent(incoming({message:'Please call +1 415 555 1234 or email private@example.test'})),config);
  assert.doesNotMatch(draft.body,/private@example.test|415 555 1234/);
});
test('EN messages produce English marketing drafts without fabricated customer references',()=>{
  const draft=createMaterial(normalizeEvent(incoming({language:'en'})),config);
  assert.match(draft.body,/Our current service categories/);
  assert.doesNotMatch(draft.body,/100% ROI|SOC 2|guaranteed revenue/i);
});
test('REA artifacts imported as pending, never certified',async t=>{
  const {dir}=await fixture(t);const file=path.join(dir,'rea.json');
  await writeFile(file,JSON.stringify({evidence_id:'rea_observation_12345',normalized_result:{coverage:{status:'partial'},targets:['Langflow']}}));
  const staged=await stageReaEvidence({file,targetId:'langflow',evidenceId:'rea_observation_12345',localEvidenceDir:path.join(dir,'rea-records'),
    sourceUrl:'https://www.langflow.org/pricing',coverage:'Pricing page only',limitations:'No login, no checkout flow observed'});
  assert.equal(staged.status,'IMPORTED_PENDING_HUMAN_REVIEW');
  assert.equal(staged.artifactSha256.length,64);
  assert.equal(staged.schemaVersion,2);
  assert.equal(staged.coverage,'Pricing page only');
  assert.match(staged.capturedAt,/^\d{4}-\d{2}-\d{2}T/);
  await assert.rejects(stageReaEvidence({file,targetId:'langflow',evidenceId:'rea_observation_12345',localEvidenceDir:path.join(dir,'rea-records'),
    sourceUrl:'https://www.langflow.org/pricing',coverage:'Pricing page only',limitations:'No login'}),e=>e.code==='EEXIST');
});
test('REA import requires provenance, coverage, limits and a matching vendor URL',async t=>{
  const {dir}=await fixture(t);const file=path.join(dir,'rea.json');
  await writeFile(file,JSON.stringify({evidence_id:'rea_observation_77777',payload:'p'.repeat(50)}));
  const base={file,targetId:'langflow',evidenceId:'rea_observation_77777',localEvidenceDir:path.join(dir,'rea-records')};
  await assert.rejects(stageReaEvidence(base),e=>e.code==='INCOMPLETE_EVIDENCE');
  await assert.rejects(stageReaEvidence({...base,sourceUrl:'https://example.test/x',coverage:'c',limitations:'l'}),e=>e.code==='EVIDENCE_TARGET_MISMATCH');
  await assert.rejects(stageReaEvidence({...base,sourceUrl:'http://www.langflow.org/x',coverage:'c',limitations:'l'}),e=>e.code==='INVALID_SOURCE_URL');
  await assert.rejects(stageReaEvidence({...base,sourceUrl:'https://www.langflow.org/x',coverage:'',limitations:'l'}),e=>e.code==='INCOMPLETE_EVIDENCE');
});
test('REA import rejects mismatched identity and arbitrary vendor',async t=>{
  const {dir}=await fixture(t);const file=path.join(dir,'rea.json');
  await writeFile(file,JSON.stringify({evidence_id:'legitimate_id_111',payload:'n'.repeat(100)}));
  await assert.rejects(stageReaEvidence({file,targetId:'langflow',evidenceId:'wrong_id_111',localEvidenceDir:dir}),e=>e.code==='EVIDENCE_CONFLICT');
  await assert.rejects(stageReaEvidence({file,targetId:'other',evidenceId:'legitimate_id_111',localEvidenceDir:dir}),e=>e.code==='INVALID_TARGET');
});
test('local loopback bridge enforces roles, tenant isolation, approvals, and reverse delivery',async t=>{
  const {workflow}=await fixture(t);
  const tokenA='local-a2a-secret-token-with-32-characters', tokenO='local-operator-secret-token-with-32-characters';
  const server=createMarketingBridge({workflow,a2aToken:tokenA,operatorToken:tokenO});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>await new Promise(resolve=>server.close(resolve)));
  const addr='http://127.0.0.1:'+server.address().port;
  async function invoke(uri,body,token){const r=await fetch(addr+uri,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
  assert.equal((await invoke('/v1/a2a/events',incoming(),'wrong')).status,401);
  assert.equal((await invoke('/v1/a2a/events',incoming(),tokenO)).status,401);
  assert.equal((await invoke('/v1/a2a/events',incoming(),tokenA)).status,200);
  const ref={tenantId:'tenant-one',eventId:'real-or-operator-001',partnerId:'partner-one'};
  assert.equal((await invoke('/v1/a2a/materials',ref,tokenA)).status,409);
  assert.equal((await invoke('/v1/operator/approve', {...ref,operatorId:'director'},tokenA)).status,401);
  assert.equal((await invoke('/v1/operator/approve', {...ref,operatorId:'director'},tokenO)).status,200);
  assert.equal((await invoke('/v1/operator/handoff',ref,tokenO)).status,200);
  assert.equal((await invoke('/v1/a2a/materials',{...ref,tenantId:'wrong-tenant'},tokenA)).status,404);
  assert.equal((await invoke('/v1/a2a/materials',{...ref,partnerId:'wrong-partner'},tokenA)).status,404);
  const material=await invoke('/v1/a2a/materials',ref,tokenA);
  assert.equal(material.status,200);
  assert.equal(material.data.handoff.recipientAgent,'clonador-a2a');
  assert.equal(material.data.handoff.instruction,'QUEUE_FOR_REVIEW_ONLY_NO_EXTERNAL_SEND');
  const reply=await invoke('/v1/a2a/events',incoming({eventId:'other-reply-001',reference:'real-or-operator-001',type:'a2a.partner.reply.received'}),tokenA);
  assert.equal(reply.status,200);
});
test('bridge refuses default startup without distinct strong credentials',async t=>{
  const {workflow}=await fixture(t);
  assert.throws(()=>createMarketingBridge({workflow,a2aToken:'weak',operatorToken:'weak'}),e=>e.code==='MISSING_SECRETS');
});
test('live locks block and stale locks are reclaimed',async t=>{
  const {workflow}=await fixture(t);await workflow.receive(incoming());
  const lock=path.join(workflow.folder('tenant-one','real-or-operator-001'),'operation.lock');
  await writeFile(lock,JSON.stringify({pid:process.pid,host:os.hostname(),startedAt:Date.now()}));
  await assert.rejects(workflow.approve('tenant-one','real-or-operator-001','director'),e=>e.code==='BUSY');
  await writeFile(lock,JSON.stringify({pid:2147483646,host:os.hostname(),startedAt:Date.now()}));
  const approved=await workflow.approve('tenant-one','real-or-operator-001','director');
  assert.equal(approved.state,'APPROVED_FOR_HANDOFF');
  await assert.rejects(readFile(lock),e=>e.code==='ENOENT');
});
test('reconcile reports, then repairs interrupted jobs on apply',async t=>{
  const {workflow}=await fixture(t);
  const folder=workflow.folder('tenant-one','interrupted-001');
  await mkdir(folder,{recursive:true});
  const dry=await workflow.reconcile();
  assert.equal(dry.applied,false);
  assert.deepEqual(dry.quarantined,[path.basename(folder)]);
  const applied=await workflow.reconcile({apply:true});
  assert.equal(applied.applied,true);
  assert.equal(applied.quarantined.length,1);
  const record=await workflow.receive(incoming({eventId:'interrupted-001'}));
  assert.equal(record.state,'DRAFT_REVIEW_REQUIRED');
  const status=await workflow.status();
  assert.equal(status.jobs,1);
  assert.equal(status.byState.DRAFT_REVIEW_REQUIRED,1);
});
test('operator token can be scoped to specific tenants',async t=>{
  const {workflow}=await fixture(t);
  const tokenA='local-a2a-secret-token-with-32-characters', tokenO='local-operator-secret-token-with-32-characters';
  const server=createMarketingBridge({workflow,a2aToken:tokenA,operatorToken:tokenO,operatorTenants:['tenant-one']});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>await new Promise(resolve=>server.close(resolve)));
  const addr='http://127.0.0.1:'+server.address().port;
  async function invoke(uri,body,token){const r=await fetch(addr+uri,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
  assert.equal((await invoke('/v1/a2a/events',incoming(),tokenA)).status,200);
  assert.equal((await invoke('/v1/operator/approve',{tenantId:'tenant-two',eventId:'real-or-operator-001',operatorId:'director'},tokenO)).status,403);
  assert.equal((await invoke('/v1/operator/approve',{tenantId:'tenant-one',eventId:'real-or-operator-001',operatorId:'director'},tokenO)).status,200);
});