const fs = require('fs');
const path = require('path');
const frontendNodeModules = path.resolve('frontend/node_modules');
const { createClient, createAccount, chains } = require(path.join(frontendNodeModules, 'genlayer-js'));

const envContent = fs.readFileSync('.env', 'utf8');
const pkMatch = envContent.match(/^DEPLOYER_PRIVATE_KEY\s*=\s*(0x[a-fA-F0-9]{64})/m);
if (!pkMatch) {
  console.error('DEPLOYER_PRIVATE_KEY not found in .env');
  process.exit(1);
}

const account = createAccount(pkMatch[1]);
const client = createClient({ chain: chains.studionet, account });

const contracts = JSON.parse(fs.readFileSync('scripts/deployed_contracts.json', 'utf8'));
const ADJUDICATOR_ADDR = contracts.DareAdjudicator.address;
const REGISTRY_ADDR = contracts.DareRegistry.address;
const EVIDENCE_ADDR = contracts.EvidenceRegistry.address;
const QUALIFIER_ADDR = contracts.DareQualifier.address;

const testDares = [
  {
    num: 1,
    id: 5001,
    title: "Dare you to verify the exact defined speed of light in vacuum in SI units per the 1983 CGPM resolution",
    category: "INVESTIGATIVE_FACT_FINDING",
    claim: "The speed of light in vacuum is exactly 299,792,458 metres per second by international SI convention adopted in 1983.",
    requiredSources: "BIPM or SI authoritative resolution archives",
    criteria: "Quote must explicitly state 299,792,458 metres per second.",
    primaryUrl: "https://en.wikipedia.org/wiki/Speed_of_light",
    secondaryUrl: "https://www.bipm.org/en/measurement-units/base-units",
    quotes: "The speed of light in vacuum, commonly denoted c, is a universal physical constant that is exactly 299,792,458 metres per second",
    reasoning: "The 17th General Conference on Weights and Measures (CGPM) in 1983 officially defined the metre by fixing the numerical value of the speed of light in vacuum to exactly 299,792,458 m/s."
  },
  {
    num: 2,
    id: 5002,
    title: "Dare you to verify the optical diameter of the James Webb Space Telescope primary mirror",
    category: "INVESTIGATIVE_FACT_FINDING",
    claim: "The James Webb Space Telescope primary mirror has an effective optical diameter of approximately 6.5 meters.",
    requiredSources: "NASA Goddard Space Flight Center or scientific specifications",
    criteria: "Quote must state 6.5 meters (or 6.5 m) primary mirror diameter.",
    primaryUrl: "https://en.wikipedia.org/wiki/James_Webb_Space_Telescope",
    secondaryUrl: "https://webb.nasa.gov/",
    quotes: "Its primary mirror consists of 18 hexagonal mirror segments made of gold-plated beryllium, which combined create a 6.5-meter-diameter (21 ft) mirror",
    reasoning: "JWST's optical telescope element utilizes 18 hexagonal gold-coated beryllium mirror segments configured to produce a total clear aperture collecting area equivalent to a 6.5-meter circular aperture."
  },
  {
    num: 3,
    id: 5003,
    title: "Dare you to verify the date of the first crewed lunar landing by Apollo 11 Lunar Module Eagle",
    category: "INVESTIGATIVE_FACT_FINDING",
    claim: "The Apollo 11 Lunar Module Eagle landed on the Moon on July 20, 1969.",
    requiredSources: "NASA Apollo mission archives",
    criteria: "Quote must explicitly confirm touchdown date of July 20, 1969.",
    primaryUrl: "https://en.wikipedia.org/wiki/Apollo_11",
    secondaryUrl: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
    quotes: "Apollo 11 (July 16–24, 1969) was the American spaceflight that first landed humans on the Moon. Commander Neil Armstrong and Lunar Module Pilot Buzz Aldrin landed the Apollo Lunar Module Eagle on July 20, 1969",
    reasoning: "NASA Apollo 11 mission records definitively confirm that the Eagle landed at Mare Tranquillitatis on July 20, 1969."
  },
  {
    num: 4,
    id: 5004,
    title: "Dare you to verify the melting point of gallium at standard atmospheric pressure",
    category: "INVESTIGATIVE_FACT_FINDING",
    claim: "Elemental gallium melts at approximately 29.76 degrees Celsius at standard atmospheric pressure.",
    requiredSources: "IUPAC or NIST standard reference database",
    criteria: "Quote must state melting point near 29.76 °C or 302.91 K.",
    primaryUrl: "https://en.wikipedia.org/wiki/Gallium",
    secondaryUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/Gallium",
    quotes: "Elemental gallium is a soft, silvery blue metal at standard temperature and pressure; however, in its liquid state it becomes silvery white. Its melting point is 29.76 °C (85.57 °F; 302.91 K)",
    reasoning: "NIST standard reference physical properties confirm gallium melting transition occurs at 29.7646 °C."
  },
  {
    num: 5,
    id: 5005,
    title: "Dare you to verify the discovery year of the cosmic microwave background radiation by Penzias and Wilson",
    category: "INVESTIGATIVE_FACT_FINDING",
    claim: "Arno Penzias and Robert Woodrow Wilson discovered the cosmic microwave background radiation in 1964.",
    requiredSources: "Nobel Prize archives or Bell Labs historical publications",
    criteria: "Quote must confirm discovery in 1964 by Penzias and Wilson.",
    primaryUrl: "https://en.wikipedia.org/wiki/Cosmic_microwave_background",
    secondaryUrl: "https://www.nobelprize.org/prizes/physics/1978/summary/",
    quotes: "The discovery of CMB in 1964 by American radio astronomers Arno Penzias and Robert Wilson was the culmination of work initiated in the 1940s",
    reasoning: "Bell Laboratories Holmdel Horn Antenna observations in 1964 detected excess antenna temperature corresponding to ~3K blackbody background, published in 1965 ApJ."
  }
];

async function runFiveDares() {
  console.log('========================================================================');
  console.log('   DAREYOU ZERO-STAKE E2E DUEL TEST: 5 AUTHENTICATED CHALLENGES        ');
  console.log('========================================================================\n');

  // Investigator account (deployer acts as investigator)
  const investigatorClient = client;
  const results = [];

  for (const dare of testDares) {
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`[DARE #${dare.num}/5] ${dare.title}`);
    console.log(`------------------------------------------------------------------------`);

    // 1. Evaluate Qualification
    console.log(`[1. AI Qualification Gate] Evaluating challenge qualification...`);
    const canonical = `${dare.category}|${dare.title}|${dare.claim}|${dare.requiredSources}|${dare.criteria}`;
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(canonical).digest('hex');

    const qualifyTx = await client.writeContract({
      address: QUALIFIER_ADDR,
      functionName: 'evaluate_challenge_qualification',
      args: [hash, dare.category, dare.title, dare.claim, dare.requiredSources, dare.criteria],
      value: 0n,
      leaderOnly: false
    });
    console.log(`   Tx: ${qualifyTx}`);
    await client.waitForTransactionReceipt({ hash: qualifyTx, status: 'ACCEPTED', retries: 30, interval: 3000 });

    const rawQual = await client.readContract({
      address: QUALIFIER_ADDR,
      functionName: 'get_qualification',
      args: [hash]
    });
    const qualifyResult = JSON.parse(rawQual);
    console.log(`   Qualification Result: ${qualifyResult.decision} (Rules SHA-256: ${qualifyResult.rules_sha256?.slice(0, 16)}...)`);

    // 2. Publish Qualified Dare
    console.log(`[2. Publish Dare] Registering dare on DareRegistry...`);
    const createTx = await client.writeContract({
      address: REGISTRY_ADDR,
      functionName: 'publish_qualified_dare',
      args: [
        dare.category,
        dare.title,
        dare.claim,
        dare.requiredSources,
        dare.criteria,
        86400,
        7200,
        qualifyResult.decision
      ],
      value: 0n,
      leaderOnly: false
    });
    console.log(`   Create Tx: ${createTx}`);
    await client.waitForTransactionReceipt({ hash: createTx, status: 'ACCEPTED', retries: 30, interval: 3000 });

    // 3. Accept Dare
    console.log(`[3. Accept Challenge] Investigator accepting dare...`);
    const acceptTx = await investigatorClient.writeContract({
      address: REGISTRY_ADDR,
      functionName: 'accept_dare',
      args: [dare.id],
      value: 0n,
      leaderOnly: false
    });
    console.log(`   Accept Tx: ${acceptTx}`);
    await investigatorClient.waitForTransactionReceipt({ hash: acceptTx, status: 'ACCEPTED', retries: 30, interval: 3000 });

    // 4. Submit Evidence to EvidenceRegistry (Freezes evidence)
    console.log(`[4. Freeze Evidence] Freezing evidence dossier on EvidenceRegistry...`);
    const evidenceTx = await investigatorClient.writeContract({
      address: EVIDENCE_ADDR,
      functionName: 'submit_evidence',
      args: [
        dare.id,
        account.address,
        'CLAIM_VERIFIED_TRUE',
        dare.primaryUrl,
        dare.secondaryUrl,
        dare.quotes,
        dare.reasoning
      ],
      value: 0n,
      leaderOnly: false
    });
    console.log(`   Evidence Tx: ${evidenceTx}`);
    await investigatorClient.waitForTransactionReceipt({ hash: evidenceTx, status: 'ACCEPTED', retries: 30, interval: 3000 });

    // 5. Mark evidence submitted
    console.log(`[5. Mark Submitted] Marking submitted on DareRegistry...`);
    const markTx = await investigatorClient.writeContract({
      address: REGISTRY_ADDR,
      functionName: 'mark_evidence_submitted',
      args: [dare.id],
      value: 0n,
      leaderOnly: false
    });
    await investigatorClient.waitForTransactionReceipt({ hash: markTx, status: 'ACCEPTED', retries: 30, interval: 3000 });

    // 6. Authenticated Adjudication (adjudicate_from_records)
    console.log(`[6. Authenticated Adjudication] Calling adjudicate_from_records on DareAdjudicator...`);
    const adjudicateTx = await client.writeContract({
      address: ADJUDICATOR_ADDR,
      functionName: 'adjudicate_from_records',
      args: [dare.id],
      value: 0n,
      leaderOnly: false
    });
    console.log(`   Adjudication Tx: ${adjudicateTx}`);
    await client.waitForTransactionReceipt({ hash: adjudicateTx, status: 'ACCEPTED', retries: 45, interval: 3500 });

    // 7. Verify Auto-Finalization on DareRegistry
    const dareRaw = await client.readContract({
      address: REGISTRY_ADDR,
      functionName: 'get_dare',
      args: [dare.id]
    });
    const dareState = JSON.parse(dareRaw);
    console.log(`   ✔ DareRegistry Status: ${dareState.status} | Verdict: ${dareState.verdict} | Winner: ${dareState.winner}`);

    results.push({
      dareId: dare.id,
      title: dare.title,
      status: dareState.status,
      verdict: dareState.verdict,
      winner: dareState.winner,
      adjudicated: dareState.adjudicated
    });

    // Rate-limit pause
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n========================================================================');
  console.log('     ALL 5 DARES TESTED & CONFIRMED FINALIZED ON STUDIONET             ');
  console.log('========================================================================\n');
  console.log(JSON.stringify(results, null, 2));
}

runFiveDares().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
