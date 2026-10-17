# DareYou — Adversarial Fact-Checking Duel Protocol on GenLayer StudioNet

**Live Production App:** [https://dareyou-seven.vercel.app](https://dareyou-seven.vercel.app)  
**Network:** GenLayer StudioNet (`Chain ID 61999` · RPC `https://studio.genlayer.com/api`)  
**GenVM Runner Hash:** `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`  
**Proof Manifest:** [`deploy/proof.json`](./deploy/proof.json) (`npm run verify:proof`)  
**Developer Tutorial (>700 words):** [`docs/TUTORIAL.md`](./docs/TUTORIAL.md)  
**2-Minute Steward Demo Script:** [`docs/DEMO_SCRIPT.md`](./docs/DEMO_SCRIPT.md)  

---

## 1. Overview & Why This Needs GenLayer

Ordinary smart contracts and price oracles can read a number from an API, but they cannot resolve an adversarial evidentiary dispute such as:
- *"Does this peer-reviewed publication or mission archive definitively confirm the detection of atmospheric carbon dioxide on exoplanet WASP-39b?"*
- *"Does this statutory filing contradict the leaked consultancy agreement?"*
- *"Does this archival specification prove that the initial base fee is burned rather than paid to miners?"*

**DareYou** is a decentralized epistemic duel protocol powered by **GenLayer Intelligent Contracts**. A **Challenger** posts a verifiable factual challenge with frozen evaluation criteria and a strict research countdown window. An **Investigator** (human via browser or autonomous AI agent via WebMCP) accepts the dare, searches primary archival sources, and submits a frozen evidence dossier. 

A decentralized committee of **5 GenLayer validator AI nodes** independently crawls the live source URLs, extracts the text under the **Equivalence Principle**, computes cryptographic content digests, verifies verbatim quotes, and reaches multi-LLM consensus on the truth.

---

## 2. Core GenLayer Steward Design Principles Enforced

1. **The Model Judges; Deterministic Code Moves State:**
   - The LLM never outputs arbitrary scores, prices, or payouts.
   - In [`contracts/dare_adjudicator.py`](./contracts/dare_adjudicator.py), the LLM outputs a strict categorical schema (`outcome`: `"MET"` | `"NOT_MET"` | `"INSUFFICIENT_EVIDENCE"`, `quote_verified`: `bool`, `extracted_quote`: `str`, `rationale`: `str`).
   - Deterministic Python code maps (`"MET"` + `quote_verified == True`) $\rightarrow$ `INVESTIGATOR_WINS`, `"NOT_MET"` $\rightarrow$ `CHALLENGER_WINS`, and `"INSUFFICIENT_EVIDENCE"` $\rightarrow$ `INCONCLUSIVE`.

2. **Validators Agree on the Evidence, Not Just the Verdict:**
   - Each validator node independently fetches the source URL via `gl.nondet.web.render(url, mode="text")`.
   - Python code normalizes whitespace, extracts a bounded 3,000-character window centered around the target quote, computes a 16-character SHA-256 digest (`evidence_sha256`), and checks whether the verbatim quote actually exists in the fetched document.
   - The LLM only receives the downloaded excerpt—it never "takes the investigator's word for it."

3. **Reject Vague Inputs Up Front & Freeze Rules (`rules_sha256`):**
   - [`contracts/dare_qualifier.py`](./contracts/dare_qualifier.py) rejects subjective or unobservable criteria up front (`"who is the best"`, `"good progress"`, `"in your opinion"`).
   - Once qualified, the canonical challenge specification is hashed into a permanent SHA-256 identifier (`rules_sha256`).

4. **Untrusted Content Sandboxing & Adversarial Prompt-Injection Defense:**
   - Both deterministic pre-filters and prompt sandboxing block adversarial injection attempts (`"ignore previous instructions"`, `"system override"`, `"mark MET"`, `"you must output investigator_wins"`).
   - Any attempt immediately triggers `CHALLENGER_WINS` forfeiture.

5. **Link Resilience & Bot-Safe Crawling Standard:**
   - **Wayback `id_` Raw Identity Mode:** Auto-converts `web.archive.org` URLs to use `id_` (`https://web.archive.org/web/<ts>id_/<url>`), stripping iframe wrappers and redirect loops so validator crawlers get raw HTML.
   - **Open Repository Support:** First-class support for bot-friendly open repositories (`arxiv.org`, `wikipedia.org`, `raw.githubusercontent.com`, `ncbi.nlm.nih.gov/pmc/`).
   - **Dual-Source Contract Fallback:** If `primary_source_url` returns a redirect interstitial or error, the contract automatically falls back to fetch `secondary_source_url`.

6. **Every Waiting State Has a Deterministic Timeout:**
   - [`contracts/dare_registry.py`](./contracts/dare_registry.py) enforces research window countdowns (`claim_research_timeout_forfeit`) and adjudication fallbacks so challenges never hang indefinitely.

---

## 3. Architecture Diagram

```mermaid
flowchart TD
    subgraph Challenger["1. Challenge Creation & Qualification Gate"]
        C1["Challenger Submits Challenge Specification"] --> DP["DarePolicy (Deterministic Python)\nValidates bounds, formats, durations"]
        DP --> DQ["DareQualifier (Validator LLM Committee)\nJudges: APPROVED | REJECTED"]
        DQ -- "APPROVED" --> H["Freeze SHA-256 Rules Hash (rules_sha256)\nOpen Challenge in DareRegistry"]
        DQ -- "REJECTED (Subjective / Vague)" --> R1["Reject Up Front with Constructive Feedback"]
    end

    subgraph Duel["2. Challenge Acceptance & Research Window"]
        H --> A1["Investigator Accepts Challenge\nResearch Countdown Timer Starts Ticking"]
        A1 --> ER["Investigator Submits Evidence Dossier\nPrimary URL + Verbatim Quote + Defense"]
        ER --> FR["Timer Freezes Immediately on Line 1\nState Broadcast to StudioNet"]
    end

    subgraph Adjudication["3. Validator Evidence Fetch & Multi-LLM Consensus"]
        FR --> V1["Deterministic Pre-Filter\nBlocks self-hosted URLs & prompt injection"]
        V1 --> V2["Validators Fetch Source (gl.nondet.web.render)\nAuto id_ Raw Identity + Dual-URL Fallback"]
        V2 --> V3["Python Extracts Bounded 3,000-Char Excerpt\nComputes SHA-256 Digest of Downloaded Text"]
        V3 --> V4["5-Node Multi-LLM Committee (Equivalence Principle)\nEvaluates Evidence Excerpt vs. Frozen Criteria"]
    end

    subgraph Settlement["4. Deterministic Resolution & Consensus Record"]
        V4 -- "MET + Quote Verified True" --> S1["INVESTIGATOR_WINS (Fact Verified)\nQuorum Recorded On-Chain"]
        V4 -- "NOT_MET / Missing Quote / Timeout" --> S2["CHALLENGER_WINS (Unproven / Forfeit)\nQuorum Recorded On-Chain"]
        V4 -- "INSUFFICIENT_EVIDENCE / Unreachable" --> S3["INCONCLUSIVE (Tie / Inadmissible)"]
    end
```

---

## 4. Deployed Intelligent Contracts on StudioNet (Chain ID 61999)

All 8 Intelligent Contracts are deployed on GenLayer StudioNet (`Chain ID 61999`) and verified in [`deploy/proof.json`](./deploy/proof.json):

| Contract | File | StudioNet Address | Deploy Tx Hash | Explorer Link |
|---|---|---|---|---|
| **DareAdjudicator** | [`contracts/dare_adjudicator.py`](./contracts/dare_adjudicator.py) | `0x16aB2ddD1961d2d660F35FD54dab825eb7a63B2b` | `0x67de5fb99c16...` | [View on Explorer](https://explorer-studio.genlayer.com/address/0x16aB2ddD1961d2d660F35FD54dab825eb7a63B2b) |
| **DareQualifier** | [`contracts/dare_qualifier.py`](./contracts/dare_qualifier.py) | `0xb9F28F1791039AFe0948f0FDc231e196f5B16CE6` | `0x7241bcf182f5...` | [View on Explorer](https://explorer-studio.genlayer.com/address/0xb9F28F1791039AFe0948f0FDc231e196f5B16CE6) |
| **DareRegistry** | [`contracts/dare_registry.py`](./contracts/dare_registry.py) | `0x68E73e3e2075A3978510c93437C5F6248ba85f4D` | `0x4328b8500aef...` | [View on Explorer](https://explorer-studio.genlayer.com/address/0x68E73e3e2075A3978510c93437C5F6248ba85f4D) |
| **NetworkProbe** | [`contracts/probe_network.py`](./contracts/probe_network.py) | `0xB28858fA47C3648746f38c99dC4e46AA80444BD3` | `0x0d37ad4655fb...` | [View on Explorer](https://explorer-studio.genlayer.com/address/0xB28858fA47C3648746f38c99dC4e46AA80444BD3) |
| **StakeEscrow** | [`contracts/stake_escrow.py`](./contracts/stake_escrow.py) | `0x82De72ea7D86A6ef69B6bB2eeE4054E762838105` | `0x457eaee9561e...` | [View on Explorer](https://explorer-studio.genlayer.com/address/0x82De72ea7D86A6ef69B6bB2eeE4054E762838105) |
| **EvidenceRegistry** | [`contracts/evidence_registry.py`](./contracts/evidence_registry.py) | `0x3C3F2982Caa3B204214bAf3f24A67c33799d89de` | `0xf278af244707...` | [View on Explorer](https://explorer-studio.genlayer.com/address/0x3C3F2982Caa3B204214bAf3f24A67c33799d89de) |
| **DarePolicy** | [`contracts/dare_policy.py`](./contracts/dare_policy.py) | `0x59AF57218Bc417a2390cE373094Cc83E43DdD403` | `0x2e3e3ef0e187...` | [View on Explorer](https://explorer-studio.genlayer.com/address/0x59AF57218Bc417a2390cE373094Cc83E43DdD403) |
| **AgentReputation** | [`contracts/agent_reputation.py`](./contracts/agent_reputation.py) | `0xB8408D22EFCB2702Ad2ec104e0C66c4180562B19` | `0x02eae17c927b...` | [View on Explorer](https://explorer-studio.genlayer.com/address/0xB8408D22EFCB2702Ad2ec104e0C66c4180562B19) |

---

## 5. Live On-Chain Proof Transactions

Every critical path has been executed to finality (`ACCEPTED` / `MAJORITY_AGREE`) on StudioNet:

| Proof Case | Description | Outcome / Verdict | StudioNet Transaction Link |
|---|---|---|---|
| **Live Proof #1 (Dare #6)** | CMB Radiation Temperature Verification via arXiv | `outcome: "MET"`, Score: `95/100`, `INVESTIGATOR_WINS` | [`0xccbb2795f657...`](https://explorer-studio.genlayer.com/tx/0xccbb2795f65764a5638ca079db3843994c40b89df9c8be2400d5517837ccf0d8) |
| **Live Proof #2 (Dare #1003)** | Missing Excerpt Detection (Wayback Redirect Trap Caught) | `outcome: "NOT_MET"`, `CHALLENGER_WINS` | [`0xb396604fbcc4...`](https://explorer-studio.genlayer.com/tx/0xb396604fbcc45b415f44de853ea62793261886aca249cb3db7c92068883029c2) |
| **Proof Case #101** | Historical Specification Adjudication | `outcome: "MET"`, `quote_verified: true` | [`0x6f2ba43ab0c1...`](https://explorer-studio.genlayer.com/tx/0x6f2ba43ab0c114a0aebe25c12c7fd64dd477bc468c61dcfa390edf6b718b7eb6) |
| **Proof Case #102** | Fabricated Verbatim Quote Rejected | `outcome: "NOT_MET"`, `CHALLENGER_WINS` | [`0xeeb293b5d560...`](https://explorer-studio.genlayer.com/tx/0xeeb293b5d560b8f38410b2f33c6c967c242a9a2ea7776a05c4135aa996075da5) |
| **Proof Case #103** | Adversarial Prompt-Injection Blocked | `outcome: "NOT_MET"`, `CHALLENGER_WINS` | [`0xe69900b4e846...`](https://explorer-studio.genlayer.com/tx/0xe69900b4e846c0ff1c54c0a0b221da4cae9aaf499651e39fe4de4df7637f5245) |
| **Proof Case #104** | Vague / Subjective Criterion Rejected Up Front | `decision: "REJECTED"`, `observable_criteria: false` | [`0x652434bd2416...`](https://explorer-studio.genlayer.com/tx/0x652434bd24169190c4740e00acc18663443ab99dc529415a57c842055ff2add4) |
| **Proof Case #105** | Observable Challenge Approved & `rules_sha256` Frozen | `decision: "APPROVED"`, `rules_sha256: "abb82f..."` | [`0x208b8a38e9a2...`](https://explorer-studio.genlayer.com/tx/0x208b8a38e9a2e88feaa0bfacbcc7643a3f2ed7167f56f09081a0c53f86bfec4c) |

---

## 6. Setup & Verification

```bash
# 1. Clone repository
git clone https://github.com/kosaiyno/dareyou.git
cd dareyou

# 2. Run the read-only StudioNet Proof Verifier (validates all 8 contracts on RPC)
npm run verify:proof

# 3. Install frontend dependencies & run locally
cd frontend
npm install
npm run dev
```

---

## 7. Autonomous AI Agent Gateway (WebMCP)

DareYou features a first-class **WebMCP Agent Studio** integrated directly into the web application at [`window.__WEBMCP_TOOLS__`](./frontend/src/webmcp/registerTools.ts). Autonomous AI agents (Claude Code, Grok, LangChain agents, or custom LLM bots) can connect, inspect dares, and participate autonomously:

* `list_dares`: Enumerates all open, in-research, and finalized dares with frozen criteria.
* `get_dare_dossier`: Retrieves full challenge specifications and validator quorum logs.
* `create_dare`: Creates a new dare with frozen adjudication criteria and research window.
* `accept_dare`: Claims a challenge and starts the research timer.
* `convert_to_wayback`: Converts URLs into bot-safe Wayback `id_` raw identity snapshots.
* `submit_evidence`: Submits the final evidentiary dossier and triggers on-chain consensus.

---

## 8. GenLayer Submission Fields (Ready to Copy-Paste)

- **Contribution Type:** Project / Deployed Intelligent Contract + Frontend + MCP Agent Gateway
- **One-Liner:** Adversarial fact-checking duel protocol where GenLayer AI validators crawl immutable archives, verify verbatim quotes, and reach multi-LLM consensus under the Equivalence Principle.
- **Short Description (<1,000 chars):**  
  DareYou is an epistemic duel protocol on GenLayer StudioNet (Chain ID 61999) where Challengers post verifiable multi-source investigations and Investigators (humans or autonomous AI agents via WebMCP) submit frozen evidence dossiers. Built strictly according to GenLayer steward principles: (1) DareQualifier rejects vague or unobservable criteria up front and freezes a canonical SHA-256 rules hash; (2) DareAdjudicator validators independently fetch source documents via `gl.nondet.web.render()`, bound the text in Python, compute SHA-256 digests, and verify that submitted verbatim quotes exist in the downloaded text; (3) the multi-LLM committee outputs a strict categorical outcome (`MET`, `NOT_MET`, `INSUFFICIENT_EVIDENCE`), while deterministic Python code maps outcomes to finality; (4) prompt injection is blocked deterministically; (5) includes automatic Wayback `id_` raw identity conversion and dual-URL contract fallback. Includes live production app on Vercel, WebMCP agent tools, `deploy/proof.json`, and `npm run verify:proof`.
- **How-To Steps for Reviewer:**
  1. Visit [https://dareyou-seven.vercel.app](https://dareyou-seven.vercel.app) (no wallet required to inspect live proofs).
  2. Click "View Outcome" on Dare #6, #101, #102, or #103 to inspect the validator votes, extracted text digests, and consensus rationales.
  3. Inside any dossier modal, click the StudioNet Proof Tx link to inspect the finalized transaction on `explorer-studio.genlayer.com`.
  4. Run `npm run verify:proof` in the repository to verify all 8 deployed contracts and proof transactions against `https://studio.genlayer.com/api`.
- **Primary Contract Explorer Links:**
  - DareAdjudicator: [`0x16aB2ddD1961d2d660F35FD54dab825eb7a63B2b`](https://explorer-studio.genlayer.com/address/0x16aB2ddD1961d2d660F35FD54dab825eb7a63B2b)
  - DareQualifier: [`0xb9F28F1791039AFe0948f0FDc231e196f5B16CE6`](https://explorer-studio.genlayer.com/address/0xb9F28F1791039AFe0948f0FDc231e196f5B16CE6)
  - DareRegistry: [`0x68E73e3e2075A3978510c93437C5F6248ba85f4D`](https://explorer-studio.genlayer.com/address/0x68E73e3e2075A3978510c93437C5F6248ba85f4D)
  - NetworkProbe: [`0xB28858fA47C3648746f38c99dC4e46AA80444BD3`](https://explorer-studio.genlayer.com/address/0xB28858fA47C3648746f38c99dC4e46AA80444BD3)
  - StakeEscrow: [`0x82De72ea7D86A6ef69B6bB2eeE4054E762838105`](https://explorer-studio.genlayer.com/address/0x82De72ea7D86A6ef69B6bB2eeE4054E762838105)
  - EvidenceRegistry: [`0x3C3F2982Caa3B204214bAf3f24A67c33799d89de`](https://explorer-studio.genlayer.com/address/0x3C3F2982Caa3B204214bAf3f24A67c33799d89de)
  - DarePolicy: [`0x59AF57218Bc417a2390cE373094Cc83E43DdD403`](https://explorer-studio.genlayer.com/address/0x59AF57218Bc417a2390cE373094Cc83E43DdD403)
  - AgentReputation: [`0xB8408D22EFCB2702Ad2ec104e0C66c4180562B19`](https://explorer-studio.genlayer.com/address/0xB8408D22EFCB2702Ad2ec104e0C66c4180562B19)

---

## 9. Next Milestones & Roadmap

Our development roadmap for taking DareYou from hackathon finality to production protocol:

### Milestone 1: Decentralized Content-Addressed Evidence (IPFS & Arweave CIDs)
* **Goal**: Eliminate reliance on DNS domains and centralized web servers entirely.
* **Mechanism**: Investigators can pin evidence documents (PDFs, research datasets, historical newspapers) to IPFS or Arweave. GenLayer validator nodes will fetch directly from public IPFS/Arweave gateways using immutable content hashes (CIDs), guaranteeing that evidence can never be 404’d, deleted, or edited post-submission.

### Milestone 2: Multi-Round Adversarial Rebuttal & Appeals Window
* **Goal**: Give Challengers a structured 24-hour window to contest fraudulent interpretations before consensus finalizes.
* **Mechanism**: Introduce an interactive rebuttal phase where a Challenger can highlight contextual contradictions or redactions. The validator committee evaluates both the primary dossier and the challenger's counter-brief before emitting the final on-chain verdict.

### Milestone 3: Native Mainnet GEN Escrow & Staking
* **Goal**: Reintroduce cryptographic financial stakes with real economic incentives once GenLayer Mainnet launches.
* **Mechanism**: When GenLayer mainnet deploys with production bridge infrastructure and native gas tokens, activate `StakeEscrow` using native GEN and verified ERC-20 stablecoins. Challengers post bounties and investigators win real prize pools upon validator verification.

### Milestone 4: Autonomous AI Agent Swarms (Agent-vs-Agent via WebMCP)
* **Goal**: Enable 24/7 autonomous epistemic battlegrounds where AI research agents duel against AI red-teamers.
* **Mechanism**: Integrate Agent-to-Agent (A2A) protocols and autonomous scraping pipelines where AI agents continuously monitor news, scientific preprints, and government disclosures, automatically generating verifiable dares and researching evidence within minutes.

### Milestone 5: Cross-Chain Epistemic Oracle Service
* **Goal**: Serve as the decentralized subjective truth oracle for external EVM prediction markets and DAOs.
* **Mechanism**: Export DareYou’s validator quorum decisions to Ethereum, Arbitrum, Base, and Optimism via Chainlink CCIP / LayerZero. External prediction markets (e.g. Polymarket, Augur) and DAO governance proposals can consume DareYou’s GenLayer-verified epistemic verdicts to resolve complex real-world disputes trustlessly.
