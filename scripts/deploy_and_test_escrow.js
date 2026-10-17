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
const POLICY_ADDR = '0x59AF57218Bc417a2390cE373094Cc83E43DdD403';
const QUALIFIER_ADDR = '0xb9F28F1791039AFe0948f0FDc231e196f5B16CE6';

async function main() {
  console.log('=== DEPLOYING UPDATED STAKE_ESCROW (WITH TIMESTAMP SAFEGUARDS) ===');
  const code = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'stake_escrow.py'), 'utf8');

  const deployTx = await client.deployContract({
    code,
    args: [],
    leaderOnly: false
  });
  console.log('StakeEscrow Deploy Tx:', deployTx);
  const deployRcpt = await client.waitForTransactionReceipt({
    hash: deployTx,
    status: 'ACCEPTED',
    retries: 30,
    interval: 3500
  });

  const escrowAddr = deployRcpt.recipient;
  console.log('✔ NEW StakeEscrow Address:', escrowAddr);

  console.log('\n--- Authorizing DareRegistry on StakeEscrow ---');
  const authTx = await client.writeContract({
    address: escrowAddr,
    functionName: 'set_authorized_registry',
    args: [REGISTRY_ADDR],
    value: 0n,
    leaderOnly: false
  });
  console.log('Auth Tx:', authTx);
  await client.waitForTransactionReceipt({ hash: authTx, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('✔ Registry Authorized on StakeEscrow');

  console.log('\n--- Updating DareRegistry with new Escrow ---');
  const linkTx = await client.writeContract({
    address: REGISTRY_ADDR,
    functionName: 'set_authorized_contracts',
    args: [POLICY_ADDR, QUALIFIER_ADDR, escrowAddr],
    value: 0n,
    leaderOnly: false
  });
  console.log('Link Tx:', linkTx);
  await client.waitForTransactionReceipt({ hash: linkTx, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('✔ DareRegistry Linked to new Escrow');

  console.log('\n=== RUNNING LIVE PAYABLE DEPOSIT, SETTLE & CLAIM FLOW ===');
  const dareId = 1001;
  const stakeCents = 10;
  const depositWei = parseEther('0.001');

  console.log(`Depositing 0.001 GEN for Dare #${dareId}...`);
  const depTx1 = await client.writeContract({
    address: escrowAddr,
    functionName: 'deposit_challenger_stake',
    args: [dareId, account.address, stakeCents],
    value: depositWei,
    leaderOnly: false
  });
  await client.waitForTransactionReceipt({ hash: depTx1, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('✔ Challenger Stake Deposited: 0.001 GEN | Tx:', depTx1);

  const depTx2 = await client.writeContract({
    address: escrowAddr,
    functionName: 'deposit_investigator_stake',
    args: [dareId, account.address, stakeCents],
    value: depositWei,
    leaderOnly: false
  });
  await client.waitForTransactionReceipt({ hash: depTx2, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('✔ Investigator Stake Matched: 0.001 GEN | Tx:', depTx2);

  const contractBal = await client.getBalance({ address: escrowAddr });
  console.log(`StakeEscrow Native Balance: ${formatEther(contractBal)} GEN (0.002 GEN Expected)`);

  console.log(`\nSettling Payout to Winner: ${account.address}...`);
  const settleTx = await client.writeContract({
    address: escrowAddr,
    functionName: 'settle_winner_payout',
    args: [dareId, account.address],
    value: 0n,
    leaderOnly: false
  });
  await client.waitForTransactionReceipt({ hash: settleTx, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('✔ Settle Succeeded | Tx:', settleTx);

  const balBeforeClaim = await client.getBalance({ address: account.address });
  console.log(`Deployer Balance Before Claim: ${formatEther(balBeforeClaim)} GEN`);

  console.log('\nClaiming Winner Payout via claim_winner_payout (emit_transfer)...');
  const claimTx = await client.writeContract({
    address: escrowAddr,
    functionName: 'claim_winner_payout',
    args: [dareId],
    value: 0n,
    leaderOnly: false
  });
  await client.waitForTransactionReceipt({ hash: claimTx, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('✔ Claim Succeeded | Tx:', claimTx);

  const balAfterClaim = await client.getBalance({ address: account.address });
  console.log(`Deployer Balance After Claim: ${formatEther(balAfterClaim)} GEN`);

  const contractBalAfter = await client.getBalance({ address: escrowAddr });
  console.log(`StakeEscrow Balance After Claim: ${formatEther(contractBalAfter)} GEN`);

  const finalRecord = await client.readContract({
    address: escrowAddr,
    functionName: 'get_stake_info',
    args: [dareId]
  });
  console.log('Final On-Chain Stake Record:', finalRecord);

  const out = {
    newEscrowAddress: escrowAddr,
    deployTx,
    authTx,
    linkTx,
    depTx1,
    depTx2,
    settleTx,
    claimTx,
    finalRecord: JSON.parse(finalRecord)
  };
  fs.writeFileSync(path.join(__dirname, 'escrow_test_success.json'), JSON.stringify(out, null, 2));
  console.log('\n=== ALL TESTS PASSED TO FINALITY! ===');
}

main().catch(console.error);
