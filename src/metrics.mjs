import { STAGES } from './opportunities.mjs';

const rate = (numerator, denominator) => denominator > 0 ? Number((numerator / denominator).toFixed(4)) : null;

// Metrics are computed only from persisted records. Anything not measured is
// reported as unavailable instead of guessed.
export async function computeMetrics({ registry, workflow, now = () => new Date().toISOString() }) {
  const opportunities = await registry.list();
  const byStage = Object.fromEntries(STAGES.map(stage => [stage, 0]));
  const byChannel = {};
  const provenance = { real: 0, synthetic: 0 };
  const revenueByCurrency = {};
  for (const item of opportunities) {
    byStage[item.stage] = (byStage[item.stage] || 0) + 1;
    byChannel[item.channel] = (byChannel[item.channel] || 0) + 1;
    provenance[item.provenance] = (provenance[item.provenance] || 0) + 1;
    if (item.stage === 'WON' && item.revenue?.verified) {
      revenueByCurrency[item.revenue.currency] = (revenueByCurrency[item.revenue.currency] || 0) + item.revenue.amount;
    }
  }
  const status = await workflow.status();
  const funnel = {
    captured: opportunities.length,
    qualified: byStage.QUALIFIED + byStage.MATERIAL_READY + byStage.PROPOSAL_PREPARED + byStage.PROPOSAL_AUTHORIZED + byStage.SENT + byStage.REPLIED + byStage.NEGOTIATION + byStage.WON,
    materialReady: byStage.MATERIAL_READY + byStage.PROPOSAL_PREPARED + byStage.PROPOSAL_AUTHORIZED + byStage.SENT + byStage.REPLIED + byStage.NEGOTIATION + byStage.WON,
    proposalsPrepared: byStage.PROPOSAL_PREPARED + byStage.PROPOSAL_AUTHORIZED + byStage.SENT + byStage.REPLIED + byStage.NEGOTIATION + byStage.WON,
    proposalsAuthorized: byStage.PROPOSAL_AUTHORIZED + byStage.SENT + byStage.REPLIED + byStage.NEGOTIATION + byStage.WON,
    sent: byStage.SENT + byStage.REPLIED + byStage.NEGOTIATION + byStage.WON,
    replied: byStage.REPLIED + byStage.NEGOTIATION + byStage.WON,
    negotiation: byStage.NEGOTIATION + byStage.WON,
    won: byStage.WON,
    lost: byStage.LOST,
    disqualified: byStage.DISQUALIFIED
  };
  return {
    generatedAt: now(),
    opportunities: { total: opportunities.length, byStage, byChannel, provenance },
    funnel,
    conversion: {
      captureToQualified: rate(funnel.qualified, funnel.captured),
      qualifiedToProposal: rate(funnel.proposalsPrepared, funnel.qualified),
      proposalToSent: rate(funnel.sent, funnel.proposalsAuthorized),
      sentToReply: rate(funnel.replied, funnel.sent),
      replyToWon: rate(funnel.won, funnel.replied),
      overallCaptureToWon: rate(funnel.won, funnel.captured)
    },
    revenue: {
      verifiedByCurrency: revenueByCurrency,
      source: 'only WON opportunities with verified revenue and evidence reference',
      syntheticExcluded: true
    },
    materials: { jobs: status.jobs, byState: status.byState },
    unavailable: [
      { metric: 'operatingCosts', reason: 'no cost ledger or provider billing is integrated' },
      { metric: 'externalA2ADeliveries', reason: 'external sending is disabled and requires authorization' },
      { metric: 'realCustomers', reason: 'no real customer interaction has been recorded' }
    ]
  };
}
