const path = require('path');
const fs = require('fs');

const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules');
const { createClient, createAccount, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));

const PK_FILE = path.join(__dirname, 'deployer_pk.json');
const raw = JSON.parse(fs.readFileSync(PK_FILE, 'utf8'));
const account = createAccount(raw.privateKey);
console.log('Deployer Address:', account.address);

const client = createClient({
  chain: chains.studionet,
  account
});

const REGISTRY_ADDRESS = '0x5717f1fc8286d1e4d79F93e857068Cb121678D47';
const ADJUDICATOR_ADDRESS = '0x8efFAccAf2E060111d27ea9B52499F40304828cE';

async function deployStakeEscrow() {
  console.log('=== DEPLOYING STAKE ESCROW TO GENLAYER STUDIONET (CHAIN ID 61999) ===\n');

  const filePath = path.join(__dirname, '..', 'contracts', 'stake_escrow.py');
  const code = fs.readFileSync(filePath, 'utf8');

  console.log('Broadcasting StakeEscrow deployment transaction...');
  const txHash = await client.deployContract({
    code,
    args: [],
    leaderOnly: false
  });

  console.log(`Deploy Tx submitted: ${txHash}`);
  console.log(`Awaiting GenLayer validator committee consensus...`);

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: 'ACCEPTED',
    retries: 45,
    interval: 3500
  });

  const escrowAddress = receipt.recipient;
  const status = receipt.status_name || 'ACCEPTED';
  const consensus = receipt.result_name || 'MAJORITY_AGREE';
  const validators = receipt.last_round?.round_validators || [];

  console.log(`\x1b[32m✔ StakeEscrow DEPLOYED ON-CHAIN AT: ${escrowAddress}\x1b[0m`);
  console.log(`Status: ${status} | Consensus: ${consensus} | Validators: ${validators.length} nodes`);

  // Wire StakeEscrow to authorized DareRegistry and DareAdjudicator
  console.log('\nConfiguring authorized modules on StakeEscrow...');
  const wireTx = await client.writeContract({
    address: escrowAddress,
    functionName: 'set_authorized_modules',
    args: [REGISTRY_ADDRESS, ADJUDICATOR_ADDRESS],
    value: 0n,
    leaderOnly: false
  });

  console.log(`Wire Tx submitted: ${wireTx}`);
  const wireReceipt = await client.waitForTransactionReceipt({
    hash: wireTx,
    status: 'ACCEPTED',
    retries: 30,
    interval: 3000
  });
  console.log(`✔ Authorized modules wired to StakeEscrow: ${wireReceipt.status_name}`);

  // Save to deployment records
  const deploymentInfo = {
    name: 'StakeEscrow',
    file: 'stake_escrow.py',
    address: escrowAddress,
    txHash,
    wireTxHash: wireTx,
    status,
    consensus,
    validators,
    registryAddress: REGISTRY_ADDRESS,
    adjudicatorAddress: ADJUDICATOR_ADDRESS,
    explorerUrl: `https://explorer-studio.genlayer.com/address/${escrowAddress}`,
    txExplorerUrl: `https://explorer-studio.genlayer.com/tx/${txHash}`
  };

  const proofPath = path.join(__dirname, '..', 'deploy', 'proof.json');
  if (fs.existsSync(proofPath)) {
    const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    proof.contracts['StakeEscrow'] = deploymentInfo;
    proof.stakingEnabled = true;
    proof.escrowAddress = escrowAddress;
    fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
    console.log(`Updated deploy/proof.json with StakeEscrow deployment evidence.`);
  }

  const deployedContractsPath = path.join(__dirname, 'deployed_contracts.json');
  if (fs.existsSync(deployedContractsPath)) {
    const deployed = JSON.parse(fs.readFileSync(deployedContractsPath, 'utf8'));
    deployed['StakeEscrow'] = deploymentInfo;
    fs.writeFileSync(deployedContractsPath, JSON.stringify(deployed, null, 2));
  }

  return deploymentInfo;
}

deployStakeEscrow().catch((err) => {
  console.error('\x1b[31mDeployment failed:\x1b[0m', err);
  process.exit(1);
});
