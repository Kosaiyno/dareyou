const path = require('path');
const fs = require('fs');

const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules');
const { createClient, createAccount, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));
const { parseEther, formatEther } = require(path.join(frontendNodeModules, 'viem'));

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const match = envContent.match(/^DEPLOYER_PRIVATE_KEY\s*=\s*(0x[a-fA-F0-9]{64})/m);
const account = createAccount(match[1]);
const client = createClient({ chain: chains.studionet, account });

const REGISTRY_ADDR = '0x68E73e3e2075A3978510c93437C5F6248ba85f4D';
const ESCROW_ADDR = '0x82De72ea7D86A6ef69B6bB2eeE4054E762838105';

async function main() {
  console.log('=== DEPOSITING EXACT 5.000 GEN ON-CHAIN ===');
  console.log('Deployer Wallet:', account.address);
  const balBefore = await client.getBalance({ address: account.address });
  console.log('Balance before:', formatEther(balBefore), 'GEN');

  const title = 'Verify whether the NASA Voyager 1 interstellar plasma density equals 0.08 cm⁻³';
  const category = 'INVESTIGATIVE_FACT_FINDING';
  const metaPayload = JSON.stringify({
    challenger: account.address,
    domain: 'Science',
    durationSeconds: 600,
    createdAtMs: Date.now()
  });
  const claim = 'Voyager 1 Plasma Wave Science instrument detected plasma density of 0.08 electrons per cubic centimeter upon crossing into interstellar space.';
  const requiredSources = `NASA Jet Propulsion Laboratory mission archives or Gurnett et al. (Science 2013)|||META:${metaPayload}`;
  const criteria = 'Quote must confirm 0.08 cm⁻³ interstellar electron plasma density from archival logs.';
  const stakeCents = 500; // $5.00
  const durationSeconds = 600;

  console.log('\n1. Creating Dare #2 on DareRegistry...');
  const tx1 = await client.writeContract({
    address: REGISTRY_ADDR,
    functionName: 'create_dare',
    args: [title, category, claim, requiredSources, criteria, stakeCents, durationSeconds],
    value: 0n,
    leaderOnly: false
  });
  await client.waitForTransactionReceipt({ hash: tx1, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('Dare #2 created on-chain. Tx:', tx1);

  const exactFiveGenWei = parseEther('5');
  console.log(`\n2. Depositing EXACTLY ${formatEther(exactFiveGenWei)} GEN (5000000000000000000 wei) from ${account.address} into StakeEscrow...`);
  const depTx = await client.writeContract({
    address: ESCROW_ADDR,
    functionName: 'deposit_challenger_stake',
    args: [2, account.address, stakeCents],
    value: exactFiveGenWei,
    leaderOnly: false
  });
  console.log('Deposit tx submitted:', depTx);
  const rcpt = await client.waitForTransactionReceipt({ hash: depTx, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('Deposit receipt:', rcpt.status_name);

  const balAfter = await client.getBalance({ address: account.address });
  console.log('\nDeployer Balance after deposit:', formatEther(balAfter), 'GEN');

  const escrowBal = await client.getBalance({ address: ESCROW_ADDR });
  console.log('StakeEscrow Contract Balance:', formatEther(escrowBal), 'GEN');

  const stakeInfoRaw = await client.readContract({
    address: ESCROW_ADDR,
    functionName: 'get_stake_info',
    args: [2]
  });
  console.log('Stake Record for Dare #2:', JSON.parse(stakeInfoRaw));
}

main().catch(console.error);
