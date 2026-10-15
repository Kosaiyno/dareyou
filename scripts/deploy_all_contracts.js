const path = require('path');
const fs = require('fs');

const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules');
const { createClient, createAccount, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));
const { generatePrivateKey } = require(path.join(frontendNodeModules, 'viem/accounts'));

// Ensure persistent deployer account
const PK_FILE = path.join(__dirname, 'deployer_pk.json');
let privateKey;
if (fs.existsSync(PK_FILE)) {
  privateKey = JSON.parse(fs.readFileSync(PK_FILE, 'utf8')).privateKey;
} else {
  privateKey = generatePrivateKey();
  fs.writeFileSync(PK_FILE, JSON.stringify({ privateKey }, null, 2));
}

const account = createAccount(privateKey);
console.log('Deployer Address:', account.address);

const client = createClient({
  chain: chains.studionet,
  account
});

const contractsToDeploy = [
  { name: 'NetworkProbe', file: 'probe_network.py' },
  { name: 'DarePolicy', file: 'dare_policy.py' },
  { name: 'StakeEscrow', file: 'stake_escrow.py' },
  { name: 'EvidenceRegistry', file: 'evidence_registry.py' },
  { name: 'AgentReputation', file: 'agent_reputation.py' },
  { name: 'DareQualifier', file: 'dare_qualifier.py' },
  { name: 'DareAdjudicator', file: 'dare_adjudicator.py' },
  { name: 'DareRegistry', file: 'dare_registry.py' }
];

async function deployAll() {
  console.log('=== DEPLOYING GENLAYER INTELLIGENT CONTRACTS TO STUDIONET (CHAIN ID 61999) ===\n');
  const results = {};

  for (const c of contractsToDeploy) {
    console.log(`\n-----------------------------------------------------------`);
    console.log(`Deploying ${c.name} (${c.file})...`);
    const filePath = path.join(__dirname, '..', 'contracts', c.file);
    const code = fs.readFileSync(filePath, 'utf8');

    try {
      const txHash = await client.deployContract({
        code,
        args: [],
        leaderOnly: false
      });
      console.log(`Tx submitted: ${txHash}`);
      console.log(`Waiting for validator committee consensus...`);

      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        status: 'ACCEPTED',
        retries: 30,
        interval: 3500
      });

      const deployedAddress = receipt.recipient;
      const status = receipt.status_name || 'ACCEPTED';
      const consensus = receipt.result_name || 'MAJORITY_AGREE';
      const validators = receipt.last_round?.round_validators || [];

      console.log(`\x1b[32m✔ ${c.name} DEPLOYED ON-CHAIN AT: ${deployedAddress}\x1b[0m`);
      console.log(`Status: ${status} | Consensus: ${consensus} | Validators: ${validators.length} nodes`);

      results[c.name] = {
        name: c.name,
        file: c.file,
        address: deployedAddress,
        txHash,
        status,
        consensus,
        validators,
        explorerUrl: `https://genlayer-explorer.vercel.app/address/${deployedAddress}`
      };
    } catch (err) {
      console.error(`\x1b[31m✖ Error deploying ${c.name}:\x1b[0m`, err.message);
      results[c.name] = {
        name: c.name,
        file: c.file,
        error: err.message
      };
    }
  }

  const outPath = path.join(__dirname, 'deployed_contracts.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n\n=== DEPLOYMENT COMPLETE ===`);
  console.log(`Summary written to ${outPath}`);
  console.log(JSON.stringify(results, null, 2));
}

deployAll().catch(console.error);
