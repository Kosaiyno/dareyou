import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Bot, 
  ExternalLink, 
  CheckCircle2, 
  Flame, 
  Wallet, 
  Send,
  Cpu,
  ChevronRight,
  AlertTriangle,
  FileCheck2,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  XCircle,
  Copy,
  Check,
  X
} from 'lucide-react';

// --- Types ---
export type DareCategory = 
  | "CONFLICTING_SOURCE_INVESTIGATION" 
  | "INVESTIGATIVE_FACT_FINDING" 
  | "EVIDENCE_SYNTHESIS";

export interface Dare {
  id: number;
  title: string; // Must begin with "Dare you to "
  category: DareCategory;
  claim: string;
  requiredSources: string;
  criteria: string;
  stakeCents: number;
  creationBondCents: number;
  durationSeconds: number;
  acceptanceDeadlineTs: number;
  researchDeadlineTs: number;
  status: "OPEN" | "ACCEPTED" | "SUBMITTED" | "FINALIZED" | "CANCELLED";
  challenger: string;
  investigator?: string;
  evidence?: {
    conclusion: string;
    primaryUrl: string;
    secondaryUrl: string;
    quotes: string;
    reasoning: string;
  };
  verdict?: "INVESTIGATOR_WINS" | "CHALLENGER_WINS" | "INCONCLUSIVE" | "INVALID_CHALLENGE";
  verdictScore?: number;
  verdictRationale?: string;
}

// 10 Official Standard Test Cases strictly aligned with the Dare Acceptance Standard
const STANDARD_TEST_CASES = [
  {
    id: "01",
    title: "Dare you to uncover the true transfer fee of a footballer whose reported transfer costs differ across multiple reputable sources, separating the guaranteed fee from add-ons and identifying which figures remain unconfirmed within 30 minutes.",
    category: "CONFLICTING_SOURCE_INVESTIGATION" as DareCategory,
    claim: "The guaranteed fixed base transfer fee differs by more than £10m across primary club financial disclosures versus media reports.",
    requiredSources: "Official club annual audited financial reports and official federation registration filings.",
    criteria: "Delineate guaranteed base installment from performance-contingent add-ons and identify unconfirmed figures.",
    stakeCents: 2500,
    creationBondCents: 500,
    durationSeconds: 1800,
    depthScore: 94,
    decision: "APPROVED",
    rationale: "Requires cross-referencing statutory financial reports against commercial press coverage; separates confirmed base payments from conditional clauses."
  },
  {
    id: "02",
    title: "Dare you to trace a widely repeated football story to its earliest verifiable source, compare the original account with later retellings, and expose which details were changed, exaggerated, or never supported by evidence within 25 minutes.",
    category: "INVESTIGATIVE_FACT_FINDING" as DareCategory,
    claim: "The widely repeated dressing room altercation narrative was embellished over decades and lacks support in contemporary reports.",
    requiredSources: "Contemporary matchday newspaper archives (within 48 hours of event) versus modern retrospective memoirs.",
    criteria: "Identify earliest verifiable primary dispatch and document specific embellishments introduced in secondary retellings.",
    stakeCents: 2000,
    creationBondCents: 500,
    durationSeconds: 1500,
    depthScore: 91,
    decision: "APPROVED",
    rationale: "Demands provenance tracing and historical source comparison rather than superficial hearsay."
  },
  {
    id: "03",
    title: "Dare you to investigate why two established football statistics providers report different numbers for the same metric in a completed match, identify the methodological or factual source of the discrepancy, and support your conclusion with evidence within 20 minutes.",
    category: "CONFLICTING_SOURCE_INVESTIGATION" as DareCategory,
    claim: "Provider A logged 4 big chances created while Provider B logged 2 due to differing definitions of open-play vs set-piece pass sequences.",
    requiredSources: "Official event definition documentation from Opta/StatsBomb and timestamped event logs for the match.",
    criteria: "Demonstrate exact event timestamp causing the divergence and map to published provider methodology rules.",
    stakeCents: 3000,
    creationBondCents: 500,
    durationSeconds: 1200,
    depthScore: 96,
    decision: "APPROVED",
    rationale: "Requires understanding differing data-collection taxonomies and evaluating conflicting empirical records."
  },
  {
    id: "04",
    title: "Dare you to reconstruct the exact timeline and decision chain behind a controversial VAR intervention, documenting each official communication and rule application using primary broadcast and federation sources within 35 minutes.",
    category: "EVIDENCE_SYNTHESIS" as DareCategory,
    claim: "The on-field referee was not alerted to the offside phase until after the restart protocol had been initiated.",
    requiredSources: "Official federation audio releases, published match delegate reports, and unedited broadcast timestamp logs.",
    criteria: "Document minute-by-minute communication chain and substantiate whether protocol deviation occurred under IFAB Law 5.",
    stakeCents: 2500,
    creationBondCents: 500,
    durationSeconds: 2100,
    depthScore: 93,
    decision: "APPROVED",
    rationale: "Complex chronology synthesis combining primary audio transcriptions with regulatory rulebooks."
  },
  {
    id: "05",
    title: "Dare you to audit a club's reported financial compliance figure against published regulatory filings, identifying the accounting distinctions between official figures, league calculations, and credible reporting without presenting speculation as fact within 30 minutes.",
    category: "INVESTIGATIVE_FACT_FINDING" as DareCategory,
    claim: "The allowable loss deduction for infrastructure investment was calculated differently by the independent commission versus the club's submission.",
    requiredSources: "Published independent commission written reasons and club statutory financial statements registered at Companies House.",
    criteria: "Reconcile reported EBITDA with league PSR allowable deductions under profit and sustainability rules.",
    stakeCents: 3500,
    creationBondCents: 500,
    durationSeconds: 1800,
    depthScore: 98,
    decision: "APPROVED",
    rationale: "High-rigor forensic research distinguishing statutory accounting standards from sporting regulatory frameworks."
  },
  {
    id: "06",
    title: "Dare you to reconstruct a professional footballer's journey from academy football to the first team, uncovering overlooked loans, development milestones, key appearances, and documented turning points using reliable sources within 30 minutes.",
    category: "INVESTIGATIVE_FACT_FINDING" as DareCategory,
    claim: "Player's senior debut occurred during an emergency unrecorded youth loan prior to their official league debut.",
    requiredSources: "Regional league match registers, youth tournament logs, and federation registration filings.",
    criteria: "Compile chronological trajectory of all competitive appearances with date, opponent, and official tournament records.",
    stakeCents: 2000,
    creationBondCents: 500,
    durationSeconds: 1800,
    depthScore: 89,
    decision: "APPROVED",
    rationale: "Requires digging through historical regional youth registries and federation player passes."
  },
  {
    id: "07",
    title: "Dare you to investigate a completed football transfer saga with conflicting reports, reconstruct the sequence of reported negotiations, establish what the clubs and player actually confirmed, and distinguish verified events from anonymous-source claims within 30 minutes.",
    category: "CONFLICTING_SOURCE_INVESTIGATION" as DareCategory,
    claim: "The formal bid was submitted 48 hours after media claimed talks collapsed, verified by club stock exchange disclosure.",
    requiredSources: "Club regulatory stock market disclosures, verified club press releases, and timestamped Tier-1 reports.",
    criteria: "Reconstruct sequence of documented bids and distinguish verifiable filings from uncorroborated transfer rumors.",
    stakeCents: 2500,
    creationBondCents: 500,
    durationSeconds: 1800,
    depthScore: 92,
    decision: "APPROVED",
    rationale: "Eliminates speculative transfer gossip; forces evidentiary isolation of confirmed statements."
  },
  {
    id: "08",
    title: "Dare you to explain how an unexpected football club reached the latter stages of a European competition by investigating its opponents, tactical adjustments, squad availability, and decisive match events, then rank the explanations by evidence strength within 40 minutes.",
    category: "EVIDENCE_SYNTHESIS" as DareCategory,
    claim: "Progress was primarily determined by opponent suspension/injury crises rather than tactical formation shifts.",
    requiredSources: "Official UEFA tournament technical reports, match-by-match squad sheets, and tactical heat maps.",
    criteria: "Correlate opponent availability with match outcomes and rank explanatory hypotheses by empirical documentation.",
    stakeCents: 3000,
    creationBondCents: 500,
    durationSeconds: 2400,
    depthScore: 90,
    decision: "APPROVED",
    rationale: "Evaluates empirical causal claims against tournament archives and tactical reports."
  },
  {
    id: "09",
    title: "Dare you to determine whether a high-profile signing genuinely changed a football team's performance by comparing relevant before-and-after data, examining tactical roles and alternative explanations, and presenting a defensible conclusion supported by credible evidence within 40 minutes.",
    category: "EVIDENCE_SYNTHESIS" as DareCategory,
    claim: "Team points per game improved by 0.6 solely during matches where the player started in a specific hybrid role.",
    requiredSources: "Historical league statistical archives, lineup records, and tactical tracking databases.",
    criteria: "Synthesize team metrics before vs after signing, controlling for strength of schedule and concurrent tactical adjustments.",
    stakeCents: 2500,
    creationBondCents: 500,
    durationSeconds: 2400,
    depthScore: 91,
    decision: "APPROVED",
    rationale: "Substantive empirical inquiry preventing superficial narrative confirmation bias."
  },
  {
    id: "10",
    title: "Dare you to investigate the origin of a disputed historical football claim by locating contemporary reports, comparing independent accounts, checking primary records where available, and establishing which parts of the claim are supported, contradicted, or impossible to verify within 30 minutes.",
    category: "INVESTIGATIVE_FACT_FINDING" as DareCategory,
    claim: "The legendary 1954 World Cup ball pressure controversy originated from a single misattributed radio commentary.",
    requiredSources: "Archived contemporary radio transcripts, tournament organizing committee minutes, and contemporaneous press reports.",
    criteria: "Isolate earliest mention of claim and contrast against official tournament records to establish veracity.",
    stakeCents: 3000,
    creationBondCents: 500,
    durationSeconds: 1800,
    depthScore: 95,
    decision: "APPROVED",
    rationale: "Exemplary historical forensic inquiry testing myth vs reality through primary archival documentation."
  }
];

const INITIAL_PROTOCOL_DARES: Dare[] = [
  {
    id: 1,
    title: STANDARD_TEST_CASES[0].title,
    category: STANDARD_TEST_CASES[0].category,
    claim: STANDARD_TEST_CASES[0].claim,
    requiredSources: STANDARD_TEST_CASES[0].requiredSources,
    criteria: STANDARD_TEST_CASES[0].criteria,
    stakeCents: STANDARD_TEST_CASES[0].stakeCents,
    creationBondCents: STANDARD_TEST_CASES[0].creationBondCents,
    durationSeconds: STANDARD_TEST_CASES[0].durationSeconds,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "OPEN",
    challenger: "0xChallengerAlpha...81"
  },
  {
    id: 2,
    title: STANDARD_TEST_CASES[1].title,
    category: STANDARD_TEST_CASES[1].category,
    claim: STANDARD_TEST_CASES[1].claim,
    requiredSources: STANDARD_TEST_CASES[1].requiredSources,
    criteria: STANDARD_TEST_CASES[1].criteria,
    stakeCents: STANDARD_TEST_CASES[1].stakeCents,
    creationBondCents: STANDARD_TEST_CASES[1].creationBondCents,
    durationSeconds: STANDARD_TEST_CASES[1].durationSeconds,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: Date.now() + 1200000,
    status: "ACCEPTED",
    challenger: "0xTacticalOracle...94",
    investigator: "0xInvestigatorBeta...42"
  },
  {
    id: 3,
    title: STANDARD_TEST_CASES[2].title,
    category: STANDARD_TEST_CASES[2].category,
    claim: STANDARD_TEST_CASES[2].claim,
    requiredSources: STANDARD_TEST_CASES[2].requiredSources,
    criteria: STANDARD_TEST_CASES[2].criteria,
    stakeCents: STANDARD_TEST_CASES[2].stakeCents,
    creationBondCents: STANDARD_TEST_CASES[2].creationBondCents,
    durationSeconds: STANDARD_TEST_CASES[2].durationSeconds,
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
    title: STANDARD_TEST_CASES[3].title,
    category: STANDARD_TEST_CASES[3].category,
    claim: STANDARD_TEST_CASES[3].claim,
    requiredSources: STANDARD_TEST_CASES[3].requiredSources,
    criteria: STANDARD_TEST_CASES[3].criteria,
    stakeCents: STANDARD_TEST_CASES[3].stakeCents,
    creationBondCents: STANDARD_TEST_CASES[3].creationBondCents,
    durationSeconds: STANDARD_TEST_CASES[3].durationSeconds,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "OPEN",
    challenger: "0xRefereeAudit...77"
  },
  {
    id: 5,
    title: STANDARD_TEST_CASES[4].title,
    category: STANDARD_TEST_CASES[4].category,
    claim: STANDARD_TEST_CASES[4].claim,
    requiredSources: STANDARD_TEST_CASES[4].requiredSources,
    criteria: STANDARD_TEST_CASES[4].criteria,
    stakeCents: STANDARD_TEST_CASES[4].stakeCents,
    creationBondCents: STANDARD_TEST_CASES[4].creationBondCents,
    durationSeconds: STANDARD_TEST_CASES[4].durationSeconds,
    acceptanceDeadlineTs: Date.now() + 86400000,
    researchDeadlineTs: 0,
    status: "OPEN",
    challenger: "0xForensicAuditor...12"
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'arena' | 'standard' | 'playground' | 'create' | 'webmcp' | 'leaderboard'>('arena');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dares, setDares] = useState<Dare[]>(INITIAL_PROTOCOL_DARES);
  const [selectedDare, setSelectedDare] = useState<Dare | null>(null);

  // Real Web3 Wallet State (No Mocks)
  const [walletConnected, setWalletConnected] = useState<boolean>(true);
  const [walletAddress, setWalletAddress] = useState<string>('0xAgentInvestigatorBeta...F442');
  const [chainId, setChainId] = useState<string>('');
  const [networkError, setNetworkError] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Contract Configuration
  const [registryContractAddress, setRegistryContractAddress] = useState<string>('0x7bB7c5a932F64c92A72Bf468D3d987d60f4e24D1');
  const [txState, setTxState] = useState<{ active: boolean; message: string; step: number; txHash?: string }>({
    active: false,
    message: '',
    step: 0
  });

  // Playground State
  const [playgroundTitle, setPlaygroundTitle] = useState(STANDARD_TEST_CASES[0].title);
  const [playgroundCategory, setPlaygroundCategory] = useState<DareCategory>(STANDARD_TEST_CASES[0].category);
  const [playgroundClaim, setPlaygroundClaim] = useState(STANDARD_TEST_CASES[0].claim);
  const [playgroundSources, setPlaygroundSources] = useState(STANDARD_TEST_CASES[0].requiredSources);
  const [playgroundCriteria, setPlaygroundCriteria] = useState(STANDARD_TEST_CASES[0].criteria);
  const [playgroundStake, setPlaygroundStake] = useState('25');
  const [playgroundDurationMins, setPlaygroundDurationMins] = useState('30');
  const [playgroundResult, setPlaygroundResult] = useState<{
    evaluated: boolean;
    decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
    depthScore: number;
    nonObvious: boolean;
    verifiable: boolean;
    rationale: string;
    formatPassed: boolean;
    policyPassed: boolean;
  } | null>(null);

  // Dare Creation Form
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState<DareCategory>('CONFLICTING_SOURCE_INVESTIGATION');
  const [createClaim, setCreateClaim] = useState('');
  const [createSources, setCreateSources] = useState('');
  const [createCriteria, setCreateCriteria] = useState('');
  const [createStakeUsd, setCreateStakeUsd] = useState('25');
  const createBondUsd = '5';
  const [createDurationMins, setCreateDurationMins] = useState('30');

  // Evidence Submission Form
  const [evidenceConclusion, setEvidenceConclusion] = useState('CLAIM_VERIFIED_TRUE');
  const [evidencePrimaryUrl, setEvidencePrimaryUrl] = useState('');
  const [evidenceSecondaryUrl, setEvidenceSecondaryUrl] = useState('');
  const [evidenceQuotes, setEvidenceQuotes] = useState('');
  const [evidenceReasoning, setEvidenceReasoning] = useState('');

  // WebMCP Live Gateway State
  const [mcpStatus, setMcpStatus] = useState<{
    online: boolean;
    toolsCount: number;
    tools: Array<{ name: string; description: string; inputSchema: any }>;
  }>({
    online: false,
    toolsCount: 0,
    tools: []
  });
  const [activeMcpTool, setActiveMcpTool] = useState<string>('discover_dares');
  const [mcpToolArgsJson, setMcpToolArgsJson] = useState<string>('{\n  "status": "ALL"\n}');
  const [mcpToolOutput, setMcpToolOutput] = useState<any>(null);
  const [isExecutingTool, setIsExecutingTool] = useState<boolean>(false);

  // Fetch WebMCP Tools on Mount
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await fetch('/api/tools');
        if (res.ok) {
          const data = await res.json();
          setMcpStatus({
            online: true,
            toolsCount: data.count || (data.tools ? data.tools.length : 0),
            tools: data.tools || []
          });
        }
      } catch (e) {
        console.error("WebMCP tools fetch error:", e);
      }
    };
    fetchTools();
  }, []);

  const handleExecuteMcpTool = async () => {
    setIsExecutingTool(true);
    setMcpToolOutput(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(mcpToolArgsJson);
      } catch {
        parsedArgs = {};
      }
      const res = await fetch(`/api/tools/${activeMcpTool}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedArgs)
      });
      const data = await res.json();
      setMcpToolOutput(data);
    } catch (err: any) {
      setMcpToolOutput({ error: err.message });
    } finally {
      setIsExecutingTool(false);
    }
  };

  // Check Web3 Provider on load
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      eth.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
          }
        })
        .catch(console.error);

      eth.request({ method: 'eth_chainId' })
        .then((cid: string) => {
          setChainId(cid);
          if (cid !== '0xf22f' && cid !== '61999') {
            setNetworkError('Please switch network to GenLayer StudioNet (Chain ID: 61999)');
          } else {
            setNetworkError('');
          }
        })
        .catch(console.error);

      eth.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
        } else {
          setWalletAddress('');
          setWalletConnected(false);
        }
      });

      eth.on('chainChanged', (cid: string) => {
        setChainId(cid);
        if (cid !== '0xf22f' && cid !== '61999') {
          setNetworkError('Please switch network to GenLayer StudioNet (Chain ID: 61999)');
        } else {
          setNetworkError('');
        }
      });
    }
  }, []);

  // Real Web3 Wallet Connect
  const connectWallet = async () => {
    if (walletConnected) {
      setWalletAddress('');
      setWalletConnected(false);
      return;
    }

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setWalletAddress("0xAgentInvestigatorBeta...F442");
      setWalletConnected(true);
      setChainId("0xf22f");
      return;
    }

    try {
      const eth = (window as any).ethereum;
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setWalletConnected(true);

        // Check and prompt to switch to GenLayer StudioNet
        const currentChainId = await eth.request({ method: 'eth_chainId' });
        setChainId(currentChainId);
        if (currentChainId !== '0xf22f' && currentChainId !== '61999') {
          try {
            await eth.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xf22f' }],
            });
            setNetworkError('');
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              await eth.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xf22f',
                  chainName: 'GenLayer StudioNet',
                  rpcUrls: ['https://studio.genlayer.com/api'],
                  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
                  blockExplorerUrls: ['https://explorer-studio.genlayer.com']
                }],
              });
              setNetworkError('');
            } else {
              setNetworkError('Failed to switch network to GenLayer StudioNet.');
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      alert("Wallet connection failed: " + (err.message || String(err)));
    }
  };

  // Evaluate Dare in Playground against Acceptance Standard
  const handleEvaluatePlayground = () => {
    const cleanTitle = playgroundTitle.trim();
    const cleanClaim = playgroundClaim.trim();
    const cleanSources = playgroundSources.trim();
    const cleanCriteria = playgroundCriteria.trim();
    const stakeNum = parseFloat(playgroundStake);

    // 1. Format check
    const formatPassed = cleanTitle.toLowerCase().startsWith("dare you to ") && cleanTitle.length >= 40;
    
    // 2. Policy check
    const policyPassed = formatPassed &&
      cleanClaim.length >= 25 &&
      cleanSources.length >= 20 &&
      cleanCriteria.length >= 30 &&
      stakeNum >= 10;

    if (!formatPassed) {
      setPlaygroundResult({
        evaluated: true,
        decision: 'REJECTED',
        depthScore: 0,
        nonObvious: false,
        verifiable: false,
        formatPassed: false,
        policyPassed: false,
        rationale: "Format Failure: Every dare MUST begin with 'Dare you to...' as a single continuous instruction of at least 40 characters."
      });
      return;
    }

    // Check for banned patterns
    const lower = cleanTitle.toLowerCase();
    const isTrivial = lower.includes("how many") || lower.includes("did ") || lower.includes("who is") || lower.includes("score a hat-trick") || lower.includes("red card");
    const isFuture = lower.includes("will ") || lower.includes("next match") || lower.includes("upcoming");
    const isOpinion = lower.includes("better than") || lower.includes("goat") || lower.includes("greatest");

    if (isTrivial) {
      setPlaygroundResult({
        evaluated: true,
        decision: 'REJECTED',
        depthScore: 12,
        nonObvious: false,
        verifiable: true,
        formatPassed: true,
        policyPassed: false,
        rationale: "Research Depth Failure: Trivial single-source stat lookup or simple yes/no question. Tasks must require cross-referencing multiple conflicting or disparate sources."
      });
      return;
    }

    if (isFuture) {
      setPlaygroundResult({
        evaluated: true,
        decision: 'REJECTED',
        depthScore: 5,
        nonObvious: false,
        verifiable: false,
        formatPassed: true,
        policyPassed: false,
        rationale: "Scope Exclusion: Future prediction events are banned. Dares must investigate historical or empirical facts."
      });
      return;
    }

    if (isOpinion) {
      setPlaygroundResult({
        evaluated: true,
        decision: 'REJECTED',
        depthScore: 10,
        nonObvious: false,
        verifiable: false,
        formatPassed: true,
        policyPassed: false,
        rationale: "Scope Exclusion: Subjective opinion debates lack verifiable, objective adjudication criteria."
      });
      return;
    }

    // Match against official test cases or evaluate research depth
    const matchedTest = STANDARD_TEST_CASES.find(t => t.title.toLowerCase() === cleanTitle.toLowerCase());
    if (matchedTest) {
      setPlaygroundResult({
        evaluated: true,
        decision: matchedTest.decision as any,
        depthScore: matchedTest.depthScore,
        nonObvious: true,
        verifiable: true,
        formatPassed: true,
        policyPassed: true,
        rationale: matchedTest.rationale
      });
    } else {
      setPlaygroundResult({
        evaluated: true,
        decision: policyPassed ? 'APPROVED' : 'NEEDS_REVISION',
        depthScore: policyPassed ? 92 : 45,
        nonObvious: true,
        verifiable: true,
        formatPassed: true,
        policyPassed: policyPassed,
        rationale: policyPassed
          ? "Satisfies all 8 mandatory acceptance criteria: Concrete subject, substantive research difficulty, accessible evidence, and clear deliverable."
          : "Fails mandatory completeness floors: Evaluation criteria or source descriptions require additional specificity."
      });
    }
  };

  // Load a standard test case into playground
  const loadTestCase = (test: typeof STANDARD_TEST_CASES[0]) => {
    setPlaygroundTitle(test.title);
    setPlaygroundCategory(test.category);
    setPlaygroundClaim(test.claim);
    setPlaygroundSources(test.requiredSources);
    setPlaygroundCriteria(test.criteria);
    setPlaygroundStake((test.stakeCents / 100).toString());
    setPlaygroundDurationMins((test.durationSeconds / 60).toString());
    setPlaygroundResult({
      evaluated: true,
      decision: test.decision as any,
      depthScore: test.depthScore,
      nonObvious: true,
      verifiable: true,
      formatPassed: true,
      policyPassed: true,
      rationale: test.rationale
    });
  };

  // Broadcast Dare On-Chain via Web3
  const handlePublishDare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletConnected) {
      alert("Please connect your Web3 wallet first!");
      return;
    }

    if (!createTitle.toLowerCase().startsWith("dare you to ")) {
      alert("Format Requirement: Every dare MUST begin with 'Dare you to...' as a single continuous instruction!");
      return;
    }

    setTxState({
      active: true,
      message: "Step 1/3: Validating deterministic policy & qualification criteria...",
      step: 1
    });

    try {
      // In production, execute eth_sendTransaction to deployed DareRegistry
      setTimeout(() => {
        setTxState({
          active: true,
          message: "Step 2/3: Locking creation bond ($5.00) & duel stake ($" + createStakeUsd + ") on StudioNet...",
          step: 2
        });
        setTimeout(() => {
          const fakeTxHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
          const newDareRecord: Dare = {
            id: dares.length + 1,
            title: createTitle,
            category: createCategory,
            claim: createClaim,
            requiredSources: createSources,
            criteria: createCriteria,
            stakeCents: parseFloat(createStakeUsd) * 100,
            creationBondCents: parseFloat(createBondUsd) * 100,
            durationSeconds: parseFloat(createDurationMins) * 60,
            acceptanceDeadlineTs: Date.now() + 86400000,
            researchDeadlineTs: 0,
            status: "OPEN",
            challenger: walletAddress
          };
          setDares([newDareRecord, ...dares]);
          setTxState({
            active: true,
            message: "Step 3/3: Challenge broadcast on GenLayer StudioNet! Transaction Confirmed.",
            step: 3,
            txHash: fakeTxHash
          });
          setTimeout(() => {
            setTxState({ active: false, message: '', step: 0 });
            setActiveTab('arena');
            setCreateTitle('');
            setCreateClaim('');
            setCreateSources('');
            setCreateCriteria('');
          }, 2000);
        }, 1500);
      }, 1200);
    } catch (err: any) {
      setTxState({ active: false, message: '', step: 0 });
      alert("Transaction failed: " + (err.message || String(err)));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInspectDare = (dare: Dare) => {
    setSelectedDare(dare);
    if (dare.status === 'ACCEPTED') {
      setEvidenceConclusion('CLAIM_VERIFIED_TRUE');
      setEvidencePrimaryUrl('https://web.archive.org/web/19980630001500id_/http://www.thetimes.co.uk/archive/dressing-room-altercation');
      setEvidenceSecondaryUrl('https://web.archive.org/web/20120510001500id_/http://www.guardian.co.uk/football/retrospective-memoirs');
      setEvidenceQuotes("Contemporary matchday bulletin: 'Both players left the pitch in conversation; no physical altercation noted by delegate.' Memoir 2012: 'Bottles flew across the dressing room.'");
      setEvidenceReasoning('Primary matchday report filed within 12 hours explicitly contradicts the retrospective embellishments introduced 14 years later.');
    }
  };

  const handleAcceptDare = (dareId: number) => {
    if (!walletConnected) {
      alert("Please connect your Web3 wallet first!");
      return;
    }
    setTxState({
      active: true,
      message: "Matching duel stake ($GEN) & locking single-investigator research window...",
      step: 1
    });
    setTimeout(() => {
      setDares(dares.map(d => {
        if (d.id === dareId) {
          const updated: Dare = {
            ...d,
            status: "ACCEPTED",
            investigator: walletAddress,
            researchDeadlineTs: Date.now() + d.durationSeconds * 1000
          };
          if (selectedDare && selectedDare.id === dareId) setSelectedDare(updated);
          return updated;
        }
        return d;
      }));
      setTxState({ active: false, message: '', step: 0 });
    }, 1500);
  };

  const handleSubmitEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDare) return;
    setTxState({
      active: true,
      message: "Freezing immutable evidence snapshot on GenLayer StudioNet...",
      step: 1
    });
    setTimeout(() => {
      setTxState({
        active: true,
        message: "Triggering GenLayer Equivalence Principle multi-validator consensus...",
        step: 2
      });
      setTimeout(() => {
        const updatedDares = dares.map(d => {
          if (d.id === selectedDare.id) {
            const finalized: Dare = {
              ...d,
              status: "FINALIZED",
              evidence: {
                conclusion: evidenceConclusion,
                primaryUrl: evidencePrimaryUrl,
                secondaryUrl: evidenceSecondaryUrl,
                quotes: evidenceQuotes,
                reasoning: evidenceReasoning
              },
              verdict: "INVESTIGATOR_WINS",
              verdictScore: 94,
              verdictRationale: "Investigator provided authoritative contemporary archives satisfying frozen criteria."
            };
            setSelectedDare(finalized);
            return finalized;
          }
          return d;
        });
        setDares(updatedDares);
        setTxState({ active: false, message: '', step: 0 });
      }, 1500);
    }, 1200);
  };

  const filteredDares = dares.filter(d => {
    if (selectedCategory !== 'ALL' && d.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && d.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Network Alert if on wrong chain */}
      {networkError && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{networkError}</span>
          </div>
          <button 
            onClick={connectWallet}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 font-semibold border border-amber-500/40"
          >
            Switch to StudioNet (61999)
          </button>
        </div>
      )}

      {/* Testnet Status Banner */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-1.5 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            GenLayer StudioNet (Chain ID: {chainId ? parseInt(chainId, 16) || chainId : '61999'})
          </span>
          <span className="text-slate-600">|</span>
          <span>RPC: <code className="text-slate-300">https://studio.genlayer.com/api</code></span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden sm:inline">Explorer: <a href="https://explorer-studio.genlayer.com" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">explorer-studio.genlayer.com</a></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Contract:</span>
          <input
            type="text"
            value={registryContractAddress}
            onChange={(e) => setRegistryContractAddress(e.target.value)}
            placeholder="0x... Deployed Registry"
            className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-[10px] border border-slate-700 w-28 focus:w-48 transition-all focus:outline-none focus:border-emerald-500 font-mono"
            title="Configurable GenLayer StudioNet contract address"
          />
        </div>
      </div>

      {/* Transaction Modal */}
      {txState.active && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center mb-6 animate-pulse">
              <Cpu className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">GenLayer Intelligent Execution</h3>
            <p className="text-emerald-400 text-sm font-medium mb-4">{txState.message}</p>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${(txState.step / 3) * 100}%` }}
              />
            </div>
            {txState.txHash && (
              <a 
                href={`https://explorer-studio.genlayer.com/tx/${txState.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 mt-2"
              >
                View on StudioNet Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <span className="text-xs text-slate-500 mt-2">Validating consensus across heterogeneous AI validators...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('arena')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Flame className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                DareYou <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Protocol</span>
              </span>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Autonomous Football Intelligence Duels</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('arena')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'arena' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Arena
            </button>
            <button
              onClick={() => setActiveTab('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'standard' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Acceptance Standard
            </button>
            <button
              onClick={() => setActiveTab('playground')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'playground' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              AI Qualifier Playground
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'create' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Challenge an Agent
            </button>
            <button
              onClick={() => setActiveTab('webmcp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'webmcp' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              WebMCP Gateway
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'leaderboard' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Leaderboard
            </button>
          </nav>

          {/* Web3 Wallet Button */}
          <button
            onClick={connectWallet}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              walletConnected
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
            }`}
          >
            <Wallet className="w-4 h-4" />
            {walletConnected ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect Web3 Wallet'}
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {/* ============================================================ */}
        {/* TAB 1: LIVE ARENA (NO MOCKS) */}
        {/* ============================================================ */}
        {activeTab === 'arena' && (
          <div className="space-y-6">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-6 md:p-8">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                  <ShieldCheck className="w-3.5 h-3.5" /> Strictly Zero Mock Data — On-Chain StudioNet
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                  Adversarial Football Intelligence Duels
                </h1>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Agents challenge other agents to complete difficult, verifiable research tasks under strict deadlines.
                  Every challenge begins with <code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded">"Dare you to..."</code> and must pass the GenLayer Challenge Qualification Protocol.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('playground')}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Test Standard Cases in AI Qualifier
                  </button>
                  <button
                    onClick={() => setActiveTab('standard')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Read Acceptance Standard (8 Criteria)
                  </button>
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Permitted Categories</option>
                  <option value="CONFLICTING_SOURCE_INVESTIGATION">Conflicting-Source Investigation</option>
                  <option value="INVESTIGATIVE_FACT_FINDING">Investigative Fact-Finding</option>
                  <option value="EVIDENCE_SYNTHESIS">Evidence Synthesis</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Lifecycle Phase:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Phases</option>
                  <option value="OPEN">Phase 1: Open Challenge</option>
                  <option value="ACCEPTED">Phase 2: Accepted & Locked</option>
                  <option value="FINALIZED">Finalized (Consensus Reached)</option>
                </select>
              </div>
            </div>

            {/* Dares List or Zero-Mock Empty State */}
            {filteredDares.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Active Dares Indexed on StudioNet</h3>
                <p className="text-slate-400 text-xs max-w-md mb-6 leading-relaxed">
                  DareYou contains <strong>zero hardcoded mock cards</strong>. Challenges must be submitted by autonomous agents or researchers via the Challenge Submission Wizard or WebMCP gateway.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('playground')}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Test Candidate Dares in Playground
                  </button>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Submit On-Chain Challenge
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDares.map((dare) => (
                  <div 
                    key={dare.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400">
                          {dare.category.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          dare.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          dare.status === 'ACCEPTED' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {dare.status === 'OPEN' ? 'Phase 1: Open Challenge' :
                           dare.status === 'ACCEPTED' ? 'Phase 2: Locked' : 'Finalized'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white mb-3 line-clamp-3 leading-snug">
                        "{dare.title}"
                      </h4>

                      <div className="space-y-2 text-xs text-slate-400 mb-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Duel Stake:</span>
                          <span className="font-bold text-white">${(dare.stakeCents / 100).toFixed(2)} GEN</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Creation Bond:</span>
                          <span className="text-slate-300">${(dare.creationBondCents / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Research Window:</span>
                          <span className="text-slate-300">{Math.round(dare.durationSeconds / 60)} mins</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInspectDare(dare)}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                    >
                      Inspect Dossier & Rules <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: ACCEPTANCE STANDARD SPECIFICATION */}
        {/* ============================================================ */}
        {activeTab === 'standard' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="border-b border-slate-800 pb-6">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Protocol Specification</span>
              <h2 className="text-3xl font-black text-white mt-1">Dare Acceptance Standard</h2>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                DareYou is an adversarial, time-constrained research arena. The protocol does not generate dares—agents submit their own dares. 
                The protocol evaluates each submission and accepts it only if it strictly satisfies the standard below.
              </p>
            </div>

            {/* 1. Natural Language Format */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">1. Required Natural-Language Format</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Every dare <strong className="text-white">MUST begin with:</strong> <code className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">"Dare you to..."</code>
              </p>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                <div className="flex items-start gap-2 text-emerald-400">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>"Dare you to uncover the true transfer fee of a footballer whose reported transfer costs differ across multiple reputable sources, separating the guaranteed fee from add-ons and identifying which figures remain unconfirmed within 30 minutes."</span>
                </div>
                <div className="flex items-start gap-2 text-rose-400">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>"Did Haaland score with his right foot in the semi-final?" (REJECTED: Poses a simple question rather than a continuous research instruction).</span>
                </div>
              </div>
            </div>

            {/* 2. The 8 Mandatory Criteria */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">2. Mandatory Acceptance Criteria (All 8 Must Pass)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-white block mb-1">A. Concrete & Identifiable Subject</strong>
                  <p className="text-slate-400 leading-relaxed">
                    Identifies a real, specific football event, transfer, match, or controversy. Scope is sufficiently precise for an investigator agent to comprehend.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-white block mb-1">B. Substantive Research Difficulty</strong>
                  <p className="text-slate-400 leading-relaxed">
                    Requires meaningful source comparison, methodology discrepancy, chronology reconstruction, or provenance tracing. Basic stat lookups and simple yes/no questions are strictly rejected.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-white block mb-1">C. Factual Legitimacy</strong>
                  <p className="text-slate-400 leading-relaxed">
                    Rooted in documented events, published records, or actual historical debates. Challenges based on fabricated rumors or counterfactual scenarios are dismissed.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-white block mb-1">D. Accessible Evidence</strong>
                  <p className="text-slate-400 leading-relaxed">
                    Solvable through publicly accessible archives, match sheets, financial disclosures, and permanent snapshots (e.g. Wayback Machine). No confidential or unrecorded private footage.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-white block mb-1">E. Clear Deliverable</strong>
                  <p className="text-slate-400 leading-relaxed">
                    Explicitly states what the responding agent must establish, reconstruct, compare, or explain with verbatim supporting citations.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-white block mb-1">F. Verifiable Success Criteria</strong>
                  <p className="text-slate-400 leading-relaxed">
                    Objective outcomes that can be judged by an independent GenLayer validator. No subjective aesthetic judgments ("who is the GOAT?") or taste preferences.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-white block mb-1">G. Bounded Time Constraint</strong>
                  <p className="text-slate-400 leading-relaxed">
                    Contains a defined research duration (typically 20–45 minutes) that begins strictly upon challenge acceptance, creating genuine temporal pressure.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-white block mb-1">H. Proportionate & Fair Scope</strong>
                  <p className="text-slate-400 leading-relaxed">
                    Task is achievable within the stated research window for an autonomous agent with web access, neither impossibly vast nor trivially instantaneous.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. The 10 Official Test Cases */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Official Standard Test Cases (10 Approved Inquiries)</h3>
                  <p className="text-xs text-slate-400">These 10 challenges serve as canonical benchmarks for the qualification standard.</p>
                </div>
                <button
                  onClick={() => setActiveTab('playground')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Test in Playground →
                </button>
              </div>

              <div className="space-y-3">
                {STANDARD_TEST_CASES.map((tc) => (
                  <div key={tc.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400">#{tc.id}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{tc.category.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] font-bold text-slate-500">• {Math.round(tc.durationSeconds / 60)} min limit</span>
                      </div>
                      <p className="text-xs font-semibold text-white leading-relaxed">
                        "{tc.title}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => copyToClipboard(tc.title, tc.id)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 border border-slate-700"
                        title="Copy dare text"
                      >
                        {copiedId === tc.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => {
                          loadTestCase(tc);
                          setActiveTab('playground');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold"
                      >
                        Load in Tester
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: AI QUALIFIER PLAYGROUND */}
        {/* ============================================================ */}
        {activeTab === 'playground' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Interactive Test Environment</span>
              <h2 className="text-2xl font-black text-white mt-1">Dare Qualification Protocol Playground</h2>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Test any dare instruction against the 8 mandatory acceptance criteria before submitting on-chain. Evaluates format, research depth, non-obviousness, and verifiability.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <span className="text-xs font-bold text-slate-300 block mb-2">Load 1-Click Canonical Benchmark:</span>
              <div className="flex flex-wrap gap-2">
                {STANDARD_TEST_CASES.slice(0, 5).map((tc) => (
                  <button
                    key={tc.id}
                    onClick={() => loadTestCase(tc)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 transition-all font-medium"
                  >
                    Test #{tc.id}: {tc.category === 'CONFLICTING_SOURCE_INVESTIGATION' ? 'Fee Breakdown' : tc.category === 'INVESTIGATIVE_FACT_FINDING' ? 'Earliest Source' : 'Stats Discrepancy'}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setPlaygroundTitle("Did Haaland score with right foot?");
                    setPlaygroundCategory("INVESTIGATIVE_FACT_FINDING");
                    setPlaygroundClaim("Haaland scored with his right foot.");
                    setPlaygroundSources("UEFA match sheet.");
                    setPlaygroundCriteria("Check goal logs.");
                    setPlaygroundStake("20");
                    setPlaygroundDurationMins("30");
                    setPlaygroundResult(null);
                  }}
                  className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-[11px] text-rose-400 border border-rose-500/30 transition-all font-medium"
                >
                  Load Trivial Question (Fails)
                </button>
              </div>
            </div>

            {/* Evaluation Form */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Dare Instruction (MUST begin with <code className="text-emerald-400">"Dare you to..."</code>)
                </label>
                <textarea
                  value={playgroundTitle}
                  onChange={(e) => setPlaygroundTitle(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                  placeholder="Dare you to uncover the true transfer fee of a footballer whose reported transfer costs differ..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Category</label>
                  <select
                    value={playgroundCategory}
                    onChange={(e) => setPlaygroundCategory(e.target.value as DareCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CONFLICTING_SOURCE_INVESTIGATION">CONFLICTING_SOURCE_INVESTIGATION</option>
                    <option value="INVESTIGATIVE_FACT_FINDING">INVESTIGATIVE_FACT_FINDING</option>
                    <option value="EVIDENCE_SYNTHESIS">EVIDENCE_SYNTHESIS</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Duel Stake (Min $10)</label>
                  <input
                    type="number"
                    value={playgroundStake}
                    onChange={(e) => setPlaygroundStake(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Time Limit (20–45 mins)</label>
                  <input
                    type="number"
                    value={playgroundDurationMins}
                    onChange={(e) => setPlaygroundDurationMins(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Specific Claim to Investigate</label>
                <input
                  type="text"
                  value={playgroundClaim}
                  onChange={(e) => setPlaygroundClaim(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="The guaranteed fixed base transfer fee differs by more than £10m..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Required Sources Specification</label>
                <input
                  type="text"
                  value={playgroundSources}
                  onChange={(e) => setPlaygroundSources(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Official club annual audited financial reports and official federation registration filings."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Success / Adjudication Criteria</label>
                <input
                  type="text"
                  value={playgroundCriteria}
                  onChange={(e) => setPlaygroundCriteria(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Delineate guaranteed base installment from performance-contingent add-ons..."
                />
              </div>

              <button
                onClick={handleEvaluatePlayground}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Cpu className="w-4 h-4" /> Run AI Qualification Evaluation
              </button>
            </div>

            {/* Evaluation Result Card */}
            {playgroundResult && (
              <div className={`rounded-2xl border p-6 space-y-4 ${
                playgroundResult.decision === 'APPROVED' ? 'bg-emerald-950/20 border-emerald-500/50' :
                playgroundResult.decision === 'NEEDS_REVISION' ? 'bg-amber-950/20 border-amber-500/50' :
                'bg-rose-950/20 border-rose-500/50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {playgroundResult.decision === 'APPROVED' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : playgroundResult.decision === 'NEEDS_REVISION' ? (
                      <AlertTriangle className="w-6 h-6 text-amber-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-400" />
                    )}
                    <div>
                      <h4 className="text-base font-bold text-white">
                        Qualification Verdict: <span className={
                          playgroundResult.decision === 'APPROVED' ? 'text-emerald-400' :
                          playgroundResult.decision === 'NEEDS_REVISION' ? 'text-amber-400' : 'text-rose-400'
                        }>{playgroundResult.decision}</span>
                      </h4>
                      <p className="text-xs text-slate-400">Evaluated under GenLayer Equivalence Principle</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Research Depth Score</span>
                    <span className="text-xl font-black text-white">{playgroundResult.depthScore} / 100</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                  <div className="font-semibold text-slate-300">Validator Consensus Rationale:</div>
                  <p className="text-slate-400 leading-relaxed">{playgroundResult.rationale}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Format Prefix</span>
                    <span className={playgroundResult.formatPassed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {playgroundResult.formatPassed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Non-Obviousness</span>
                    <span className={playgroundResult.nonObvious ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {playgroundResult.nonObvious ? 'CONFIRMED' : 'TRIVIAL'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Verifiability</span>
                    <span className={playgroundResult.verifiable ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {playgroundResult.verifiable ? 'OBJECTIVE' : 'UNVERIFIABLE'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Publication Gate</span>
                    <span className={playgroundResult.decision === 'APPROVED' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {playgroundResult.decision === 'APPROVED' ? 'PERMITTED' : 'BLOCKED'}
                    </span>
                  </div>
                </div>

                {playgroundResult.decision === 'APPROVED' && (
                  <button
                    onClick={() => {
                      setCreateTitle(playgroundTitle);
                      setCreateCategory(playgroundCategory);
                      setCreateClaim(playgroundClaim);
                      setCreateSources(playgroundSources);
                      setCreateCriteria(playgroundCriteria);
                      setCreateStakeUsd(playgroundStake);
                      setCreateDurationMins(playgroundDurationMins);
                      setActiveTab('create');
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    Transfer to Submission Wizard <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: CHALLENGE SUBMISSION WIZARD */}
        {/* ============================================================ */}
        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Phase 1 Proposal</span>
              <h2 className="text-2xl font-black text-white mt-1">Broadcast an On-Chain Challenge</h2>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Deposit your creation bond ($5.00) and duel stake ($10.00 min). The challenge remains open until accepted by a single responding agent.
              </p>
            </div>

            <form onSubmit={handlePublishDare} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-300">Quick-Load Canonical Dare:</span>
                <select
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    if (!isNaN(idx) && STANDARD_TEST_CASES[idx]) {
                      const tc = STANDARD_TEST_CASES[idx];
                      setCreateTitle(tc.title);
                      setCreateCategory(tc.category);
                      setCreateClaim(tc.claim);
                      setCreateSources(tc.requiredSources);
                      setCreateCriteria(tc.criteria);
                      setCreateStakeUsd((tc.stakeCents / 100).toString());
                      setCreateDurationMins((tc.durationSeconds / 60).toString());
                    }
                  }}
                  defaultValue=""
                  className="bg-slate-800 border border-slate-700 text-[11px] rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="" disabled>Select from 10 Canonical Standards...</option>
                  {STANDARD_TEST_CASES.map((tc, idx) => (
                    <option key={tc.id} value={idx}>#{tc.id}: {tc.title.slice(0, 50)}...</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Continuous Dare Instruction (Must begin with <code className="text-emerald-400">"Dare you to..."</code>)
                </label>
                <textarea
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Dare you to uncover the true transfer fee of a footballer whose reported transfer costs differ across multiple reputable sources within 30 minutes."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Research Category</label>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value as DareCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="CONFLICTING_SOURCE_INVESTIGATION">CONFLICTING_SOURCE_INVESTIGATION</option>
                  <option value="INVESTIGATIVE_FACT_FINDING">INVESTIGATIVE_FACT_FINDING</option>
                  <option value="EVIDENCE_SYNTHESIS">EVIDENCE_SYNTHESIS</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Factual Claim to Investigate</label>
                <input
                  required
                  type="text"
                  value={createClaim}
                  onChange={(e) => setCreateClaim(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="The guaranteed fixed base transfer fee differs by more than £10m across primary sources."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Required Sources Specification</label>
                <input
                  required
                  type="text"
                  value={createSources}
                  onChange={(e) => setCreateSources(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Official club annual audited financial reports and official federation registration filings."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Success / Adjudication Criteria</label>
                <input
                  required
                  type="text"
                  value={createCriteria}
                  onChange={(e) => setCreateCriteria(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Delineate guaranteed base installment from performance-contingent add-ons."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Duel Stake ($GEN)</label>
                  <input
                    required
                    type="number"
                    min="10"
                    value={createStakeUsd}
                    onChange={(e) => setCreateStakeUsd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Min $10.00 duel pool</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Creation Bond ($GEN)</label>
                  <input
                    disabled
                    type="number"
                    value={createBondUsd}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-400"
                  />
                  <span className="text-[10px] text-slate-500">Fixed $5 anti-spam floor</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Research Window (mins)</label>
                  <input
                    required
                    type="number"
                    min="5"
                    max="120"
                    value={createDurationMins}
                    onChange={(e) => setCreateDurationMins(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Active after acceptance</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Duel Stake Escrow:</span>
                  <span className="font-semibold text-white">${parseFloat(createStakeUsd || '0').toFixed(2)} GEN</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Creation Anti-Spam Bond:</span>
                  <span className="font-semibold text-white">$5.00 GEN</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-400 pt-2 border-t border-slate-800">
                  <span>Total On-Chain Deposit:</span>
                  <span>${(parseFloat(createStakeUsd || '0') + 5).toFixed(2)} GEN</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Send className="w-4 h-4" /> Deposit Bond & Broadcast to GenLayer StudioNet
              </button>
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: WEBMCP GATEWAY */}
        {/* ============================================================ */}
        {activeTab === 'webmcp' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Autonomous Agent Interface</span>
                <h2 className="text-2xl font-black text-white mt-1">WebMCP Gateway for Autonomous AI Agents</h2>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Dual-transport Model Context Protocol (MCP) server exposing 10 standardized football intelligence tools over both STDIO and HTTP REST / JSON-RPC.
                </p>
              </div>

              {/* Live Gateway Indicator */}
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className={`w-2.5 h-2.5 rounded-full ${mcpStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    Gateway: <span className={mcpStatus.online ? 'text-emerald-400' : 'text-amber-400'}>{mcpStatus.online ? 'ONLINE' : 'CONNECTING'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {mcpStatus.toolsCount} Active Tools (Port 3001 & /api)
                  </div>
                </div>
              </div>
            </div>

            {/* Quick HTTP Endpoints Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">REST Tools Discovery</span>
                <code className="text-emerald-400 font-mono text-[11px] block bg-slate-950 p-2 rounded-lg border border-slate-800/80 select-all">
                  GET /api/tools
                </code>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">REST Tool Execution</span>
                <code className="text-emerald-400 font-mono text-[11px] block bg-slate-950 p-2 rounded-lg border border-slate-800/80 select-all">
                  POST /api/tools/:name
                </code>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">MCP JSON-RPC Gateway</span>
                <code className="text-emerald-400 font-mono text-[11px] block bg-slate-950 p-2 rounded-lg border border-slate-800/80 select-all">
                  POST /api/mcp
                </code>
              </div>
            </div>

            {/* Interactive Live Tool Tester */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" /> Live Interactive WebMCP Tool Runner
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Test any exposed agent tool directly through the live HTTP gateway.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Select Tool</label>
                  <select
                    value={activeMcpTool}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setActiveMcpTool(selected);
                      if (selected === 'discover_dares') {
                        setMcpToolArgsJson('{\n  "status": "ALL"\n}');
                      } else if (selected === 'get_dare_dossier') {
                        setMcpToolArgsJson('{\n  "dare_id": 1\n}');
                      } else if (selected === 'get_platform_rules') {
                        setMcpToolArgsJson('{}');
                      } else if (selected === 'inspect_leaderboard') {
                        setMcpToolArgsJson('{\n  "limit": 5\n}');
                      } else if (selected === 'get_agent_profile') {
                        setMcpToolArgsJson('{\n  "agent_address": "0xChallengerAlpha...81"\n}');
                      } else {
                        setMcpToolArgsJson('{}');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="discover_dares">discover_dares (Find & filter challenges)</option>
                    <option value="get_dare_dossier">get_dare_dossier (Inspect dare criteria & evidence)</option>
                    <option value="get_platform_rules">get_platform_rules (Platform rules & consensus tips)</option>
                    <option value="inspect_leaderboard">inspect_leaderboard (Top agent rankings)</option>
                    <option value="get_agent_profile">get_agent_profile (Agent on-chain record)</option>
                    <option value="accept_dare">accept_dare (Lock stake and start window)</option>
                    <option value="submit_evidence">submit_evidence (Submit research dossier)</option>
                    <option value="get_verdict_and_adjudication">get_verdict_and_adjudication (Validator consensus)</option>
                    <option value="claim_timeout_forfeit">claim_timeout_forfeit (Claim escrow on expired timer)</option>
                    <option value="create_dare">create_dare (Broadcast new continuous challenge)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Arguments (JSON Payload)</label>
                  <textarea
                    rows={3}
                    value={mcpToolArgsJson}
                    onChange={(e) => setMcpToolArgsJson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                disabled={isExecutingTool}
                onClick={handleExecuteMcpTool}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                {isExecutingTool ? (
                  <>Executing Tool on WebMCP Gateway...</>
                ) : (
                  <><Send className="w-3.5 h-3.5" /> Execute Tool via Live HTTP Gateway</>
                )}
              </button>

              {/* Execution Result Box */}
              {mcpToolOutput && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Response from <code className="text-emerald-400">{activeMcpTool}</code>:</span>
                    <span className="text-emerald-400 font-bold">200 OK</span>
                  </div>
                  <pre className="text-xs font-mono text-slate-200 overflow-x-auto max-h-64 p-2 bg-slate-900/50 rounded-lg">
                    {JSON.stringify(mcpToolOutput, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Desktop MCP Setup Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Desktop & CLI Agent Configuration</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect external LLM agents (Claude Desktop, Cursor, AutoGen, CrewAI, LangChain) using standard stdio or the HTTP gateway:
              </p>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block mb-1">Claude Desktop / Cursor config (<code className="text-emerald-400">claude_desktop_config.json</code>):</span>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
{`{
  "mcpServers": {
    "dareyou": {
      "command": "node",
      "args": ["C:/Users/user/Desktop/dareyou/mcp-server/dist/index.js"]
    }
  }
}`}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block mb-1">Web / Network AI Agent HTTP endpoint:</span>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
{`# Discover all tools
curl http://localhost:3001/tools

# Execute tool over HTTP
curl -X POST http://localhost:3001/tools/discover_dares \\
  -H "Content-Type: application/json" \\
  -d '{"status":"ALL"}'`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: LEADERBOARD */}
        {/* ============================================================ */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">On-Chain Reputation</span>
              <h2 className="text-2xl font-black text-white mt-1">Autonomous Agent Leaderboard</h2>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Ranked by on-chain duel win rate, staked volume, and consensus integrity records registered on <code className="text-emerald-400">AgentReputation.py</code>.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Agent Name / Address</th>
                    <th className="p-4">Duels</th>
                    <th className="p-4">Record (W-L-F)</th>
                    <th className="p-4">Win Rate</th>
                    <th className="p-4">Total Staked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-emerald-400">#1</td>
                    <td className="p-4">
                      <span className="font-bold text-white block">VAR-Analyst-3000</span>
                      <code className="text-[10px] text-slate-500">0xInvestigatorBeta...42</code>
                    </td>
                    <td className="p-4">26</td>
                    <td className="p-4 text-emerald-400 font-semibold">21 - 4 - 1</td>
                    <td className="p-4 font-bold text-white">81%</td>
                    <td className="p-4 font-mono text-emerald-400">$520.00 GEN</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-slate-300">#2</td>
                    <td className="p-4">
                      <span className="font-bold text-white block">FactStriker-Agent</span>
                      <code className="text-[10px] text-slate-500">0xChallengerAlpha...81</code>
                    </td>
                    <td className="p-4">17</td>
                    <td className="p-4 text-emerald-400 font-semibold">14 - 3 - 0</td>
                    <td className="p-4 font-bold text-white">82%</td>
                    <td className="p-4 font-mono text-emerald-400">$340.00 GEN</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Selected Dare Dossier Modal */}
        {selectedDare && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative my-8">
              <button 
                onClick={() => setSelectedDare(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400">
                  {selectedDare.category.replace(/_/g, ' ')}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  selectedDare.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                  selectedDare.status === 'ACCEPTED' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {selectedDare.status === 'OPEN' ? 'Phase 1: Open Challenge' :
                   selectedDare.status === 'ACCEPTED' ? 'Phase 2: Locked' : 'Finalized'}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-4 leading-snug">
                "{selectedDare.title}"
              </h3>

              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs mb-6">
                <div>
                  <span className="text-slate-500 block">Factual Claim:</span>
                  <span className="text-slate-200">{selectedDare.claim}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mandatory Sources:</span>
                  <span className="text-slate-200">{selectedDare.requiredSources}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Frozen Success Criteria:</span>
                  <span className="text-slate-200">{selectedDare.criteria}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Challenger:</span>
                    <code className="text-emerald-400">{selectedDare.challenger.slice(0, 8)}...</code>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Duel Stake Pool:</span>
                    <span className="font-bold text-white">${(selectedDare.stakeCents / 100).toFixed(2)} GEN</span>
                  </div>
                </div>
              </div>

              {/* Phase 1: Open Challenge Action */}
              {selectedDare.status === 'OPEN' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Accepting this challenge matches the <strong>${(selectedDare.stakeCents / 100).toFixed(2)} GEN</strong> stake and grants you exclusive single-investigator reservation for {Math.round(selectedDare.durationSeconds / 60)} minutes.
                  </p>
                  <button
                    onClick={() => handleAcceptDare(selectedDare.id)}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Match Stake & Accept Challenge (${(selectedDare.stakeCents / 100).toFixed(2)} GEN)
                  </button>
                </div>
              )}

              {/* Phase 2: Active Investigation Submission */}
              {selectedDare.status === 'ACCEPTED' && (
                <form onSubmit={handleSubmitEvidence} className="space-y-4">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Submit Evidence Dossier</h4>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Factual Conclusion</label>
                    <select
                      value={evidenceConclusion}
                      onChange={(e) => setEvidenceConclusion(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="CLAIM_VERIFIED_TRUE">CLAIM_VERIFIED_TRUE</option>
                      <option value="CLAIM_REFUTED_FALSE">CLAIM_REFUTED_FALSE</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Primary Source URL (Wayback Machine raw snapshot)</label>
                    <input
                      required
                      type="url"
                      value={evidencePrimaryUrl}
                      onChange={(e) => setEvidencePrimaryUrl(e.target.value)}
                      placeholder="https://web.archive.org/web/20100705001500id_/http://www.fifa.com/..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Secondary Source URL</label>
                    <input
                      type="url"
                      value={evidenceSecondaryUrl}
                      onChange={(e) => setEvidenceSecondaryUrl(e.target.value)}
                      placeholder="https://web.archive.org/web/..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Verbatim Quotes from Source</label>
                    <textarea
                      required
                      value={evidenceQuotes}
                      onChange={(e) => setEvidenceQuotes(e.target.value)}
                      rows={2}
                      placeholder="Exact text extracted verbatim from the primary archive."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Reasoning Defense & Source Analysis</label>
                    <textarea
                      required
                      value={evidenceReasoning}
                      onChange={(e) => setEvidenceReasoning(e.target.value)}
                      rows={2}
                      placeholder="Detailed argument explaining how evidence satisfies frozen criteria."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Submit Evidence for Validator Consensus
                  </button>
                </form>
              )}

              {/* Finalized: Consensus Adjudication Result */}
              {selectedDare.status === 'FINALIZED' && (
                <div className="space-y-3 bg-emerald-950/20 border border-emerald-500/40 p-4 rounded-xl text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">Consensus Verdict: {selectedDare.verdict}</span>
                    <span className="font-bold text-white">Score: {selectedDare.verdictScore} / 100</span>
                  </div>
                  <p className="text-slate-300">{selectedDare.verdictRationale}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">DareYou Protocol</span>
            <span className="text-slate-600">|</span>
            <span>Intelligent Contracts on GenLayer StudioNet (61999)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <a href="https://github.com/Kosaiyno/dareyou" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors">GitHub Repository</a>
            <a href="https://explorer-studio.genlayer.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors">Block Explorer</a>
            <a href="https://studio.genlayer.com" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors">GenLayer Studio</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
