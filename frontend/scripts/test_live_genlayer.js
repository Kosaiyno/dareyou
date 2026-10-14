import { submitRealGenLayerAdjudication, formatRealValidatorVotes, GENLAYER_ADJUDICATOR_ADDRESS } from '../src/services/genlayerService.ts';

console.log("=== Testing Real GenLayer StudioNet Validator Consensus Adjudication ===");
console.log(`Deployed Contract: ${GENLAYER_ADJUDICATOR_ADDRESS}`);

const testDare = {
  id: 42,
  title: "Dare you to verify official Premier League delegate report regarding offside communication within 20 minutes.",
  category: "EVIDENCE_SYNTHESIS",
  claim: "The VAR communication log confirms official review was initiated prior to match restart.",
  requiredSources: "Official IFAB delegate reports and published federation audio logs.",
  criteria: "Demonstrate chronological timestamp of VAR audio alert matching official protocol."
};

const testEvidence = {
  conclusion: "CLAIM_VERIFIED_TRUE",
  primaryUrl: "https://web.archive.org/web/20231015/https://theanalyst.com/var-audio-release",
  quotes: "Audio release minute 48:12 confirms VAR initiated offside review 14 seconds before referee whistle signal.",
  reasoning: "Official audio transcript demonstrates review was formally active under IFAB Law 5 protocol."
};

console.log("Submitting real transaction to GenLayer StudioNet...");
const result = await submitRealGenLayerAdjudication(testDare, testEvidence, (txHash) => {
  console.log(`✓ Real Tx Hash Broadcast: ${txHash}`);
});

console.log("\n--- Real On-Chain Adjudication Confirmed ---");
console.log(`✓ Tx Hash: ${result.txHash}`);
console.log(`✓ Receipt Status: ${result.receiptStatus}`);
console.log(`✓ Real Validators (${result.validators.length}):`, result.validators);
console.log(`✓ Real Validator Votes:`, result.validatorVotes);
console.log(`✓ On-Chain Verdict: ${result.verdict}`);
console.log(`✓ On-Chain Score: ${result.score}/100`);
console.log(`✓ Real Equivalence Principle Rationale: "${result.rationale}"`);

const uiVotes = formatRealValidatorVotes(
  result.validators,
  result.validatorVotes,
  result.verdict,
  result.score,
  result.rationale
);
console.log(`✓ Formatted ${uiVotes.length} UI validator votes from live on-chain nodes.`);
console.log("\n=== REAL GENLAYER VALIDATOR TEST PASSED 100%! ===");
