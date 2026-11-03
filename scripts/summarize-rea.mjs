import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Summarizes a REA observation artifact without inventing content.
// Text capture may be policy-filtered; this only reports what the artifact holds.
const hostOf = url => { try { return new URL(url).hostname.toLowerCase(); } catch { return null; } };

export async function summarizeArtifact(file) {
  const artifact = JSON.parse(await readFile(file, 'utf8'));
  const result = artifact.normalized_result || {};
  const nodes = result.dom?.nodes || [];
  const count = name => nodes.filter(node => node.node_name === name).length;
  const domUrls = (result.metadata?.dom_urls || []).map(x => x.url).filter(Boolean);
  const resources = result.resources || [];
  const hosts = {};
  for (const url of [...domUrls, ...resources.map(x => x.url)]) {
    const host = hostOf(url);
    if (host) hosts[host] = (hosts[host] || 0) + 1;
  }
  const resourceTypes = {};
  for (const item of resources) resourceTypes[item.type || 'unknown'] = (resourceTypes[item.type || 'unknown'] || 0) + 1;
  return {
    evidenceId: artifact.evidence_id,
    operation: artifact.operation,
    confidence: artifact.confidence,
    url: result.target?.url || result.metadata?.dom_urls?.[0]?.url || null,
    title: result.target?.title || null,
    capturedAt: result.capture_window?.started_at || null,
    completeness: {
      status: result.completeness?.status || 'unknown',
      policyFilteredSections: result.completeness?.policy_filtered_sections || [],
      attachLimitedSections: result.completeness?.attach_limited_sections || []
    },
    textCapture: {
      status: result.accessibility?.text_capture?.status || 'unknown',
      excludedFields: result.accessibility?.text_capture?.excluded_fields ?? null
    },
    dom: {
      totalNodes: result.dom?.total_nodes ?? 0,
      headings: { h1: count('H1'), h2: count('H2'), h3: count('H3') },
      anchors: count('A'), buttons: count('BUTTON'), images: count('IMG'), forms: count('FORM'), inputs: count('INPUT')
    },
    links: {
      total: domUrls.length,
      hosts: Object.entries(hosts).sort((a, b) => b[1] - a[1]).map(([host, hits]) => ({ host, hits })),
      samplePaths: [...new Set(domUrls.filter(url => !/\.(png|jpe?g|svg|webp|css|js)$/i.test(url)).map(url => { try { return new URL(url).pathname; } catch { return null; } }).filter(Boolean))].slice(0, 25)
    },
    resources: { total: resources.length, byType: resourceTypes, thirdPartyHosts: [...new Set(resources.map(x => hostOf(x.url)).filter(h => h && !String(h).includes(new URL(result.target?.url || 'https://example.invalid').hostname.replace(/^www\./,''))))].slice(0, 25) },
    limitations: artifact.limitations || []
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const [, , target, output] = process.argv;
  const summary = await summarizeArtifact(path.resolve(target));
  const text = JSON.stringify(summary, null, 2) + '\n';
  if (output) await writeFile(output, text);
  else process.stdout.write(text);
}
