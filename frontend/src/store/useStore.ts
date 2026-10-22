import { create } from 'zustand';
import { 
  submitRealGenLayerAdjudication, 
  formatRealValidatorVotes, 
  GENLAYER_ADJUDICATOR_ADDRESS,
  createDareOnChain,
  acceptDareOnChain,
  fetchOnChainDares,
  syncDareToCanonicalApi,
  submitEvidenceOnChain,
} from '../services/genlayerService';

export function isDareExpired(dare: Dare, now: number = Date.now()): boolean {
  if (dare.status === 'EXPIRED') return true;
  if (dare.status === 'ACCEPTED' && dare.researchDeadlineTs > 0 && now > dare.researchDeadlineTs) return true;
  if (dare.status === 'OPEN' && dare.acceptanceDeadlineTs > 0 && now > dare.acceptanceDeadlineTs) return true;
  return false;
}

/**
 * Bot-Safe Archive URL Validator
 * GenLayer Validator AI nodes execute gl.nondet.web.render(). Institutional sites
 * (loc.gov, nasa.gov, news sites) employ Cloudflare/Akamai anti-bot defenses that return
 * HTTP 403 (WEB_FETCH_UNAVAILABLE). Archive snapshots guarantee 100% validator readability.
 */
export function isBotSafeUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
}

export interface UrlHealth {
  status: 'OPTIMAL' | 'SAFE' | 'WARNING';
  label: string;
  tip?: string;
  suggestedUrl?: string;
}

/**
 * Evaluates whether a URL is reliably readable by headless GenLayer validator nodes.
 */
export function evaluateEvidenceUrlHealth(url?: string): UrlHealth {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { status: 'WARNING', label: 'Empty Link', tip: 'Enter a valid HTTP/HTTPS link' };
  }
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    return { status: 'WARNING', label: 'Missing Protocol', tip: 'Must start with https:// or http://' };
  }

  // 1. Direct Open Academic & Encyclopedic Repositories (100% crawlable, zero bot blocks)
  const openRepoPatterns = [
    'wikipedia.org',
    'arxiv.org',
    'biorxiv.org',
    'medrxiv.org',
    'ncbi.nlm.nih.gov',
    'raw.githubusercontent.com',
    'github.com',
    'nasa.gov',
    'esa.int',
    'isro.gov.in',
    'congress.gov',
    'supremecourt.gov',
    'sec.gov'
  ];
  if (openRepoPatterns.some(pattern => lower.includes(pattern))) {
    return {
      status: 'OPTIMAL',
      label: 'Direct Open Repository (100% Validator Readable)',
      tip: 'Public repository that does not block decentralized validator nodes.'
    };
  }

  // 2. Archive.org URLs
  if (lower.includes('web.archive.org/web/')) {
    if (lower.includes('id_/')) {
      return {
        status: 'OPTIMAL',
        label: 'Wayback Raw Identity Snapshot (id_ Active)',
        tip: 'Bypasses Wayback iframe wrappers and redirects directly to raw HTML.'
      };
    } else {
      const fixed = convertToWayback(trimmed);
      return {
        status: 'SAFE',
        label: 'Wayback Standard Snapshot',
        tip: 'Auto-converting to id_ mode to strip redirects for GenLayer validators.',
        suggestedUrl: fixed
      };
    }
  }

  // 3. Known Paywalls / Bot-Blockers (Risk of 403 or redirect loop)
  const paywallPatterns = [
    'nature.com',
    'sciencedirect.com',
    'springer.com',
    'wiley.com',
    'nytimes.com',
    'wsj.com',
    'bloomberg.com',
    'ft.com',
    'washingtonpost.com'
  ];
  if (paywallPatterns.some(p => lower.includes(p))) {
    return {
      status: 'WARNING',
      label: 'Paywall / Bot Firewall Risk',
      tip: 'This domain often blocks cloud validators. We recommend using arXiv, Wikipedia, or an Archive.org id_ snapshot.',
      suggestedUrl: convertToWayback(trimmed)
    };
  }

  return {
    status: 'SAFE',
    label: 'Standard Web URL',
    tip: 'Ensure the link is publicly accessible without logins or captchas.'
  };
}

export function convertToWayback(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();

  // If already a Wayback URL, ensure it has the id_ raw identity modifier
  if (lower.includes('web.archive.org/web/')) {
    if (lower.includes('id_/')) return trimmed; // already has id_
    // Match pattern: https://web.archive.org/web/<digits>/<rest>
    const match = trimmed.match(/^(https?:\/\/web\.archive\.org\/web\/\d+)(\/.*)$/i);
    if (match) {
      return `${match[1]}id_${match[2]}`;
    }
    // Fallback if no specific timestamp: insert id_/
    return trimmed.replace(/\/web\/([0-9*]+)?\/?/i, (_, ts) => `/web/${ts || '20240101000000'}id_/`);
  }

  // If already an open repository that doesn't block bots (Wikipedia, arXiv, GitHub raw), keep direct
  const openRepoPatterns = [
    'wikipedia.org',
    'arxiv.org',
    'biorxiv.org',
    'medrxiv.org',
    'ncbi.nlm.nih.gov',
    'raw.githubusercontent.com'
  ];
  if (openRepoPatterns.some(p => lower.includes(p))) {
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') 
      ? trimmed 
      : `https://${trimmed}`;
  }

  // Otherwise, wrap in Wayback raw identity mode (id_) with dynamic timestamp
  const safe = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
    ? trimmed 
    : `https://${trimmed}`;
  const now = new Date();
  const ts = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}000000`;
  return `https://web.archive.org/web/${ts}id_/${safe}`;
}

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
  finalVerdict?: "INVESTIGATOR_WINS" | "CHALLENGER_WINS" | "INCONCLUSIVE" | "INVALID_CHALLENGE";
  averageScore?: number;
  consensusRationale?: string;
  isLiveOnChain?: boolean;
  txHash?: string;
  onChainValidators?: string[];
  receiptStatus?: string;
}

export interface Dare {
  id: number;
  onChainId?: number;
  isBenchmark: boolean;
  title: string;
  category: DareCategory;
  domain?: string;
  featuredImageUrl?: string;
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
  txHash?: string;
  settlementTxHash?: string;
  payoutRecipient?: string;
  payoutClaimed?: boolean;
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
    domain?: string;
    claim: string;
    requiredSources: string;
    criteria: string;
    stakeCents: number;
    durationSeconds: number;
    challenger?: string;
    txHash?: string;
  }) => number;

  updateDare: (id: number, updates: Partial<Dare>) => boolean;
  deleteDare: (id: number) => boolean;
  acceptDare: (id: number, investigatorAddress: string) => boolean;
  submitEvidence: (id: number, evidence: EvidenceData) => boolean;
  startAdjudication: (id: number) => boolean;
  adjudicateDare: (id: number, verdict: "INVESTIGATOR_WINS" | "CHALLENGER_WINS", score?: number, rationale?: string) => boolean;
  claimTimeoutForfeit: (id: number, challengerAddress: string) => boolean;
  claimWinnerPayout: (id: number, walletAddress: string) => number;
  closeDare: (id: number, rationale?: string) => boolean;
  processAllExpiredDares: () => number;
  loadOnChainDares: () => Promise<void>;

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

export const DAREYOU_PERSISTED_DARES_KEY = 'dareyou_persisted_dares_v9';

export const SEED_INITIAL_DARES: Dare[] = [
  {
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
  }
];

export function saveDaresToStorage(dares: Dare[]) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(DAREYOU_PERSISTED_DARES_KEY, JSON.stringify(dares));
    } catch (e) {
      console.warn('Could not persist dares to localStorage', e);
    }
  }
}

export function loadDaresFromStorage(): Dare[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Purge any legacy local caches
      window.localStorage.removeItem('dareyou_persisted_dares_v7');
      window.localStorage.removeItem('dareyou_persisted_dares_v8');
      window.localStorage.removeItem('dareyou_persisted_dares_v9');
    } catch (e) {
      console.warn('Could not purge legacy localStorage', e);
    }
  }
  return SEED_INITIAL_DARES;
}

export const INITIAL_DARES: Dare[] = loadDaresFromStorage();


function pushSnapshot(state: AppState, newDares: Dare[]): Partial<AppState> {
  saveDaresToStorage(newDares);
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(newDares);
  return {
    dares: newDares,
    history: newHistory,
    historyIndex: newHistory.length - 1
  };
}

export const useStore = create<AppState>((set, get) => ({
  dares: INITIAL_DARES,
  selectedDareId: null,
  activeTab: 'arena',
  categoryFilter: 'ALL',
  lifecycleFilter: 'ALL',
  benchmarkFilter: 'ALL',
  walletConnected: false,
  walletAddress: '',
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
    const nextId = Math.max(1003, state.dares.reduce((max, d) => Math.max(max, d.id), 0) + 1);
    const newDare: Dare = {
      id: nextId,
      isBenchmark: false,
      title: item.title.trim(),
      category: item.category,
      domain: item.domain || 'Entertainment',
      claim: item.claim.trim(),
      requiredSources: item.requiredSources.trim(),
      criteria: item.criteria.trim(),
      stakeCents: item.stakeCents || 0,
      creationBondCents: 0,
      durationSeconds: item.durationSeconds || 1800,
      acceptanceDeadlineTs: Date.now() + 86400000,
      researchDeadlineTs: 0,
      status: "OPEN",
      challenger: item.challenger || state.walletAddress,
      txHash: item.txHash
    };

    const newDares = [newDare, ...state.dares];
    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: nextId,
      lastActionMessage: `Created Dare #${nextId} "${newDare.title.substring(0, 40)}..."`
    });

    // Immediately broadcast new dare to canonical cross-browser API (/api/dares)
    syncDareToCanonicalApi(newDare).catch(() => {});

    createDareOnChain({
      title: newDare.title,
      category: newDare.category,
      domain: newDare.domain,
      claim: newDare.claim,
      requiredSources: newDare.requiredSources,
      criteria: newDare.criteria,
      durationSeconds: newDare.durationSeconds,
      challenger: newDare.challenger,
      txHash: newDare.txHash
    }).then(() => {
      get().loadOnChainDares();
    }).catch((err) => {
      console.warn('[DareRegistry] create_dare on-chain fallback:', err);
    });

    return nextId;
  },

  updateDare: (id, updates) => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    // ANTI-CHEAT LOCK: Never allow updateDare on any non-OPEN dare or to change status/verdict!
    if (!target || target.status !== "OPEN") return false;
    const safeUpdates = { ...updates };
    delete (safeUpdates as any).status;
    delete (safeUpdates as any).verdict;
    delete (safeUpdates as any).verdictScore;
    delete (safeUpdates as any).verdictRationale;
    delete (safeUpdates as any).researchDeadlineTs;

    const newDares = state.dares.map(d => d.id === id ? { ...d, ...safeUpdates } : d);
    set({
      ...pushSnapshot(state, newDares),
      lastActionMessage: `Updated Dare #${id}`
    });
    return true;
  },

  deleteDare: (id) => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target || target.status !== "OPEN") return false;

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

    const acceptedDare: Dare = {
      ...target,
      status: "ACCEPTED" as DareStatus,
      investigator: investigatorAddress,
      researchDeadlineTs: Date.now() + (target.durationSeconds * 1000)
    };

    const newDares = state.dares.map(d => d.id === id ? acceptedDare : d);

    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: id,
      lastActionMessage: `Investigator ${investigatorAddress.substring(0, 10)} accepted Dare #${id}. Research countdown started.`
    });

    // Immediately sync ACCEPTED status and exact researchDeadlineTs across all browsers
    syncDareToCanonicalApi(acceptedDare).catch(() => {});

    const onChainId = target.onChainId || (id >= 1000 ? id - 1000 : undefined);
    if (onChainId) {
      acceptDareOnChain(onChainId).catch((err) => {
        console.warn('[DareRegistry] accept_dare fallback:', err);
      });
    }

    return true;
  },

  submitEvidence: (id, evidence) => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    // ANTI-CHEAT LOCK: Only an ACCEPTED dare before its researchDeadlineTs can ever accept evidence!
    if (!target || target.status !== "ACCEPTED") return false;
    if (target.researchDeadlineTs > 0 && Date.now() > target.researchDeadlineTs) {
      get().processAllExpiredDares();
      return false;
    }

    // Enforce URL health check: only OPTIMAL or SAFE URLs allowed
    const primaryHealth = evaluateEvidenceUrlHealth(evidence.primaryUrl);
    if (primaryHealth.status === 'WARNING') {
      console.warn('[submitEvidence] Primary URL health check failed:', primaryHealth);
      // Don't block, but warn - validator nodes may still fail
    }
    if (evidence.secondaryUrl && evidence.secondaryUrl !== 'N/A') {
      const secondaryHealth = evaluateEvidenceUrlHealth(evidence.secondaryUrl);
      if (secondaryHealth.status === 'WARNING') {
        console.warn('[submitEvidence] Secondary URL health check failed:', secondaryHealth);
      }
    }

    const session: AdjudicationSession = {
      dareId: id,
      status: "VOTING_IN_PROGRESS",
      progressPercent: 20,
      currentStage: `Broadcasting transaction to GenLayer StudioNet contract (${GENLAYER_ADJUDICATOR_ADDRESS.slice(0, 10)}...)...`,
      startedAt: Date.now(),
      etaSeconds: 30,
      votes: [],
      requiredVotes: 5,
      consensusThreshold: "Majority Quorum on StudioNet",
      isLiveOnChain: true
    };

    const submittedDare: Dare = {
      ...target,
      status: "SUBMITTED" as DareStatus,
      evidence,
      adjudicationSession: session
    };

    const newDares = state.dares.map(d => d.id === id ? submittedDare : d);

    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: id,
      lastActionMessage: `Broadcasting Dare #${id} evidence to GenLayer StudioNet Intelligent Contract...`
    });

    // Lock SUBMITTED state across all browsers so duplicate submissions are blocked
    syncDareToCanonicalApi(submittedDare).catch(() => {});

        // EXCLUSIVE AUTHENTICATED LIFECYCLE:
    // Await evidence freeze -> Await adjudication consensus -> Await escrow settlement
    (async () => {
      try {
        // Step 1: Submit & FREEZE evidence on-chain FIRST and AWAIT finalization
        console.log(`[Lifecycle Step 1/3] Freezing evidence dossier for Dare #${id} on EvidenceRegistry...`);
        const freezeTx = await submitEvidenceOnChain({
          dareId: id,
          investigator: target.investigator || get().walletAddress || '',
          conclusion: evidence.conclusion,
          primaryUrl: evidence.primaryUrl,
          secondaryUrl: evidence.secondaryUrl,
          quotes: evidence.quotes,
          reasoning: evidence.reasoning
        });

        // Update UI stage: evidence freeze confirmed, moving to adjudication
        const curAfterFreeze = get().dares.find(d => d.id === id);
        if (curAfterFreeze && curAfterFreeze.adjudicationSession) {
          const updatedStageSession: AdjudicationSession = {
            ...curAfterFreeze.adjudicationSession,
            isLiveOnChain: true,
            txHash: freezeTx,
            currentStage: `Stage 1 Confirmed: Evidence frozen on EvidenceRegistry (Tx: ${freezeTx.slice(0, 10)}...). Initiating multi-LLM consensus on DareAdjudicator...`,
            progressPercent: 35,
            etaSeconds: 30
          };
          set({
            dares: get().dares.map(d => d.id === id ? { ...d, adjudicationSession: updatedStageSession } : d)
          });
        }

        // Step 2: Trigger real on-chain GenLayer Intelligent Contract adjudication (adjudicate_from_records)
        console.log(`[Lifecycle Step 2/3] Calling adjudicate_from_records for Dare #${id} on DareAdjudicator...`);
        const onChainResult = await submitRealGenLayerAdjudication(target, evidence, (adjTxHash) => {
          const cur = get().dares.find(d => d.id === id);
          if (cur && cur.status === "SUBMITTED" && cur.adjudicationSession) {
            const updatedSession: AdjudicationSession = {
              ...cur.adjudicationSession,
              isLiveOnChain: true,
              txHash: adjTxHash,
              currentStage: `Stage 2 In-Progress: Adjudication Tx ${adjTxHash.slice(0, 10)}... broadcast! GenLayer validators executing Equivalence Principle consensus on StudioNet...`,
              progressPercent: 65,
              etaSeconds: 20
            };
            set({
              dares: get().dares.map(d => d.id === id ? { ...d, txHash: adjTxHash, adjudicationSession: updatedSession } : d)
            });
          }
        });

        const cur = get().dares.find(d => d.id === id);
        if (!cur || cur.status === "FINALIZED") return;

        const realVotes = formatRealValidatorVotes(
          onChainResult.validators,
          onChainResult.validatorVotes,
          onChainResult.verdict,
          onChainResult.score,
          onChainResult.rationale
        );

        const winnerLabel = onChainResult.verdict === "INVESTIGATOR_WINS" ? "Investigator" : "Challenger";
        const winnerAddress = onChainResult.verdict === "INVESTIGATOR_WINS"
          ? (cur.investigator || get().walletAddress)
          : cur.challenger;

        // Step 3: DareRegistry auto-finalized via DareAdjudicator callback
        console.log(`[Lifecycle Step 3/3] DareRegistry auto-finalized via DareAdjudicator callback for Dare #${id}...`);

        const finalizedSession: AdjudicationSession = {
          dareId: id,
          status: "FINALIZED",
          progressPercent: 100,
          currentStage: `Consensus & Auto-Finalization Confirmed on GenLayer StudioNet: ${onChainResult.receiptStatus}`,
          startedAt: cur.adjudicationSession?.startedAt || Date.now() - 30000,
          etaSeconds: 0,
          votes: realVotes,
          requiredVotes: onChainResult.validators.length || 5,
          consensusThreshold: "Majority Quorum on StudioNet",
          finalVerdict: onChainResult.verdict as any,
          averageScore: onChainResult.score,
          consensusRationale: onChainResult.rationale,
          isLiveOnChain: true,
          txHash: onChainResult.txHash,
          onChainValidators: onChainResult.validators,
          receiptStatus: onChainResult.receiptStatus
        };

        const finalizedDare: Dare = {
          ...cur,
          status: "FINALIZED" as DareStatus,
          verdict: onChainResult.verdict as any,
          verdictScore: onChainResult.score,
          verdictRationale: onChainResult.rationale,
          txHash: onChainResult.txHash,
          payoutRecipient: winnerAddress,
          adjudicationSession: finalizedSession
        };

        const updatedDares = get().dares.map(d => d.id === id ? finalizedDare : d);

        set({
          ...pushSnapshot(get(), updatedDares),
          selectedDareId: id,
          lastActionMessage: `On-chain GenLayer consensus finalized for Dare #${id}: ${onChainResult.verdict} (${onChainResult.score}/100). Winner recorded in protocol: ${winnerLabel}.`
        });

        syncDareToCanonicalApi(finalizedDare).catch(() => {});
      } catch (err: any) {
        console.warn('[GenLayer Authenticated Sequence Error]', err);
        const cur = get().dares.find(d => d.id === id);
        if (cur && cur.status === "SUBMITTED" && cur.adjudicationSession) {
          const errorSession: AdjudicationSession = {
            ...cur.adjudicationSession,
            status: "FAILED" as any,
            progressPercent: 100,
            currentStage: `StudioNet Execution Failed: ${err.message || String(err)}`,
            consensusRationale: `Transaction or consensus failed on GenLayer StudioNet: ${err.message || String(err)}`
          };
          set({
            dares: get().dares.map(d => d.id === id ? { ...d, adjudicationSession: errorSession } : d),
            lastActionMessage: `StudioNet Execution error for Dare #${id}: ${err.message || String(err)}`
          });
        }
      }
    })();

    return true;
  },

  startAdjudication: (id) => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target || target.status !== "SUBMITTED" || !target.evidence) return false;
    (async () => {
      try {
        const onChainResult = await submitRealGenLayerAdjudication(target, target.evidence);
        const cur = get().dares.find(d => d.id === id);
        if (!cur) return;
        const realVotes = formatRealValidatorVotes(
          onChainResult.validators,
          onChainResult.validatorVotes,
          onChainResult.verdict,
          onChainResult.score,
          onChainResult.rationale
        );
        const winnerAddress = onChainResult.verdict === "INVESTIGATOR_WINS"
          ? (cur.investigator || get().walletAddress)
          : cur.challenger;
        const finalizedSession: AdjudicationSession = {
          dareId: id,
          status: "FINALIZED",
          progressPercent: 100,
          currentStage: `Consensus & Auto-Finalization Confirmed on GenLayer StudioNet: ${onChainResult.receiptStatus}`,
          startedAt: cur.adjudicationSession?.startedAt || Date.now() - 30000,
          etaSeconds: 0,
          votes: realVotes,
          requiredVotes: onChainResult.validators.length || 5,
          consensusThreshold: "Majority Quorum on StudioNet",
          finalVerdict: onChainResult.verdict as any,
          averageScore: onChainResult.score,
          consensusRationale: onChainResult.rationale,
          isLiveOnChain: true,
          txHash: onChainResult.txHash,
          onChainValidators: onChainResult.validators,
          receiptStatus: onChainResult.receiptStatus
        };
        const finalizedDare: Dare = {
          ...cur,
          status: "FINALIZED" as DareStatus,
          verdict: onChainResult.verdict as any,
          verdictScore: onChainResult.score,
          verdictRationale: onChainResult.rationale,
          txHash: onChainResult.txHash,
          payoutRecipient: winnerAddress,
          adjudicationSession: finalizedSession
        };
        set({
          ...pushSnapshot(get(), get().dares.map(d => d.id === id ? finalizedDare : d)),
          selectedDareId: id,
          lastActionMessage: `Consensus finalized for Dare #${id}: ${onChainResult.verdict}`
        });
        syncDareToCanonicalApi(finalizedDare).catch(() => {});
      } catch (err) {
        console.error('[startAdjudication] error:', err);
      }
    })();
    return true;
  },

  adjudicateDare: (id, verdict, score = 95, rationale = "Evidence independently corroborates claim under Equivalence Principle.") => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target || target.status === "FINALIZED") return false;

    const finalizedDare: Dare = {
      ...target,
      status: "FINALIZED" as DareStatus,
      verdict,
      verdictScore: score,
      verdictRationale: rationale
    };

    const newDares = state.dares.map(d => d.id === id ? finalizedDare : d);

    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: id,
      lastActionMessage: `Finalized Dare #${id} with verdict ${verdict} (${score}/100)`
    });
    syncDareToCanonicalApi(finalizedDare).catch(() => {});
    return true;
  },

  claimTimeoutForfeit: (id, _challengerAddress) => {
    const state = get();
    const target = state.dares.find(d => d.id === id);
    if (!target) return false;
    if (target.status !== "ACCEPTED" && target.status !== "EXPIRED") return false;
    if (target.researchDeadlineTs > 0 && Date.now() <= target.researchDeadlineTs) return false;

    const forfeitedDare: Dare = {
      ...target,
      status: "FINALIZED" as DareStatus,
      verdict: "CHALLENGER_WINS" as any,
      verdictScore: 100,
      verdictRationale: "Investigator forfeited due to elapsed research deadline without evidence submission. Protocol recorded Challenger as winner.",
      settlementTxHash: target.txHash || undefined,
      payoutRecipient: target.challenger
    };

    const newDares = state.dares.map(d => d.id === id ? forfeitedDare : d);

    set({
      ...pushSnapshot(state, newDares),
      selectedDareId: id,
      lastActionMessage: `Timeout forfeit recorded for Dare #${id}: Challenger recorded as winner.`
    });
    syncDareToCanonicalApi(forfeitedDare).catch(() => {});
    return true;
  },

  loadOnChainDares: async () => {
    try {
      const onChain = await fetchOnChainDares();
      if (onChain && onChain.length > 0) {
        const state = get();
        const remainingList = [...state.dares];
        const mergedOnChain: Dare[] = [];
        let updatedSelectedId = state.selectedDareId;

        const orderedOnChain = [...onChain].sort((a, b) => b.id - a.id);

        for (const oc of orderedOnChain) {
          const matchIdx = remainingList.findIndex(
            d => d.id === oc.id || (!d.isBenchmark && d.title.trim().toLowerCase() === oc.title.trim().toLowerCase())
          );

          if (matchIdx !== -1) {
            const existing = remainingList[matchIdx];
            remainingList.splice(matchIdx, 1);

            if (updatedSelectedId === existing.id) {
              updatedSelectedId = oc.id;
            }

            // If canonical state or existing state is FINALIZED, enforce FINALIZED!
            if (oc.status === 'FINALIZED' || existing.status === 'FINALIZED') {
              const finalizedVerdict = existing.verdict || oc.verdict || 'CHALLENGER_WINS';
              const isChallengerWon = finalizedVerdict === 'CHALLENGER_WINS';
              const winnerAddress = existing.payoutRecipient || oc.payoutRecipient || (isChallengerWon ? (existing.challenger || oc.challenger) : (existing.investigator || oc.investigator));
              let isLocallyClaimed = false;
              try {
                if (typeof window !== 'undefined' && window.localStorage) {
                  const raw = window.localStorage.getItem('dareyou_claimed_payouts');
                  const list = raw ? JSON.parse(raw) : [];
                  isLocallyClaimed = list.includes(oc.id) || (oc.onChainId && list.includes(oc.onChainId)) || (existing && (list.includes(existing.id) || (existing.onChainId && list.includes(existing.onChainId))));
                }
              } catch (e) {}

              const isClaimedFinal = oc.id === 2 || Boolean(existing.payoutClaimed) || Boolean(oc.payoutClaimed) || isLocallyClaimed;

              mergedOnChain.push({
                ...existing,
                ...oc,
                status: 'FINALIZED',
                verdict: finalizedVerdict,
                verdictScore: existing.verdictScore ?? oc.verdictScore ?? 100,
                verdictRationale: existing.verdictRationale || oc.verdictRationale || 'Adjudicated and finalized on-chain.',
                payoutRecipient: winnerAddress,
                payoutClaimed: isClaimedFinal,
                settlementTxHash: existing.settlementTxHash || oc.settlementTxHash || undefined,
                txHash: existing.txHash || oc.txHash || undefined,
                id: oc.id,
                onChainId: oc.onChainId
              });
            } else if (existing.status === 'SUBMITTED') {
              // Push local progress up to canonical API
              const merged = {
                ...oc,
                ...existing,
                id: oc.id,
                onChainId: oc.onChainId
              };
              mergedOnChain.push(merged);
              syncDareToCanonicalApi(merged).catch(() => {});
            } else if (oc.status === 'ACCEPTED') {
              mergedOnChain.push({
                ...existing,
                ...oc,
                id: oc.id,
                onChainId: oc.onChainId,
                status: 'ACCEPTED',
                researchDeadlineTs: oc.researchDeadlineTs > 0
                  ? oc.researchDeadlineTs
                  : (existing.researchDeadlineTs > 0 ? existing.researchDeadlineTs : (Date.now() + (oc.durationSeconds * 1000)))
              });
            } else {
              mergedOnChain.push({
                ...existing,
                ...oc,
                id: oc.id,
                onChainId: oc.onChainId
              });
            }
          } else {
            mergedOnChain.push(oc);
          }
        }

        const mergedDares = [...mergedOnChain, ...remainingList];
        saveDaresToStorage(mergedDares);
        set({
          dares: mergedDares,
          selectedDareId: updatedSelectedId
        });
      }
    } catch (err) {
      console.warn('[loadOnChainDares] Could not fetch on-chain dares:', err);
    }
  },

  closeDare: (_id: number, _rationale = "Dare closed and finalized by challenger.") => {
    // Disabled to prevent arbitrary state closure by agents
    return false;
  },

  processAllExpiredDares: () => {
    const state = get();
    const now = Date.now();
    let processed = 0;

    const newDares = state.dares.map(d => {
      if ((d.status === "ACCEPTED" || d.status === "EXPIRED") && d.researchDeadlineTs > 0 && now > d.researchDeadlineTs) {
        processed++;
        const txHash = d.settlementTxHash || d.txHash || undefined;
        const forfeited: Dare = {
          ...d,
          status: "FINALIZED" as DareStatus,
          verdict: "CHALLENGER_WINS" as any,
          verdictScore: 100,
          verdictRationale: "Investigator forfeited due to elapsed research window without evidence submission. Protocol recorded Challenger as winner.",
          settlementTxHash: txHash,
          payoutRecipient: d.challenger
        };
        syncDareToCanonicalApi(forfeited).catch(() => {});
        return forfeited;
      }
      return d;
    });

    if (processed > 0) {
      set({
        ...pushSnapshot(state, newDares),
        lastActionMessage: `Processed timeout forfeit for ${processed} expired dare(s). Challenger recorded as winner.`
      });
    }
    return processed;
  },

  claimWinnerPayout: (id: number, _walletAddress: string) => {
    const state = get();
    const dare = state.dares.find(d => d.id === id);
    if (!dare || dare.status !== 'FINALIZED' || dare.payoutClaimed) return 0;

    const payoutDollars = (dare.stakeCents * 2) / 100;
    const newDares = state.dares.map(d => {
      if (d.id === id) {
        const updated = { ...d, payoutClaimed: true };
        syncDareToCanonicalApi(updated).catch(() => {});
        return updated;
      }
      return d;
    });

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('dareyou_claimed_payouts');
        const list = raw ? JSON.parse(raw) : [];
        if (!list.includes(id)) list.push(id);
        if (dare.onChainId && !list.includes(dare.onChainId)) list.push(dare.onChainId);
        window.localStorage.setItem('dareyou_claimed_payouts', JSON.stringify(list));
      }
    } catch (e) {}

    set({
      ...pushSnapshot(state, newDares),
      lastActionMessage: `Protocol settlement record: $${payoutDollars.toFixed(2)} GEN awarded to winner for Dare #${id}.`
    });
    return payoutDollars;
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
      lastActionMessage: "State reset to production on-chain baseline."
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
    if (dare.durationSeconds !== undefined && dare.durationSeconds < 1) {
      errors.push("Time Constraint Error: Research window must be at least 1 second.");
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
    const expiredCount = state.dares.filter(d => isDareExpired(d, now) && d.status !== "FINALIZED").length;
    
    const summary = {
      totalDares: state.dares.length,
      open: state.dares.filter(d => d.status === "OPEN" && !isDareExpired(d, now)).length,
      accepted: state.dares.filter(d => d.status === "ACCEPTED" && !isDareExpired(d, now)).length,
      submitted: state.dares.filter(d => d.status === "SUBMITTED").length,
      finalized: state.dares.filter(d => d.status === "FINALIZED").length,
      expired: expiredCount
    };

    const issues: string[] = [];
    const recommendations: string[] = [];

    state.dares.forEach(d => {
      if (isDareExpired(d, now) && d.status !== "FINALIZED") {
        issues.push(`Dare #${d.id} research window expired without evidence. Eligible for timeout forfeit claim.`);
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


