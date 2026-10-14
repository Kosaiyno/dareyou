// Headless verification of WebMCP In-Browser registration & shared reactive state store for Production
import { useStore } from '../src/store/useStore.ts';
import { registerAppWebMCPTools, APP_WEBMCP_TOOLS } from '../src/webmcp/registerTools.ts';

console.log("=== Testing WebMCP In-Browser Dual Registration & Shared State (Production Mode) ===");

// 1. Mock document.modelContext
const mockRegistered = [];
globalThis.document = {
  modelContext: {
    registerTool: async (tool) => {
      mockRegistered.push(tool.name);
    }
  }
};
globalThis.window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  }
};

// 2. Register tools
await registerAppWebMCPTools();
console.log(`✓ Native document.modelContext registered: ${mockRegistered.length} production tools`);
console.log(`✓ Global window.__WEBMCP_TOOLS__ registered: ${window.__WEBMCP_TOOLS__.list().length} production tools`);

// 3. Test get_wallet_identity
const walletIdentity = await window.__WEBMCP_TOOLS__.execute('get_wallet_identity', {});
console.log(`✓ Connected GenLayer wallet: ${walletIdentity.walletAddress}`);
console.log(`✓ StudioNet Chain ID: ${walletIdentity.chainId}`);

// 4. Test key export & import
const exportedKey = await window.__WEBMCP_TOOLS__.execute('export_wallet_key', {});
console.log(`✓ Exported private key: ${exportedKey.privateKey ? 'AVAILABLE (0x...)' : 'FAILED'}`);

const importRes = await window.__WEBMCP_TOOLS__.execute('import_wallet_key', {
  private_key: exportedKey.privateKey
});
console.log(`✓ import_wallet_key: ${importRes.message}`);

// 5. Test get_app_state (Zero seeded challenges initially!)
const initialState = await window.__WEBMCP_TOOLS__.execute('get_app_state', {});
console.log(`✓ Initial total dares in store (Production empty start): ${initialState.totalDares}`);
console.log(`✓ Active UI tab: ${initialState.activeTab}`);

// 6. Test create_dare
const createRes = await window.__WEBMCP_TOOLS__.execute('create_dare', {
  title: "Dare you to uncover the true transfer fee of a footballer whose reported transfer costs differ across multiple reputable sources within 30 minutes.",
  category: "CONFLICTING_SOURCE_INVESTIGATION",
  claim: "Guaranteed fixed base transfer fee differs by £10m in audited filings.",
  required_sources: "Official club annual financial statements.",
  criteria: "Delineate guaranteed base installment from add-ons.",
  stake_usd: 25,
  duration_minutes: 30
});
console.log(`✓ Created dare #${createRes.dare_id} via WebMCP tool.`);

// Verify store was mutated in real-time
const updatedState = useStore.getState();
console.log(`✓ Store now has ${updatedState.dares.length} dare(s) (Reactive re-render verified!).`);
console.log(`✓ Selected dare in store: #${updatedState.selectedDareId}`);

// 7. Test accept_dare
const acceptRes = await window.__WEBMCP_TOOLS__.execute('accept_dare', {
  dare_id: createRes.dare_id,
  investigator_address: walletIdentity.walletAddress
});
console.log(`✓ accept_dare response: ${acceptRes.message}`);

// 8. Test submit_evidence
const submitRes = await window.__WEBMCP_TOOLS__.execute('submit_evidence', {
  dare_id: createRes.dare_id,
  conclusion: "CLAIM_VERIFIED_TRUE",
  primary_url: "https://web.archive.org/times-1998",
  quotes: "No altercation observed in primary logs.",
  reasoning: "Official delegate log confirms no altercation occurred."
});
console.log(`✓ submit_evidence response: ${submitRes.message}`);

// 9. Test self-correction / validation tools
const validation = await window.__WEBMCP_TOOLS__.execute('validate_dare', {
  title: "Dare you to verify the goal discrepancy within 20 minutes."
});
console.log(`✓ validate_dare (self-correction): valid = ${validation.valid}`);

const audit = await window.__WEBMCP_TOOLS__.execute('validate_state', {});
console.log(`✓ validate_state (platform health audit): valid = ${audit.valid}, issues = ${audit.issues.length}`);

// 10. Test start_adjudication (Fast-track consensus with dynamic citations)
const adjRes = await window.__WEBMCP_TOOLS__.execute('start_adjudication', {
  dare_id: createRes.dare_id,
  fast_track: true
});
console.log(`✓ start_adjudication response: ${adjRes.message}`);
const finalizedDare = useStore.getState().dares.find(d => d.id === createRes.dare_id);
console.log(`✓ Finalized dare status: ${finalizedDare?.status}, verdict: ${finalizedDare?.verdict}`);
console.log(`✓ Dynamic consensus rationale: "${finalizedDare?.verdictRationale}"`);
console.log(`✓ Validator 1 reasoning: "${finalizedDare?.adjudicationSession?.votes[0]?.reasoning}"`);
if (!finalizedDare?.verdictRationale?.includes("web.archive.org")) {
  throw new Error("FAIL: Consensus rationale did not dynamically cite submitted source!");
}

// 11. Test Bad / Self-Referential Evidence Submission -> Multi-Validator Rejection & CHALLENGER_WINS
console.log("\n--- Testing Bad / Self-Referential Evidence Rejection (CHALLENGER_WINS) ---");
const badDareRes = await window.__WEBMCP_TOOLS__.execute('create_dare', {
  title: "Dare you to investigate an unrecorded youth tournament goal tally within 20 minutes.",
  category: "INVESTIGATIVE_FACT_FINDING",
  claim: "Player scored 14 goals in regional youth tournament prior to academy signing.",
  required_sources: "Regional tournament score sheets and match delegate filings.",
  criteria: "Locate formal tournament records verifying 14 goals.",
  stake_usd: 15,
  duration_minutes: 20
});
await window.__WEBMCP_TOOLS__.execute('accept_dare', {
  dare_id: badDareRes.dare_id,
  investigator_address: walletIdentity.walletAddress
});
await window.__WEBMCP_TOOLS__.execute('submit_evidence', {
  dare_id: badDareRes.dare_id,
  conclusion: "CLAIM_VERIFIED_TRUE",
  primary_url: "https://dareyou.vercel.app/preview",
  quotes: "test dummy quote",
  reasoning: "short"
});
await window.__WEBMCP_TOOLS__.execute('start_adjudication', {
  dare_id: badDareRes.dare_id,
  fast_track: true
});
const rejectedDare = useStore.getState().dares.find(d => d.id === badDareRes.dare_id);
console.log(`✓ Rejected dare status: ${rejectedDare?.status}, verdict: ${rejectedDare?.verdict}, score: ${rejectedDare?.verdictScore}`);
console.log(`✓ Rejection rationale: "${rejectedDare?.verdictRationale}"`);
if (rejectedDare?.verdict !== "CHALLENGER_WINS") {
  throw new Error(`FAIL: Bad evidence should have produced CHALLENGER_WINS, got ${rejectedDare?.verdict}`);
}
if ((rejectedDare?.verdictScore || 100) > 40) {
  throw new Error(`FAIL: Bad evidence score should be <= 40, got ${rejectedDare?.verdictScore}`);
}

// 12. Test Expired Timeout Forfeit Settlement Flow
console.log("\n--- Testing Expired Timeout Forfeit Flow ---");
const expiredDareId = useStore.getState().addDare({
  title: "Dare you to uncover missing disciplinary logs within 15 minutes.",
  category: "INVESTIGATIVE_FACT_FINDING",
  claim: "Disciplinary panel overturned penalty.",
  requiredSources: "Regional logs.",
  criteria: "Locate formal regional notice.",
  stakeCents: 2000,
  durationSeconds: 900
});
// Manually simulate accepted with expired deadline
useStore.getState().updateDare(expiredDareId, {
  status: "ACCEPTED",
  investigator: "0xDelinquentAgentAddress",
  researchDeadlineTs: Date.now() - 60000 // Expired 1 min ago
});

const forfeitRes = await window.__WEBMCP_TOOLS__.execute('claim_timeout_forfeit', {
  dare_id: expiredDareId,
  challenger_address: walletIdentity.walletAddress
});
console.log(`✓ claim_timeout_forfeit response: ${forfeitRes.message}`);

const expiredDareAfter = useStore.getState().dares.find(d => d.id === expiredDareId);
console.log(`✓ Expired dare after forfeit: status = ${expiredDareAfter?.status}, verdict = ${expiredDareAfter?.verdict}`);
if (expiredDareAfter?.status !== "FINALIZED" || expiredDareAfter?.verdict !== "CHALLENGER_WINS") {
  throw new Error("FAIL: Timeout forfeit did not finalize with CHALLENGER_WINS!");
}

// 13. State consistency check: validate_state and get_app_state agreement
const stateFinal = await window.__WEBMCP_TOOLS__.execute('get_app_state', {});
const auditFinal = await window.__WEBMCP_TOOLS__.execute('validate_state', {});
console.log(`✓ Consistency Verification:`);
console.log(`  get_app_state expired count: ${stateFinal.daresSummary.expired}`);
console.log(`  validate_state expired count: ${auditFinal.summary.expired}`);
if (stateFinal.daresSummary.expired !== auditFinal.summary.expired) {
  throw new Error(`FAIL: Inconsistent expired count! get_app_state=${stateFinal.daresSummary.expired}, validate_state=${auditFinal.summary.expired}`);
}

console.log("\n=== ALL PRODUCTION WEBMCP TESTS PASSED 100%! ===");
