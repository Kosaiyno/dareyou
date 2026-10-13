// Headless verification of WebMCP In-Browser registration & shared reactive state store
import { useStore } from '../src/store/useStore.js';
import { registerAppWebMCPTools, APP_WEBMCP_TOOLS } from '../src/webmcp/registerTools.js';

console.log("=== Testing WebMCP In-Browser Dual Registration & Shared State ===");

// 1. Mock document.modelContext
const mockRegistered = [];
globalThis.document = {
  modelContext: {
    registerTool: async (tool) => {
      mockRegistered.push(tool.name);
    }
  }
};
globalThis.window = {};

// 2. Register tools
await registerAppWebMCPTools();
console.log(`✓ Native document.modelContext registered: ${mockRegistered.length} tools`);
console.log(`✓ Global window.__WEBMCP_TOOLS__ registered: ${window.__WEBMCP_TOOLS__.list().length} tools`);

// 3. Test get_app_state (Zero DOM Clicking)
const initialState = await window.__WEBMCP_TOOLS__.execute('get_app_state', {});
console.log(`✓ Initial total dares in store: ${initialState.totalDares}`);
console.log(`✓ Active UI tab: ${initialState.activeTab}`);

// 4. Test create_dare
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
console.log(`✓ Store now has ${updatedState.dares.length} dares (Reactive re-render verified!).`);
console.log(`✓ Selected dare in store: #${updatedState.selectedDareId}`);

// 5. Test accept_dare
const acceptRes = await window.__WEBMCP_TOOLS__.execute('accept_dare', {
  dare_id: createRes.dare_id,
  investigator_address: "0xAgentInvestigatorBeta...F442"
});
console.log(`✓ accept_dare response: ${acceptRes.message}`);

// 6. Test submit_evidence
const submitRes = await window.__WEBMCP_TOOLS__.execute('submit_evidence', {
  dare_id: createRes.dare_id,
  conclusion: "CLAIM_VERIFIED_TRUE",
  primary_url: "https://web.archive.org/times-1998",
  quotes: "No altercation observed.",
  reasoning: "Official delegate log confirms no altercation occurred."
});
console.log(`✓ submit_evidence response: ${submitRes.message}`);

// 7. Test self-correction / validation tools
const validation = await window.__WEBMCP_TOOLS__.execute('validate_dare', {
  title: "Dare you to verify the goal discrepancy within 20 minutes."
});
console.log(`✓ validate_dare (self-correction): valid = ${validation.valid}`);

const audit = await window.__WEBMCP_TOOLS__.execute('validate_state', {});
console.log(`✓ validate_state (platform health audit): valid = ${audit.valid}, issues = ${audit.issues.length}`);

// 8. Test start_adjudication (Fast-track consensus with dynamic citations)
const adjRes = await window.__WEBMCP_TOOLS__.execute('start_adjudication', {
  dare_id: createRes.dare_id,
  fast_track: true
});
console.log(`✓ start_adjudication response: ${adjRes.message}`);
const finalizedDare = useStore.getState().dares.find(d => d.id === createRes.dare_id);
console.log(`✓ Finalized dare status: ${finalizedDare?.status}, verdict: ${finalizedDare?.verdict}`);
console.log(`✓ Dynamic consensus rationale: "${finalizedDare?.verdictRationale}"`);
console.log(`✓ Validator 1 (Llama 3.3) reasoning: "${finalizedDare?.adjudicationSession?.votes[0]?.reasoning}"`);
if (!finalizedDare?.verdictRationale?.includes("web.archive.org")) {
  throw new Error("FAIL: Consensus rationale did not dynamically cite submitted source!");
}

// 8b. Test Bad / Self-Referential Evidence Submission -> Multi-Validator Rejection & CHALLENGER_WINS
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
  investigator_address: "0xAgentInvestigatorBeta...F442"
});
// Submit weak/self-referential source with placeholder quotes
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
console.log(`✓ Validator 1 (Llama 3.3) rejection reason: "${rejectedDare?.adjudicationSession?.votes[0]?.reasoning}"`);
if (rejectedDare?.verdict !== "CHALLENGER_WINS") {
  throw new Error(`FAIL: Bad evidence should have produced CHALLENGER_WINS, got ${rejectedDare?.verdict}`);
}
if ((rejectedDare?.verdictScore || 100) > 40) {
  throw new Error(`FAIL: Bad evidence score should be <= 40, got ${rejectedDare?.verdictScore}`);
}

// 9. Test claim_timeout_forfeit explicitly on Dare #11 (Controlled Expired Settlement Test)
console.log("\n--- Testing Controlled Expired Settlement Flow ---");
const dare11Before = useStore.getState().dares.find(d => d.id === 11);
console.log(`✓ Dare #11 before forfeit: status = ${dare11Before?.status}, deadline passed = ${Date.now() > (dare11Before?.researchDeadlineTs || 0)}`);

const forfeitRes = await window.__WEBMCP_TOOLS__.execute('claim_timeout_forfeit', {
  dare_id: 11,
  challenger_address: "0xChallengerAlpha...81"
});
console.log(`✓ claim_timeout_forfeit response: ${forfeitRes.message}`);

const dare11After = useStore.getState().dares.find(d => d.id === 11);
console.log(`✓ Dare #11 after forfeit: status = ${dare11After?.status}, verdict = ${dare11After?.verdict}`);
console.log(`✓ Dare #11 settlement rationale: "${dare11After?.verdictRationale}"`);
if (dare11After?.status !== "FINALIZED" || dare11After?.verdict !== "CHALLENGER_WINS") {
  throw new Error("FAIL: Dare #11 timeout forfeit did not finalize with CHALLENGER_WINS!");
}

// 10. Test process_all_expired bulk sweep
const sweepRes = await window.__WEBMCP_TOOLS__.execute('process_all_expired', {});
console.log(`✓ process_all_expired bulk sweep completed: resolved = ${sweepRes.resolvedCount}`);

// 11. Test get_app_state explicit EXPIRED state segregation
const stateAfter = await window.__WEBMCP_TOOLS__.execute('get_app_state', {});
console.log(`✓ Dares summary: open=${stateAfter.daresSummary.open}, accepted=${stateAfter.daresSummary.accepted}, expired=${stateAfter.daresSummary.expired}, finalized=${stateAfter.daresSummary.finalized}`);

// 12. Test undo & redo
const undoRes = await window.__WEBMCP_TOOLS__.execute('undo', {});
console.log(`✓ undo action: ${undoRes.message}`);

const redoRes = await window.__WEBMCP_TOOLS__.execute('redo', {});
console.log(`✓ redo action: ${redoRes.message}`);

console.log("\n=== ALL WEBMCP IN-BROWSER & SHARED STATE TESTS PASSED! ===");
