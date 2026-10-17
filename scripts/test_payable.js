const path = require('path');
const frontendNodeModules = path.resolve('frontend/node_modules');
const { createClient, createAccount, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const pkMatch = envContent.match(/^DEPLOYER_PRIVATE_KEY\s*=\s*(0x[a-fA-F0-9]{64})/m);
const account = createAccount(pkMatch[1]);

const client = createClient({
  chain: chains.studionet,
  account
});

const testCode = [
  '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }',
  'from genlayer import *',
  '',
  'class PayableTest(gl.Contract):',
  '    total: u256',
  '',
  '    def __init__(self):',
  '        self.total = u256(0)',
  '',
  '    @gl.public.write.payable',
  '    def deposit(self) -> None:',
  '        self.total = self.total + gl.message.value',
  '',
  '    @gl.public.view',
  '    def get_total(self) -> u256:',
  '        return self.total'
].join('\n');

async function testPayable() {
  console.log('Testing @gl.public.write.payable deployment...');
  try {
    const txHash = await client.deployContract({
      code: testCode,
      args: [],
      leaderOnly: false
    });
    console.log('Submitted tx:', txHash);
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: 'ACCEPTED',
      retries: 30,
      interval: 3500
    });
    console.log('Payable deployment receipt:', receipt.status_name || receipt.status, '| Address:', receipt.recipient);
  } catch (e) {
    console.log('Payable deployment error:', e.message);
  }
}
testPayable();
