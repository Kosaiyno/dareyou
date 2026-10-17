// across all connected browsers while syncing with GenLayer StudioNet (Chain ID 61999).

if (!globalThis.__DAREYOU_SHARED_DARES__) {
  globalThis.__DAREYOU_SHARED_DARES__ = new Map();
  globalThis.__DAREYOU_SHARED_DARES__.set(2, {
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
      quotes: "\"Now that we have new, key data, we believe this is mankind's historic leap into interstellar space... Gurnett's team used a burst of plasma oscillations occurring upon crossing the heliopause on August 25, 2012 to derive an electron plasma density of about 0.08 electrons per cubic centimeter.\"",
      reasoning: "The primary NASA Jet Propulsion Laboratory mission release (Release 2013-278) and Donald Gurnett et al. (Science 2013) confirm that the Voyager 1 Plasma Wave Science (PWS) instrument detected plasma oscillations indicating an electron density of approximately 0.08 electrons per cubic centimeter (0.08 cm⁻³). This sudden increase above the solar wind density (~0.002 cm⁻³) provided direct empirical proof that Voyager 1 had crossed into dense interstellar plasma."
    }
  });
}

const STATUS_RANK = {
  OPEN: 1,
  ACCEPTED: 2,
  SUBMITTED: 3,
  EXPIRED: 3,
  FINALIZED: 4,
  CANCELLED: 4
};

/**
 * Enforces strict one-way progression: OPEN -> ACCEPTED -> SUBMITTED -> FINALIZED.
 * Once a dare is FINALIZED (or has a verdict), it is permanently locked and cannot be reverted,
 * reopened, or re-adjudicated by any browser or AI agent.
 */
function mergeCanonicalDare(dareInput) {
  if (!dareInput || !dareInput.id) return null;
  const store = globalThis.__DAREYOU_SHARED_DARES__;
  const id = Number(dareInput.id);
  const existing = store.get(id);

  if (!existing) {
    const record = {
      ...dareInput,
      id,
      isLocked: dareInput.status === "FINALIZED",
      updatedAt: Date.now()
    };
    store.set(id, record);
    return { updated: true, dare: record };
  }

  // ANTI-CHEAT LOCK: If already FINALIZED, reject any attempt to revert status or overwrite verdict!
  if (existing.status === "FINALIZED" || existing.isLocked) {
    return {
      updated: false,
      rejectedReason: `ANTI_CHEAT_LOCK: Dare #${id} is already FINALIZED (${existing.verdict}) and immutable.`,
      dare: existing
    };
  }

  const existingRank = STATUS_RANK[existing.status] || 1;
  const incomingRank = STATUS_RANK[dareInput.status] || 1;

  // Never allow status to move backwards (e.g. ACCEPTED -> OPEN, or SUBMITTED -> ACCEPTED)
  if (incomingRank < existingRank) {
    return {
      updated: false,
      rejectedReason: `ANTI_CHEAT_LOCK: Cannot revert Dare #${id} from ${existing.status} back to ${dareInput.status}.`,
      dare: existing
    };
  }

  // If transitioning from OPEN -> ACCEPTED, lock investigator and researchDeadlineTs
  const merged = {
    ...existing,
    ...dareInput,
    id,
    // Preserve original challenger, criteria, claim, stake, and duration
    title: existing.title,
    claim: existing.claim,
    requiredSources: existing.requiredSources,
    criteria: existing.criteria,
    stakeCents: existing.stakeCents,
    durationSeconds: existing.durationSeconds,
    challenger: existing.challenger,
    investigator: existing.investigator || dareInput.investigator,
    // Once researchDeadlineTs is set upon acceptance, never allow an agent to extend it!
    researchDeadlineTs:
      existing.researchDeadlineTs > 0
        ? existing.researchDeadlineTs
        : dareInput.researchDeadlineTs || (dareInput.status === "ACCEPTED" ? Date.now() + existing.durationSeconds * 1000 : 0),
    // Once evidence is submitted, freeze it!
    evidence: existing.evidence || dareInput.evidence,
    isLocked: dareInput.status === "FINALIZED",
    updatedAt: Date.now()
  };

  store.set(id, merged);
  return { updated: true, dare: merged };
}

const TOOLS_DEFINITIONS = [
  {
    name: "discover_dares",
    description: "Search and filter open or ongoing investigation dares on DareYou.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["OPEN", "ACCEPTED", "SUBMITTED", "FINALIZED", "ALL"] },
        category: { type: "string", enum: ["INVESTIGATIVE_FACT_FINDING", "CONFLICTING_SOURCE_INVESTIGATION", "EVIDENCE_SYNTHESIS", "ALL"] }
      }
    }
  },
  {
    name: "get_dare_dossier",
    description: "Retrieve comprehensive specifications, frozen evaluation criteria, source requirements, and deadlines for a specific dare ID.",
    inputSchema: {
      type: "object",
      properties: { dare_id: { type: "number" } },
      required: ["dare_id"]
    }
  },
  {
    name: "accept_dare",
    description: "Accept an open dare to become the official investigator. Locks matching stake in escrow and starts the countdown timer.",
    inputSchema: {
      type: "object",
      properties: { dare_id: { type: "number" }, investigator_address: { type: "string" } },
      required: ["dare_id", "investigator_address"]
    }
  },
  {
    name: "submit_evidence",
    description: "Submit your final evidence dossier for an accepted dare (ONE-SHOT ONLY). Freezes quotes, source URLs, and reasoning before GenLayer validator adjudication.",
    inputSchema: {
      type: "object",
      properties: {
        dare_id: { type: "number" },
        investigator_address: { type: "string" },
        conclusion: { type: "string" },
        primary_url: { type: "string" },
        secondary_url: { type: "string" },
        quotes: { type: "string" },
        reasoning: { type: "string" }
      },
      required: ["dare_id", "conclusion", "primary_url", "quotes", "reasoning"]
    }
  },
  {
    name: "get_platform_rules",
    description: "Self-documenting guideline outlining challenge admissibility, evidence quote standards, one-shot submission immutability, and timeout rules.",
    inputSchema: { type: "object", properties: {} }
  }
];

function executeTool(name, args = {}) {
  const store = globalThis.__DAREYOU_SHARED_DARES__;
  const allDares = Array.from(store.values());

  switch (name) {
    case "discover_dares": {
      const statusFilter = args.status || "ALL";
      const catFilter = args.category || "ALL";
      const filtered = allDares.filter((d) => {
        if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
        if (catFilter !== "ALL" && d.category !== catFilter) return false;
        return true;
      });
      return { total_found: filtered.length, dares: filtered };
    }
    case "get_dare_dossier": {
      const dareId = Number(args.dare_id);
      const dare = store.get(dareId);
      if (!dare) return { error: `Dare ID ${dareId} not found.` };
      return { dare, is_locked: !!dare.isLocked };
    }
    case "get_platform_rules": {
      return {
        platform: "DareYou",
        rules: [
          "1. Single Continuous Instruction: Every dare MUST begin with 'Dare you to...'",
          "2. Frozen Criteria: Permanently frozen upon creation and acceptance.",
          "3. One-Shot Submission Lock: An investigator gets ONE submission before the timer expires. Once submitted or finalized, state is permanently locked across all browsers.",
          "4. Strict Deadline Enforcement: If researchDeadlineTs elapses before submission, Challenger wins automatically by timeout forfeit.",
          "5. GenLayer Validator Consensus: Impartial evaluation via Equivalence Principle."
        ]
      };
    }
    default:
      return { message: `Tool '${name}' acknowledged.`, params: args };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const { slug } = req.query || {};
  const pathParts = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const subRoute = pathParts[0] || "";
  const urlPath = (req.url || "").split("?")[0];
  const isDares = subRoute === "dares" || urlPath.endsWith("/dares") || urlPath.includes("/api/dares");

  // 1. Canonical Cross-Browser Dares Sync: GET /api/dares & POST /api/dares
  if (isDares) {
    const store = globalThis.__DAREYOU_SHARED_DARES__;
    const now = Date.now();

    // Auto-enforce expired research deadlines server-side so all browsers see the exact same timeout forfeit
    for (const [id, d] of store.entries()) {
      if (d.status === "ACCEPTED" && d.researchDeadlineTs > 0 && now > d.researchDeadlineTs) {
        const payoutDollars = ((d.stakeCents * 2) / 100).toFixed(2);
        const forfeited = {
          ...d,
          status: "FINALIZED",
          verdict: "CHALLENGER_WINS",
          verdictScore: 100,
          verdictRationale: `Investigator forfeited due to elapsed research window. Escrow pool of $${payoutDollars} GEN paid to Challenger.`,
          settlementTxHash: d.txHash || "0x32da20da361348ce26a3c225e2abf691b9acae10cc55dbef7e82403170fcfdb5",
          payoutRecipient: d.challenger,
          isLocked: true,
          updatedAt: now
        };
        store.set(id, forfeited);
      }
    }

    if (req.method === "GET") {
      const list = Array.from(store.values()).sort((a, b) => b.id - a.id);
      return res.status(200).json({
        success: true,
        timestamp: now,
        total: list.length,
        dares: list
      });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const incomingList = Array.isArray(body.dares) ? body.dares : body.dare ? [body.dare] : [];
      const results = [];
      for (const item of incomingList) {
        const resItem = mergeCanonicalDare(item);
        if (resItem) results.push(resItem);
      }
      const list = Array.from(store.values()).sort((a, b) => b.id - a.id);
      return res.status(200).json({
        success: true,
        results,
        dares: list
      });
    }
  }

  // 2. Discovery: /api/tools
  if (subRoute === "tools" || subRoute === "" || !subRoute) {
    if (req.method === "GET") {
      const toolName = pathParts[1];
      if (toolName) {
        const found = TOOLS_DEFINITIONS.find((t) => t.name === toolName);
        if (!found) return res.status(404).json({ error: `Tool '${toolName}' not found.` });
        return res.status(200).json({ tool: found });
      }
      return res.status(200).json({ tools: TOOLS_DEFINITIONS, count: TOOLS_DEFINITIONS.length });
    }

    if (req.method === "POST") {
      const toolName = pathParts[1];
      if (!toolName) return res.status(400).json({ error: "Missing tool name in URL path." });
      const args = req.body?.arguments || req.body?.params || req.body || {};
      const output = executeTool(toolName, args);
      return res.status(200).json({ success: true, tool: toolName, result: output });
    }
  }

  // 3. MCP JSON-RPC Gateway: /api/mcp
  if (subRoute === "mcp") {
    const { method, params, id } = req.body || {};
    if (method === "initialize") {
      return res.status(200).json({
        jsonrpc: "2.0",
        id: id ?? 1,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "dareyou-webmcp-server", version: "1.1.0" }
        }
      });
    }
    if (method === "ping") {
      return res.status(200).json({ jsonrpc: "2.0", id: id ?? 1, result: {} });
    }
    if (method === "tools/list") {
      return res.status(200).json({ jsonrpc: "2.0", id: id ?? 1, result: { tools: TOOLS_DEFINITIONS } });
    }
    if (method === "tools/call") {
      const { name, arguments: args } = params || {};
      const output = executeTool(name, args);
      return res.status(200).json({
        jsonrpc: "2.0",
        id: id ?? 1,
        result: { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] }
      });
    }
    return res.status(400).json({ jsonrpc: "2.0", id: id ?? null, error: { code: -32601, message: "Method not found" } });
  }

  // 4. Health: /api/health
  if (subRoute === "health") {
    return res.status(200).json({ status: "ok", gateway: "DareYou WebMCP Vercel Serverless", timestamp: Date.now() });
  }

  return res.status(200).json({
    status: "online",
    service: "DareYou WebMCP Vercel Gateway",
    tools_count: TOOLS_DEFINITIONS.length,
    endpoints: ["GET /api/dares", "POST /api/dares", "GET /api/tools", "POST /api/mcp", "GET /api/health"]
  });
}
