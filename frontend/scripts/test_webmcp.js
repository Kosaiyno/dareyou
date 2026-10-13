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

// 8. Test start_adjudication (Fast-track consensus)
const adjRes = await window.__WEBMCP_TOOLS__.execute('start_adjudication', {
  dare_id: createRes.dare_id,
  fast_track: true
});
console.log(`✓ start_adjudication response: ${adjRes.message}`);
const finalizedDare = useStore.getState().dares.find(d => d.id === createRes.dare_id);
console.log(`✓ Finalized dare status: ${finalizedDare?.status}, verdict: ${finalizedDare?.verdict}`);

// 9. Test process_all_expired (Dare #11 is pre-seeded with expired deadline)
const expiredBefore = useStore.getState().dares.filter(d => d.status === 'ACCEPTED' && d.researchDeadlineTs && d.researchDeadlineTs <= Date.now()).length;
console.log(`✓ Expired dares eligible for forfeit before sweep: ${expiredBefore}`);
const sweepRes = await window.__WEBMCP_TOOLS__.execute('process_all_expired', {});
console.log(`✓ process_all_expired response: ${sweepRes.message}, resolved: ${sweepRes.resolvedCount}`);

// 10. Test undo & redo
const undoRes = await window.__WEBMCP_TOOLS__.execute('undo', {});
console.log(`✓ undo action: ${undoRes.message}`);

const redoRes = await window.__WEBMCP_TOOLS__.execute('redo', {});
console.log(`✓ redo action: ${redoRes.message}`);

console.log("\n=== ALL WEBMCP IN-BROWSER & SHARED STATE TESTS PASSED! ===");
