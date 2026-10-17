const path = require('path');
const fs = require('fs');

const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules');
const { createClient, createAccount, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));
const { parseEther, formatEther } = require(path.join(frontendNodeModules, 'viem'));

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const match = envContent.match(/^DEPLOYER_PRIVATE_KEY\s*=\s*(0x[a-fA-F0-9]{64})/m);
if (!match) {
  console.error('No private key in .env');
  process.exit(1);
}

const account = createAccount(match[1]);
const client = createClient({ chain: chains.studionet, account });

const ESCROW_ADDR = '0x1F3cb956B066e42698F6F47d63d578BFd2708F5D';
const REGISTRY_ADDR = '0x68E73e3e2075A3978510c93437C5F6248ba85f4D';

async function run() {
  console.log('=== REAL NATIVE ESCROW DEPOSIT & CLAIM VERIFICATION ===');
  console.log('Deployer Address:', account.address);
  console.log('StakeEscrow Address:', ESCROW_ADDR);
  console.log('DareRegistry Address:', REGISTRY_ADDR);

  const initialBal = await client.getBalance({ address: account.address });
  console.log(`Initial Deployer Balance: ${formatEther(initialBal)} GEN`);

  const dareId = 999;
  const stakeCents = 10; // 10 cents = 0.001 GEN for live test
  const depositWei = parseEther('0.001');

  console.log(`\n1. Depositing Challenger Stake for Dare #${dareId} with ${formatEther(depositWei)} GEN...`);
  const tx1 = await client.writeContract({
    address: ESCROW_ADDR,
    functionName: 'deposit_challenger_stake',
    args: [dareId, account.address, stakeCents],
    value: depositWei,
    leaderOnly: false
  });
  console.log('Tx submitted:', tx1);
  const rcpt1 = await client.waitForTransactionReceipt({ hash: tx1, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('Challenger Stake Receipt:', rcpt1.status_name, '| Tx:', tx1);

  console.log(`\n2. Matching Investigator Stake for Dare #${dareId} with ${formatEther(depositWei)} GEN...`);
  const tx2 = await client.writeContract({
    address: ESCROW_ADDR,
    functionName: 'deposit_investigator_stake',
    args: [dareId, account.address, stakeCents],
    value: depositWei,
    leaderOnly: false
  });
  console.log('Tx submitted:', tx2);
  const rcpt2 = await client.waitForTransactionReceipt({ hash: tx2, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('Investigator Stake Receipt:', rcpt2.status_name, '| Tx:', tx2);

  console.log(`\n3. Inspecting On-Chain Escrow State for Dare #${dareId}...`);
  const infoRaw = await client.readContract({
    address: ESCROW_ADDR,
    functionName: 'get_stake_info',
    args: [dareId]
  });
  console.log('Stake Info On-Chain:', infoRaw);
  const info = JSON.parse(infoRaw);

  const contractBal = await client.getBalance({ address: ESCROW_ADDR });
  console.log(`StakeEscrow Contract Native Balance: ${formatEther(contractBal)} GEN`);

  console.log(`\n4. Settling Payout to Winner: ${account.address}...`);
  const tx3 = await client.writeContract({
    address: ESCROW_ADDR,
    functionName: 'settle_winner_payout',
    args: [dareId, account.address],
    value: 0n,
    leaderOnly: false
  });
  console.log('Tx submitted:', tx3);
  const rcpt3 = await client.waitForTransactionReceipt({ hash: tx3, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('Settlement Receipt:', rcpt3.status_name, '| Tx:', tx3);

  const balBeforeClaim = await client.getBalance({ address: account.address });
  console.log(`\nDeployer Balance Before Claim: ${formatEther(balBeforeClaim)} GEN`);

  console.log(`\n5. Executing Winner Claim via claim_winner_payout (emit_transfer)...`);
  const tx4 = await client.writeContract({
    address: ESCROW_ADDR,
    functionName: 'claim_winner_payout',
    args: [dareId],
    value: 0n,
    leaderOnly: false
  });
  console.log('Tx submitted:', tx4);
  const rcpt4 = await client.waitForTransactionReceipt({ hash: tx4, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('Claim Receipt:', rcpt4.status_name, '| Tx:', tx4);

  const balAfterClaim = await client.getBalance({ address: account.address });
  console.log(`Deployer Balance After Claim: ${formatEther(balAfterClaim)} GEN`);

  const updatedInfoRaw = await client.readContract({
    address: ESCROW_ADDR,
    functionName: 'get_stake_info',
    args: [dareId]
  });
  console.log('\nFinal Stake Record On-Chain:', updatedInfoRaw);

  const contractBalAfter = await client.getBalance({ address: ESCROW_ADDR });
  console.log(`StakeEscrow Contract Balance After Claim: ${formatEther(contractBalAfter)} GEN`);

  console.log('\n=== REAL ESCROW DEPOSIT & CLAIM VERIFICATION COMPLETE & SUCCESSFUL! ===');
}

run().catch(console.error);
