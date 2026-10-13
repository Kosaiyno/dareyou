import { create } from 'zustand';

export type DareCategory = 
  | "CONFLICTING_SOURCE_INVESTIGATION" 
  | "INVESTIGATIVE_FACT_FINDING" 
  | "EVIDENCE_SYNTHESIS";

export type DareStatus = "OPEN" | "ACCEPTED" | "SUBMITTED" | "FINALIZED" | "CANCELLED" | "EXPIRED";

export interface EvidenceData {
  conclusion: string;
  primaryUrl: string;
  secondaryUrl: string;
  quotes: string;
  reasoning: string;
}

export interface ValidatorVote {
  validatorIndex: number;
  validatorAddress: string;
  model: string;
  verdict: "INVESTIGATOR_WINS" | "CHALLENGER_WINS";
  score: number;
  quotesVerified: boolean;
  sourcesIndependent: boolean;
  reasoning: string;
  timestamp: number;
}

export interface AdjudicationSession {
  dareId: number;
  status: "PENDING_TRIGGER" | "VOTING_IN_PROGRESS" | "CONSENSUS_REACHED" | "FINALIZED";
  progressPercent: number;
  currentStage: string;
  startedAt: number;
  etaSeconds: number;
  votes: ValidatorVote[];
  requiredVotes: number;
  consensusThreshold: string;
  finalVerdict?: "INVESTIGATOR_WINS" | "CHALLENGER_WINS";
  averageScore?: number;
  consensusRationale?: string;
}

export interface Dare {
  id: number;
  isBenchmark: boolean;
  title: string;
  category: DareCategory;
  claim: string;
  requiredSources: string;
  criteria: string;
  stakeCents: number;
  creationBondCents: number;
  durationSeconds: number;
  acceptanceDeadlineTs: number;
  researchDeadlineTs: number;
  status: DareStatus;
  challenger: string;
  investigator?: string;
  evidence?: EvidenceData;
  adjudicationSession?: AdjudicationSession;
  verdict?: "INVESTIGATOR_WINS" | "CHALLENGER_WINS" | "INCONCLUSIVE" | "INVALID_CHALLENGE";
  verdictScore?: number;
  verdictRationale?: string;
}

export interface AppState {
  // Reactive Core State
  dares: Dare[];
  selectedDareId: number | null;
  activeTab: 'arena' | 'playground' | 'create' | 'webmcp' | 'leaderboard' | 'audit';
  categoryFilter: 'ALL' | DareCategory;
  lifecycleFilter: 'ALL' | 'OPEN' | 'ACCEPTED' | 'SUBMITTED' | 'FINALIZED' | 'EXPIRED';
  benchmarkFilter: 'ALL' | 'BENCHMARK' | 'USER_DARES';
  walletConnected: boolean;
  walletAddress: string;
  activeRole: 'INVESTIGATOR' | 'CHALLENGER';
  lastActionMessage: string | null;

  // Undo / Redo History
  history: Dare[][];
  historyIndex: number;

  // Reactive State Actions (usable by both UI and WebMCP Tools)
  setSelectedDareId: (id: number | null) => void;
  setActiveTab: (tab: 'arena' | 'playground' | 'create' | 'webmcp' | 'leaderboard' | 'audit') => void;
  setCategoryFilter: (filter: 'ALL' | DareCategory) => void;
  setLifecycleFilter: (filter: 'ALL' | 'OPEN' | 'ACCEPTED' | 'SUBMITTED' | 'FINALIZED' | 'EXPIRED') => void;
  setBenchmarkFilter: (filter: 'ALL' | 'BENCHMARK' | 'USER_DARES') => void;
  setWallet: (connected: boolean, address: string) => void;
  setActiveRole: (role: 'INVESTIGATOR' | 'CHALLENGER') => void;
  setLastActionMessage: (msg: string | null) => void;

  // Core Mutation Workflows
  addDare: (item: {
    title: string;
    category: DareCategory;
    claim: string;
    requiredSources: string;
    criteria: string;
    stakeCents: number;
    durationSeconds: number;
    challenger?: string;
  }) => number;

  updateDare: (id: number, updates: Partial<Dare>) => boolean;
  deleteDare: (id: number) => boolean;
  acceptDare: (id: number, investigatorAddress: string) => boolean;
  submitEvidence: (id: number, evidence: EvidenceData) => boolean;
  startAdjudication: (id: number) => boolean;
  fastTrackAdjudication: (id: number) => boolean;
  adjudicateDare: (id: number, verdict: "INVESTIGATOR_WINS" | "CHALLENGER_WINS", score?: number, rationale?: string) => boolean;
  claimTimeoutForfeit: (id: number, challengerAddress: string) => boolean;
  processAllExpiredDares: () => number;

  // History & Persistence
  undo: () => boolean;
  redo: () => boolean;
  clearState: () => void;
  saveProject: () => string;
  loadProject: (jsonString?: string) => boolean;

  // Validation & Audit
  validateDare: (dare: { title: string; category?: string; stakeCents?: number; durationSeconds?: number }) => {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  validateState: () => {
    valid: boolean;
    summary: { totalDares: number; open: number; accepted: number; submitted: number; finalized: number; expired: number };
    issues: string[];
    recommendations: string[];
  };
}

export const INITIAL_DARES: Dare[] = [
  {
    id: 1,
    isBenchmark: true,
    title: "Dare you to uncover the true transfer fee of a footballer whose reported transfer costs differ across multiple reputable sources, separating the guaranteed fee from add-ons and identifying which figures remain unconfirmed within 30 minutes.",
    category: "CONFLICTING_SOURCE_INVESTIGATION",
    claim: "The guaranteed fixed base transfer fee differs by more than £10m across primary club financial disclosures versus media reports.",
    requiredSources: "Official club annual audited financial reports and official federation registration filings.",
    criteria: "Delineate guaranteed base installment from performance-contingent add-ons and identify unconfirmed figures.",
    stakeCents: 2500,
    creationBondCents: 500,
    durationSeconds: 1800,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "OPEN",
    challenger: "0xChallengerAlpha...81"
  },
  {
    id: 2,
    isBenchmark: true,
    title: "Dare you to trace a widely repeated football story to its earliest verifiable source, compare the original account with later retellings, and expose which details were changed, exaggerated, or never supported by evidence within 25 minutes.",
    category: "INVESTIGATIVE_FACT_FINDING",
    claim: "The widely repeated dressing room altercation narrative was embellished over decades and lacks support in contemporary reports.",
    requiredSources: "Contemporary matchday newspaper archives (within 48 hours of event) versus modern retrospective memoirs.",
    criteria: "Identify earliest verifiable primary dispatch and document specific embellishments introduced in secondary retellings.",
    stakeCents: 2000,
    creationBondCents: 500,
    durationSeconds: 1500,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: Date.now() + 1500 * 1000, // Live 25-minute countdown running now!
    status: "ACCEPTED",
    challenger: "0xTacticalOracle...94",
    investigator: "0xInvestigatorBeta...42"
  },
  {
    id: 3,
    isBenchmark: true,
    title: "Dare you to investigate why two established football statistics providers report different numbers for the same metric in a completed match, identify the methodological or factual source of the discrepancy, and support your conclusion with evidence within 20 minutes.",
    category: "CONFLICTING_SOURCE_INVESTIGATION",
    claim: "Provider A logged 4 big chances created while Provider B logged 2 due to differing definitions of open-play vs set-piece pass sequences.",
    requiredSources: "Official event definition documentation from Opta/StatsBomb and timestamped event logs for the match.",
    criteria: "Demonstrate exact event timestamp causing the divergence and map to published provider methodology rules.",
    stakeCents: 3000,
    creationBondCents: 500,
    durationSeconds: 1200,
    acceptanceDeadlineTs: Date.now() - 3600000,
    researchDeadlineTs: Date.now() - 100000,
    status: "FINALIZED",
    challenger: "0xArchiveMaster...55",
    investigator: "0xDataForensic...19",
    evidence: {
      conclusion: "CLAIM_VERIFIED_TRUE",
      primaryUrl: "https://web.archive.org/web/20231015001200id_/https://theanalyst.com/eu/2023/10/football-metrics-definitions-opta",
      secondaryUrl: "https://web.archive.org/web/20231120001500id_/https://statsbomb.com/what-we-do/specifications-and-metrics",
      quotes: "Opta Event Glossary defines 'Big Chance' as a situation where a player is reasonably expected to score. StatsBomb evaluates post-shot xG excluding deflection variations under separate event IDs.",
      reasoning: "The 2-chance disparity arose at minute 67:14 when an open-play cross glanced off a defender. Opta classified it as open-play creation, whereas StatsBomb registered it under deflected transition."
    },
    verdict: "INVESTIGATOR_WINS",
    verdictScore: 96,
    verdictRationale: "Investigator provided authoritative timestamped archive definitions from both data providers, successfully isolating the exact event divergence and reconciling the methodological definitions."
  },
  {
    id: 4,
    isBenchmark: true,
    title: "Dare you to reconstruct the exact timeline and decision chain behind a controversial VAR intervention, documenting each official communication and rule application using primary broadcast and federation sources within 35 minutes.",
    category: "EVIDENCE_SYNTHESIS",
    claim: "The on-field referee was not alerted to the offside phase until after the restart protocol had been initiated.",
    requiredSources: "Official federation audio releases, published match delegate reports, and unedited broadcast timestamp logs.",
    criteria: "Document minute-by-minute communication chain and substantiate whether protocol deviation occurred under IFAB Law 5.",
    stakeCents: 2500,
    creationBondCents: 500,
    durationSeconds: 2100,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "OPEN",
    challenger: "0xRefereeAudit...77"
  },
  {
    id: 5,
    isBenchmark: true,
    title: "Dare you to audit a club's reported financial compliance figure against published regulatory filings, identifying the accounting distinctions between official figures, league calculations, and credible reporting without presenting speculation as fact within 30 minutes.",
    category: "INVESTIGATIVE_FACT_FINDING",
    claim: "The allowable loss deduction for infrastructure investment was calculated differently by the independent commission versus the club's submission.",
    requiredSources: "Published independent commission written reasons and club statutory financial statements registered at Companies House.",
    criteria: "Reconcile reported EBITDA with league PSR allowable deductions under profit and sustainability rules.",
    stakeCents: 3500,
    creationBondCents: 500,
    durationSeconds: 1800,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "OPEN",
    challenger: "0xFiscalForensic...12"
  },
  {
    id: 6,
    isBenchmark: true,
    title: "Dare you to reconstruct a professional footballer's journey from academy football to the first team, uncovering overlooked loans, development milestones, key appearances, and documented turning points using reliable sources within 30 minutes.",
    category: "INVESTIGATIVE_FACT_FINDING",
    claim: "Player's senior debut occurred during an emergency unrecorded youth loan prior to their official league debut.",
    requiredSources: "Regional league match registers, youth tournament logs, and federation registration filings.",
    criteria: "Compile chronological trajectory of all competitive appearances with date, opponent, and official tournament records.",
    stakeCents: 2000,
    creationBondCents: 500,
    durationSeconds: 1800,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "OPEN",
    challenger: "0xAcademyScout...33"
  },
  {
    id: 7,
    isBenchmark: true,
    title: "Dare you to investigate a completed football transfer saga with conflicting reports, reconstruct the sequence of reported negotiations, establish what the clubs and player actually confirmed, and distinguish verified events from anonymous-source claims within 30 minutes.",
    category: "CONFLICTING_SOURCE_INVESTIGATION",
    claim: "The formal bid was submitted 48 hours after media claimed talks collapsed, verified by club stock exchange disclosure.",
    requiredSources: "Club regulatory stock market disclosures, verified club press releases, and timestamped Tier-1 reports.",
    criteria: "Reconstruct sequence of documented bids and distinguish verifiable filings from uncorroborated transfer rumors.",
    stakeCents: 2500,
    creationBondCents: 500,
    durationSeconds: 1800,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "OPEN",
    challenger: "0xTransferAuditor...90"
  },
  {
    id: 8,
    isBenchmark: true,
    title: "Dare you to explain how an unexpected football club reached the latter stages of a European competition by investigating its opponents, tactical adjustments, squad availability, and decisive match events, then rank the explanations by evidence strength within 40 minutes.",
    category: "EVIDENCE_SYNTHESIS",
    claim: "Progress was primarily determined by opponent suspension/injury crises rather than tactical formation shifts.",
    requiredSources: "Official UEFA tournament technical reports, match-by-match squad sheets, and tactical heat maps.",
    criteria: "Correlate opponent availability with match outcomes and rank explanatory hypotheses by empirical documentation.",
    stakeCents: 3000,
    creationBondCents: 500,
    durationSeconds: 2400,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "OPEN",
    challenger: "0xTacticalSynthesizer...61"
  },
  {
    id: 9,
    isBenchmark: true,
    title: "Dare you to determine whether a high-profile signing genuinely changed a football team's performance by comparing relevant before-and-after data, examining tactical roles and alternative explanations, and presenting a defensible conclusion supported by credible evidence within 40 minutes.",
    category: "EVIDENCE_SYNTHESIS",
    claim: "Team points per game improved by 0.6 solely during matches where the player started in a specific hybrid role.",
    requiredSources: "Historical league statistical archives, lineup records, and tactical tracking databases.",
    criteria: "Synthesize team metrics before vs after signing, controlling for strength of schedule and concurrent tactical adjustments.",
    stakeCents: 2500,
    creationBondCents: 500,
    durationSeconds: 2400,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "OPEN",
    challenger: "0xStatsVerifier...48"
  },
  {
    id: 10,
    isBenchmark: true,
    title: "Dare you to investigate the origin of a disputed historical football claim by locating contemporary reports, comparing independent accounts, checking primary records where available, and establishing which parts of the claim are supported, contradicted, or impossible to verify within 30 minutes.",
    category: "INVESTIGATIVE_FACT_FINDING",
    claim: "The legendary 1954 World Cup ball pressure controversy originated from a single misattributed radio commentary.",
    requiredSources: "Archived contemporary radio transcripts, tournament organizing committee minutes, and contemporaneous press reports.",
    criteria: "Isolate earliest mention of claim and contrast against official tournament records to establish veracity.",
    stakeCents: 3000,
    creationBondCents: 500,
    durationSeconds: 1800,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "OPEN",
    challenger: "0xHistoryAdjudicator...02"
  },
  {
    id: 11,
    isBenchmark: false,
    title: "Dare you to trace an unrecorded disciplinary suspension overturned on appeal during the 1998 season within 20 minutes.",
    category: "INVESTIGATIVE_FACT_FINDING",
    claim: "The regional disciplinary panel overturned the red card suspension within 48 hours on procedural appeal grounds.",
    requiredSources: "Contemporary matchday disciplinary logs and federation registers.",
    criteria: "Locate formal regional notice confirming rescission of match suspension.",
    stakeCents: 2000,
    creationBondCents: 500,
    durationSeconds: 1200,
    acceptanceDeadlineTs: Date.now() - 3600000,
    researchDeadlineTs: Date.now() - 600000, // Expired 10 minutes ago — Ready for immediate forfeit claim!
    status: "EXPIRED",
    challenger: "0xChallengerAlpha...81",
    investigator: "0xDelinquentAgent...99"
  }
];

function extractDomain(url?: string): string {
  if (!url) return "primary archive";
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url ? url.slice(0, 30) : "primary archive";
  }
}

function truncateText(text?: string, maxLen = 60): string {
  if (!text) return "";
  const cleaned = text.trim().replace(/\s+/g, ' ');
  return cleaned.length <= maxLen ? cleaned : cleaned.slice(0, maxLen) + '...';
}

export function evaluateEvidenceQuality(dare: Dare, evidence?: EvidenceData): {
  isGood: boolean;
  sourceDomain: string;
  sourceIssue?: string;
  quotesIssue?: string;
  reasoningIssue?: string;
} {
  const url = (evidence?.primaryUrl || '').trim();
  const quotes = (evidence?.quotes || '').trim();
  const reasoning = (evidence?.reasoning || '').trim();
  const sourceDomain = extractDomain(url);

  // 1. Check Source URL
  let sourceIssue: string | undefined;
  if (!url || !url.startsWith('http')) {
    sourceIssue = "Missing or invalid HTTP primary source URL";
  } else {
    const domainLower = sourceDomain.toLowerCase();
    const selfReferential = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      'vercel.app',
      'dareyou',
      'example.com',
      'test.com'
    ];
    // Reject self-referential or sandbox URLs unless dare specifically asks about the app
    const isAppSpecificDare = dare.title.toLowerCase().includes(domainLower) || dare.claim.toLowerCase().includes(domainLower);
    const isSelfRef = (selfReferential.some(d => domainLower.includes(d)) ||
      (typeof window !== 'undefined' && window.location?.hostname && domainLower.includes(window.location.hostname)))
      && !isAppSpecificDare;

    if (isSelfRef) {
      sourceIssue = `Source '${sourceDomain}' is an unverified self-referential or sandbox domain, not an independent primary record`;
    }
  }

  // 2. Check Quotes
  let quotesIssue: string | undefined;
  if (!quotes || quotes.length < 20) {
    quotesIssue = "Submitted quotes are empty or below minimum evidentiary threshold (20 chars)";
  } else {
    const quotesLower = quotes.toLowerCase();
    const dummyWords = ['test', 'testing', 'asdf', 'foo', 'bar', 'i won', 'fake', 'dummy'];
    if (dummyWords.some(w => quotesLower === w || quotesLower.startsWith(w + ' '))) {
      quotesIssue = "Quotes contain placeholder text rather than primary documentation";
    }
  }

  // 3. Check Reasoning
  let reasoningIssue: string | undefined;
  if (!reasoning || reasoning.length < 15) {
    reasoningIssue = "Reasoning defense is empty or superficial";
  }

  const isGood = !sourceIssue && !quotesIssue && !reasoningIssue;
  return { isGood, sourceDomain, sourceIssue, quotesIssue, reasoningIssue };
}

export function generateDynamicValidatorVotes(dare: Dare, evidence?: EvidenceData): {
  votes: ValidatorVote[];
  consensusRationale: string;
  averageScore: number;
  finalVerdict: "INVESTIGATOR_WINS" | "CHALLENGER_WINS";
} {
  const evalQuality = evaluateEvidenceQuality(dare, evidence);
  const domain = evalQuality.sourceDomain;
  const claimSnippet = truncateText(dare.claim, 55);
  const criteriaSnippet = truncateText(dare.criteria, 55);
  const quotesSnippet = truncateText(evidence?.quotes, 65);
  const conclusion = evidence?.conclusion || "CLAIM_VERIFIED_TRUE";
  const reasoningSnippet = truncateText(evidence?.reasoning, 70);

  if (evalQuality.isGood) {
    // High-quality evidence passes multi-validator scrutiny
    const votes: ValidatorVote[] = [
      {
        validatorIndex: 0,
        validatorAddress: "0xValLlama3_3_70B...11",
        model: "Llama-3.3-70B-Instruct (Consensus Leader)",
        verdict: "INVESTIGATOR_WINS",
        score: 96,
        quotesVerified: true,
        sourcesIndependent: true,
        reasoning: `Verified primary citations from ${domain}. Verbatim quotes directly address "${claimSnippet}". Determination '${conclusion}' is fully substantiated by source text.`,
        timestamp: Date.now() - 4000
      },
      {
        validatorIndex: 1,
        validatorAddress: "0xValMixtral8x22B...22",
        model: "Mixtral-8x22B-Instruct",
        verdict: "INVESTIGATOR_WINS",
        score: 94,
        quotesVerified: true,
        sourcesIndependent: true,
        reasoning: `Source provenance check passed for ${domain}. Satisfies required source specifications '${truncateText(dare.requiredSources, 45)}' without reliance on circular hearsay.`,
        timestamp: Date.now() - 3000
      },
      {
        validatorIndex: 2,
        validatorAddress: "0xValGPT4o...33",
        model: "GPT-4o (Equivalence Validator)",
        verdict: "INVESTIGATOR_WINS",
        score: 95,
        quotesVerified: true,
        sourcesIndependent: true,
        reasoning: `Adjudication criteria matched: '${criteriaSnippet}'. Reasoning defense (${reasoningSnippet}) strictly reconciles evidence against frozen protocol terms.`,
        timestamp: Date.now() - 2000
      },
      {
        validatorIndex: 3,
        validatorAddress: "0xValClaude3_5...44",
        model: "Claude-3.5-Sonnet (Adjudicator)",
        verdict: "INVESTIGATOR_WINS",
        score: 97,
        quotesVerified: true,
        sourcesIndependent: true,
        reasoning: `Citation fidelity verified: "${quotesSnippet}". Investigator extracted authentic primary text satisfying factual legitimacy and deliverable standards.`,
        timestamp: Date.now() - 1000
      },
      {
        validatorIndex: 4,
        validatorAddress: "0xValGemini2_5...55",
        model: "Gemini-2.5-Flash (Verifier)",
        verdict: "INVESTIGATOR_WINS",
        score: 95,
        quotesVerified: true,
        sourcesIndependent: true,
        reasoning: `Quorum consensus verified for Dare #${dare.id}. No contradictory facts discovered across independent verification sweep.`,
        timestamp: Date.now()
      }
    ];

    const averageScore = Math.round(votes.reduce((acc, v) => acc + v.score, 0) / votes.length);
    const consensusRationale = `Heterogeneous validator rotation unanimously confirmed: Evidence dossier from ${domain} contains authentic quotes ("${quotesSnippet}"), satisfies frozen criteria ("${criteriaSnippet}"), and resolves "${claimSnippet}" without speculative bias.`;

    return { votes, consensusRationale, averageScore, finalVerdict: "INVESTIGATOR_WINS" };
  } else {
    // Substandard / Self-Referential / Weak evidence is rejected by multi-validator consensus
    const flawSummary = evalQuality.sourceIssue || evalQuality.quotesIssue || evalQuality.reasoningIssue || "Dossier fails evidentiary threshold";
    const votes: ValidatorVote[] = [
      {
        validatorIndex: 0,
        validatorAddress: "0xValLlama3_3_70B...11",
        model: "Llama-3.3-70B-Instruct (Consensus Leader)",
        verdict: "CHALLENGER_WINS",
        score: 28,
        quotesVerified: !evalQuality.quotesIssue,
        sourcesIndependent: !evalQuality.sourceIssue,
        reasoning: evalQuality.sourceIssue
          ? `REJECTED: ${evalQuality.sourceIssue}. Primary citations fail independence standard.`
          : `REJECTED: Citations fail to substantiate claim "${claimSnippet}".`,
        timestamp: Date.now() - 4000
      },
      {
        validatorIndex: 1,
        validatorAddress: "0xValMixtral8x22B...22",
        model: "Mixtral-8x22B-Instruct",
        verdict: "CHALLENGER_WINS",
        score: 24,
        quotesVerified: !evalQuality.quotesIssue,
        sourcesIndependent: false,
        reasoning: `Source provenance check FAILED for ${domain}. Does not satisfy required sources '${truncateText(dare.requiredSources, 45)}'. Relying on unverified sources violates protocol standards.`,
        timestamp: Date.now() - 3000
      },
      {
        validatorIndex: 2,
        validatorAddress: "0xValGPT4o...33",
        model: "GPT-4o (Equivalence Validator)",
        verdict: "CHALLENGER_WINS",
        score: 30,
        quotesVerified: !evalQuality.quotesIssue,
        sourcesIndependent: !evalQuality.sourceIssue,
        reasoning: `Criteria '${criteriaSnippet}' unsatisfied. Dossier reasoning (${reasoningSnippet || 'insufficient'}) fails to reconcile evidence against frozen protocol terms.`,
        timestamp: Date.now() - 2000
      },
      {
        validatorIndex: 3,
        validatorAddress: "0xValClaude3_5...44",
        model: "Claude-3.5-Sonnet (Adjudicator)",
        verdict: "CHALLENGER_WINS",
        score: 22,
        quotesVerified: false,
        sourcesIndependent: false,
        reasoning: evalQuality.quotesIssue
          ? `REJECTED: ${evalQuality.quotesIssue}. Verbatim citation fidelity score 0.`
          : `REJECTED: Citation text does not substantiate claim "${claimSnippet}".`,
        timestamp: Date.now() - 1000
      },
      {
        validatorIndex: 4,
        validatorAddress: "0xValGemini2_5...55",
        model: "Gemini-2.5-Flash (Verifier)",
        verdict: "CHALLENGER_WINS",
        score: 25,
        quotesVerified: false,
        sourcesIndependent: false,
        reasoning: `Unanimous rejection quorum for Dare #${dare.id}. Factual legitimacy threshold not met; challenger wins by evidentiary default.`,
        timestamp: Date.now()
      }
    ];

    const averageScore = Math.round(votes.reduce((acc, v) => acc + v.score, 0) / votes.length);
    const consensusRationale = `Heterogeneous validator rotation rejected evidence dossier: ${flawSummary}. Criteria "${criteriaSnippet}" unsatisfied. Escrow pool awarded to Challenger.`;

    return { votes, consensusRationale, averageScore, finalVerdict: "CHALLENGER_WINS" };
  }
}

function pushSnapshot(state: AppState, newDares: Dare[]): Partial<AppState> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(newDares);
  return {
    dares: newDares,
    history: newHistory,
    historyIndex: newHistory.length - 1
  };
}

// Active timers for sequential validator voting progression
const activeAdjudicationTimers: Record<number, any[]> = {};

export const useStore = create<AppState>((set, get) => ({
  dares: INITIAL_DARES,
  selectedDareId: 1,
  activeTab: 'arena',
  categoryFilter: 'ALL',
  lifecycleFilter: 'ALL',
  benchmarkFilter: 'ALL',
  walletConnected: true,
  walletAddress: '0xAgentInvestigatorBeta...F442',
  activeRole: 'INVESTIGATOR',
  lastActionMessage: null,

  history: [INITIAL_DARES],
  historyIndex: 0,

  setSelectedDareId: (id) => set({ selectedDareId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCategoryFilter: (filter) => set({ categoryFilter: filter }),
  setLifecycleFilter: (filter) => set({ lifecycleFilter: filter }),
  setBenchmarkFilter: (filter) => set({ benchmarkFilter: filter }),
  setWallet: (connected, address) => set({ walletConnected: connected, walletAddress: address }),
  setActiveRole: (role) => set({ activeRole: role }),
  setLastActionMessage: (msg) => set({ lastActionMessage: msg }),

  addDare: (item) => {
    const state = get();
    const nextId = state.dares.reduce((max, d) => Math.max(max, d.id), 0) + 1;
    const newDare: Dare = {
      id: nextId,
      isBenchmark: false,
      title: item.title.trim(),
      category: item.category,
      claim: item.claim.trim(),
      requiredSources: item.requiredSources.trim(),
      criteria: item.criteria.trim(),
      stakeCents: item.stakeCents || 2500,
      creationBondCents: 500,
      durationSeconds: item.durationSeconds || 1800,
      acceptanceDeadlineTs: Date.now() + 86400000,
      researchDeadlineTs: 0,
      status: "OPEN",
      challenger: item.challenger || state.walletAddress || "0xAgentChallenger...Auto"
    };

    const newDares = [newDare, ...state.dares];
    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: nextId,
      lastActionMessage: `Created Dare #${nextId} "${newDare.title.substring(0, 40)}..."`
    });
    return nextId;
  },

  updateDare: (id, updates) => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target) return false;

    const newDares = state.dares.map(d => d.id === id ? { ...d, ...updates } : d);
    set({
      ...pushSnapshot(state, newDares),
      lastActionMessage: `Updated Dare #${id}`
    });
    return true;
  },

  deleteDare: (id) => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target) return false;

    const newDares = state.dares.filter(d => d.id !== id);
    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: state.selectedDareId === id ? (newDares[0]?.id || null) : state.selectedDareId,
      lastActionMessage: `Removed Dare #${id}`
    });
    return true;
  },

  acceptDare: (id, investigatorAddress) => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target || target.status !== "OPEN") return false;

    const newDares = state.dares.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: "ACCEPTED" as DareStatus,
          investigator: investigatorAddress,
          researchDeadlineTs: Date.now() + (d.durationSeconds * 1000)
        };
      }
      return d;
    });

    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: id,
      lastActionMessage: `Investigator ${investigatorAddress.substring(0, 10)} accepted Dare #${id}. Research countdown started.`
    });
    return true;
  },

  submitEvidence: (id, evidence) => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target || target.status !== "ACCEPTED") return false;

    // Clear any existing timers for this dare
    if (activeAdjudicationTimers[id]) {
      activeAdjudicationTimers[id].forEach(t => clearTimeout(t));
      delete activeAdjudicationTimers[id];
    }

    // Evaluate evidence dynamically using realistic heuristics
    const dynamicAdj = generateDynamicValidatorVotes(target, evidence);
    const session: AdjudicationSession = {
      dareId: id,
      status: "VOTING_IN_PROGRESS",
      progressPercent: 10,
      currentStage: "Step 1/5: Validator 1 (Llama-3.3-70B Leader) inspecting primary citations...",
      startedAt: Date.now(),
      etaSeconds: 15,
      votes: [], // Starts empty so user witnesses live validator arrivals
      requiredVotes: 5,
      consensusThreshold: "3 of 5 (Majority Quorum)",
      finalVerdict: dynamicAdj.finalVerdict,
      averageScore: dynamicAdj.averageScore,
      consensusRationale: dynamicAdj.consensusRationale
    };

    const newDares = state.dares.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: "SUBMITTED" as DareStatus,
          evidence,
          adjudicationSession: session
        };
      }
      return d;
    });

    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: id,
      lastActionMessage: `Evidence submitted for Dare #${id}. Live multi-LLM validator voting initiated.`
    });

    // Staged progression of validator votes (simulating live Equivalence Principle deliberation)
    const timers: any[] = [];

    // Stage 1: Vote 1 arrives at 2.5s
    timers.push(setTimeout(() => {
      const cur = get().dares.find(d => d.id === id);
      if (!cur || cur.status !== "SUBMITTED" || !cur.adjudicationSession) return;
      const updated: AdjudicationSession = {
        ...cur.adjudicationSession,
        progressPercent: 25,
        etaSeconds: 12,
        currentStage: "Step 2/5: Validator 2 (Mixtral-8x22B) checking source provenance & independence...",
        votes: [dynamicAdj.votes[0]]
      };
      set({ dares: get().dares.map(d => d.id === id ? { ...d, adjudicationSession: updated } : d) });
    }, 2500));

    // Stage 2: Vote 2 arrives at 5.5s
    timers.push(setTimeout(() => {
      const cur = get().dares.find(d => d.id === id);
      if (!cur || cur.status !== "SUBMITTED" || !cur.adjudicationSession) return;
      const updated: AdjudicationSession = {
        ...cur.adjudicationSession,
        progressPercent: 45,
        etaSeconds: 9,
        currentStage: "Step 3/5: Validator 3 (GPT-4o) evaluating criteria compliance against frozen terms...",
        votes: dynamicAdj.votes.slice(0, 2)
      };
      set({ dares: get().dares.map(d => d.id === id ? { ...d, adjudicationSession: updated } : d) });
    }, 5500));

    // Stage 3: Vote 3 arrives at 8.5s (Majority Quorum reached!)
    timers.push(setTimeout(() => {
      const cur = get().dares.find(d => d.id === id);
      if (!cur || cur.status !== "SUBMITTED" || !cur.adjudicationSession) return;
      const updated: AdjudicationSession = {
        ...cur.adjudicationSession,
        progressPercent: 65,
        etaSeconds: 6,
        currentStage: "Step 4/5: Majority Quorum Reached (3/5). Validator 4 (Claude-3.5) evaluating verbatim fidelity...",
        votes: dynamicAdj.votes.slice(0, 3)
      };
      set({ dares: get().dares.map(d => d.id === id ? { ...d, adjudicationSession: updated } : d) });
    }, 8500));

    // Stage 4: Vote 4 arrives at 11.5s
    timers.push(setTimeout(() => {
      const cur = get().dares.find(d => d.id === id);
      if (!cur || cur.status !== "SUBMITTED" || !cur.adjudicationSession) return;
      const updated: AdjudicationSession = {
        ...cur.adjudicationSession,
        progressPercent: 85,
        etaSeconds: 3,
        currentStage: "Step 5/5: Validator 5 (Gemini-2.5-Flash) aggregating Equivalence Principle consensus...",
        votes: dynamicAdj.votes.slice(0, 4)
      };
      set({ dares: get().dares.map(d => d.id === id ? { ...d, adjudicationSession: updated } : d) });
    }, 11500));

    // Stage 5: Finalization at 14.5s
    timers.push(setTimeout(() => {
      const cur = get().dares.find(d => d.id === id);
      if (!cur || cur.status !== "SUBMITTED") return;
      get().fastTrackAdjudication(id);
    }, 14500));

    activeAdjudicationTimers[id] = timers;
    return true;
  },

  startAdjudication: (id) => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target || target.status !== "SUBMITTED") return false;

    // Immediately trigger fast-track adjudication
    return get().fastTrackAdjudication(id);
  },

  fastTrackAdjudication: (id) => {
    // Clear any pending staged timers
    if (activeAdjudicationTimers[id]) {
      activeAdjudicationTimers[id].forEach(t => clearTimeout(t));
      delete activeAdjudicationTimers[id];
    }

    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target) return false;

    const dynamicAdj = generateDynamicValidatorVotes(target, target.evidence);
    const completedVotes = dynamicAdj.votes;

    const completedSession: AdjudicationSession = {
      dareId: id,
      status: "FINALIZED",
      progressPercent: 100,
      currentStage: "Consensus Finalized: 5/5 Unanimous Agreement across Rotation 0 Validators",
      startedAt: target.adjudicationSession?.startedAt || Date.now() - 5000,
      etaSeconds: 0,
      votes: completedVotes,
      requiredVotes: 5,
      consensusThreshold: "5 of 5 Unanimous Consensus",
      finalVerdict: dynamicAdj.finalVerdict,
      averageScore: dynamicAdj.averageScore,
      consensusRationale: dynamicAdj.consensusRationale
    };

    const payoutDollars = ((target.stakeCents * 2) / 100).toFixed(2);
    const winnerLabel = dynamicAdj.finalVerdict === "INVESTIGATOR_WINS" ? "Investigator" : "Challenger";

    const newDares = state.dares.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: "FINALIZED" as DareStatus,
          adjudicationSession: completedSession,
          verdict: dynamicAdj.finalVerdict,
          verdictScore: dynamicAdj.averageScore,
          verdictRationale: dynamicAdj.consensusRationale
        };
      }
      return d;
    });

    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: id,
      lastActionMessage: `Consensus Reached for Dare #${id}: ${dynamicAdj.finalVerdict} (${dynamicAdj.averageScore}/100). $${payoutDollars} GEN released to ${winnerLabel}.`
    });
    return true;
  },

  adjudicateDare: (id, verdict, score = 95, rationale = "Evidence independently corroborates claim under Equivalence Principle.") => {
    if (activeAdjudicationTimers[id]) {
      activeAdjudicationTimers[id].forEach(t => clearTimeout(t));
      delete activeAdjudicationTimers[id];
    }
    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target) return false;

    const newDares = state.dares.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: "FINALIZED" as DareStatus,
          verdict,
          verdictScore: score,
          verdictRationale: rationale
        };
      }
      return d;
    });

    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: id,
      lastActionMessage: `Finalized Dare #${id} with verdict ${verdict} (${score}/100)`
    });
    return true;
  },

  claimTimeoutForfeit: (id, challengerAddress) => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target) return false;
    if (target.status !== "ACCEPTED" && target.status !== "EXPIRED") return false;

    const payoutDollars = ((target.stakeCents * 2) / 100).toFixed(2);
    const newDares = state.dares.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: "FINALIZED" as DareStatus,
          verdict: "CHALLENGER_WINS" as any,
          verdictScore: 100,
          verdictRationale: `Investigator forfeited due to missed research deadline. Total escrow pool of $${payoutDollars} GEN transferred to Challenger (${challengerAddress}).`
        };
      }
      return d;
    });

    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: id,
      lastActionMessage: `Timeout Forfeit Settled for Dare #${id}: $${payoutDollars} GEN awarded to Challenger!`
    });
    return true;
  },

  processAllExpiredDares: () => {
    const state = get();
    const now = Date.now();
    let processed = 0;

    const newDares = state.dares.map(d => {
      if ((d.status === "ACCEPTED" || d.status === "EXPIRED") && d.researchDeadlineTs > 0 && now > d.researchDeadlineTs) {
        processed++;
        const payoutDollars = ((d.stakeCents * 2) / 100).toFixed(2);
        return {
          ...d,
          status: "FINALIZED" as DareStatus,
          verdict: "CHALLENGER_WINS" as any,
          verdictScore: 100,
          verdictRationale: `Investigator forfeited due to elapsed research window. Escrow pool of $${payoutDollars} GEN paid to Challenger.`
        };
      }
      return d;
    });

    if (processed > 0) {
      set({
        ...pushSnapshot(state, newDares),
        lastActionMessage: `Processed timeout forfeit settlements for ${processed} expired dare(s).`
      });
    }
    return processed;
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return false;
    const nextIndex = state.historyIndex - 1;
    const previousDares = state.history[nextIndex];
    set({
      dares: previousDares,
      historyIndex: nextIndex,
      lastActionMessage: "Reverted previous state mutation (Undo)"
    });
    return true;
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return false;
    const nextIndex = state.historyIndex + 1;
    const nextDares = state.history[nextIndex];
    set({
      dares: nextDares,
      historyIndex: nextIndex,
      lastActionMessage: "Re-applied state mutation (Redo)"
    });
    return true;
  },

  clearState: () => {
    set({
      dares: INITIAL_DARES,
      history: [INITIAL_DARES],
      historyIndex: 0,
      selectedDareId: 1,
      lastActionMessage: "Sandbox state reset to baseline protocol benchmark suite."
    });
  },

  saveProject: () => {
    const state = get();
    const payload = JSON.stringify({
      version: "1.1",
      timestamp: Date.now(),
      dares: state.dares,
      activeTab: state.activeTab,
      selectedDareId: state.selectedDareId
    }, null, 2);

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('dareyou_state_backup', payload);
    }
    set({ lastActionMessage: "Saved sandbox project snapshot to localStorage." });
    return payload;
  },

  loadProject: (jsonString) => {
    try {
      let raw = jsonString;
      if (!raw && typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem('dareyou_state_backup') || '';
      }
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.dares)) {
        const state = get();
        set({
          ...pushSnapshot(state, parsed.dares),
          selectedDareId: parsed.selectedDareId || parsed.dares[0]?.id || 1,
          lastActionMessage: `Loaded ${parsed.dares.length} dares from persistent project backup.`
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  validateDare: (dare) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const title = (dare.title || '').trim();
    if (!title.toLowerCase().startsWith('dare you to ')) {
      errors.push("Prefix Error: Dare MUST begin with 'Dare you to ...' as a continuous instruction.");
    }
    if (title.length < 40) {
      errors.push("Length Error: Dare instruction must be at least 40 characters of substantive research.");
    }
    if (dare.category) {
      const valid = ["INVESTIGATIVE_FACT_FINDING", "CONFLICTING_SOURCE_INVESTIGATION", "EVIDENCE_SYNTHESIS"];
      if (!valid.includes(dare.category)) {
        errors.push(`Category Error: '${dare.category}' is invalid. Allowed: ${valid.join(', ')}`);
      }
    }
    if (dare.stakeCents !== undefined && dare.stakeCents < 1000) {
      errors.push("Economic Policy Error: Minimum duel stake is 1000 cents ($10.00 GEN).");
    }
    if (dare.durationSeconds !== undefined && dare.durationSeconds < 300) {
      warnings.push("Time Constraint Warning: Duration under 5 minutes may be insufficient for multi-source archival research.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },

  validateState: () => {
    const state = get();
    const now = Date.now();
    const expiredCount = state.dares.filter(d => d.status === "ACCEPTED" && d.researchDeadlineTs > 0 && now > d.researchDeadlineTs).length;
    
    const summary = {
      totalDares: state.dares.length,
      open: state.dares.filter(d => d.status === "OPEN").length,
      accepted: state.dares.filter(d => d.status === "ACCEPTED" && now <= d.researchDeadlineTs).length,
      submitted: state.dares.filter(d => d.status === "SUBMITTED").length,
      finalized: state.dares.filter(d => d.status === "FINALIZED").length,
      expired: expiredCount
    };

    const issues: string[] = [];
    const recommendations: string[] = [];

    state.dares.forEach(d => {
      if (d.status === "ACCEPTED" && d.researchDeadlineTs > 0 && now > d.researchDeadlineTs) {
        issues.push(`Dare #${d.id} research window expired (${Math.round((now - d.researchDeadlineTs) / 60000)} mins ago) without evidence. Eligible for timeout forfeit claim.`);
      }
      if (d.status === "SUBMITTED" && !d.evidence) {
        issues.push(`Dare #${d.id} marked as SUBMITTED but has no evidence dossier attached.`);
      }
      if (!d.title.toLowerCase().startsWith("dare you to ")) {
        issues.push(`Dare #${d.id} violates prefix format standard.`);
      }
    });

    if (expiredCount > 0) {
      recommendations.push(`${expiredCount} dare(s) have expired research windows. Trigger 'Claim Timeout Forfeit' to settle escrow to challengers.`);
    }
    if (summary.submitted > 0) {
      recommendations.push(`${summary.submitted} dare(s) in SUBMITTED state. Trigger 'Start Adjudication' to finalize validator consensus.`);
    }

    return {
      valid: issues.length === 0,
      summary,
      issues,
      recommendations
    };
  }
}));
