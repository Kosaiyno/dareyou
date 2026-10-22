const path = require('path');
const fs = require('fs');

const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules');
const { createClient, createAccount, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));

// Load deployer private key
const envFile = path.join(__dirname, '..', '.env');
let privateKey = null;

if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const match = envContent.match(/^DEPLOYER_PRIVATE_KEY\s*=\s*(0x[a-fA-F0-9]{64})/m);
  if (match) {
    privateKey = match[1];
  }
}

if (!privateKey) {
  const PK_FILE = path.join(__dirname, 'deployer_pk.json');
  if (fs.existsSync(PK_FILE)) {
    const raw = JSON.parse(fs.readFileSync(PK_FILE, 'utf8'));
    if (raw.privateKey && raw.privateKey.startsWith('0x') && raw.privateKey.length === 66) {
      privateKey = raw.privateKey;
    }
  }
}

if (!privateKey) {
  console.error('[Wiring Error] No valid private key found!');
  process.exit(1);
}

const account = createAccount(privateKey);
console.log('Deployer Address:', account.address);

const client = createClient({
  chain: chains.studionet,
  account
});

async function safeWait(hash, retries = 35) {
  for (let i = 1; i <= retries; i++) {
    try {
      const receipt = await client.getTransactionReceipt({ hash });
      if (receipt && receipt.status === 'success') return receipt;
    } catch (e) {
      // ignore temporary RPC blips
    }
    await new Promise(r => setTimeout(r, 3000));
  }
}

// Load deployed addresses from deployed_contracts.json or proof.json
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

console.log('Wiring with deployed addresses:');
console.log(JSON.stringify(contracts, null, 2));

async function wireContracts() {
  console.log('\n=== WIRING ZERO-STAKE DAREYOU CONTRACTS ON STUDIONET ===\n');

  const { DareRegistry, DarePolicy, DareQualifier, DareAdjudicator, EvidenceRegistry, AgentReputation } = contracts;

  if (!DareRegistry || !DareAdjudicator || !EvidenceRegistry) {
    console.error('Missing required contract addresses in deployed_contracts.json!');
    process.exit(1);
  }

  // 1. DareRegistry.set_authorized_contracts(policy, qualifier, adjudicator)
  console.log(`1. Wiring DareRegistry (${DareRegistry})...`);
  console.log(`   policy: ${DarePolicy || '0x0000000000000000000000000000000000000000'}`);
  console.log(`   qualifier: ${DareQualifier || '0x0000000000000000000000000000000000000000'}`);
  console.log(`   adjudicator: ${DareAdjudicator}`);
  
  const regTx = await client.writeContract({
    address: DareRegistry,
    functionName: 'set_authorized_contracts',
    args: [
      DarePolicy || '0x0000000000000000000000000000000000000000',
      DareQualifier || '0x0000000000000000000000000000000000000000',
      DareAdjudicator
    ]
  });
  console.log(`   Tx: ${regTx}. Waiting for consensus...`);
  await safeWait(regTx);
  console.log(`   ✔ DareRegistry wired successfully!\n`);

  // Rate-limit pause
  await new Promise(r => setTimeout(r, 2000));

  // 2. DareAdjudicator.set_authorized_registries(registry, evidence)
  console.log(`2. Wiring DareAdjudicator (${DareAdjudicator})...`);
  console.log(`   registry: ${DareRegistry}`);
  console.log(`   evidence: ${EvidenceRegistry}`);
  
  const adjTx = await client.writeContract({
    address: DareAdjudicator,
    functionName: 'set_authorized_registries',
    args: [DareRegistry, EvidenceRegistry]
  });
  console.log(`   Tx: ${adjTx}. Waiting for consensus...`);
  await safeWait(adjTx);
  console.log(`   ✔ DareAdjudicator wired successfully!\n`);

  // Rate-limit pause
  await new Promise(r => setTimeout(r, 2000));

  // 3. EvidenceRegistry.set_authorized_registry(registry)
  console.log(`3. Wiring EvidenceRegistry (${EvidenceRegistry})...`);
  console.log(`   registry: ${DareRegistry}`);
  
  const evTx = await client.writeContract({
    address: EvidenceRegistry,
    functionName: 'set_authorized_registry',
    args: [DareRegistry]
  });
  console.log(`   Tx: ${evTx}. Waiting for consensus...`);
  await safeWait(evTx);
  console.log(`   ✔ EvidenceRegistry wired successfully!\n`);

  // Rate-limit pause
  await new Promise(r => setTimeout(r, 2000));

  // 4. AgentReputation.set_authorized_registry(registry)
  if (AgentReputation) {
    console.log(`4. Wiring AgentReputation (${AgentReputation})...`);
    console.log(`   registry: ${DareRegistry}`);
    
    const repTx = await client.writeContract({
      address: AgentReputation,
      functionName: 'set_authorized_registry',
      args: [DareRegistry]
    });
    console.log(`   Tx: ${repTx}. Waiting for consensus...`);
    await safeWait(repTx);
    console.log(`   ✔ AgentReputation wired successfully!\n`);
  }

  console.log('=== ALL 7 CONTRACTS WIRED SUCCESSFULLY ON STUDIONET ===\n');
}

wireContracts().catch(console.error);
