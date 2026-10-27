const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules');
const { createClient, createAccount, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));

const PK_FILE = path.join(__dirname, 'deployer_pk.json');
const raw = JSON.parse(fs.readFileSync(PK_FILE, 'utf8'));
const challengerAccount = createAccount(raw.privateKey);

const client = createClient({
  chain: chains.studionet,
  account: challengerAccount
});

const QUALIFIER_ADDRESS = '0x7AFB3987c13C00B6318A3491e541d31Ac9468a63';
const REGISTRY_ADDRESS = '0x5717f1fc8286d1e4d79F93e857068Cb121678D47';
const ESCROW_ADDRESS = '0xE82729980699b0f0F6dca041946488E319e3f675';

async function computeSha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

async function createLiveDareWithStake() {
  console.log('=== CREATING LIVE DARE WITH STAKE ON STUDIONET ===\n');
  console.log(`Challenger: ${challengerAccount.address}`);

  const category = "INVESTIGATIVE_FACT_FINDING";
  const title = "Dare you to verify the discovery date of the cosmic microwave background radiation";
  const claim = "Arno Penzias and Robert Wilson discovered the cosmic microwave background radiation in 1964 using the Holmdel Horn Antenna.";
  const sources = "Bell Laboratories historical archives or Penzias and Wilson (Astrophysical Journal 1965)";
  const criteria = "Quote must confirm detection of 3.5 Kelvin excess antenna temperature in 1964 at Bell Labs.";
  const duration = 600;
  const stakeCents = 500; // $5.00

  // 1. Rules SHA-256
  const canonicalRules = `${category}|${title}|${claim}|${sources}|${criteria}`;
  const contentHash = await computeSha256(canonicalRules);
  console.log(`Canonical Rules SHA-256: ${contentHash}`);

  // 2. Step 1: Pre-qualification via DareQualifier
  console.log('\n--- Step 1: Evaluating Qualification on DareQualifier ---');
  const qualTx = await client.writeContract({
    address: QUALIFIER_ADDRESS,
    functionName: 'evaluate_challenge_qualification',
    args: [contentHash, category, title, claim, sources, criteria],
    value: 0n,
    leaderOnly: false
  });
  console.log(`Qualification Tx: ${qualTx}`);
  const qualReceipt = await client.waitForTransactionReceipt({
    hash: qualTx,
    status: 'ACCEPTED',
    retries: 40,
    interval: 3500
  });
  console.log(`✔ Qualification Confirmed: ${qualReceipt.status_name} (${qualReceipt.result_name})`);

  const qualRecord = await client.readContract({
    address: QUALIFIER_ADDRESS,
    functionName: 'get_qualification',
    args: [contentHash]
  });
  console.log(`DareQualifier Decision: ${qualRecord}`);

  // 3. Step 2: Publish on DareRegistry
  console.log('\n--- Step 2: Publishing Qualified Dare on DareRegistry ---');
  const pubTx = await client.writeContract({
    address: REGISTRY_ADDRESS,
    functionName: 'publish_qualified_dare',
    args: [
      category,
      title,
      claim,
      sources,
      criteria,
      86400,
      duration,
      'APPROVED'
    ],
    value: 0n,
    leaderOnly: false
  });
  console.log(`Publication Tx: ${pubTx}`);
  const pubReceipt = await client.waitForTransactionReceipt({
    hash: pubTx,
    status: 'ACCEPTED',
    retries: 40,
    interval: 3500
  });
  console.log(`✔ Publication Confirmed: ${pubReceipt.status_name} (${pubReceipt.result_name})`);

  const totalDares = await client.readContract({
    address: REGISTRY_ADDRESS,
    functionName: 'get_total_dares',
    args: []
  });
  const newDareId = Number(totalDares);
  console.log(`✔ Successfully Minted On-Chain Dare ID: #${newDareId}`);

  // 4. Step 3: Deposit Challenger Stake in StakeEscrow
  console.log(`\n--- Step 3: Locking $5.00 (500 cents) Challenger Stake in StakeEscrow ---`);
  const stakeTx = await client.writeContract({
    address: ESCROW_ADDRESS,
    functionName: 'deposit_challenger_stake',
    args: [newDareId, challengerAccount.address, stakeCents],
    value: 0n,
    leaderOnly: false
  });
  console.log(`Challenger Stake Deposit Tx: ${stakeTx}`);
  const stakeReceipt = await client.waitForTransactionReceipt({
    hash: stakeTx,
    status: 'ACCEPTED',
    retries: 40,
    interval: 3500
  });
  console.log(`✔ Challenger Stake Confirmed: ${stakeReceipt.status_name} (${stakeReceipt.result_name})`);

  // 5. Read On-Chain Stake Record
  console.log('\n--- Step 4: Reading On-Chain Stake Info ---');
  const stakeInfoRaw = await client.readContract({
    address: ESCROW_ADDRESS,
    functionName: 'get_stake_info',
    args: [newDareId]
  });
  console.log(`On-Chain Stake Record for Dare #${newDareId}:`, stakeInfoRaw);

  // Sync to local API so Vite immediately updates
  try {
    const postData = JSON.stringify({
      id: newDareId,
      onChainId: newDareId,
      isBenchmark: false,
      title,
      category,
      domain: "Science",
      claim,
      requiredSources: sources,
      criteria,
      stakeCents,
      creationBondCents: stakeCents,
      durationSeconds: duration,
      acceptanceDeadlineTs: Date.now() + 86400000,
      researchDeadlineTs: 0,
      status: "OPEN",
      challenger: challengerAccount.address,
      txHash: pubTx
    });

    const http = require('http');
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5173,
      path: '/api/dares',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      console.log(`Synced Dare #${newDareId} to Vite local server: HTTP ${res.statusCode}`);
    });
    req.write(postData);
    req.end();
  } catch (syncErr) {
    console.warn('Sync notice:', syncErr.message);
  }

  console.log(`\n===================================================================`);
  console.log(` SUCCESS: Dare #${newDareId} created with $5.00 challenger stake locked in StakeEscrow!`);
  console.log(` Explorer URL: https://explorer-studio.genlayer.com/address/${ESCROW_ADDRESS}`);
  console.log(`===================================================================`);
}

createLiveDareWithStake().catch(err => {
  console.error('Fatal creation error:', err);
  process.exit(1);
});
