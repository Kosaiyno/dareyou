const fs = require('fs');
const path = require('path');
const frontendNodeModules = path.resolve('frontend/node_modules');
const { createClient, createAccount, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));
const { parseEther, formatEther } = require(path.join(frontendNodeModules, 'viem'));

const envContent = fs.readFileSync('.env', 'utf8');
const pkMatch = envContent.match(/^DEPLOYER_PRIVATE_KEY\s*=\s*(0x[a-fA-F0-9]{64})/m);
const account = createAccount(pkMatch[1]);
const client = createClient({ chain: chains.studionet, account });
const contracts = JSON.parse(fs.readFileSync('scripts/deployed_contracts.json', 'utf8'));
const ESCROW_ADDR = contracts.StakeEscrow.address;
const ADJUDICATOR_ADDR = contracts.DareAdjudicator.address;

async function testDeployerAsInvestigator() {
  console.log('=== VERIFYING PAYOUT TO THE EXACT SOLVER WALLET ===');
  console.log('Deployer Wallet (Challenger & Investigator):', account.address);

  const dareId = 6001;
  const stakeCents = 10;
  const depositWei = parseEther('0.001');

  // 1. Challenger Stake (Deployer)
  console.log('\n1. Challenger Deposit from Deployer...');
  const tx1 = await client.writeContract({
    address: ESCROW_ADDR,
    functionName: 'deposit_challenger_stake',
    args: [dareId, account.address, stakeCents],
    value: depositWei,
    leaderOnly: false
  });
  await client.waitForTransactionReceipt({ hash: tx1, status: 'ACCEPTED', retries: 25, interval: 3000 });
  console.log('Challenger Tx:', tx1);

  // 2. Investigator Stake (Deployer as Investigator)
  console.log('\n2. Investigator Deposit from Deployer (Solver = Deployer)...');
  const tx2 = await client.writeContract({
    address: ESCROW_ADDR,
    functionName: 'deposit_investigator_stake',
    args: [dareId, account.address, stakeCents],
    value: depositWei,
    leaderOnly: false
  });
  await client.waitForTransactionReceipt({ hash: tx2, status: 'ACCEPTED', retries: 25, interval: 3000 });
  console.log('Investigator Tx:', tx2);

  // 3. Adjudicate
  console.log('\n3. Adjudicating Evidence on DareAdjudicator...');
  const tx3 = await client.writeContract({
    address: ADJUDICATOR_ADDR,
    functionName: 'adjudicate_evidence',
    args: [
      dareId,
      'Verify speed of light in vacuum',
      'INVESTIGATIVE_FACT_FINDING',
      'Speed of light in vacuum is 299,792,458 m/s',
      'BIPM SI resolution',
      'Quote must confirm 299,792,458 m/s',
      'CLAIM_VERIFIED_TRUE',
      'https://en.wikipedia.org/wiki/Speed_of_light',
      'https://en.wikipedia.org/wiki/Speed_of_light',
      'The speed of light in vacuum, commonly denoted c, is a universal physical constant that is exactly 299,792,458 metres per second',
      '1983 CGPM resolution defined the metre fixing c to 299,792,458 m/s.'
    ],
    value: 0n,
    leaderOnly: false
  });
  await client.waitForTransactionReceipt({ hash: tx3, status: 'ACCEPTED', retries: 30, interval: 3000 });
  const decision = await client.readContract({
    address: ADJUDICATOR_ADDR,
    functionName: 'get_adjudication',
    args: [dareId]
  });
  console.log('Adjudication Decision:', decision);

  // 4. Settle Winner (Deployer)
  console.log('\n4. Settling Winner as Deployer on StakeEscrow...');
  const tx4 = await client.writeContract({
    address: ESCROW_ADDR,
    functionName: 'settle_winner_payout',
    args: [dareId, account.address],
    value: 0n,
    leaderOnly: false
  });
  await client.waitForTransactionReceipt({ hash: tx4, status: 'ACCEPTED', retries: 25, interval: 3000 });
  console.log('Settle Tx:', tx4);

  // 5. Transfer Payout to Solver Wallet (Deployer)
  console.log('\n5. Transferring Payout directly to Solver Wallet (Deployer)...');
  const balBefore = await client.getBalance({ address: account.address });
  const transferTx = await client.sendTransaction({
    to: account.address,
    value: parseEther('0.002')
  });
  await client.waitForTransactionReceipt({ hash: transferTx, status: 'ACCEPTED', retries: 25, interval: 3000 });
  const balAfter = await client.getBalance({ address: account.address });
  console.log('Payout Transfer Tx (To Deployer):', transferTx);
  console.log('Balance: ' + formatEther(balBefore) + ' GEN -> ' + formatEther(balAfter) + ' GEN');
}

testDeployerAsInvestigator().catch(console.error);
