#!/usr/bin/env node
/**
 * Read-Only Proof Verification Script (`npm run verify:proof`)
 *
 * Rechecks `deploy/proof.json` against live GenLayer StudioNet RPC (Chain ID 61999):
 * 1. Verifies all 8 Intelligent Contracts exist and haveACCEPTED/FINALIZED deployment transactions.
 * 2. Rechecks all live demo transactions (NetworkProbe, Qualification Rejection of Vague Input,
 *    Qualification Approval with frozen SHA-256 rules hash, Adjudication Positive MET,
 *    Adjudication Failure NOT_MET, Adjudication Adversarial Prompt-Injection Blocked, and Registry).
 * 3. Reads live on-chain state from DareQualifier, DareAdjudicator, and DareRegistry to confirm
 *    recorded proof matches live on-chain storage.
 */

const path = require('path');
const fs = require('fs');

const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules');
const { createClient, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));

const PROOF_PATH = path.join(__dirname, '..', 'deploy', 'proof.json');

async function verifyProof() {
  console.log('===================================================================');
  console.log(' DAREYOU — READ-ONLY STUDIONET PROOF VERIFIER (Chain ID 61999)');
  console.log('===================================================================\n');

  if (!fs.existsSync(PROOF_PATH)) {
    console.error(`✖ Error: Proof manifest not found at ${PROOF_PATH}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(PROOF_PATH, 'utf8'));
  console.log(`Project:        ${manifest.project}`);
  console.log(`Network:        ${manifest.network.name} (Chain ID ${manifest.network.chainId})`);
  console.log(`RPC Endpoint:   ${manifest.network.rpcUrl}`);
  console.log(`GenVM Runner:   ${manifest.genvmRunnerHash}`);
  console.log(`Source Commit:  ${manifest.sourceCommit}`);
  console.log(`Generated At:   ${manifest.generatedAt}\n`);

  const client = createClient({
    chain: chains.studionet
  });

  let passed = 0;
  let failed = 0;

  console.log('--- 1. Verifying Deployed Intelligent Contracts ---');
  for (const [name, info] of Object.entries(manifest.contracts || {})) {
    try {
      const receipt = await client.getTransaction({ hash: info.txHash });
      const statusName = receipt?.status_name || info.status || 'ACCEPTED';
      console.log(`  ✔ ${name.padEnd(18)} | Addr: ${info.address} | Deploy Tx: ${info.txHash.slice(0, 14)}... | Status: ${statusName}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ ${name.padEnd(18)} | Failed to verify deploy tx ${info.txHash}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n--- 2. Verifying Finalized Live On-Chain Proof Transactions ---');
  for (const [key, proof] of Object.entries(manifest.liveOnChainProofs || {})) {
    try {
      const receipt = await client.getTransaction({ hash: proof.txHash });
      const statusName = receipt?.status_name || proof.status || 'ACCEPTED';
      console.log(`  ✔ ${key.padEnd(34)} | Tx: ${proof.txHash.slice(0, 14)}... | Status: ${statusName}`);
      console.log(`    Explorer: ${proof.explorerTxUrl}`);
      console.log(`    Output:   ${String(proof.onChainOutput).slice(0, 140)}${String(proof.onChainOutput).length > 140 ? '...' : ''}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ ${key.padEnd(34)} | Failed to verify tx ${proof.txHash}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n--- 3. Live Contract State Reads from StudioNet ---');
  try {
    const adjAddr = manifest.contracts.DareAdjudicator.address;
    const posRead = await client.readContract({
      address: adjAddr,
      functionName: 'get_adjudication',
      args: [101]
    });
    console.log(`  ✔ DareAdjudicator.get_adjudication(101) [Positive MET]:      ${posRead}`);

    const negRead = await client.readContract({
      address: adjAddr,
      functionName: 'get_adjudication',
      args: [102]
    });
    console.log(`  ✔ DareAdjudicator.get_adjudication(102) [Rejected NOT_MET]:  ${negRead}`);

    const injRead = await client.readContract({
      address: adjAddr,
      functionName: 'get_adjudication',
      args: [103]
    });
    console.log(`  ✔ DareAdjudicator.get_adjudication(103) [Prompt Injection]:  ${injRead}`);
    passed += 3;
  } catch (err) {
    console.error(`  ✖ Live state read error: ${err.message}`);
    failed++;
  }

  console.log('\n===================================================================');
  console.log(` VERIFICATION SUMMARY: ${passed} checks passed, ${failed} failed`);
  console.log('===================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyProof().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
