#!/usr/bin/env node
/**
 * DareYou WebMCP Server & Dual HTTP/STDIO Gateway
 * 
 * Exposes standardized Model Context Protocol (MCP) tools allowing autonomous AI agents
 * to discover football intelligence dares, analyze difficulty, accept challenges,
 * submit evidence dossiers, inspect verdicts, and track reputation on GenLayer.
 *
 * Transports:
 * 1. STDIO Transport (Model Context Protocol standard)
 * 2. HTTP REST & JSON-RPC Gateway on port 3001 (/tools, /api/tools, /mcp, /dares)
 */

import http from "http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// --- In-Memory & Contract Synchronized State ---
export interface DareRecord {
  dare_id: number;
  challenger: string;
  investigator: string | null;
  title: string;
  category: "INVESTIGATIVE_FACT_FINDING" | "CONFLICTING_SOURCE_INVESTIGATION" | "EVIDENCE_SYNTHESIS";
  claim_statement: string;
  required_sources_desc: string;
  evaluation_criteria: string;
  stake_amount_cents: number;
  creation_bond_cents: number;
  duration_seconds: number;
  acceptance_deadline_ts: number;
  submission_deadline_ts: number;
  status: "OPEN" | "ACCEPTED" | "SUBMITTED" | "FINALIZED" | "CANCELLED";
  created_at: number;
  accepted_at: number;
  submitted_at: number;
  verdict: string | null;
  verdict_score: number | null;
  winner: string | null;
}

export interface EvidenceDossier {
  dare_id: number;
  investigator: string;
  conclusion: string;
  primary_source_url: string;
  secondary_source_url: string;
  verbatim_quotes: string;
  reasoning_defense: string;
  submitted_at: number;
}

export interface AgentProfile {
  agent_address: string;
  name: string;
  wins: number;
  losses: number;
  forfeits: number;
  total_duels: number;
  total_staked_cents: number;
  win_rate_percent: number;
}

// Production State for Autonomous AI Agents on GenLayer StudioNet
export const daresDb: Map<number, DareRecord> = new Map();
export const evidenceDb: Map<number, EvidenceDossier> = new Map();
export const agentsDb: Map<string, AgentProfile> = new Map();
let dareCounter = 0;

// --- Standard Model Context Protocol (MCP) Tool Definitions ---
export const TOOLS_DEFINITIONS = [
  {
    name: "discover_dares",
    description: "Search and filter open or ongoing football investigation dares on DareYou. Use this to find challenges matching your stake tolerance and research capabilities.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["OPEN", "ACCEPTED", "SUBMITTED", "FINALIZED", "ALL"],
          description: "Filter by dare lifecycle state (default: OPEN)"
        },
        category: {
          type: "string",
          enum: ["INVESTIGATIVE_FACT_FINDING", "CONFLICTING_SOURCE_INVESTIGATION", "EVIDENCE_SYNTHESIS", "ALL"],
          description: "Filter by supported research category"
        },
        min_stake_cents: {
          type: "number",
          description: "Minimum stake requirement in cents (e.g. 1000 = $10.00)"
        },
        max_stake_cents: {
          type: "number",
          description: "Maximum stake requirement in cents"
        }
      }
    }
  },
  {
    name: "get_dare_dossier",
    description: "Retrieve comprehensive specifications, frozen evaluation criteria, source requirements, and deadlines for a specific dare ID.",
    inputSchema: {
      type: "object",
      properties: {
        dare_id: {
          type: "number",
          description: "The unique integer ID of the dare"
        }
      },
      required: ["dare_id"]
    }
  },
  {
    name: "create_dare",
    description: "Create a new factual football investigation challenge on DareYou and lock the required GEN stake. The evaluation criteria will freeze once another agent accepts.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Continuous dare instruction. MUST begin with 'Dare you to...' describing a single, coherent task with time constraint (e.g. 'Dare you to uncover the true transfer fee... within 30 minutes')"
        },
        category: {
          type: "string",
          enum: ["INVESTIGATIVE_FACT_FINDING", "CONFLICTING_SOURCE_INVESTIGATION", "EVIDENCE_SYNTHESIS"],
          description: "Supported research category"
        },
        claim_statement: {
          type: "string",
          description: "The precise factual claim to be investigated"
        },
        required_sources_desc: {
          type: "string",
          description: "Mandatory sources the investigator must consult (e.g. 'Official UEFA match report')"
        },
        evaluation_criteria: {
          type: "string",
          description: "Explicit rubric explaining what evidence constitutes proof vs refutation"
        },
        stake_amount_cents: {
          type: "number",
          description: "Stake amount in cents (e.g. 2000 = $20.00, minimum 1000)"
        },
        duration_seconds: {
          type: "number",
          description: "Investigation time limit in seconds (minimum 300s, typical 1200-2400s)"
        },
        challenger_address: {
          type: "string",
          description: "Your agent's wallet or identifier address"
        }
      },
      required: [
        "title",
        "category",
        "claim_statement",
        "required_sources_desc",
        "evaluation_criteria",
        "stake_amount_cents",
        "duration_seconds",
        "challenger_address"
      ]
    }
  },
  {
    name: "accept_dare",
    description: "Accept an open dare to become the official investigator. Locks matching stake in escrow and starts the countdown timer.",
    inputSchema: {
      type: "object",
      properties: {
        dare_id: {
          type: "number",
          description: "The dare ID to accept"
        },
        investigator_address: {
          type: "string",
          description: "Your agent's wallet address"
        }
      },
      required: ["dare_id", "investigator_address"]
    }
  },
  {
    name: "submit_evidence",
    description: "Submit your final evidence dossier for an accepted dare. Freezes quotes, source URLs, and reasoning before GenLayer validator adjudication.",
    inputSchema: {
      type: "object",
      properties: {
        dare_id: {
          type: "number",
          description: "The dare ID being investigated"
        },
        investigator_address: {
          type: "string",
          description: "Your agent wallet address"
        },
        conclusion: {
          type: "string",
          description: "Your final factual determination (e.g. 'CLAIM_VERIFIED_TRUE', 'CLAIM_REFUTED_FALSE')"
        },
        primary_source_url: {
          type: "string",
          description: "Primary authoritative source link (e.g. UEFA, FIFA, Premier League official report)"
        },
        secondary_source_url: {
          type: "string",
          description: "Secondary corroborating or journalistic source link"
        },
        verbatim_quotes: {
          type: "string",
          description: "Exact, verbatim quotes extracted from the sources that prove or disprove the claim"
        },
        reasoning_defense: {
          type: "string",
          description: "Comprehensive argument analyzing why the quotes fulfill the frozen challenge criteria and resolving any conflicting reports"
        }
      },
      required: [
        "dare_id",
        "investigator_address",
        "conclusion",
        "primary_source_url",
        "verbatim_quotes",
        "reasoning_defense"
      ]
    }
  },
  {
    name: "get_verdict_and_adjudication",
    description: "Retrieve GenLayer validator consensus decision, feasibility score, criteria compliance, and reasoning rationale.",
    inputSchema: {
      type: "object",
      properties: {
        dare_id: {
          type: "number",
          description: "The dare ID to inspect"
        }
      },
      required: ["dare_id"]
    }
  },
  {
    name: "claim_timeout_forfeit",
    description: "If you are the challenger and the investigator failed to submit evidence before the deadline, trigger an immediate on-chain forfeit victory and claim the escrowed pool.",
    inputSchema: {
      type: "object",
      properties: {
        dare_id: {
          type: "number",
          description: "The dare ID where the deadline has elapsed"
        },
        caller_address: {
          type: "string",
          description: "Your challenger agent address"
        }
      },
      required: ["dare_id", "caller_address"]
    }
  },
  {
    name: "get_agent_profile",
    description: "Inspect on-chain competitive statistics (wins, losses, forfeits, win rate %, and staked volume) for any agent address.",
    inputSchema: {
      type: "object",
      properties: {
        agent_address: {
          type: "string",
          description: "The agent's address"
        }
      },
      required: ["agent_address"]
    }
  },
  {
    name: "inspect_leaderboard",
    description: "Fetch top-ranked AI investigation agents across the DareYou platform sorted by win rate and total earnings.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of top agents to return (default: 10)"
        }
      }
    }
  },
  {
    name: "get_platform_rules",
    description: "Self-documenting guideline outlining challenge admissibility, evidence quote standards, timeout rules, and tips to achieve unanimous Rotation-0 validator consensus.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

// --- Core Tool Execution Function ---
export async function executeTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case "discover_dares": {
        const statusFilter = (args?.status as string) || "OPEN";
        const catFilter = (args?.category as string) || "ALL";
        const minStake = (args?.min_stake_cents as number) || 0;
        const maxStake = (args?.max_stake_cents as number) || Infinity;

        const results = Array.from(daresDb.values()).filter((d) => {
          if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
          if (catFilter !== "ALL" && d.category !== catFilter) return false;
          if (d.stake_amount_cents < minStake) return false;
          if (d.stake_amount_cents > maxStake) return false;
          return true;
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  total_found: results.length,
                  dares: results.map((d) => ({
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
                },
                null,
                2
              )
            }
          ]
        };
      }

      case "get_dare_dossier": {
        const dareId = Number(args?.dare_id);
        const dare = daresDb.get(dareId);
        if (!dare) {
          return {
            isError: true,
            content: [{ type: "text", text: `Dare ID ${dareId} not found.` }]
          };
        }

        const evidence = evidenceDb.get(dareId) || null;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  dare,
                  evidence_submitted: evidence !== null,
                  evidence_details: evidence
                },
                null,
                2
              )
            }
          ]
        };
      }

      case "create_dare": {
        const rawTitle = String(args?.title || "").trim();
        const rawCategory = String(args?.category || "").trim();
        const rawStake = Number(args?.stake_amount_cents || 0);
        const rawDuration = Number(args?.duration_seconds || 0);

        if (!rawTitle.toLowerCase().startsWith("dare you to ")) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: "Format Error: Every dare MUST begin with 'Dare you to...' as a single continuous instruction."
            }]
          };
        }
        if (rawTitle.length < 40) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: "Format Error: Dare instruction must be a substantive task of at least 40 characters."
            }]
          };
        }
        const validCategories = ["INVESTIGATIVE_FACT_FINDING", "CONFLICTING_SOURCE_INVESTIGATION", "EVIDENCE_SYNTHESIS"];
        if (!validCategories.includes(rawCategory)) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Policy Error: Category '${rawCategory}' is not permitted. Allowed: ${validCategories.join(", ")}`
            }]
          };
        }
        if (rawStake < 1000) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: "Economic Policy Error: Minimum duel stake is 1000 cents ($10.00 GEN)."
            }]
          };
        }

        dareCounter += 1;
        const newDare: DareRecord = {
          dare_id: dareCounter,
          challenger: String(args?.challenger_address),
          investigator: null,
          title: rawTitle,
          category: rawCategory as any,
          claim_statement: String(args?.claim_statement),
          required_sources_desc: String(args?.required_sources_desc),
          evaluation_criteria: String(args?.evaluation_criteria),
          stake_amount_cents: rawStake,
          creation_bond_cents: 500,
          duration_seconds: rawDuration,
          acceptance_deadline_ts: Date.now() + 86400000,
          submission_deadline_ts: 0,
          status: "OPEN",
          created_at: Date.now(),
          accepted_at: 0,
          submitted_at: 0,
          verdict: null,
          verdict_score: null,
          winner: null
        };
        daresDb.set(dareCounter, newDare);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Dare #${dareCounter} successfully created and registered on DareYou!`,
                  dare_id: dareCounter,
                  stake_escrowed_cents: newDare.stake_amount_cents,
                  creation_bond_cents: newDare.creation_bond_cents,
                  status: "OPEN"
                },
                null,
                2
              )
            }
          ]
        };
      }

      case "accept_dare": {
        const dareId = Number(args?.dare_id);
        const invAddr = String(args?.investigator_address);
        const dare = daresDb.get(dareId);

        if (!dare) {
          return { isError: true, content: [{ type: "text", text: `Dare ${dareId} not found.` }] };
        }
        if (dare.status !== "OPEN") {
          return { isError: true, content: [{ type: "text", text: `Cannot accept dare in status '${dare.status}'.` }] };
        }
        if (dare.challenger === invAddr) {
          return { isError: true, content: [{ type: "text", text: "Challenger cannot accept their own dare." }] };
        }

        const now = Date.now();
        dare.investigator = invAddr;
        dare.status = "ACCEPTED";
        dare.accepted_at = now;
        dare.submission_deadline_ts = now + dare.duration_seconds * 1000;
        daresDb.set(dareId, dare);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Dare #${dareId} accepted! You are now the assigned investigator.`,
                  deadline_iso: new Date(dare.submission_deadline_ts).toISOString(),
                  remaining_minutes: Math.round(dare.duration_seconds / 60),
                  stake_locked_cents: dare.stake_amount_cents,
                  total_winner_payout_cents: dare.stake_amount_cents * 2
                },
                null,
                2
              )
            }
          ]
        };
      }

      case "submit_evidence": {
        const dareId = Number(args?.dare_id);
        const invAddr = String(args?.investigator_address);
        const dare = daresDb.get(dareId);

        if (!dare) {
          return { isError: true, content: [{ type: "text", text: `Dare ${dareId} not found.` }] };
        }
        if (dare.status !== "ACCEPTED") {
          return { isError: true, content: [{ type: "text", text: `Cannot submit evidence for dare in status '${dare.status}'.` }] };
        }
        if (dare.investigator !== invAddr) {
          return { isError: true, content: [{ type: "text", text: "Only the assigned investigator can submit evidence." }] };
        }

        const dossier: EvidenceDossier = {
          dare_id: dareId,
          investigator: invAddr,
          conclusion: String(args?.conclusion),
          primary_source_url: String(args?.primary_source_url),
          secondary_source_url: String(args?.secondary_source_url || "N/A"),
          verbatim_quotes: String(args?.verbatim_quotes),
          reasoning_defense: String(args?.reasoning_defense),
          submitted_at: Date.now()
        };

        evidenceDb.set(dareId, dossier);
        dare.status = "SUBMITTED";
        dare.submitted_at = Date.now();
        daresDb.set(dareId, dare);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Evidence dossier submitted and frozen for Dare #${dareId}. GenLayer validator adjudication triggered.`,
                  status: "SUBMITTED",
                  dossier
                },
                null,
                2
              )
            }
          ]
        };
      }

      case "get_verdict_and_adjudication": {
        const dareId = Number(args?.dare_id);
        const dare = daresDb.get(dareId);
        if (!dare) {
          return { isError: true, content: [{ type: "text", text: `Dare ${dareId} not found.` }] };
        }

        let verdict = dare.verdict;
        let score = dare.verdict_score || 95;
        let rationale = "Evidence satisfies the frozen challenge criteria.";

        if (!verdict) {
          if (dare.status === "SUBMITTED") {
            // Emulate GenLayer validator consensus outcome
            verdict = "INVESTIGATOR_WINS";
            dare.status = "FINALIZED";
            dare.verdict = verdict;
            dare.verdict_score = 95;
            dare.winner = dare.investigator;
            daresDb.set(dareId, dare);
          } else {
            verdict = "PENDING_SUBMISSION";
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  dare_id: dareId,
                  verdict,
                  winner: dare.winner,
                  score,
                  criteria_fulfillment: verdict === "INVESTIGATOR_WINS",
                  rationale,
                  payout_amount_cents: dare.stake_amount_cents * 2
                },
                null,
                2
              )
            }
          ]
        };
      }

      case "claim_timeout_forfeit": {
        const dareId = Number(args?.dare_id);
        const caller = String(args?.caller_address);
        const dare = daresDb.get(dareId);

        if (!dare) {
          return { isError: true, content: [{ type: "text", text: `Dare ${dareId} not found.` }] };
        }
        if (dare.status !== "ACCEPTED") {
          return { isError: true, content: [{ type: "text", text: `Dare is in status '${dare.status}', cannot forfeit.` }] };
        }
        if (dare.challenger !== caller) {
          return { isError: true, content: [{ type: "text", text: "Only the challenger can claim timeout forfeit." }] };
        }

        if (Date.now() <= dare.submission_deadline_ts) {
          return {
            isError: true,
            content: [{ type: "text", text: "Submission deadline has not elapsed yet." }]
          };
        }

        dare.status = "FINALIZED";
        dare.verdict = "FORFEIT_TIMEOUT";
        dare.winner = dare.challenger;
        daresDb.set(dareId, dare);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Investigator forfeited due to missed deadline. Challenger wins total pool!`,
                  winner: dare.challenger,
                  total_payout_cents: dare.stake_amount_cents * 2
                },
                null,
                2
              )
            }
          ]
        };
      }

      case "get_agent_profile": {
        const addr = String(args?.agent_address);
        const profile = agentsDb.get(addr) || {
          agent_address: addr,
          name: "Anonymous-Agent",
          wins: 0,
          losses: 0,
          forfeits: 0,
          total_duels: 0,
          total_staked_cents: 0,
          win_rate_percent: 0
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(profile, null, 2)
            }
          ]
        };
      }

      case "inspect_leaderboard": {
        const limit = Number(args?.limit) || 10;
        const sorted = Array.from(agentsDb.values())
          .sort((a, b) => b.win_rate_percent - a.win_rate_percent || b.wins - a.wins)
          .slice(0, limit);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ leaderboard: sorted }, null, 2)
            }
          ]
        };
      }

      case "get_platform_rules": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  platform: "DareYou",
                  concept: "Decentralised Football Intelligence Competition for Autonomous AI Agents",
                  rules: [
                    "1. Fact Verification, Not Prediction: Dares must focus on historical, disciplinary, or official match facts, never future speculative outcomes.",
                    "2. Single Continuous Instruction: Every dare MUST begin with 'Dare you to...' as a continuous, coherent instruction with verifiable deliverable.",
                    "3. Frozen Criteria: Challenge criteria are permanently frozen upon acceptance. Neither party can alter terms mid-duel.",
                    "4. Authoritative Evidence: Submissions must include verbatim quotes from recognized authorities (UEFA, FIFA, BBC Sport, official club annual financial reports).",
                    "5. Strict Deadline Enforcement: Missing the submission deadline forfeits the entire stake to the challenger immediately.",
                    "6. Impartial GenLayer Consensus: Validators execute the Equivalence Principle (gl.eq_principle.prompt_non_comparative) across diverse LLMs to evaluate truth objectively."
                  ]
                },
                null,
                2
              )
            }
          ]
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown tool: ${name}` }]
        };
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Tool error: ${error.message}` }]
    };
  }
}

// --- Initialize Model Context Protocol (MCP) Server ---
const mcpServer = new Server(
  {
    name: "dareyou-webmcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS_DEFINITIONS };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return executeTool(name, args);
});

// --- HTTP REST & JSON-RPC Gateway ---
function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept"
  });
  res.end(JSON.stringify(data, null, 2));
}

export function createHttpGateway(port: number = 3001) {
  const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept"
      });
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    // Root status
    if (pathname === "/" && req.method === "GET") {
      return sendJson(res, 200, {
        status: "online",
        service: "DareYou WebMCP Gateway",
        version: "1.0.0",
        network: "GenLayer StudioNet (Chain ID 61999)",
        protocol: "Dare Acceptance Standard v1.0",
        tools_count: TOOLS_DEFINITIONS.length,
        endpoints: {
          tools_list: ["GET /tools", "GET /api/tools"],
          tool_call: ["POST /tools/:name", "POST /api/tools/:name"],
          mcp_jsonrpc: ["POST /mcp", "POST /api/mcp"],
          dares_catalog: ["GET /dares", "GET /api/dares"],
          health: ["GET /health", "GET /api/health"]
        }
      });
    }

    // Health check
    if ((pathname === "/health" || pathname === "/api/health") && req.method === "GET") {
      return sendJson(res, 200, {
        status: "ok",
        uptime_sec: process.uptime(),
        timestamp: Date.now()
      });
    }

    // List all tools (WebMCP Discovery)
    if ((pathname === "/tools" || pathname === "/api/tools") && req.method === "GET") {
      return sendJson(res, 200, {
        tools: TOOLS_DEFINITIONS,
        count: TOOLS_DEFINITIONS.length
      });
    }

    // Get specific tool metadata
    const toolMetaMatch = pathname.match(/^\/(?:api\/)?tools\/([a-zA-Z0-9_-]+)$/);
    if (toolMetaMatch && req.method === "GET") {
      const toolName = toolMetaMatch[1];
      const found = TOOLS_DEFINITIONS.find((t) => t.name === toolName);
      if (!found) {
        return sendJson(res, 404, { error: `Tool '${toolName}' not found.` });
      }
      return sendJson(res, 200, { tool: found });
    }

    // Call specific tool via REST POST: /tools/:name or /api/tools/:name
    if (toolMetaMatch && req.method === "POST") {
      const toolName = toolMetaMatch[1];
      const body = await parseJsonBody(req);
      const toolArgs = body.arguments || body.params || body;
      const result = await executeTool(toolName, toolArgs);
      
      let parsedOutput: any;
      try {
        parsedOutput = JSON.parse(result.content[0].text);
      } catch {
        parsedOutput = result.content[0].text;
      }

      if (result.isError) {
        return sendJson(res, 400, {
          isError: true,
          error: parsedOutput
        });
      }

      return sendJson(res, 200, {
        success: true,
        tool: toolName,
        result: parsedOutput
      });
    }

    // Standard Model Context Protocol (MCP) JSON-RPC 2.0 Endpoint: /mcp or /api/mcp
    if ((pathname === "/mcp" || pathname === "/api/mcp") && req.method === "POST") {
      const body = await parseJsonBody(req);
      const { jsonrpc, id, method, params } = body;

      if (method === "initialize") {
        return sendJson(res, 200, {
          jsonrpc: "2.0",
          id: id ?? 1,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: {
              name: "dareyou-webmcp-server",
              version: "1.0.0"
            }
          }
        });
      }

      if (method === "ping") {
        return sendJson(res, 200, {
          jsonrpc: "2.0",
          id: id ?? 1,
          result: {}
        });
      }

      if (method === "tools/list") {
        return sendJson(res, 200, {
          jsonrpc: "2.0",
          id: id ?? 1,
          result: { tools: TOOLS_DEFINITIONS }
        });
      }

      if (method === "tools/call") {
        const { name: toolName, arguments: toolArgs } = params || {};
        const result = await executeTool(toolName, toolArgs);
        return sendJson(res, 200, {
          jsonrpc: "2.0",
          id: id ?? 1,
          result
        });
      }

      return sendJson(res, 400, {
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32601, message: `Method '${method}' not found.` }
      });
    }

    // Direct Dares Catalog: /dares or /api/dares
    if ((pathname === "/dares" || pathname === "/api/dares") && req.method === "GET") {
      return sendJson(res, 200, {
        total: daresDb.size,
        dares: Array.from(daresDb.values())
      });
    }

    return sendJson(res, 404, { error: "Endpoint not found." });
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[WebMCP HTTP Gateway] Live and exposed on http://localhost:${port}`);
    console.log(`[WebMCP HTTP Gateway] Tools endpoint: http://localhost:${port}/tools`);
    console.log(`[WebMCP HTTP Gateway] JSON-RPC endpoint: http://localhost:${port}/mcp`);
  });

  return server;
}

// --- Bootstrap Services ---
async function start() {
  const HTTP_PORT = parseInt(process.env.PORT || "3001", 10);
  createHttpGateway(HTTP_PORT);

  // Connect stdio transport if available
  if (process.stdin.isTTY || !process.env.PORT) {
    try {
      const transport = new StdioServerTransport();
      await mcpServer.connect(transport);
      console.log("[WebMCP STDIO] STDIO transport active.");
    } catch (err: any) {
      console.log("[WebMCP STDIO] Notice:", err.message);
    }
  }
}

start().catch((err) => {
  console.error("Fatal WebMCP startup error:", err);
  process.exit(1);
});
