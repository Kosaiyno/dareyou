const fs = require('fs');
const path = require('path');

const deployed = JSON.parse(fs.readFileSync(path.join(__dirname, 'deployed_contracts.json'), 'utf8'));
const file = path.join(__dirname, '..', 'frontend', 'src', 'services', 'genlayerService.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/GENLAYER_ADJUDICATOR_ADDRESS\s*=\s*"[^"]+"/, `GENLAYER_ADJUDICATOR_ADDRESS = "${deployed.DareAdjudicator.address}"`);
content = content.replace(/GENLAYER_REGISTRY_ADDRESS\s*=\s*"[^"]+"/, `GENLAYER_REGISTRY_ADDRESS = "${deployed.DareRegistry.address}"`);
content = content.replace(/GENLAYER_QUALIFIER_ADDRESS\s*=\s*"[^"]+"/, `GENLAYER_QUALIFIER_ADDRESS = "${deployed.DareQualifier.address}"`);
content = content.replace(/GENLAYER_REPUTATION_ADDRESS\s*=\s*"[^"]+"/, `GENLAYER_REPUTATION_ADDRESS = "${deployed.AgentReputation.address}"`);
content = content.replace(/GENLAYER_EVIDENCE_REGISTRY_ADDRESS\s*=\s*"[^"]+"/, `GENLAYER_EVIDENCE_REGISTRY_ADDRESS = "${deployed.EvidenceRegistry.address}"`);
content = content.replace(/GENLAYER_POLICY_ADDRESS\s*=\s*"[^"]+"/, `GENLAYER_POLICY_ADDRESS = "${deployed.DarePolicy.address}"`);
content = content.replace(/GENLAYER_PROBE_NETWORK_ADDRESS\s*=\s*"[^"]+"/, `GENLAYER_PROBE_NETWORK_ADDRESS = "${deployed.NetworkProbe.address}"`);

fs.writeFileSync(file, content);
console.log('Frontend addresses successfully updated in genlayerService.ts!');
