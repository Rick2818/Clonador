import { WorkflowError } from './marketing.mjs';
import { CHANNELS } from './opportunities.mjs';

const req = (payload, field) => {
  const value = payload?.[field];
  if (typeof value !== 'string' || !value.trim()) throw new WorkflowError('INVALID_PAYLOAD', `${field} is required`);
  return value.trim();
};

// Every adapter maps a channel-specific payload to the same capture contract.
// None of them performs network calls: inbound channels receive already-fetched data.
export const channelAdapters = Object.freeze({
  a2a: p => ({ externalRef: req(p, 'eventId'), company: req(p, 'partnerName'), contactName: p.contactName, contactEmail: p.contactEmail, sourceUrl: p.sourceUrl, notes: p.message }),
  // Both observed platforms convert through a demo conversation instead of a landing form.
  demo_request: p => ({ externalRef: req(p, 'requestId'), company: req(p, 'company'), contactName: p.name, contactEmail: p.email, sourceUrl: p.pageUrl, consentToContact: p.consent === true, notes: p.topic }),
  web_form: p => ({ externalRef: `${req(p, 'formId')}:${req(p, 'submissionId')}`, company: req(p, 'company'), contactName: p.name, contactEmail: p.email, sourceUrl: p.pageUrl, consentToContact: p.consent === true, notes: p.message }),
  inbound_email: p => ({ externalRef: req(p, 'messageId'), company: req(p, 'company'), contactName: p.from, contactEmail: p.from, sourceUrl: null, consentToContact: p.consent === true, notes: p.subject }),
  referral: p => ({ externalRef: req(p, 'referralId'), company: req(p, 'company'), contactName: p.referrer, notes: p.context }),
  partner_program: p => ({ externalRef: req(p, 'applicationId'), company: req(p, 'company'), contactName: p.contactName, contactEmail: p.contactEmail, sourceUrl: p.programUrl, notes: p.notes }),
  marketplace: p => ({ externalRef: `${req(p, 'marketplace')}:${req(p, 'listingId')}`, company: req(p, 'company'), contactName: p.buyerName, sourceUrl: p.listingUrl, notes: p.request }),
  directory: p => ({ externalRef: `${req(p, 'directory')}:${req(p, 'profileId')}`, company: req(p, 'company'), contactName: p.agentName, sourceUrl: p.profileUrl }),
  manual: p => ({ externalRef: req(p, 'reference'), company: req(p, 'company'), contactName: p.contactName, contactEmail: p.contactEmail, notes: p.notes })
});

export function normalizeSubmission(channel, payload, { tenantId, provenance = 'real' } = {}) {
  if (!CHANNELS.includes(channel)) throw new WorkflowError('INVALID_CHANNEL', `channel must be one of ${CHANNELS.join(', ')}`);
  const adapter = channelAdapters[channel];
  return { tenantId, channel, provenance, ...adapter(payload || {}) };
}

export function supportedChannels() { return Object.keys(channelAdapters); }
