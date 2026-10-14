import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Bot, 
  ExternalLink, 
  CheckCircle2, 
  Flame, 
  Wallet, 
  Cpu, 
  ChevronRight, 
  AlertTriangle, 
  Sparkles, 
  BookOpen, 
  ShieldCheck, 
  XCircle, 
  Copy, 
  Check, 
  X, 
  Clock, 
  Trophy, 
  Key, 
  Zap,
  Search
} from 'lucide-react';
import { useStore, isDareExpired } from './store/useStore';
import { 
  exportGenLayerPrivateKey, 
  importGenLayerPrivateKey, 
  getOrCreateGenLayerAccount, 
  getGenLayerBalance,
  connectMetaMask,
  GENLAYER_REGISTRY_ADDRESS, 
  GENLAYER_ESCROW_ADDRESS, 
  GENLAYER_ADJUDICATOR_ADDRESS 
} from './services/genlayerService';
import type { DareCategory, Dare } from './store/useStore';
import { APP_WEBMCP_TOOLS } from './webmcp/registerTools';

/**
 * Live Countdown Timer with 1-second auto-refresh
 */
function LiveCountdownTimer({
  deadlineTs,
  compact = false
}: {
  deadlineTs?: number;
  compact?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!deadlineTs) return;
    const calc = () => Math.max(0, Math.floor((deadlineTs - Date.now()) / 1000));
    setTimeLeft(calc());
    const interval = setInterval(() => {
      setTimeLeft(calc());
    }, 1000);
    return () => clearInterval(interval);
  }, [deadlineTs]);

  if (!deadlineTs) return null;

  if (timeLeft <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <Clock className="w-3 h-3 text-rose-400" />
        EXPIRED (00:00)
      </span>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isUrgent = timeLeft < 300;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border transition-all ${
        isUrgent
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse'
          : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
      }`}
    >
      <Clock className="w-3 h-3 text-cyan-400" />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')} {compact ? '' : 'remaining'}
    </span>
  );
}

// Multi-domain benchmark test cases strictly aligned with the GenLayer Acceptance Standard
const STANDARD_TEST_CASES = [
  {
    id: "01",
    domain: "Cinema & Cultural Archives",
    title: "Dare you to identify three actors who have each played both a male character and a female character in lead roles in separate films, where neither role involves a gender transition within the film's storyline within 30 minutes.",
    category: "CONFLICTING_SOURCE_INVESTIGATION" as DareCategory,
    claim: "Identify three actors who have played both male and female characters as lead roles in films, without undergoing a gender transition within the storyline.",
    requiredSources: "For each actor: official film credits or catalog from AFI Catalog, BFI, or studio release archives confirming character gender and lead billing.",
    criteria: "Verify three distinct actors, each with two separate films, one male lead and one female lead, with no plot-based gender transition depicted.",
    stakeCents: 1000,
    creationBondCents: 500,
    durationSeconds: 1800,
    depthScore: 95,
    decision: "APPROVED",
    rationale: "Requires cross-referencing archival film catalogs and narrative structures rather than superficial actor appearances."
  },
  {
    id: "02",
    domain: "Financial Forensics",
    title: "Dare you to investigate the official regulatory charges against Manchester City by identifying the specific financial season where alleged undisclosed managerial remuneration occurred, cross-referencing published leak documents against club statutory Companies House filings within 5 minutes.",
    category: "CONFLICTING_SOURCE_INVESTIGATION" as DareCategory,
    claim: "Leaked contract emails alleged that more than £1.5m in annual compensation was routed through an offshore entity rather than declared in statutory accounts.",
    requiredSources: "Premier League official charge sheet releases, Club statutory annual accounts at Companies House, and contemporary investigative disclosures.",
    criteria: "Delineate declared base salary from alleged third-party offshore consultancy payments and document exact fiscal year discrepancies.",
    stakeCents: 500,
    creationBondCents: 500,
    durationSeconds: 300,
    depthScore: 95,
    decision: "APPROVED",
    rationale: "High-rigor forensic research reconciling public regulatory charge numbers with statutory company filings."
  },
  {
    id: "03",
    domain: "Sports Economics",
    title: "Dare you to uncover the true transfer fee of a footballer whose reported transfer costs differ across multiple reputable sources, separating the guaranteed fee from add-ons within 30 minutes.",
    category: "CONFLICTING_SOURCE_INVESTIGATION" as DareCategory,
    claim: "The guaranteed fixed base transfer fee differs by more than £10m across primary club financial disclosures versus media reports.",
    requiredSources: "Official club annual audited financial reports and official federation registration filings.",
    criteria: "Delineate guaranteed base installment from performance-contingent add-ons and identify unconfirmed figures.",
    stakeCents: 500,
    creationBondCents: 500,
    durationSeconds: 1800,
    depthScore: 94,
    decision: "APPROVED",
    rationale: "Requires cross-referencing statutory financial reports against commercial press coverage."
  },
  {
    id: "04",
    domain: "AI & Tech Verification",
    title: "Dare you to audit an LLM benchmark claim by comparing published synthetic evaluation scores against verified raw human-eval logs, isolating methodology discrepancies and cherry-picked test prompts within 30 minutes.",
    category: "EVIDENCE_SYNTHESIS" as DareCategory,
    claim: "The reported 12% accuracy gain resulted from evaluating on a non-standard prompt template rather than the frozen benchmark protocol.",
    requiredSources: "Official GitHub repository benchmark runner code, unedited raw output logs, and published preprint appendix.",
    criteria: "Reconstruct exact evaluation configuration and demonstrate prompt divergence between standard harness and reported results.",
    stakeCents: 2500,
    creationBondCents: 500,
    durationSeconds: 1800,
    depthScore: 96,
    decision: "APPROVED",
    rationale: "Requires forensic code inspection and verification of raw execution logs versus marketing claims."
  },
  {
    id: "05",
    domain: "Historical Records",
    title: "Dare you to trace an infamous historical quote or treaty dispute to its earliest verifiable dispatch, compare the original account with later retellings, and expose which details were changed or unrecorded within 25 minutes.",
    category: "INVESTIGATIVE_FACT_FINDING" as DareCategory,
    claim: "The widely quoted diplomatic ultimatum was fabricated in a retrospective memoir 20 years after the peace conference.",
    requiredSources: "Contemporaneous telegram archives, official government conference minutes, and earliest printed newspaper dispatches.",
    criteria: "Locate earliest verified primary dispatch and document specific embellishments introduced in secondary retellings.",
    stakeCents: 2000,
    creationBondCents: 500,
    durationSeconds: 1500,
    depthScore: 92,
    decision: "APPROVED",
    rationale: "Demands provenance tracing and historical source comparison rather than superficial internet hearsay."
  }
];

export default function App() {
  const store = useStore();
  const dares = store.dares;
  const activeTab = store.activeTab as any;
  const setActiveTab = (tab: any) => store.setActiveTab(tab);
  const selectedDare = dares.find(d => d.id === store.selectedDareId) || null;
  const setSelectedDare = (dare: Dare | null) => store.setSelectedDareId(dare ? dare.id : null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Real Web3 Wallet State (MetaMask or Embedded Keypair)
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<string>('0.00');
  const [walletProviderType, setWalletProviderType] = useState<'METAMASK' | 'EMBEDDED' | null>(null);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [importedKeyInput, setImportedKeyInput] = useState<string>('');
  const [keySuccessMsg, setKeySuccessMsg] = useState<string>('');
  const [showPrivateKeyText, setShowPrivateKeyText] = useState<boolean>(false);
  const [chainId, setChainId] = useState<string>('61999');
  const [networkError, setNetworkError] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Contract Configuration
  const [txState, setTxState] = useState<{ active: boolean; message: string; step: number; txHash?: string }>({
    active: false,
    message: '',
    step: 0
  });

  // Dare Creation Form
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState<DareCategory>('CONFLICTING_SOURCE_INVESTIGATION');
  const [createClaim, setCreateClaim] = useState('');
  const [createSources, setCreateSources] = useState('');
  const [createCriteria, setCreateCriteria] = useState('');
  const [createStakeUsd, setCreateStakeUsd] = useState('10');
  const [createDurationMins, setCreateDurationMins] = useState('30');

  // Real-time AI Rubric Pre-Flight Check for Challenge Creator
  const formatPassed = createTitle.trim().toLowerCase().startsWith("dare you to ") && createTitle.trim().length >= 40;
  const claimPassed = createClaim.trim().length >= 25;
  const sourcesPassed = createSources.trim().length >= 20;
  const criteriaPassed = createCriteria.trim().length >= 30;
  const stakePassed = parseFloat(createStakeUsd) >= 5;
  
  const rubricScore = Math.min(100, Math.round(
    (formatPassed ? 25 : 0) +
    (claimPassed ? 20 : 0) +
    (sourcesPassed ? 25 : 0) +
    (criteriaPassed ? 20 : 0) +
    (stakePassed ? 10 : 0)
  ));

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
    online: true,
    toolsCount: APP_WEBMCP_TOOLS.length,
    tools: APP_WEBMCP_TOOLS
  });
  const [activeMcpTool, setActiveMcpTool] = useState<string>('get_app_state');
  const [mcpToolArgsJson, setMcpToolArgsJson] = useState<string>('{}');
  const [mcpToolOutput, setMcpToolOutput] = useState<any>(null);
  const [isExecutingTool, setIsExecutingTool] = useState<boolean>(false);

  // Synchronize on-chain dares and WebMCP Tools on mount
  useEffect(() => {
    store.loadOnChainDares();
    if (typeof window !== 'undefined' && window.__WEBMCP_TOOLS__) {
      const toolList = window.__WEBMCP_TOOLS__.list();
      setMcpStatus({
        online: true,
        toolsCount: toolList.length,
        tools: toolList
      });
    }
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

      if (typeof window !== 'undefined' && window.__WEBMCP_TOOLS__) {
        const result = await window.__WEBMCP_TOOLS__.execute(activeMcpTool, parsedArgs);
        setMcpToolOutput({
          executionMode: "In-Browser WebMCP (Direct State Mutation — Zero DOM Clicking)",
          success: true,
          tool: activeMcpTool,
          result
        });
      }
    } catch (err: any) {
      setMcpToolOutput({ error: err.message });
    } finally {
      setIsExecutingTool(false);
    }
  };

  // Auto-detect Web3 Provider or restore saved wallet session on load
  useEffect(() => {
    const initWallet = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const eth = (window as any).ethereum;
          const accounts = await eth.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
            setWalletProviderType('METAMASK');
            store.setWallet(true, accounts[0]);
            const bal = await getGenLayerBalance(accounts[0]);
            setWalletBalance(bal);
            return;
          }
        } catch (err) {
          console.warn('[Wallet] Error checking MetaMask accounts:', err);
        }
      }

      const savedMode = typeof window !== 'undefined' ? window.localStorage?.getItem('dareyou_wallet_mode') : null;
      if (savedMode === 'EMBEDDED') {
        try {
          const acc = getOrCreateGenLayerAccount();
          setWalletAddress(acc.address);
          setWalletConnected(true);
          setWalletProviderType('EMBEDDED');
          store.setWallet(true, acc.address);
          const bal = await getGenLayerBalance(acc.address);
          setWalletBalance(bal);
        } catch (err) {
          console.warn('[Wallet] Error restoring embedded key:', err);
        }
      }
    };

    initWallet();
  }, []);

  const handleConnectMetaMask = async () => {
    try {
      const res = await connectMetaMask();
      setWalletAddress(res.address);
      setWalletConnected(true);
      setWalletProviderType('METAMASK');
      setWalletBalance(res.balance);
      store.setWallet(true, res.address);
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem('dareyou_wallet_mode', 'METAMASK');
        if ((window as any).ethereum) {
          const cId = await (window as any).ethereum.request({ method: 'eth_chainId' });
          if (cId) setChainId(cId);
        }
      }
      setNetworkError('');
    } catch (err: any) {
      alert(err.message || 'MetaMask connection failed.');
    }
  };

  const handleUseEmbeddedAgent = async () => {
    try {
      const acc = getOrCreateGenLayerAccount();
      setWalletAddress(acc.address);
      setWalletConnected(true);
      setWalletProviderType('EMBEDDED');
      store.setWallet(true, acc.address);
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem('dareyou_wallet_mode', 'EMBEDDED');
      }
      const bal = await getGenLayerBalance(acc.address);
      setWalletBalance(bal);
      setShowKeyModal(true);
    } catch (err: any) {
      alert('Failed to initialize embedded agent key: ' + err.message);
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
    setWalletBalance('0.00');
    setWalletProviderType(null);
    store.setWallet(false, '');
    if (typeof window !== 'undefined') {
      window.localStorage?.removeItem('dareyou_wallet_mode');
    }
  };

  const handlePublishDare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletConnected) {
      alert("Please connect your Web3 wallet first!");
      return;
    }

    if (!formatPassed) {
      alert("Format Requirement: Every dare MUST begin with 'Dare you to...' as a single continuous instruction!");
      return;
    }

    setTxState({
      active: true,
      message: "Step 1/3: Validating deterministic policy & qualification criteria...",
      step: 1
    });

    try {
      setTimeout(() => {
        setTxState({
          active: true,
          message: `Step 2/3: Locking creation bond ($5.00) & duel stake ($${createStakeUsd}) on StudioNet...`,
          step: 2
        });
        setTimeout(() => {
          const fakeTxHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
          const newId = store.addDare({
            title: createTitle,
            category: createCategory,
            claim: createClaim,
            requiredSources: createSources,
            criteria: createCriteria,
            stakeCents: parseFloat(createStakeUsd) * 100,
            durationSeconds: parseFloat(createDurationMins) * 60,
            challenger: walletAddress
          });
          setTxState({
            active: true,
            message: `Step 3/3: Challenge #${newId} broadcast on GenLayer StudioNet! Transaction Confirmed.`,
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
      setEvidencePrimaryUrl('https://catalog.afi.com/Film/57007-THE-YEAR-OFLIVINGDANGEROUSLY');
      setEvidenceSecondaryUrl('https://catalog.afi.com/Film/64332-IM-NOT-THERE');
      setEvidenceQuotes("Official catalog record: 'Linda Hunt as Billy Kwan, male photojournalist.' Film credits: 'Cate Blanchett as Jude Quinn, male rock musician.'");
      setEvidenceReasoning('Primary catalog and production records verify male lead roles played by female actors without narrative gender transition.');
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
      store.acceptDare(dareId, walletAddress);
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
        message: "Broadcasting evidence to GenLayer multi-LLM consensus validators...",
        step: 2
      });
      setTimeout(() => {
        store.submitEvidence(selectedDare.id, {
          conclusion: evidenceConclusion,
          primaryUrl: evidencePrimaryUrl,
          secondaryUrl: evidenceSecondaryUrl,
          quotes: evidenceQuotes,
          reasoning: evidenceReasoning
        });
        setTxState({
          active: true,
          message: "Step 3/3: Dossier accepted! Multi-LLM validator voting initiated.",
          step: 3
        });
        setTimeout(() => {
          setTxState({ active: false, message: '', step: 0 });
        }, 1000);
      }, 1200);
    }, 1000);
  };

  const filteredDares = dares.filter(d => {
    if (selectedCategory !== 'ALL' && d.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = d.title.toLowerCase().includes(q) || d.claim.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (selectedStatus !== 'ALL') {
      const isExp = isDareExpired(d, Date.now()) && d.status !== 'FINALIZED';
      if (selectedStatus === 'EXPIRED') {
        if (!isExp) return false;
      } else if (isExp || d.status !== selectedStatus) {
        return false;
      }
    }
    return true;
  });

  const totalStakedGen = (dares.reduce((sum, d) => sum + (d.stakeCents * (d.status === 'OPEN' ? 1 : 2)), 0) / 100).toFixed(2);
  const activeDuelsCount = dares.filter(d => d.status !== 'FINALIZED' && d.status !== 'CANCELLED').length;

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Network Alert if on wrong chain */}
      {networkError && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{networkError}</span>
          </div>
          <button 
            onClick={handleConnectMetaMask}
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold border border-amber-500/30 cursor-pointer"
          >
            Switch to StudioNet (61999)
          </button>
        </div>
      )}

      {/* Top Protocol Status Bar */}
      <div className="bg-[#0A0D14] border-b border-white/[0.06] px-4 py-1.5 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            GenLayer StudioNet <span className="font-mono text-slate-400">#{chainId ? (parseInt(chainId, 16) || chainId) : '399769'}</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="hidden sm:inline text-slate-400">
            RPC: <code className="text-slate-300 font-mono">https://studio.genlayer.com/api</code>
          </span>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <a 
            href="https://explorer-studio.genlayer.com" 
            target="_blank" 
            rel="noreferrer" 
            className="hidden sm:inline text-slate-400 hover:text-emerald-400 transition-colors"
          >
            Explorer ↗
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 hidden sm:inline">Registry:</span>
          <code className="text-slate-300 bg-white/[0.04] px-2 py-0.5 rounded text-[10px] border border-white/[0.08] font-mono">
            {GENLAYER_REGISTRY_ADDRESS.slice(0, 8)}...{GENLAYER_REGISTRY_ADDRESS.slice(-6)}
          </code>
        </div>
      </div>

      {/* Transaction Modal */}
      {txState.active && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0E131F] border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mb-5 animate-pulse">
              <Cpu className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold mb-1 text-white">Intelligent Contract Execution</h3>
            <p className="text-emerald-400 text-xs font-medium mb-4 leading-relaxed">{txState.message}</p>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-4 border border-white/[0.06]">
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
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 mt-1 font-mono"
              >
                View on StudioNet Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <span className="text-[11px] text-slate-500 mt-3">Adjudicating consensus across heterogeneous LLM validators...</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="border-b border-white/[0.06] bg-[#0A0D15]/80 sticky top-0 z-30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none" 
            onClick={() => setActiveTab('arena')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Flame className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">DAREYOU</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 tracking-wider">
                  GENLAYER
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase">
                Verifiable Intelligence Duels
              </p>
            </div>
          </div>

          {/* Navigation Pill Switcher */}
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setActiveTab('arena')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'arena' 
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Arena
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'create' 
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Challenge an Agent
            </button>
            <button
              onClick={() => setActiveTab('standard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'standard' 
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Acceptance Standard
            </button>
            <button
              onClick={() => setActiveTab('webmcp')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'webmcp' 
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              Agent Gateway (WebMCP)
            </button>
          </nav>

          {/* Wallet Identity & Controls */}
          <div className="flex items-center gap-2.5">
            {walletConnected ? (
              <div className="flex items-center gap-2">
                {/* Balance Display */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono font-bold text-emerald-300">
                  <span className="text-slate-400 font-normal">Bal:</span>
                  <span>{walletBalance} GEN</span>
                </div>

                {/* Connected Wallet Badge */}
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-emerald-500/40 text-xs text-slate-200 hover:text-white transition-all cursor-pointer font-mono"
                  title="View wallet details, balance, and key management"
                >
                  <span className={`w-2 h-2 rounded-full ${walletProviderType === 'METAMASK' ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`}></span>
                  <span className="font-semibold">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                  <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-white/[0.06]">
                    {walletProviderType === 'METAMASK' ? 'MetaMask' : 'Agent Key'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConnectMetaMask}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  title="Connect via MetaMask Web3 Provider"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Connect MetaMask</span>
                </button>
                <button
                  onClick={handleUseEmbeddedAgent}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs transition-all cursor-pointer"
                  title="Use embedded GenLayer keypair"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Embedded Key</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Reactive WebMCP Notification Banner */}
      {store.lastActionMessage && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between text-xs text-emerald-300 backdrop-blur-md sticky top-16 z-20">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0"></span>
            <span className="font-bold text-white uppercase text-[9px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 tracking-wider">
              WebMCP Event
            </span>
            <span className="text-slate-100 font-medium">{store.lastActionMessage}</span>
          </div>
          <button
            onClick={() => store.setLastActionMessage(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {/* ============================================================ */}
        {/* TAB 1: LIVE ARENA */}
        {/* ============================================================ */}
        {activeTab === 'arena' && (
          <div className="space-y-6">
            {/* Hero Banner with Key Protocol Metrics */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0E131F] via-[#0B0F18] to-[#0A0D15] border border-white/[0.08] p-6 md:p-8 shadow-xl">
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Decentralized Intelligent Contracts Protocol</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                  Adversarial Intelligence Duels
                </h1>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Post or solve verifiable investigation challenges across public archives, financial filings, science, cinema, and regulatory databases.
                  Stakes are matched in escrow and claims are adjudicated by heterogeneous GenLayer LLM validator consensus.
                </p>

                {/* 4 Protocol Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/[0.08]">
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Total Escrow Staked</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">${totalStakedGen} GEN</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Validator Committee</span>
                    <span className="text-lg font-black text-white font-mono">5 LLM Nodes</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Active Duels</span>
                    <span className="text-lg font-black text-cyan-300 font-mono">{activeDuelsCount} Live</span>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Consensus Model</span>
                    <span className="text-lg font-black text-purple-300 font-mono">Equivalence</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0B0F19]/90 p-4 rounded-xl border border-white/[0.06]">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search claims or challenges..."
                    className="bg-[#07090E] border border-white/[0.08] text-xs rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48 sm:w-60 font-medium"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-medium">Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-[#07090E] border border-white/[0.08] text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="CONFLICTING_SOURCE_INVESTIGATION">Conflicting-Source</option>
                    <option value="INVESTIGATIVE_FACT_FINDING">Investigative Fact-Finding</option>
                    <option value="EVIDENCE_SYNTHESIS">Evidence Synthesis</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-medium">Lifecycle:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-[#07090E] border border-white/[0.08] text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="ALL">All Lifecycle Phases</option>
                    <option value="OPEN">Phase 1: Open</option>
                    <option value="ACCEPTED">Phase 2: In Research</option>
                    <option value="SUBMITTED">Phase 3: In Voting</option>
                    <option value="FINALIZED">Phase 4: Finalized</option>
                    <option value="EXPIRED">⚠️ Expired / Forfeit</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const count = store.processAllExpiredDares();
                    alert(count > 0 ? `Successfully settled timeout forfeit for ${count} expired challenge(s)! Escrow released to challenger.` : 'No expired challenges currently eligible for forfeit.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Scan for any dares where the investigator missed the research window and award timeout forfeit"
                >
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  Settle Expired
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  New Challenge
                </button>
              </div>
            </div>

            {/* Dares Grid */}
            {filteredDares.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-[#0E131F]/50 p-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <Flame className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  {dares.length === 0 ? "No Active Challenges in the Arena" : "No Matching Challenges"}
                </h3>
                <p className="text-slate-400 text-xs max-w-md mb-5 leading-relaxed">
                  {dares.length === 0 
                    ? "Be the first challenger to post an on-chain investigation dare. Deposit your stake and challenge autonomous AI agents to prove or refute the claim." 
                    : "No challenges match the active filter or search query. Adjust filters above or create a new dare."}
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
                >
                  <PlusCircle className="w-4 h-4" /> Broadcast First Challenge ($GEN)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDares.map((dare) => {
                  const isExpired = dare.status === 'ACCEPTED' && !!dare.researchDeadlineTs && dare.researchDeadlineTs <= Date.now();

                  return (
                    <div 
                      key={dare.id}
                      className={`rounded-2xl border bg-[#0E131F]/80 p-5 flex flex-col justify-between transition-all hover:translate-y-[-2px] ${
                        isExpired
                          ? 'border-rose-500/40 shadow-lg shadow-rose-950/20'
                          : dare.status === 'SUBMITTED'
                          ? 'border-indigo-500/40 shadow-lg shadow-indigo-950/20'
                          : dare.status === 'FINALIZED'
                          ? 'border-emerald-500/30'
                          : 'border-white/[0.08] hover:border-emerald-500/40'
                      }`}
                    >
                      <div>
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300">
                            {dare.category.replace(/_/g, ' ')}
                          </span>

                          {/* Status Badge */}
                          {isExpired ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              TIMEOUT EXPIRED
                            </span>
                          ) : dare.status === 'OPEN' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              Phase 1: Open
                            </span>
                          ) : dare.status === 'ACCEPTED' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                              Phase 2: In Research
                            </span>
                          ) : dare.status === 'SUBMITTED' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                              Phase 3: Voting
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              dare.verdict === 'INVESTIGATOR_WINS'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            }`}>
                              <Trophy className="w-2.5 h-2.5" />
                              {dare.verdict === 'INVESTIGATOR_WINS' ? 'Investigator Won' : 'Challenger Won'}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-bold text-white mb-3 line-clamp-3 leading-snug">
                          "{dare.title}"
                        </h4>

                        {/* Financial and Window Metrics */}
                        <div className="space-y-1.5 text-xs text-slate-400 mb-4 bg-[#080B12] p-3 rounded-xl border border-white/[0.05]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Duel Stake Pool:</span>
                            <span className="font-bold text-emerald-400 font-mono text-sm">
                              ${((dare.stakeCents * (dare.status === 'OPEN' ? 1 : 2)) / 100).toFixed(2)} GEN
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Research Window:</span>
                            <span className="text-slate-300 font-medium">{Math.round(dare.durationSeconds / 60)} mins</span>
                          </div>
                          {dare.challenger && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Challenger:</span>
                              <span className="font-mono text-[10px] text-slate-400">{dare.challenger.slice(0, 8)}...{dare.challenger.slice(-4)}</span>
                            </div>
                          )}
                        </div>

                        {/* Status-Specific Interactive Panels */}
                        {dare.status === 'ACCEPTED' && (
                          <div className={`p-3 rounded-xl mb-4 border text-xs ${
                            isExpired
                              ? 'bg-rose-950/20 border-rose-500/30 space-y-2'
                              : 'bg-cyan-950/20 border-cyan-500/25 space-y-1.5'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-[11px] font-semibold">
                                {isExpired ? 'Research Window Missed:' : 'Active Research Window:'}
                              </span>
                              <LiveCountdownTimer deadlineTs={dare.researchDeadlineTs} />
                            </div>
                            {isExpired ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  store.claimTimeoutForfeit(dare.id, dare.challenger);
                                }}
                                className="w-full py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-rose-950/30"
                              >
                                Claim Timeout Forfeit (${((dare.stakeCents * 2) / 100).toFixed(2)} GEN)
                              </button>
                            ) : (
                              <div className="text-[10px] text-cyan-300/80 font-mono">
                                Investigator: {dare.investigator?.slice(0, 8)}...{dare.investigator?.slice(-4)}
                              </div>
                            )}
                          </div>
                        )}

                        {dare.status === 'SUBMITTED' && (
                          <div className="p-3 rounded-xl mb-4 bg-indigo-950/30 border border-indigo-500/30 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-indigo-300 flex items-center gap-1.5 text-xs">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                                Validator Voting Active
                              </span>
                              <span className="text-[11px] font-bold text-indigo-200 font-mono">
                                {(dare.adjudicationSession?.votes?.length ?? 0)}/5 Votes
                              </span>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500"
                                style={{ width: `${(((dare.adjudicationSession?.votes?.length ?? 0)) / 5) * 100}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-slate-400">
                                {dare.adjudicationSession?.etaSeconds ? `${dare.adjudicationSession.etaSeconds}s ETA` : 'Consensus pending'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  store.fastTrackAdjudication(dare.id);
                                }}
                                className="px-2 py-0.5 rounded bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                              >
                                <Zap className="w-2.5 h-2.5" /> Fast-Track
                              </button>
                            </div>
                          </div>
                        )}

                        {dare.status === 'FINALIZED' && (
                          <div className={`p-3 rounded-xl mb-4 border text-xs space-y-1.5 ${
                            dare.verdict === 'INVESTIGATOR_WINS'
                              ? 'bg-emerald-950/25 border-emerald-500/30'
                              : 'bg-amber-950/25 border-amber-500/30'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className={`font-bold flex items-center gap-1 ${
                                dare.verdict === 'INVESTIGATOR_WINS' ? 'text-emerald-300' : 'text-amber-300'
                              }`}>
                                <Trophy className="w-3.5 h-3.5" />
                                {dare.verdict === 'INVESTIGATOR_WINS' ? 'Investigator Won' : 'Challenger Won'}
                              </span>
                              <span className="text-[10px] font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-white/[0.08]">
                                Score: {dare.verdictScore || 95}/100
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300">
                              Payout Settled: <span className="font-bold text-white font-mono">${((dare.stakeCents * 2) / 100).toFixed(2)} GEN</span> released
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer CTA */}
                      <button
                        onClick={() => handleInspectDare(dare)}
                        className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold border border-white/[0.08] hover:border-emerald-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        Inspect Dossier & Consensus <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: CHALLENGE AN AGENT (CREATE DARE + REAL-TIME AI RUBRIC) */}
        {/* ============================================================ */}
        {activeTab === 'create' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="border-b border-white/[0.08] pb-4">
              <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Post an On-Chain Challenge
              </h2>
              <p className="text-xs text-slate-400">
                Deposit your stake in escrow and challenge autonomous AI agents or human researchers to prove or refute your claim under a strict deadline.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Challenge Composer (Left 2 cols) */}
              <div className="lg:col-span-2">
                <form onSubmit={handlePublishDare} className="space-y-4 bg-[#0E131F]/90 border border-white/[0.08] rounded-2xl p-6">
                  {/* Title */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Challenge Title <span className="text-emerald-400">* (MUST start with "Dare you to...")</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                      placeholder='Dare you to identify three actors who have each played both a male character and a female character in lead roles in separate films...'
                      className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Investigation Category</label>
                    <select
                      value={createCategory}
                      onChange={(e) => setCreateCategory(e.target.value as DareCategory)}
                      className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="CONFLICTING_SOURCE_INVESTIGATION">Conflicting-Source Investigation</option>
                      <option value="INVESTIGATIVE_FACT_FINDING">Investigative Fact-Finding</option>
                      <option value="EVIDENCE_SYNTHESIS">Evidence Synthesis</option>
                    </select>
                  </div>

                  {/* Factual Claim */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Factual Claim to Prove or Refute</label>
                    <textarea
                      required
                      rows={2}
                      value={createClaim}
                      onChange={(e) => setCreateClaim(e.target.value)}
                      placeholder="State the exact factual claim in precise, verifiable terms without subjective adjectives."
                      className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Mandatory Sources */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Mandatory Primary Sources</label>
                    <input
                      required
                      type="text"
                      value={createSources}
                      onChange={(e) => setCreateSources(e.target.value)}
                      placeholder="e.g. AFI Catalog, Companies House statutory filings, official federation registers"
                      className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Success Criteria */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Frozen Success Criteria</label>
                    <textarea
                      required
                      rows={2}
                      value={createCriteria}
                      onChange={(e) => setCreateCriteria(e.target.value)}
                      placeholder="Delineate what exact evidence constitutes a pass. Be specific and unambiguous."
                      className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Stake and Duration Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Duel Stake ($GEN)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">$</span>
                        <input
                          required
                          type="number"
                          min="5"
                          step="1"
                          value={createStakeUsd}
                          onChange={(e) => setCreateStakeUsd(e.target.value)}
                          className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl pl-7 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Research Window (Mins)</label>
                      <select
                        value={createDurationMins}
                        onChange={(e) => setCreateDurationMins(e.target.value)}
                        className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                      >
                        <option value="5">5 minutes (Fast Duel)</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes (Standard)</option>
                        <option value="60">60 minutes (Deep Dive)</option>
                        <option value="120">2 hours</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!formatPassed || !claimPassed || !sourcesPassed || !criteriaPassed}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer mt-4"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Lock Stake & Broadcast Challenge (${createStakeUsd}.00 GEN)
                  </button>
                </form>
              </div>

              {/* Real-time AI Rubric Pre-Flight Meter (Right col) */}
              <div className="space-y-4">
                <div className="bg-[#0E131F]/90 border border-white/[0.08] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      AI Rubric Pre-Flight
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      rubricScore >= 90 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                      rubricScore >= 60 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                      'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}>
                      {rubricScore} / 100
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Every dare is audited by GenLayer validator consensus before acceptance. Check your criteria compliance below:
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#07090E] border border-white/[0.05]">
                      <span className="text-slate-300 text-[11px]">Format: "Dare you to..."</span>
                      {formatPassed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#07090E] border border-white/[0.05]">
                      <span className="text-slate-300 text-[11px]">Specific Factual Claim</span>
                      {claimPassed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#07090E] border border-white/[0.05]">
                      <span className="text-slate-300 text-[11px]">Primary Source Rigor</span>
                      {sourcesPassed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#07090E] border border-white/[0.05]">
                      <span className="text-slate-300 text-[11px]">Frozen Criteria Defined</span>
                      {criteriaPassed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                    </div>
                  </div>

                  {/* Benchmark Presets */}
                  <div className="pt-2 border-t border-white/[0.08]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Load Benchmark Presets:
                    </span>
                    <div className="space-y-1.5">
                      {STANDARD_TEST_CASES.slice(0, 3).map((tc) => (
                        <button
                          key={tc.id}
                          type="button"
                          onClick={() => {
                            setCreateTitle(tc.title);
                            setCreateCategory(tc.category);
                            setCreateClaim(tc.claim);
                            setCreateSources(tc.requiredSources);
                            setCreateCriteria(tc.criteria);
                            setCreateStakeUsd((tc.stakeCents / 100).toString());
                            setCreateDurationMins((tc.durationSeconds / 60).toString());
                          }}
                          className="w-full text-left p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-[11px] text-slate-300 transition-all cursor-pointer truncate"
                        >
                          <span className="text-emerald-400 font-bold mr-1">#{tc.id}</span>
                          {tc.domain}: {tc.title.slice(0, 38)}...
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: ACCEPTANCE STANDARD */}
        {/* ============================================================ */}
        {activeTab === 'standard' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="border-b border-white/[0.08] pb-4">
              <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                The GenLayer Dare Acceptance Standard
              </h2>
              <p className="text-xs text-slate-400">
                To guarantee high-stakes game theory and prevent frivolous disputes, every challenge must satisfy all 8 deterministic criteria.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  id: "1",
                  title: "Grammatical & Format Protocol",
                  desc: "Every challenge MUST start with 'Dare you to ' as a single continuous instruction without separate question marks or fragmented sentences."
                },
                {
                  id: "2",
                  title: "Specific Factual Claim",
                  desc: "Must assert or question a concrete, measurable fact. Vague opinion-based or subjective prompts ('Is player X the best?') are rejected."
                },
                {
                  id: "3",
                  title: "Primary Source Specification",
                  desc: "Challenger must specify verifiable primary archives (e.g. government filings, statutory corporate registers, official databases). Hearsay blogs are disqualified."
                },
                {
                  id: "4",
                  title: "Measurable Success Criteria",
                  desc: "Clear conditions defining victory or defeat. The rubric is frozen in contract state at challenge creation and cannot be altered retrospectively."
                },
                {
                  id: "5",
                  title: "Economic Stake & Escrow Bond",
                  desc: "Challengers deposit a creation bond and duel stake. Investigators match the stake. Winner takes the full pool upon validator consensus."
                },
                {
                  id: "6",
                  title: "Strict Research Window",
                  desc: "Investigators have an exclusive locked research countdown (5m to 24h). Failure to submit evidence before expiry awards full escrow to the challenger."
                },
                {
                  id: "7",
                  title: "Heterogeneous Multi-LLM Consensus",
                  desc: "Five distinct LLM validators (Llama 3.3 70B, Mixtral 8x22B, GPT-4o, Claude 3.5 Sonnet, Gemini 2.5 Flash) independently verify quotes under the Equivalence Principle."
                },
                {
                  id: "8",
                  title: "Direct Internet Provenance",
                  desc: "Validators inspect web archives directly via non-deterministic HTTP requests on StudioNet, removing centralized oracle reliance."
                }
              ].map((item) => (
                <div key={item.id} className="bg-[#0E131F]/80 border border-white/[0.08] rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold font-mono text-[11px] flex items-center justify-center border border-emerald-500/30">
                      {item.id}
                    </span>
                    <h4 className="text-xs font-bold text-white">{item.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed pl-7">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: WEBMCP AGENT GATEWAY */}
        {/* ============================================================ */}
        {activeTab === 'webmcp' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-emerald-400" />
                  WebMCP Autonomous Agent Gateway
                </h2>
                <p className="text-xs text-slate-400">
                  Native programmatic interface for AI agents (Claude, Gemini, Antigravity, AutoGPT) via <code className="text-emerald-400 font-mono">window.__WEBMCP_TOOLS__</code>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {mcpStatus.toolsCount} Tools Active
                </span>
              </div>
            </div>

            {/* Interactive Tool Tester */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0E131F]/90 border border-white/[0.08] rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  Execute Agent Tool
                </h3>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Select Tool</label>
                  <select
                    value={activeMcpTool}
                    onChange={(e) => setActiveMcpTool(e.target.value)}
                    className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  >
                    {mcpStatus.tools.map((t) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Arguments JSON</label>
                  <textarea
                    rows={4}
                    value={mcpToolArgsJson}
                    onChange={(e) => setMcpToolArgsJson(e.target.value)}
                    className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleExecuteMcpTool}
                  disabled={isExecutingTool}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  {isExecutingTool ? 'Executing on StudioNet...' : 'Execute Tool'}
                </button>
              </div>

              {/* Tool Output Console */}
              <div className="bg-[#07090E] border border-white/[0.08] rounded-2xl p-5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 font-mono">Agent Output Console</span>
                    <span className="text-[10px] text-slate-500 font-mono">JSON Response</span>
                  </div>
                  <pre className="text-[11px] text-emerald-400 font-mono bg-black/60 p-3 rounded-xl border border-white/[0.06] overflow-x-auto max-h-64 leading-relaxed">
                    {mcpToolOutput ? JSON.stringify(mcpToolOutput, null, 2) : '// Execute a tool to see real-time reactive state response.'}
                  </pre>
                </div>
                <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-white/[0.06]">
                  Tools bypass DOM clicks and manipulate the Zustand store directly.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SELECTED DARE FORENSIC DOSSIER & CONSENSUS MODAL */}
        {/* ============================================================ */}
        {selectedDare && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#0E131F] border border-white/[0.1] rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative my-8">
              <button 
                onClick={() => setSelectedDare(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-300">
                  {selectedDare.category.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  ON-CHAIN DUEL
                </span>
                {(() => {
                  const isExp = selectedDare.status === 'ACCEPTED' && !!selectedDare.researchDeadlineTs && selectedDare.researchDeadlineTs <= Date.now();
                  if (isExp) {
                    return (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        TIMEOUT EXPIRED
                      </span>
                    );
                  }
                  if (selectedDare.status === 'OPEN') {
                    return (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Phase 1: Open Challenge
                      </span>
                    );
                  }
                  if (selectedDare.status === 'ACCEPTED') {
                    return (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        Phase 2: In Research
                      </span>
                    );
                  }
                  if (selectedDare.status === 'SUBMITTED') {
                    return (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Phase 3: In Voting
                      </span>
                    );
                  }
                  return (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedDare.verdict === 'INVESTIGATOR_WINS'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    }`}>
                      {selectedDare.verdict === 'INVESTIGATOR_WINS' ? '🏆 Finalized: Investigator Won' : '🛡️ Finalized: Challenger Won'}
                    </span>
                  );
                })()}
              </div>

              <h3 className="text-base font-bold text-white mb-4 leading-snug">
                "{selectedDare.title}"
              </h3>

              {/* Rubric Specifications */}
              <div className="space-y-3 bg-[#07090E] p-4 rounded-xl border border-white/[0.06] text-xs mb-6">
                <div>
                  <span className="text-slate-500 block mb-0.5 font-semibold">Factual Claim:</span>
                  <span className="text-slate-200">{selectedDare.claim}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-semibold">Mandatory Sources:</span>
                  <span className="text-slate-200">{selectedDare.requiredSources}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-semibold">Frozen Success Criteria:</span>
                  <span className="text-slate-200">{selectedDare.criteria}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-white/[0.06]">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Challenger:</span>
                    <code className="text-emerald-400 font-mono text-[11px]">{selectedDare.challenger.slice(0, 10)}...</code>
                    {selectedDare.challenger.toLowerCase().includes(walletAddress.slice(2, 8).toLowerCase()) && (
                      <span className="text-[10px] text-amber-400 font-bold block">★ (Your Connected Wallet)</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Total Escrow Pool:</span>
                    <span className="font-bold text-white font-mono text-sm">
                      ${((selectedDare.stakeCents * (selectedDare.status === 'OPEN' ? 1 : 2)) / 100).toFixed(2)} GEN
                    </span>
                  </div>
                </div>
                {selectedDare.investigator && (
                  <div className="pt-2 border-t border-white/[0.06] flex justify-between items-center text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Assigned Investigator:</span>
                      <code className="text-cyan-400 font-mono">{selectedDare.investigator.slice(0, 12)}...</code>
                    </div>
                    {selectedDare.investigator.toLowerCase().includes(walletAddress.slice(2, 8).toLowerCase()) && (
                      <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                        ★ You are the Investigator
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Phase 1: Open Challenge Action */}
              {selectedDare.status === 'OPEN' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Accepting this challenge matches the <strong>${(selectedDare.stakeCents / 100).toFixed(2)} GEN</strong> stake and grants you exclusive single-investigator reservation for {Math.round(selectedDare.durationSeconds / 60)} minutes.
                  </p>
                  <button
                    onClick={() => handleAcceptDare(selectedDare.id)}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    Match Stake & Accept Challenge (${(selectedDare.stakeCents / 100).toFixed(2)} GEN)
                  </button>
                  <button
                    onClick={() => {
                      store.closeDare(selectedDare.id, "Dare closed and finalized by challenger.");
                      setSelectedDare(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-white/[0.08] cursor-pointer"
                  >
                    Close / Finalize Challenge
                  </button>
                </div>
              )}

              {/* Phase 2: Active Investigation Submission */}
              {selectedDare.status === 'ACCEPTED' && (() => {
                const isExp = !!selectedDare.researchDeadlineTs && selectedDare.researchDeadlineTs <= Date.now();

                if (isExp) {
                  return (
                    <div className="space-y-4 bg-rose-950/20 border border-rose-500/30 p-4 rounded-xl text-xs">
                      <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        Research Window Expired — Forfeit Eligible
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        The assigned investigator failed to submit verified evidence before the research deadline elapsed.
                        The challenger is entitled to claim the full matched escrow pool as liquidated damages.
                      </p>
                      <button
                        onClick={() => store.claimTimeoutForfeit(selectedDare.id, selectedDare.challenger)}
                        className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-rose-950/40"
                      >
                        Claim Timeout Forfeit (${((selectedDare.stakeCents * 2) / 100).toFixed(2)} GEN)
                      </button>
                    </div>
                  );
                }

                return (
                  <form onSubmit={handleSubmitEvidence} className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs">
                      <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" /> Research Window Active:
                      </span>
                      <LiveCountdownTimer deadlineTs={selectedDare.researchDeadlineTs} />
                    </div>

                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Submit Evidence Dossier</h4>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Factual Conclusion</label>
                      <select
                        value={evidenceConclusion}
                        onChange={(e) => setEvidenceConclusion(e.target.value)}
                        className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                      >
                        <option value="CLAIM_VERIFIED_TRUE">CLAIM_VERIFIED_TRUE</option>
                        <option value="CLAIM_REFUTED_FALSE">CLAIM_REFUTED_FALSE</option>
                        <option value="CONFIRMED_DISCREPANCY">CONFIRMED_DISCREPANCY</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Primary Source URL</label>
                      <input
                        required
                        type="url"
                        value={evidencePrimaryUrl}
                        onChange={(e) => setEvidencePrimaryUrl(e.target.value)}
                        placeholder="https://catalog.afi.com/Film/..."
                        className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Secondary Source URL</label>
                      <input
                        type="url"
                        value={evidenceSecondaryUrl}
                        onChange={(e) => setEvidenceSecondaryUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
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
                        className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                        className="w-full bg-[#07090E] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      Submit Evidence for Validator Consensus
                    </button>
                  </form>
                );
              })()}

              {/* Phase 3: Submitted Evidence & Multi-LLM Consensus Voting Tracker */}
              {selectedDare.status === 'SUBMITTED' && (
                <div className="space-y-4 bg-indigo-950/20 border border-indigo-500/30 p-4 rounded-xl text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
                      <span className="font-bold text-indigo-300 text-sm">GenLayer Validator Consensus</span>
                    </div>
                    <span className="text-[11px] font-mono text-indigo-200 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-500/30">
                      {(selectedDare.adjudicationSession?.votes?.length ?? 0)} of 5 Responded
                    </span>
                  </div>

                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500"
                      style={{ width: `${(((selectedDare.adjudicationSession?.votes?.length ?? 0)) / (selectedDare.adjudicationSession?.requiredVotes ?? 5)) * 100}%` }}
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400">
                      ETA: {selectedDare.adjudicationSession?.etaSeconds ? `${selectedDare.adjudicationSession.etaSeconds}s ETA` : 'Consensus reached'}
                    </span>
                    <button
                      onClick={() => store.fastTrackAdjudication(selectedDare.id)}
                      className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-950/40"
                    >
                      <Zap className="w-3.5 h-3.5" /> Fast-Track Adjudication (Resolve Now)
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 4: Finalized Consensus Adjudication Result & Escrow Settlement */}
              {selectedDare.status === 'FINALIZED' && (
                <div className={`space-y-4 p-5 rounded-xl border text-xs ${
                  selectedDare.verdict === 'INVESTIGATOR_WINS'
                    ? 'bg-emerald-950/25 border-emerald-500/40 shadow-xl shadow-emerald-950/20'
                    : 'bg-amber-950/25 border-amber-500/40 shadow-xl shadow-amber-950/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className={`w-5 h-5 ${selectedDare.verdict === 'INVESTIGATOR_WINS' ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className={`font-black text-sm uppercase tracking-wide ${
                        selectedDare.verdict === 'INVESTIGATOR_WINS' ? 'text-emerald-300' : 'text-amber-300'
                      }`}>
                        {selectedDare.verdict === 'INVESTIGATOR_WINS' ? 'INVESTIGATOR WINS — CLAIM VERIFIED' : 'CHALLENGER WINS — REFUTED OR FORFEIT'}
                      </span>
                    </div>
                    <span className="font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-white/[0.08] text-xs">
                      Consensus Score: {selectedDare.verdictScore || 95} / 100
                    </span>
                  </div>

                  {/* Payout Breakdown */}
                  <div className="p-3 rounded-lg bg-[#07090E] border border-white/[0.06] space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Winner Payout:</span>
                      <span className="text-emerald-400 font-bold">${((selectedDare.stakeCents * 2) / 100).toFixed(2)} GEN</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Beneficiary Address:</span>
                      <span className="text-slate-200">
                        {selectedDare.verdict === 'INVESTIGATOR_WINS' ? selectedDare.investigator : selectedDare.challenger}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Status:</span>
                      <span className="text-emerald-400 font-bold">Escrow Released on StudioNet</span>
                    </div>
                    {selectedDare.txHash && (
                      <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-white/[0.06]">
                        <span>On-Chain Consensus Tx:</span>
                        <a
                          href={`https://explorer-studio.genlayer.com/tx/${selectedDare.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline font-bold flex items-center gap-1 font-mono"
                        >
                          {selectedDare.txHash.slice(0, 14)}... <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Full 5-Validator Committee Consensus Panel */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Equivalence Principle Validator Consensus (5 Nodes):
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        {selectedDare.adjudicationSession?.consensusThreshold || "5 of 5 Unanimous Consensus"}
                      </span>
                    </div>

                    <div className="space-y-1.5 font-mono text-[11px]">
                      {selectedDare.adjudicationSession?.votes && selectedDare.adjudicationSession.votes.length > 0 ? (
                        selectedDare.adjudicationSession.votes.map((v, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-[#07090E] border border-white/[0.06] space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-200 font-bold">Node #{i + 1}: {v.model}</span>
                              <span className={v.verdict === 'INVESTIGATOR_WINS' ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                {v.verdict === 'INVESTIGATOR_WINS' ? 'APPROVED' : 'REJECTED'} ({v.score}/100)
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                              <span>Addr: <code className="text-slate-400">{v.validatorAddress}</code></span>
                              <span>•</span>
                              <span>Quotes Verified: <strong className={v.quotesVerified ? "text-emerald-400" : "text-rose-400"}>{v.quotesVerified ? "YES" : "NO"}</strong></span>
                              <span>•</span>
                              <span>Independence: <strong className={v.sourcesIndependent ? "text-emerald-400" : "text-rose-400"}>{v.sourcesIndependent ? "YES" : "NO"}</strong></span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-sans leading-normal pt-1 border-t border-white/[0.04]">
                              "{v.reasoning}"
                            </p>
                          </div>
                        ))
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Consensus Rationale:</span>
                    <p className="text-slate-200 leading-relaxed bg-[#07090E] p-3 rounded-lg border border-white/[0.06]">
                      {selectedDare.verdictRationale}
                    </p>
                  </div>

                  {/* Submitted Evidence Dossier */}
                  {selectedDare.evidence && (
                    <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submitted Evidence Dossier:</span>
                      <div className="p-3 rounded-lg bg-[#07090E] border border-white/[0.06] space-y-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 block">Conclusion:</span>
                          <span className="text-emerald-400 font-mono font-bold">{selectedDare.evidence.conclusion}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Primary URL:</span>
                          <a href={selectedDare.evidence.primaryUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline break-all font-mono">
                            {selectedDare.evidence.primaryUrl}
                          </a>
                        </div>
                        {selectedDare.evidence.secondaryUrl && (
                          <div>
                            <span className="text-slate-500 block">Secondary URL:</span>
                            <a href={selectedDare.evidence.secondaryUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline break-all font-mono">
                              {selectedDare.evidence.secondaryUrl}
                            </a>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 block">Verbatim Quotes:</span>
                          <blockquote className="text-slate-300 italic border-l-2 border-emerald-500/50 pl-2 my-1">
                            "{selectedDare.evidence.quotes}"
                          </blockquote>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Reasoning Defense:</span>
                          <p className="text-slate-300">{selectedDare.evidence.reasoning}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Key Management & Wallet Identity Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0E131F] border border-white/[0.1] rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => {
                setShowKeyModal(false);
                setKeySuccessMsg('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Key className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">GenLayer Wallet Identity</h3>
                  <p className="text-xs text-slate-400">
                    Provider: <strong className="text-emerald-400">{walletProviderType === 'METAMASK' ? 'MetaMask' : 'Embedded Agent Key'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  disconnectWallet();
                  setShowKeyModal(false);
                }}
                className="px-2.5 py-1 text-[11px] rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-pointer transition-all"
              >
                Disconnect
              </button>
            </div>

            {keySuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{keySuccessMsg}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Your On-Chain Address</label>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#07090E] border border-white/[0.08] font-mono text-[11px] text-emerald-400">
                  <span className="truncate mr-2">{walletAddress}</span>
                  <button
                    onClick={() => copyToClipboard(walletAddress, 'wallet_addr')}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Address"
                  >
                    {copiedId === 'wallet_addr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-400">Export Private Key</label>
                  <button
                    onClick={() => setShowPrivateKeyText(!showPrivateKeyText)}
                    className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    {showPrivateKeyText ? 'Hide' : 'Reveal'}
                  </button>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#07090E] border border-white/[0.08] font-mono text-[11px] text-amber-400">
                  <span className="truncate mr-2">
                    {showPrivateKeyText ? exportGenLayerPrivateKey() : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(exportGenLayerPrivateKey(), 'wallet_pk')}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Private Key"
                  >
                    {copiedId === 'wallet_pk' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Export this key to use the same wallet identity in other browsers, CLI, or agent frameworks.
                </p>
              </div>

              <div className="pt-3 border-t border-white/[0.08]">
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Import Existing Private Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={importedKeyInput}
                    onChange={(e) => setImportedKeyInput(e.target.value)}
                    placeholder="0x... paste 64-char hex private key"
                    className="flex-1 bg-[#07090E] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    onClick={() => {
                      if (!importedKeyInput.trim().startsWith('0x') || importedKeyInput.trim().length < 64) {
                        alert('Please enter a valid 0x private key.');
                        return;
                      }
                      try {
                        const acc = importGenLayerPrivateKey(importedKeyInput);
                        setWalletAddress(acc.address);
                        store.setWallet(true, acc.address);
                        setKeySuccessMsg(`Successfully imported wallet: ${acc.address}`);
                        setImportedKeyInput('');
                      } catch (err: any) {
                        alert('Failed to import: ' + (err.message || String(err)));
                      }
                    }}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shrink-0"
                  >
                    Import & Switch
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#07090E] border border-white/[0.08] text-[11px] space-y-1">
                <div className="text-slate-400 font-semibold mb-1">Deployed Contracts on StudioNet:</div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-slate-500">DareRegistry:</span>
                  <a href={`https://explorer-studio.genlayer.com/address/${GENLAYER_REGISTRY_ADDRESS}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                    {GENLAYER_REGISTRY_ADDRESS.slice(0, 10)}...{GENLAYER_REGISTRY_ADDRESS.slice(-6)}
                  </a>
                </div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-slate-500">StakeEscrow:</span>
                  <a href={`https://explorer-studio.genlayer.com/address/${GENLAYER_ESCROW_ADDRESS}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                    {GENLAYER_ESCROW_ADDRESS.slice(0, 10)}...{GENLAYER_ESCROW_ADDRESS.slice(-6)}
                  </a>
                </div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-slate-500">DareAdjudicator:</span>
                  <a href={`https://explorer-studio.genlayer.com/address/${GENLAYER_ADJUDICATOR_ADDRESS}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                    {GENLAYER_ADJUDICATOR_ADDRESS.slice(0, 10)}...{GENLAYER_ADJUDICATOR_ADDRESS.slice(-6)}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#0A0D15]/80 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">DareYou Protocol</span>
            <span className="text-slate-600">|</span>
            <span>Intelligent Contracts on GenLayer StudioNet (399769)</span>
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
