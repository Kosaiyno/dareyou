const path = require('path');
const frontendNodeModules = path.resolve('frontend/node_modules');
const { createClient, createAccount, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));
const { parseEther, formatEther } = require(path.join(frontendNodeModules, 'viem'));
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const pkMatch = envContent.match(/^DEPLOYER_PRIVATE_KEY\s*=\s*(0x[a-fA-F0-9]{64})/m);
const account = createAccount(pkMatch[1]);

const client = createClient({
  chain: chains.studionet,
  account
});

const withdrawCode = [
  '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }',
  'from genlayer import *',
  '',
  'class EscrowClaimTest(gl.Contract):',
  '    balance: u256',
  '    winner: Address',
  '',
  '    def __init__(self):',
  '        self.balance = u256(0)',
  '        self.winner = gl.message.sender_address',
  '',
  '    @gl.public.write.payable',
  '    def deposit(self) -> None:',
  '        self.balance = self.balance + gl.message.value',
  '',
  '    @gl.public.write',
  '    def claim(self, recipient: str) -> None:',
  '        target = gl.get_contract_at(Address(recipient))',
  '        target.emit_transfer(value=self.balance, on="accepted")',
  '        self.balance = u256(0)',
  '',
  '    @gl.public.view',
  '    def get_balance(self) -> u256:',
  '        return self.balance'
].join('\n');

async function testClaim() {
  console.log('Deploying EscrowClaimTest to verify transfer out...');
  const txHash = await client.deployContract({
    code: withdrawCode,
    args: [],
    leaderOnly: false
  });
  console.log('Submitted deploy:', txHash);
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: 'ACCEPTED',
    retries: 30,
    interval: 3500
  });
  const contractAddress = receipt.recipient;
  console.log('Deployed EscrowClaimTest at:', contractAddress);

  console.log('Depositing 0.002 GEN...');
  const depTx = await client.writeContract({
    address: contractAddress,
    functionName: 'deposit',
    args: [],
    value: parseEther('0.002'),
    leaderOnly: false
  });
  await client.waitForTransactionReceipt({ hash: depTx, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('Deposit confirmed! Testing claim transfer out...');

  const claimTx = await client.writeContract({
    address: contractAddress,
    functionName: 'claim',
    args: [account.address],
    value: 0n,
    leaderOnly: false
  });
  console.log('Claim tx submitted:', claimTx);
  const claimReceipt = await client.waitForTransactionReceipt({ hash: claimTx, status: 'ACCEPTED', retries: 30, interval: 3500 });
  console.log('Claim receipt status:', claimReceipt.status_name || claimReceipt.status);
}
testClaim().catch(console.error);
