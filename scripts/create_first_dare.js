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
  console.log('=== PUBLISHING FIRST LIVE DARE TO NEW STUDIONET REGISTRY ===');
  console.log('Challenger:', account.address);

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
  const stakeCents = 500; // $5.00 GEN
  const durationSeconds = 600; // 10 minutes

  console.log('Broadcasting create_dare to DareRegistry on StudioNet...');
  const tx = await client.writeContract({
    address: REGISTRY_ADDR,
    functionName: 'create_dare',
    args: [
      title,
      category,
      claim,
      requiredSources,
      criteria,
      stakeCents,
      durationSeconds
    ],
    value: 0n,
    leaderOnly: false
  });
  console.log('Tx submitted:', tx);
  const rcpt = await client.waitForTransactionReceipt({ hash: tx, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('Receipt status:', rcpt.status_name, '| Consensus:', rcpt.result_name);

  const totalDares = await client.readContract({
    address: REGISTRY_ADDR,
    functionName: 'get_total_dares',
    args: []
  });
  const newDareId = Number(totalDares);
  console.log(`✔ Dare #${newDareId} Created on StudioNet!`);

  console.log(`Depositing Challenger Stake for Dare #${newDareId} in StakeEscrow (0.005 GEN)...`);
  const depTx = await client.writeContract({
    address: ESCROW_ADDR,
    functionName: 'deposit_challenger_stake',
    args: [newDareId, account.address, stakeCents],
    value: parseEther('0.005'),
    leaderOnly: false
  });
  console.log('Deposit Tx:', depTx);
  await client.waitForTransactionReceipt({ hash: depTx, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log(`✔ Challenger Stake Deposited on-chain!`);

  const dareData = await client.readContract({
    address: REGISTRY_ADDR,
    functionName: 'get_dare',
    args: [newDareId]
  });
  console.log('Live Dare on StudioNet:', dareData);
}

main().catch(console.error);
