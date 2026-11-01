import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, createAccount, chains } from 'genlayer-js';
import { parseEther } from 'viem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function apiDaresDevPlugin(): Plugin {
  const sharedDares = new Map();
  sharedDares.set(1, {
    id: 1,
    onChainId: 1,
    isBenchmark: false,
    title: "Dare you to verify Apollo 11 lunar module landing coordinates on Sea of Tranquility",
    category: "INVESTIGATIVE_FACT_FINDING",
    domain: "Science",
    claim: "Apollo 11 Lunar Module touched down on the Moon at coordinates 0.67416° N, 23.47314° E on the Sea of Tranquility.",
    requiredSources: "NASA Apollo 11 Lunar Surface Journal mission transcripts",
    criteria: "Quote must confirm Lunar Module coordinates 0.67416 23.47314 from primary archival records.",
    stakeCents: 500,
    creationBondCents: 500,
    durationSeconds: 600,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "FINALIZED",
    isLocked: true,
    verdict: "INVESTIGATOR_WINS",
    verdictScore: 100,
    verdictRationale: "The archive lists Apollo 11 Lunar Module coordinates as 0.67416 N, 23.47314 E, matching the submitted quote and satisfying the required precision.",
    challenger: "0xBbb414E6867d8bb1c81b169AE53Dc453945e19f4",
    investigator: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    payoutRecipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    payoutClaimed: true,
    settlementTxHash: "0xa024e96ac80a5fd5605d63d7b8be46c93dbf11d1980426756b7769209d425ae1",
    txHash: "0x8e7c444e21021b13c2fd3d006e54aad27bcdd34d4754df09df915fa8c9888256",
    evidence: {
      conclusion: "CLAIM_VERIFIED_TRUE",
      primaryUrl: "https://www.hq.nasa.gov/alsj/a11/a11.landing.html",
      quotes: "Lunar Module 0.67416 23.47314",
      reasoning: "The Apollo 11 Lunar Surface Journal records the landing site of the Eagle Lunar Module at 0.67416° N, 23.47314° E."
    }
  });
  sharedDares.set(2, {
    id: 2,
    onChainId: 2,
    isBenchmark: false,
    title: "Verify whether the NASA Voyager 1 interstellar plasma density equals 0.08 cm⁻³",
    category: "INVESTIGATIVE_FACT_FINDING",
    domain: "Science",
    claim: "Voyager 1 Plasma Wave Science instrument detected plasma density of 0.08 electrons per cubic centimeter upon crossing into interstellar space.",
    requiredSources: "NASA Jet Propulsion Laboratory mission archives or Gurnett et al. (Science 2013)",
    criteria: "Quote must confirm 0.08 cm⁻³ interstellar electron plasma density from archival logs.",
    stakeCents: 500,
    creationBondCents: 500,
    durationSeconds: 600,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "FINALIZED",
    isLocked: true,
    verdict: "CHALLENGER_WINS",
    verdictScore: 100,
    verdictRationale: "The validator-fetched archival excerpt is UNREACHABLE, as indicated by the fetch status and the WEB_FETCH_UNAVAILABLE content, preventing verification of the quote against the source.",
    challenger: "0x3f0e92e30a4bD1C1851481cdEE3182a314b04B6C",
    investigator: "0x61Ddc74bA3407F56a14e1EC929dA62441764d84f",
    payoutRecipient: "0x3f0e92e30a4bD1C1851481cdEE3182a314b04B6C",
    payoutClaimed: true,
    settlementTxHash: "0x6a086b034a948dead3909da541f2ff20aefd6448673c788c6929fc2381f8c3d8",
    txHash: "0x6013531c051af8815e3c0628b8993d6feda43c39ae6a39b5732ecb02aadcb0c3",
    evidence: {
      conclusion: "CLAIM_VERIFIED_TRUE",
      primaryUrl: "https://www.jpl.nasa.gov/news/nasa-spacecraft-embarks-on-historic-journey-into-interstellar-space    https://doi.org/10.1126/science.1241681",
      secondaryUrl: "https://doi.org/10.1126/science.1241681",
      quotes: "\"Now that we have new, key data, we believe this is mankind's historic leap into interstellar space... Gurnett's team used a burst of plasma oscillations occurring upon crossing the heliopause on August 25, 2012 to derive an electron plasma density of about 0.08 electrons per cubic centimeter.\"",
      reasoning: "The primary NASA Jet Propulsion Laboratory mission release (Release 2013-278) and Donald Gurnett et al. (Science 2013) confirm that the Voyager 1 Plasma Wave Science (PWS) instrument detected plasma oscillations indicating an electron density of approximately 0.08 electrons per cubic centimeter (0.08 cm⁻³). This sudden increase above the solar wind density (~0.002 cm⁻³) provided direct empirical proof that Voyager 1 had crossed into dense interstellar plasma."
    }
  });
  return {
    name: 'api-dares-dev-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api/dares')) {
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ dares: Array.from(sharedDares.values()) }));
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                if (data && data.id) {
                  sharedDares.set(Number(data.id), data);
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, dare: data }));
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
              }
            });
            return;
          }
        }
        if (req.url && req.url.startsWith('/api/faucet')) {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const data = JSON.parse(body);
                const { to, amount = '1.0' } = data;
                if (!to || !to.startsWith('0x')) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Valid 0x address required' }));
                  return;
                }
                const envPath = path.resolve(__dirname, '..', '.env');
                if (!fs.existsSync(envPath)) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: '.env not found' }));
                  return;
                }
                const envContent = fs.readFileSync(envPath, 'utf8');
                const match = envContent.match(/^DEPLOYER_PRIVATE_KEY\s*=\s*(0x[a-fA-F0-9]{64})/m);
                if (!match) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'DEPLOYER_PRIVATE_KEY not found in .env' }));
                  return;
                }
                const account = createAccount(match[1]);
                const client = createClient({ chain: chains.studionet, account });
                const sendTx = await client.sendTransaction({
                  to: to as `0x${string}`,
                  value: parseEther(String(amount))
                });
                console.log(`[Faucet] Sent ${amount} GEN to ${to}. Tx: ${sendTx}`);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, txHash: sendTx, amount }));
              } catch (e: any) {
                console.error('[Faucet Error]:', e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e?.message || 'Faucet failed' }));
              }
            });
            return;
          }
        }
        if (req.url && req.url.startsWith('/api/claim')) {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const data = JSON.parse(body);
                const { dareId, winnerAddress, payoutDollars, claimTxHash } = data;
                let transferTxHash = '';
                try {
                  const envPath = path.resolve(__dirname, '..', '.env');
                  if (fs.existsSync(envPath)) {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const match = envContent.match(/^DEPLOYER_PRIVATE_KEY\s*=\s*(0x[a-fA-F0-9]{64})/m);
                    if (match && winnerAddress && Number(payoutDollars) > 0) {
                      const account = createAccount(match[1]);
                      const client = createClient({ chain: chains.studionet, account });
                      transferTxHash = await client.sendTransaction({
                        to: winnerAddress,
                        value: parseEther(String(payoutDollars))
                      });
                      console.log(`[Dev Claim] Transferred ${payoutDollars} GEN to ${winnerAddress}. Tx: ${transferTxHash}`);
                    }
                  }
                } catch (e: any) {
                  console.warn('[Dev Claim Transfer Warning]:', e?.message);
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  dareId,
                  payoutClaimed: true,
                  transferTxHash: transferTxHash || claimTxHash || '0x' + Array(64).fill('a').join(''),
                }));
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
              }
            });
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  css: {
    postcss: {}
  },
  server: {
    proxy: {
      '/api/genlayer-rpc': {
        target: 'https://studio.genlayer.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/genlayer-rpc/, '/api'),
        secure: false
      }
    }
  },
  plugins: [react(), tailwindcss(), apiDaresDevPlugin()]
});
