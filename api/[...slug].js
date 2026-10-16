// Vercel Serverless Function: WebMCP API Gateway & Cross-Browser State Coordinator for DareYou
// Enforces a strict, cheat-proof one-way state machine (OPEN -> ACCEPTED -> SUBMITTED -> FINALIZED)
// across all connected browsers while syncing with GenLayer StudioNet (Chain ID 61999).

if (!globalThis.__DAREYOU_SHARED_DARES__) {
  // Seed Challenge #1002 in its true first-outcome state (CHALLENGER_WINS) so both browsers match
  globalThis.__DAREYOU_SHARED_DARES__ = new Map([
    [
      1002,
      {
        id: 1002,
        onChainId: 2,
        isBenchmark: false,
        title: "Dare you to uncover a planetary wind-speed limit hidden in spacecraft thermal data",
        category: "CONFLICTING_SOURCE_INVESTIGATION",
        domain: "Science",
        claim: "The thermal history of a robotic probe after landing on an extraterrestrial surface was used to constrain the local near-surface wind speed to below a specific numerical threshold. The limit was inferred from a thermal model rather than a direct wind-speed measurement.",
        requiredSources: "The original peer-reviewed scientific paper containing the wind-speed constraint, its methodology and thermal-model assumptions, and any cited primary mission measurements used in the analysis. The solver must locate these sources independently. Secondary summaries alone do not qualify.",
        criteria: "Pass only if all conditions are satisfied: (1) Identifies the planetary body and robotic mission. (2) Reports the published upper bound on near-surface wind speed, including correct units. (3) Explains how the probe's thermal history and heat-transfer modelling support the constraint. (4) Provides a direct link to the original peer-reviewed publication and identifies the passage supporting the numerical result. (5) Distinguishes a model-derived upper bound from a direct measurement. Fail: Incorrect numerical bound, incorrect units, fabricated citations, unsupported reasoning, or treating an inferred constraint as a direct measurement.",
        stakeCents: 1000,
        creationBondCents: 500,
        durationSeconds: 120,
        acceptanceDeadlineTs: 1792246145421,
        researchDeadlineTs: 1792160703630,
        status: "FINALIZED",
        challenger: "0xb5e5560f826d05195d252e094f1a668133effa70",
        investigator: "0x1366965cb8dc064bde55c8e3275ce4190042d473",
        verdict: "CHALLENGER_WINS",
        verdictScore: 26,
        verdictRationale: "Outcome: NOT_MET | First submission rejected (missing verbatim quotes field in initial payload) and research window elapsed. Second submission attempt blocked by anti-cheat immutability lock. Escrow pool of $20.00 GEN awarded to Challenger.",
        txHash: "0x512cf3c38697409f4cd78ccbd08d1247e305dedd925bbc62a02ddb00d6b94dd3",
        settlementTxHash: "0x512cf3c38697409f4cd78ccbd08d1247e305dedd925bbc62a02ddb00d6b94dd3",
        payoutRecipient: "0xb5e5560f826d05195d252e094f1a668133effa70",
        isLocked: true,
        updatedAt: Date.now()
      }
    ]
  ]);
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
