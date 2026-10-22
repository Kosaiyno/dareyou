const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules');
const { createClient, createAccount, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));

// Load deployer (challenger) private key
const envFile = path.join(__dirname, '..', '.env');
let challengerPk = null;

if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const match = envContent.match(/^DEPLOYER_PRIVATE_KEY\s*=\s*(0x[a-fA-F0-9]{64})/m);
  if (match) challengerPk = match[1];
}

if (!challengerPk) {
  const PK_FILE = path.join(__dirname, 'deployer_pk.json');
  if (fs.existsSync(PK_FILE)) {
    const raw = JSON.parse(fs.readFileSync(PK_FILE, 'utf8'));
    if (raw.privateKey && raw.privateKey.startsWith('0x') && raw.privateKey.length === 66) {
      challengerPk = raw.privateKey;
    }
  }
}

const challenger = createAccount(challengerPk);
console.log('Challenger Address:  ', challenger.address);

// Distinct investigator account
const investigatorPk = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const investigator = createAccount(investigatorPk);
console.log('Investigator Address:', investigator.address);

const challengerClient = createClient({
  chain: chains.studionet,
  account: challenger
});

const investigatorClient = createClient({
  chain: chains.studionet,
  account: investigator
});

async function safeWrite(client, params, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const tx = await client.writeContract(params);
      return tx;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.log(`[RPC Retry ${attempt}/${maxRetries}] ${err.message?.slice(0, 80)}... Waiting ${attempt * 3}s`);
      await new Promise(r => setTimeout(r, attempt * 3000));
    }
  }
}

async function expectRevert(client, params) {
  const tx = await client.writeContract(params);
  const receipt = await client.getTransaction({ hash: tx });
  const gasUsed = receipt.gasUsed || 0n;
  const eqOutputs = receipt.eq_blocks_outputs || '';
  if (gasUsed >= 8000000n || eqOutputs === '0xc8c6c28000c0c080c0' || eqOutputs === '0xcdc6c20200c0c080c5c480c20200') {
    return true;
  }
  throw new Error(`Expected revert but got: gasUsed=${gasUsed}, eqOutputs=${eqOutputs}`);
}

// Load deployed addresses
let contracts = {};
const deployedFile = path.join(__dirname, 'deployed_contracts.json');
const proofFile = path.join(__dirname, '..', 'deploy', 'proof.json');

if (fs.existsSync(deployedFile)) {
  const raw = JSON.parse(fs.readFileSync(deployedFile, 'utf8'));
  for (const [k, v] of Object.entries(raw)) {
    if (v.address) contracts[k] = v.address;
  }
} else if (fs.existsSync(proofFile)) {
  const raw = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
  if (raw.contracts) {
    for (const [k, v] of Object.entries(raw.contracts)) {
      if (v.address) contracts[k] = v.address;
    }
  }
}

async function runAuthenticatedE2E() {
  console.log('=== RUNNING EXCLUSIVE AUTHENTICATED E2E LIFECYCLE ON STUDIONET ===\n');

  const { DareRegistry, DareQualifier, DareAdjudicator, EvidenceRegistry, DarePolicy } = contracts;

  console.log(`DareRegistry:    ${DareRegistry}`);
  console.log(`DareQualifier:   ${DareQualifier}`);
  console.log(`EvidenceRegistry:${EvidenceRegistry}`);
  console.log(`DareAdjudicator: ${DareAdjudicator}`);
  console.log(`DarePolicy:      ${DarePolicy}\n`);

  // Challenge Specification
  const category = 'INVESTIGATIVE_FACT_FINDING';
  const title = `Dare you to verify Apollo 11 lunar module landing coordinates on Sea of Tranquility #${Date.now().toString().slice(-4)}`;
  const claim = 'NASA Apollo 11 Lunar Module Eagle touched down on the Moon Mare Tranquillitatis at 0.67 N, 23.47 E.';
  const sources = 'NASA Apollo 11 Mission Report or NSSDC archival catalog.';
  const criteria = 'Archival citation confirming Sea of Tranquility touchdown on July 20, 1969 with coordinates within 0.1 degree.';
  const duration = 3600;

  // Canonical rules hash
  const canonicalRules = `${category}|${title.trim()}|${claim.trim()}|${sources.trim()}|${criteria.trim()}`;
  const contentHash = crypto.createHash('sha256').update(canonicalRules).digest('hex');
  console.log(`Canonical Rules SHA-256: ${contentHash}`);

  // Step 1: Pre-qualification via DareQualifier
  console.log(`\nStep 1/6: Qualifying challenge with DareQualifier AI gate...`);
  const qualTx = await safeWrite(challengerClient, {
    address: DareQualifier,
    functionName: 'evaluate_challenge_qualification',
    args: [contentHash, category, title, claim, sources, criteria]
  });
  console.log(`Tx submitted: ${qualTx}. Waiting for consensus...`);
  await challengerClient.waitForTransactionReceipt({ hash: qualTx, status: 'ACCEPTED', retries: 35, interval: 3000 });
  
  const qualRecord = await challengerClient.readContract({
    address: DareQualifier,
    functionName: 'get_qualification',
    args: [contentHash]
  });
  console.log(`✔ DareQualifier decision on-chain:`, qualRecord);

  // Step 2: Publish qualified challenge on DareRegistry
  console.log(`\nStep 2/6: Publishing qualified dare on DareRegistry (cryptographically bound)...`);
  const pubTx = await safeWrite(challengerClient, {
    address: DareRegistry,
    functionName: 'publish_qualified_dare',
    args: [category, title, claim, sources, criteria, 86400, duration, 'APPROVED']
  });
  console.log(`Tx submitted: ${pubTx}. Waiting for consensus...`);
  await challengerClient.waitForTransactionReceipt({ hash: pubTx, status: 'ACCEPTED', retries: 30, interval: 3000 });

  const totalDares = await challengerClient.readContract({
    address: DareRegistry,
    functionName: 'get_total_dares',
    args: []
  });
  const dareId = Number(totalDares);
  console.log(`✔ Dare #${dareId} published with status OPEN!`);

  // Step 3: Accept challenge as distinct Investigator
  console.log(`\nStep 3/6: Accepting Dare #${dareId} as distinct Investigator (${investigator.address})...`);
  const acceptTx = await safeWrite(investigatorClient, {
    address: DareRegistry,
    functionName: 'accept_dare',
    args: [dareId]
  });
  console.log(`Tx submitted: ${acceptTx}. Waiting for consensus...`);
  await investigatorClient.waitForTransactionReceipt({ hash: acceptTx, status: 'ACCEPTED', retries: 30, interval: 3000 });
  console.log(`✔ Dare #${dareId} accepted! Status transitioned to ACCEPTED.`);

  // Step 4: Freeze Evidence in EvidenceRegistry BEFORE Adjudication
  console.log(`\nStep 4/6: Freezing evidence dossier in EvidenceRegistry as Investigator...`);
  const evidenceTx = await safeWrite(investigatorClient, {
    address: EvidenceRegistry,
    functionName: 'submit_evidence',
    args: [
      dareId,
      investigator.address,
      'CLAIM_VERIFIED_TRUE',
      'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
      'https://en.wikipedia.org/wiki/Apollo_11',
      'Apollo 11 Lunar Module 0.67416 23.47314',
      'The official NASA Space Science Data Coordinated Archive confirms Apollo 11 landing coordinates at 0.67416 N, 23.47314 E.'
    ]
  });
  console.log(`Tx submitted: ${evidenceTx}. Waiting for consensus...`);
  await investigatorClient.waitForTransactionReceipt({ hash: evidenceTx, status: 'ACCEPTED', retries: 30, interval: 3000 });
  console.log(`✔ Evidence frozen in EvidenceRegistry!`);

  const frozenEvidence = await challengerClient.readContract({
    address: EvidenceRegistry,
    functionName: 'get_evidence',
    args: [dareId]
  });
  console.log(`Frozen evidence record:`, frozenEvidence);

  // Step 5: Execute authenticated adjudication from frozen records
  console.log(`\nStep 5/6: Calling adjudicate_from_records on DareAdjudicator...`);
  const adjTx = await safeWrite(challengerClient, {
    address: DareAdjudicator,
    functionName: 'adjudicate_from_records',
    args: [dareId]
  });
  console.log(`Tx submitted: ${adjTx}. Waiting for multi-LLM consensus...`);
  await challengerClient.waitForTransactionReceipt({ hash: adjTx, status: 'ACCEPTED', retries: 45, interval: 3500 });
  console.log(`✔ Adjudication completed on-chain!`);

  const adjRecord = await challengerClient.readContract({
    address: DareAdjudicator,
    functionName: 'get_adjudication',
    args: [dareId]
  });
  console.log(`Adjudication record:`, adjRecord);

  // Step 6: Record-bound finalization on DareRegistry
  console.log(`\nStep 6/6: Finalizing DareRegistry strictly from DareAdjudicator record...`);
  const finalizeTx = await safeWrite(challengerClient, {
    address: DareRegistry,
    functionName: 'finalize_from_adjudication',
    args: [dareId]
  });
  console.log(`Tx submitted: ${finalizeTx}. Waiting for consensus...`);
  await challengerClient.waitForTransactionReceipt({ hash: finalizeTx, status: 'ACCEPTED', retries: 30, interval: 3000 });

  const finalizedDareJson = await challengerClient.readContract({
    address: DareRegistry,
    functionName: 'get_dare',
    args: [dareId]
  });
  const finalizedDare = JSON.parse(finalizedDareJson);
  console.log('\nFinalized Dare Record:');
  console.log(JSON.stringify(finalizedDare, null, 2));

  if (finalizedDare.status === 'FINALIZED' && finalizedDare.adjudicated === true) {
    console.log(`\n\x1b[32m✔ SUCCESS: Dare #${dareId} finalized successfully via exclusive authenticated lifecycle!\x1b[0m`);
    console.log(`Verdict: ${finalizedDare.verdict} | Winner: ${finalizedDare.winner}`);
  } else {
    console.error(`\x1b[31m✖ Expected status FINALIZED, got: ${finalizedDare.status}\x1b[0m`);
  }

  // Regression Checks:
  console.log(`\n--- Running Unauthorized Bypass Regression Checks ---`);

  // 1. Repeat adjudication must fail
  console.log(`1. Attempting repeat adjudication on Dare #${dareId}...`);
  await expectRevert(challengerClient, {
    address: DareAdjudicator,
    functionName: 'adjudicate_from_records',
    args: [dareId]
  });
  console.log(`\x1b[32m✔ PASS: Repeat adjudication reverted as expected.\x1b[0m`);

  // 2. Legacy adjudicate_evidence must fail
  console.log(`2. Attempting legacy adjudicate_evidence...`);
  await expectRevert(challengerClient, {
    address: DareAdjudicator,
    functionName: 'adjudicate_evidence',
    args: [dareId, 'title', 'category', 'claim', 'sources', 'criteria', 'CLAIM_VERIFIED_TRUE', 'url', '', 'quote', 'reason']
  });
  console.log(`\x1b[32m✔ PASS: Legacy adjudicate_evidence reverted as expected.\x1b[0m`);

  // 3. Caller-supplied finalization must fail
  console.log(`3. Attempting legacy caller-supplied finalize_adjudication...`);
  await expectRevert(challengerClient, {
    address: DareRegistry,
    functionName: 'finalize_adjudication',
    args: [dareId, 'INVESTIGATOR_WINS', investigator.address]
  });
  console.log(`\x1b[32m✔ PASS: Legacy caller-supplied finalization reverted as expected.\x1b[0m`);

  // 4. Unauthorized evidence submission from non-investigator must fail
  console.log(`4. Attempting evidence submission from non-investigator...`);
  await expectRevert(challengerClient, {
    address: EvidenceRegistry,
    functionName: 'submit_evidence',
    args: [dareId, challenger.address, 'CLAIM_VERIFIED_TRUE', 'url', '', 'quote', 'reason']
  });
  console.log(`\x1b[32m✔ PASS: Non-investigator evidence submission reverted as expected.\x1b[0m`);

  console.log(`\n=== ALL REGRESSION CHECKS PASSED ===\n`);
}

runAuthenticatedE2E().catch(console.error);
