import { readFile } from 'node:fs/promises';
import { WorkflowError } from './marketing.mjs';

const REQUIRED = ['id', 'name', 'buyer', 'problem', 'scope', 'deliverables', 'exclusions', 'qualification', 'cta', 'priceStatus'];

// The offer is a business document, not a price list: three services, no amounts
// until the owner approves them in writing.
export function validateOffer(config) {
  if (!config || typeof config !== 'object') throw new WorkflowError('INVALID_OFFER', 'Offer config must be an object');
  if (!Array.isArray(config.services) || config.services.length !== 3) throw new WorkflowError('INVALID_OFFER', 'Exactly three services are required');
  const seen = new Set();
  for (const service of config.services) {
    for (const field of REQUIRED) {
      if (!(field in service)) throw new WorkflowError('INVALID_OFFER', `Service is missing ${field}`);
    }
    if (seen.has(service.id)) throw new WorkflowError('INVALID_OFFER', `Duplicate service id: ${service.id}`);
    seen.add(service.id);
    if (service.priceStatus !== 'PENDING_OWNER_DECISION') throw new WorkflowError('PRICE_POLICY', 'priceStatus must stay PENDING_OWNER_DECISION until approved');
    if (service.price !== null && service.price !== undefined) throw new WorkflowError('PRICE_POLICY', 'Prices must not be published before owner approval');
    for (const list of ['deliverables', 'exclusions', 'qualification']) {
      if (!Array.isArray(service[list]) || service[list].length === 0) throw new WorkflowError('INVALID_OFFER', `Service ${service.id} needs a non-empty ${list}`);
    }
  }
  return config;
}

export async function loadOffer(file) { return validateOffer(JSON.parse(await readFile(file, 'utf8'))); }
export function serviceIndex(config) {
  return config.services.map(service => ({ id: service.id, name: service.name, buyer: service.buyer, priceStatus: service.priceStatus }));
}
export function findService(config, serviceId) {
  const service = config.services.find(item => item.id === serviceId);
  if (!service) throw new WorkflowError('UNKNOWN_SERVICE', `Unknown service: ${serviceId}`);
  return service;
}
export function qualificationChecklist(config, serviceId) {
  return { service: findService(config, serviceId).name, criteria: findService(config, serviceId).qualification };
}
