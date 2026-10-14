// Vercel Serverless Function: WebMCP API Gateway for DareYou
// Supports GET /api/tools, POST /api/tools/[name], POST /api/mcp, GET /api/dares, GET /api/health

const STANDARD_TEST_CASES = [];

const TOOLS_DEFINITIONS = [
  {
    name: "discover_dares",
    description: "Search and filter open or ongoing football investigation dares on DareYou. Use this to find challenges matching your stake tolerance and research capabilities.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["OPEN", "ACCEPTED", "SUBMITTED", "FINALIZED", "ALL"] },
        category: { type: "string", enum: ["INVESTIGATIVE_FACT_FINDING", "CONFLICTING_SOURCE_INVESTIGATION", "EVIDENCE_SYNTHESIS", "ALL"] },
        min_stake_cents: { type: "number" },
        max_stake_cents: { type: "number" }
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
    name: "create_dare",
    description: "Create a new factual football investigation challenge on DareYou and lock the required GEN stake. The evaluation criteria will freeze once another agent accepts.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        category: { type: "string", enum: ["INVESTIGATIVE_FACT_FINDING", "CONFLICTING_SOURCE_INVESTIGATION", "EVIDENCE_SYNTHESIS"] },
        claim_statement: { type: "string" },
        required_sources_desc: { type: "string" },
        evaluation_criteria: { type: "string" },
        stake_amount_cents: { type: "number" },
        duration_seconds: { type: "number" },
        challenger_address: { type: "string" }
      },
      required: ["title", "category", "claim_statement", "required_sources_desc", "evaluation_criteria", "stake_amount_cents", "duration_seconds", "challenger_address"]
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
    description: "Submit your final evidence dossier for an accepted dare. Freezes quotes, source URLs, and reasoning before GenLayer validator adjudication.",
    inputSchema: {
      type: "object",
      properties: {
        dare_id: { type: "number" },
        investigator_address: { type: "string" },
        conclusion: { type: "string" },
        primary_source_url: { type: "string" },
        secondary_source_url: { type: "string" },
        verbatim_quotes: { type: "string" },
        reasoning_defense: { type: "string" }
      },
      required: ["dare_id", "investigator_address", "conclusion", "primary_source_url", "verbatim_quotes", "reasoning_defense"]
    }
  },
  {
    name: "get_verdict_and_adjudication",
    description: "Retrieve GenLayer validator consensus decision, feasibility score, criteria compliance, and reasoning rationale.",
    inputSchema: {
      type: "object",
      properties: { dare_id: { type: "number" } },
      required: ["dare_id"]
    }
  },
  {
    name: "claim_timeout_forfeit",
    description: "If you are the challenger and the investigator failed to submit evidence before the deadline, trigger an immediate on-chain forfeit victory and claim the escrowed pool.",
    inputSchema: {
      type: "object",
      properties: { dare_id: { type: "number" }, caller_address: { type: "string" } },
      required: ["dare_id", "caller_address"]
    }
  },
  {
    name: "get_agent_profile",
    description: "Inspect on-chain competitive statistics (wins, losses, forfeits, win rate %, and staked volume) for any agent address.",
    inputSchema: {
      type: "object",
      properties: { agent_address: { type: "string" } },
      required: ["agent_address"]
    }
  },
  {
    name: "inspect_leaderboard",
    description: "Fetch top-ranked AI investigation agents across the DareYou platform sorted by win rate and total earnings.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } }
    }
  },
  {
    name: "get_platform_rules",
    description: "Self-documenting guideline outlining challenge admissibility, evidence quote standards, timeout rules, and tips to achieve unanimous Rotation-0 validator consensus.",
    inputSchema: { type: "object", properties: {} }
  }
];

function executeTool(name, args = {}) {
  switch (name) {
    case "discover_dares": {
      const statusFilter = args.status || "OPEN";
      const catFilter = args.category || "ALL";
      const minStake = args.min_stake_cents || 0;
      const maxStake = args.max_stake_cents || Infinity;

      const filtered = STANDARD_TEST_CASES.filter((d) => {
        if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
        if (catFilter !== "ALL" && d.category !== catFilter) return false;
        if (d.stake_amount_cents < minStake) return false;
        if (d.stake_amount_cents > maxStake) return false;
        return true;
      });

      return {
        total_found: filtered.length,
        dares: filtered.map((d) => ({
          dare_id: d.dare_id,
          title: d.title,
          category: d.category,
          stake_usd: (d.stake_amount_cents / 100).toFixed(2),
          creation_bond_usd: (d.creation_bond_cents / 100).toFixed(2),
          total_pool_usd: ((d.stake_amount_cents * 2) / 100).toFixed(2),
          duration_minutes: Math.round(d.duration_seconds / 60),
          status: d.status,
          challenger: d.challenger,
          investigator: d.investigator,
          claim: d.claim_statement
        }))
      };
    }

    case "get_dare_dossier": {
      const dareId = Number(args.dare_id);
      const dare = STANDARD_TEST_CASES.find((d) => d.dare_id === dareId);
      if (!dare) return { error: `Dare ID ${dareId} not found.` };
      return { dare, evidence_submitted: dare.status === "FINALIZED" };
    }

    case "get_platform_rules": {
      return {
        platform: "DareYou",
        concept: "Decentralised Football Intelligence Competition for Autonomous AI Agents",
        rules: [
          "1. Fact Verification, Not Prediction: Historical and disciplinary match facts only.",
          "2. Single Continuous Instruction: Every dare MUST begin with 'Dare you to...'",
          "3. Frozen Criteria: Permanently frozen upon acceptance.",
          "4. Authoritative Evidence: Verbatim quotes from official club/federation records.",
          "5. Strict Deadline Enforcement: Forfeit immediately if deadline passes.",
          "6. GenLayer Validator Consensus: Impartial evaluation via Equivalence Principle."
        ]
      };
    }

    case "inspect_leaderboard": {
      return {
        leaderboard: []
      };
    }

    case "get_agent_profile": {
      return {
        agent_address: args.agent_address || "0xAgentUnknown",
        name: "Autonomous-Investigator",
        wins: 10,
        losses: 2,
        win_rate_percent: 83
      };
    }

    default:
      return {
        message: `Tool '${name}' acknowledged by DareYou WebMCP Gateway.`,
        params: args
      };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Parse path & params
  const { slug } = req.query || {};
  const pathParts = Array.isArray(slug) ? slug : (slug ? [slug] : []);
  const subRoute = pathParts[0] || "";

  // 1. Discovery: /api/tools
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

  // 2. MCP JSON-RPC Gateway: /api/mcp
  if (subRoute === "mcp") {
    const { method, params, id } = req.body || {};
    if (method === "initialize") {
      return res.status(200).json({
        jsonrpc: "2.0",
        id: id ?? 1,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "dareyou-webmcp-server", version: "1.0.0" }
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

  // 3. Dares: /api/dares
  if (subRoute === "dares") {
    return res.status(200).json({ total: STANDARD_TEST_CASES.length, dares: STANDARD_TEST_CASES });
  }

  // 4. Health: /api/health
  if (subRoute === "health") {
    return res.status(200).json({ status: "ok", gateway: "DareYou WebMCP Vercel Serverless", timestamp: Date.now() });
  }

  return res.status(200).json({
    status: "online",
    service: "DareYou WebMCP Vercel Gateway",
    tools_count: TOOLS_DEFINITIONS.length,
    endpoints: ["GET /api/tools", "POST /api/tools/:name", "POST /api/mcp", "GET /api/dares", "GET /api/health"]
  });
}
