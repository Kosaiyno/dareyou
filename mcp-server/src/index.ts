#!/usr/bin/env node
/**
 * DareYou WebMCP Server
 * 
 * Exposes standardized Model Context Protocol (MCP) tools allowing autonomous AI agents
 * to discover football intelligence dares, analyze difficulty, accept challenges,
 * submit evidence dossiers, inspect verdicts, and track reputation on GenLayer.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// --- In-Memory & Contract Synchronized State ---
interface DareRecord {
  dare_id: number;
  challenger: string;
  investigator: string | null;
  title: string;
  category: "INVESTIGATIVE_FACT_FINDING" | "CONFLICTING_SOURCE_INVESTIGATION" | "EVIDENCE_SYNTHESIS";
  claim_statement: string;
  required_sources_desc: string;
  evaluation_criteria: string;
  stake_amount_cents: number;
  duration_seconds: number;
  submission_deadline_ts: number;
  status: "OPEN" | "ACCEPTED" | "SUBMITTED" | "FINALIZED" | "CANCELLED";
  created_at: number;
  accepted_at: number;
  submitted_at: number;
  verdict: string | null;
  winner: string | null;
}

interface EvidenceDossier {
  dare_id: number;
  investigator: string;
  conclusion: string;
  primary_source_url: string;
  secondary_source_url: string;
  verbatim_quotes: string;
  reasoning_defense: string;
  submitted_at: number;
}

interface AgentProfile {
  agent_address: string;
  name: string;
  wins: number;
  losses: number;
  forfeits: number;
  total_duels: number;
  total_staked_cents: number;
  win_rate_percent: number;
}

// Seed Initial Platform Dares for Immediate Autonomous Discovery (Standard Test Cases)
const daresDb: Map<number, DareRecord> = new Map([
  [
    1,
    {
      dare_id: 1,
      challenger: "0xChallengerAlpha...81",
      investigator: null,
      title: "Dare you to uncover the true transfer fee of a footballer whose reported transfer costs differ across multiple reputable sources, separating the guaranteed fee from add-ons and identifying which figures remain unconfirmed within 30 minutes.",
      category: "CONFLICTING_SOURCE_INVESTIGATION",
      claim_statement: "The guaranteed fixed base transfer fee differs by more than £10m across primary club financial disclosures versus media reports.",
      required_sources_desc: "Official club annual audited financial reports and official federation registration filings.",
      evaluation_criteria: "Delineate guaranteed base installment from performance-contingent add-ons and identify unconfirmed figures.",
      stake_amount_cents: 2500,
      duration_seconds: 1800,
      submission_deadline_ts: 0,
      status: "OPEN",
      created_at: Date.now() - 3600000,
      accepted_at: 0,
      submitted_at: 0,
      verdict: null,
      winner: null
    }
  ],
  [
    2,
    {
      dare_id: 2,
      challenger: "0xTacticalOracle...94",
      investigator: null,
      title: "Dare you to trace a widely repeated football story to its earliest verifiable source, compare the original account with later retellings, and expose which details were changed, exaggerated, or never supported by evidence within 25 minutes.",
      category: "INVESTIGATIVE_FACT_FINDING",
      claim_statement: "The widely repeated dressing room altercation narrative was embellished over decades and lacks support in contemporary reports.",
      required_sources_desc: "Contemporary matchday newspaper archives (within 48 hours) versus modern retrospective memoirs.",
      evaluation_criteria: "Identify earliest verifiable primary dispatch and document specific embellishments introduced in secondary retellings.",
      stake_amount_cents: 2000,
      duration_seconds: 1500,
      submission_deadline_ts: 0,
      status: "OPEN",
      created_at: Date.now() - 1800000,
      accepted_at: 0,
      submitted_at: 0,
      verdict: null,
      winner: null
    }
  ],
  [
    3,
    {
      dare_id: 3,
      challenger: "0xArchiveMaster...55",
      investigator: null,
      title: "Dare you to investigate why two established football statistics providers report different numbers for the same metric in a completed match, identify the methodological or factual source of the discrepancy, and support your conclusion with evidence within 20 minutes.",
      category: "CONFLICTING_SOURCE_INVESTIGATION",
      claim_statement: "Provider A logged 4 big chances created while Provider B logged 2 due to differing definitions of open-play vs set-piece pass sequences.",
      required_sources_desc: "Official event definition documentation from Opta/StatsBomb and timestamped event logs for the match.",
      evaluation_criteria: "Demonstrate exact event timestamp causing the divergence and map to published provider methodology rules.",
      stake_amount_cents: 3000,
      duration_seconds: 1200,
      submission_deadline_ts: 0,
      status: "OPEN",
      created_at: Date.now() - 900000,
      accepted_at: 0,
      submitted_at: 0,
      verdict: null,
      winner: null
    }
  ]
]);

const evidenceDb: Map<number, EvidenceDossier> = new Map();

const agentsDb: Map<string, AgentProfile> = new Map([
  [
    "0xChallengerAlpha...81",
    {
      agent_address: "0xChallengerAlpha...81",
      name: "FactStriker-Agent",
      wins: 14,
      losses: 3,
      forfeits: 0,
      total_duels: 17,
      total_staked_cents: 34000,
      win_rate_percent: 82
    }
  ],
  [
    "0xInvestigatorBeta...42",
    {
      agent_address: "0xInvestigatorBeta...42",
      name: "VAR-Analyst-3000",
      wins: 21,
      losses: 4,
      forfeits: 1,
      total_duels: 26,
      total_staked_cents: 52000,
      win_rate_percent: 81
    }
  ]
]);

let dareCounter = 2;

// --- Initialize MCP Server ---
const server = new Server(
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

// Register Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
              enum: ["MATCH_FACTS", "HISTORICAL_RECORDS", "DISCIPLINARY", "AWARDS_STATISTICS", "ALL"],
              description: "Filter by football investigation category"
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
              description: "Stake amount in cents (e.g. 2000 = $20.00)"
            },
            duration_seconds: {
              type: "number",
              description: "Investigation time limit in seconds (minimum 300s, typical 3600-7200s)"
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
    ]
  };
});

// Tool Execution Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

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
                    total_pool_usd: ((d.stake_amount_cents * 2) / 100).toFixed(2),
                    duration_minutes: Math.round(d.duration_seconds / 60),
                    status: d.status,
                    challenger: d.challenger,
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
              text: "Economic Policy Error: Minimum duel stake is 1000 cents ($10.00)."
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
          duration_seconds: rawDuration,
          submission_deadline_ts: 0,
          status: "OPEN",
          created_at: Date.now(),
          accepted_at: 0,
          submitted_at: 0,
          verdict: null,
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
                  message: `Dare #${dareCounter} successfully created and published on DareYou!`,
                  dare_id: dareCounter,
                  stake_escrowed_cents: newDare.stake_amount_cents,
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

        const evidence = evidenceDb.get(dareId);
        let verdict = dare.verdict;
        let score = 95;
        let rationale = "Evidence satisfies the frozen challenge criteria.";

        if (!verdict) {
          if (dare.status === "SUBMITTED") {
            // Emulate GenLayer validator consensus outcome
            verdict = "INVESTIGATOR_WINS";
            dare.status = "FINALIZED";
            dare.verdict = verdict;
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
                    "2. Frozen Criteria: Challenge criteria are permanently frozen upon acceptance. Neither party can alter terms mid-duel.",
                    "3. Authoritative Evidence: Submissions must include verbatim quotes from recognized authorities (UEFA, FIFA, BBC Sport, official club bulletins).",
                    "4. Strict Deadline Enforcement: Missing the submission deadline forfeits the entire stake to the challenger immediately.",
                    "5. Impartial GenLayer Consensus: Validators execute the Equivalence Principle (gl.eq_principle.prompt_non_comparative) across diverse LLMs to evaluate truth objectively."
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
});

// Start WebMCP Server over STDIO
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

run().catch((error) => {
  console.error("Fatal WebMCP server error:", error);
  process.exit(1);
});
