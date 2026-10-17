import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function apiDaresDevPlugin(): Plugin {
  const sharedDares = new Map();
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
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDaresDevPlugin()]
});
