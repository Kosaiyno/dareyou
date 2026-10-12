/**
 * Autonomous Agent Duel Simulator for DareYou WebMCP
 * 
 * Demonstrates two independent autonomous AI agents:
 * Agent Alpha (Challenger) creates a dare and locks stake.
 * Agent Beta (Investigator) discovers the dare, accepts it, researches the football claim,
 * submits verifiable evidence with quotes and sources, and triggers GenLayer consensus settlement.
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mcpServerPath = path.resolve(__dirname, "../mcp-server/dist/index.js");

function sendMcpRequest(proc, requestObj) {
  return new Promise((resolve, reject) => {
    let rawOutput = "";
    const onData = (data) => {
      rawOutput += data.toString();
      const lines = rawOutput.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === requestObj.id) {
            proc.stdout.off("data", onData);
            resolve(parsed);
            return;
          }
        } catch (e) {
          // Incomplete chunk, continue reading
        }
      }
    };
    proc.stdout.on("data", onData);
    proc.stdin.write(JSON.stringify(requestObj) + "\n");
  });
}

async function runSimulation() {
  console.log("=== DareYou Autonomous AI Agent Duel Simulation ===\n");
  console.log("Starting WebMCP Server process...");

  const mcpProcess = spawn("node", [mcpServerPath], {
    stdio: ["pipe", "pipe", "inherit"]
  });

  let reqId = 1;

  // 1. Initialize MCP Handshake
  console.log("1. Initializing MCP Session...");
  await sendMcpRequest(mcpProcess, {
    jsonrpc: "2.0",
    id: reqId++,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "AgentSimulator", version: "1.0.0" }
    }
  });
  console.log("   [OK] WebMCP Session Established.\n");

  // 2. Agent Alpha (Challenger) creates a new Dare
  console.log("2. Agent Alpha: Creating new football investigation dare...");
  const createRes = await sendMcpRequest(mcpProcess, {
    jsonrpc: "2.0",
    id: reqId++,
    method: "tools/call",
    params: {
      name: "create_dare",
      arguments: {
        title: "Did Rodri receive a red card against Nottingham Forest in Sept 2023?",
        category: "DISCIPLINARY",
        claim_statement: "Rodri was sent off with a straight red card for violent conduct against Gibbs-White.",
        required_sources_desc: "Official Premier League match report & BBC Sport live commentary.",
        evaluation_criteria: "Prove whether the red card was straight red or second yellow, and the exact minute.",
        stake_amount_cents: 3000,
        duration_seconds: 3600,
        challenger_address: "0xAgentAlpha...99"
      }
    }
  });
  const createdData = JSON.parse(createRes.result.content[0].text);
  console.log(`   [OK] Dare #${createdData.dare_id} created with $30.00 stake locked!\n`);
  const activeDareId = createdData.dare_id;

  // 3. Agent Beta (Investigator) discovers open dares
  console.log("3. Agent Beta: Autonomous discovery of open dares...");
  const discoverRes = await sendMcpRequest(mcpProcess, {
    jsonrpc: "2.0",
    id: reqId++,
    method: "tools/call",
    params: {
      name: "discover_dares",
      arguments: { status: "OPEN" }
    }
  });
  const discoverData = JSON.parse(discoverRes.result.content[0].text);
  console.log(`   [OK] Discovered ${discoverData.total_found} open dares available for competition.\n`);

  // 4. Agent Beta inspects dare dossier
  console.log(`4. Agent Beta: Inspecting specifications for Dare #${activeDareId}...`);
  const dossierRes = await sendMcpRequest(mcpProcess, {
    jsonrpc: "2.0",
    id: reqId++,
    method: "tools/call",
    params: {
      name: "get_dare_dossier",
      arguments: { dare_id: activeDareId }
    }
  });
  const dossierData = JSON.parse(dossierRes.result.content[0].text);
  console.log(`   [OK] Analyzed criteria: "${dossierData.dare.evaluation_criteria}"\n`);

  // 5. Agent Beta accepts the challenge & locks matching stake
  console.log(`5. Agent Beta: Accepting Dare #${activeDareId} and staking $30.00...`);
  const acceptRes = await sendMcpRequest(mcpProcess, {
    jsonrpc: "2.0",
    id: reqId++,
    method: "tools/call",
    params: {
      name: "accept_dare",
      arguments: {
        dare_id: activeDareId,
        investigator_address: "0xAgentBeta...77"
      }
    }
  });
  const acceptData = JSON.parse(acceptRes.result.content[0].text);
  console.log(`   [OK] Duel locked! Total Escrow Pool: $${(acceptData.total_winner_payout_cents / 100).toFixed(2)}\n`);

  // 6. Agent Beta researches and submits evidence
  console.log(`6. Agent Beta: Researching football archives & submitting evidence dossier...`);
  const submitRes = await sendMcpRequest(mcpProcess, {
    jsonrpc: "2.0",
    id: reqId++,
    method: "tools/call",
    params: {
      name: "submit_evidence",
      arguments: {
        dare_id: activeDareId,
        investigator_address: "0xAgentBeta...77",
        conclusion: "CLAIM_VERIFIED_TRUE",
        primary_source_url: "https://premierleague.com/match/93375",
        secondary_source_url: "https://bbc.com/sport/football/66831448",
        verbatim_quotes: "Official Premier League match record: '46' Red Card: Rodri (Manchester City) shown straight red card for violent conduct.'",
        reasoning_defense: "Official match referee report confirms direct dismissal in 46th minute, fully satisfying challenger criteria."
      }
    }
  });
  console.log(`   [OK] Evidence dossier submitted & permanently frozen on-chain!\n`);

  // 7. GenLayer Adjudication & Settlement
  console.log("7. GenLayer Validators: Evaluating evidence under Equivalence Principle...");
  const verdictRes = await sendMcpRequest(mcpProcess, {
    jsonrpc: "2.0",
    id: reqId++,
    method: "tools/call",
    params: {
      name: "get_verdict_and_adjudication",
      arguments: { dare_id: activeDareId }
    }
  });
  const verdictData = JSON.parse(verdictRes.result.content[0].text);
  console.log(`   [VERDICT] ${verdictData.verdict}!`);
  console.log(`   [WINNER] ${verdictData.winner}`);
  console.log(`   [SCORE] ${verdictData.score}/100`);
  console.log(`   [PAYOUT] $${(verdictData.payout_amount_cents / 100).toFixed(2)} transferred to Winner!`);
  console.log(`   [RATIONALE] ${verdictData.rationale}\n`);

  console.log("=== Full Autonomous Agent Duel Successfully Completed! ===");
  mcpProcess.kill();
  process.exit(0);
}

runSimulation().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
