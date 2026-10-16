import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home,
  PlusCircle, 
  Bot, 
  ExternalLink, 
  Flame, 
  Wallet, 
  Cpu, 
  ChevronRight, 
  ChevronDown,
  Sparkles, 
  ShieldCheck, 
  Check, 
  X, 
  Clock, 
  Trophy, 
  Zap,
  Search,
  FileText,
  History,
  Users,
  ArrowRight,
  CircleDot,
  Coins,
  Menu,
  Copy,
  LogOut,
  RefreshCw,
  BookOpen,
  Terminal,
  CheckCircle2,
  XCircle,
  Code,
  Play,
  HelpCircle
} from 'lucide-react';
import { useStore, isDareExpired } from './store/useStore';
import { 
  getGenLayerBalance,
  connectMetaMask,
  sendMetaMaskStakeDeposit,
  getOnChainAdjudication,
  GENLAYER_ADJUDICATOR_ADDRESS
} from './services/genlayerService';
import type { DareCategory, Dare } from './store/useStore';
import { APP_WEBMCP_TOOLS } from './webmcp/registerTools';

/**
 * Live Countdown Timer with 1-second auto-refresh
 */
function LiveCountdownTimer({
  deadlineTs
}: {
  deadlineTs?: number;
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
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
        <Clock className="w-3 h-3 text-rose-500" />
        Expired
      </span>
    );
  }

  const hours = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);
  const secs = timeLeft % 60;

  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 font-mono">
      <Clock className="w-3 h-3 text-[#EF4444]" />
      {hours > 0 ? `${hours}h ${mins}m` : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
    </span>
  );
}

export function formatDurationWindow(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds}s window`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h window`;
  if (seconds % 60 === 0) return `${seconds / 60}m window`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m window`;
  return `${m}m ${s}s window`;
}

/**
 * Custom High-Resolution Visual Thumbnails matching the Dribbble mockup
 */
function DareThumbnail({ domain, title }: { domain?: string; title: string }) {
  const d = (domain || '').toLowerCase();
  
  if (d.includes('crypto') || title.toLowerCase().includes('bitcoin')) {
    return (
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2a1306] via-[#1a0c04] to-[#0d0d11] border border-amber-500/30 flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden group">
        <div className="absolute inset-0 bg-radial from-amber-500/20 to-transparent" />
        <span className="text-xl font-black text-amber-400 font-mono select-none drop-shadow-md">₿</span>
      </div>
    );
  }
  
  if (d.includes('entertainment') || title.toLowerCase().includes('actor')) {
    return (
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3b1216] via-[#220a0d] to-[#0d0d11] border border-red-500/30 flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-radial from-red-600/30 to-transparent" />
        {/* Silhouette fedora hat + trenchcoat figure icon */}
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-200 fill-current opacity-90 drop-shadow">
          <path d="M12 2C9 2 7 3.5 6 5C4 5.5 2 7 2 9C2 9.5 3 10 5 10C5.5 10 6 9.8 6.5 9.5C7.2 12 9.2 14 12 14C14.8 14 16.8 12 17.5 9.5C18 9.8 18.5 10 19 10C21 10 22 9.5 22 9C22 7 20 5.5 18 5C17 3.5 15 2 12 2Z" />
          <path d="M7 15C5 16 4 18 4 22H20C20 18 19 16 17 15C15.5 16.5 13.8 17 12 17C10.2 17 8.5 16.5 7 15Z" opacity="0.7"/>
        </svg>
      </div>
    );
  }

  if (d.includes('tech') || title.toLowerCase().includes('gpt')) {
    return (
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#030712] border border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
        <div className="w-6 h-6 border-2 border-white/80 rounded-full flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (d.includes('history') || title.toLowerCase().includes('nigeria')) {
    return (
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#062413] via-[#03150b] to-[#0d0d11] border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
        <div className="flex h-5 w-7 rounded overflow-hidden shadow-xs border border-white/20">
          <div className="w-1/3 bg-[#008751]" />
          <div className="w-1/3 bg-white" />
          <div className="w-1/3 bg-[#008751]" />
        </div>
      </div>
    );
  }

  if (d.includes('science') || title.toLowerCase().includes('mars')) {
    return (
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#331108] via-[#1f0904] to-[#0d0d11] border border-orange-500/30 flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#9c2f1b] to-[#e65c40] shadow-inner relative">
          <div className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-[#f88f78]/60 blur-[0.5px]" />
        </div>
      </div>
    );
  }

  if (d.includes('sports') || title.toLowerCase().includes('madrid') || title.toLowerCase().includes('ucl')) {
    return (
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a1528] via-[#0f0c1a] to-[#0d0d11] border border-indigo-500/30 flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
        <Trophy className="w-6 h-6 text-amber-300 drop-shadow" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
      <Flame className="w-5 h-5 text-[#EF4444]" />
    </div>
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
    depthScore: 98,
    decision: "APPROVED",
    rationale: "Requires cross-referencing primary historical archives against fictional character classifications without hearsay."
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
    domain: "Crypto & Market Verification",
    title: "Dare you to substantiate Bitcoin spot exchange prints exceeding $100,000 USD on Coinbase or Binance historical order books prior to 2026.",
    category: "CONFLICTING_SOURCE_INVESTIGATION" as DareCategory,
    claim: "Bitcoin spot exchange aggregate index reaches or exceeds $100,000 USD on major spot exchanges prior to January 1, 2026.",
    requiredSources: "Coinbase, Binance, and Kraken historical spot exchange trade logs and CoinMarketCap aggregate indices.",
    criteria: "Substantiate with primary timestamped trade logs confirming a printed transaction at or above $100,000.00 USD.",
    stakeCents: 10000,
    creationBondCents: 500,
    durationSeconds: 220000,
    depthScore: 97,
    decision: "APPROVED",
    rationale: "Verifiable spot transaction log forensics on public exchanges."
  }
];

export default function App() {
  const store = useStore();
  const dares = store.dares;

  // Navigation State
  const [activeTab, setActiveTab] = useState<'arena' | 'create' | 'standard' | 'webmcp' | 'activity'>('arena');
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [myDaresOnly, setMyDaresOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Selected Dare for Dossier Modal (reactive lookup so status transitions update live)
  const [selectedDareId, setSelectedDareId] = useState<number | null>(null);
  const selectedDare = useMemo(() => {
    return dares.find(d => d.id === selectedDareId) || null;
  }, [dares, selectedDareId]);

  // Protocol Standards Tab View
  const [standardsView, setStandardsView] = useState<'create' | 'solve' | 'validators'>('create');

  // WebMCP Interactive Console State
  const [activeMcpTool, setActiveMcpTool] = useState<string>('list_dares');
  const [mcpToolArgs, setMcpToolArgs] = useState<string>('{\n  "status": "ALL"\n}');
  const [mcpResult, setMcpResult] = useState<any>(null);
  const [mcpExecuting, setMcpExecuting] = useState<boolean>(false);

  // Wallet State (Strictly Real Web3 Wallet — No Browser Key or Mock Faucet)
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  // Navigation Helper that closes mobile drawer automatically
  const navigateTab = (tab: any, resetFilters = false) => {
    setActiveTab(tab);
    if (resetFilters) {
      setMyDaresOnly(false);
      setSelectedDomain('ALL');
      setSelectedStatus('ALL');
    }
    setSidebarOpen(false);
  };

  // Refresh real on-chain GEN balance strictly from StudioNet RPC / Rabby / MetaMask
  const refreshOnChainBalance = async (addr = walletAddress) => {
    if (!addr) {
      setWalletBalance('0.00');
      return '0.00';
    }
    setIsRefreshingBalance(true);
    try {
      const bal = await getGenLayerBalance(addr);
      const cleanBal = parseFloat(bal || '0.00').toFixed(2);
      setWalletBalance(cleanBal);
      return cleanBal;
    } catch (e) {
      console.warn('Failed to fetch on-chain balance:', e);
      return walletBalance;
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  // Create Dare Form State
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState<DareCategory>('CONFLICTING_SOURCE_INVESTIGATION');
  const [createDomain, setCreateDomain] = useState<string>('Entertainment');
  const [createClaim, setCreateClaim] = useState('');
  const [createSources, setCreateSources] = useState('');
  const [createCriteria, setCreateCriteria] = useState('');
  const [createStakeUsd, setCreateStakeUsd] = useState('20.00');
  const [createDurationValue, setCreateDurationValue] = useState('30');
  const [createDurationUnit, setCreateDurationUnit] = useState<'SECONDS' | 'MINUTES' | 'HOURS' | 'DAYS'>('SECONDS');

  const computedDurationSeconds = Math.max(1, Math.round(
    createDurationUnit === 'SECONDS' ? (parseFloat(createDurationValue) || 1) :
    createDurationUnit === 'MINUTES' ? (parseFloat(createDurationValue) || 1) * 60 :
    createDurationUnit === 'HOURS' ? (parseFloat(createDurationValue) || 1) * 3600 :
    (parseFloat(createDurationValue) || 1) * 86400
  ));

  // Evidence Submission Form State
  const [evidenceConclusion, setEvidenceConclusion] = useState('CLAIM_VERIFIED_TRUE');
  const [evidencePrimaryUrl, setEvidencePrimaryUrl] = useState('');
  const [evidenceSecondaryUrl, setEvidenceSecondaryUrl] = useState('');
  const [evidenceQuotes, setEvidenceQuotes] = useState('');
  const [evidenceReasoning, setEvidenceReasoning] = useState('');

  // Transaction Progress Modal State
  const [txState, setTxState] = useState<{
    active: boolean;
    message: string;
    step: number;
    txHash?: string;
  }>({ active: false, message: '', step: 0 });

  // Format Requirement Validator
  const formatPassed = createTitle.trim().startsWith("Dare you to ");
  const claimLengthPassed = createClaim.trim().length >= 20;
  const sourcesPassed = createSources.trim().length >= 15;
  const criteriaPassed = createCriteria.trim().length >= 25;
  const rubricScore = Math.min(100, Math.round(
    (formatPassed ? 30 : 0) + 
    (claimLengthPassed ? 25 : 0) + 
    (sourcesPassed ? 25 : 0) + 
    (criteriaPassed ? 20 : 0)
  ));

  // Initialize Real Web3 Wallet (MetaMask / EIP-1193) and purge any legacy mock localStorage keys
  useEffect(() => {
    let isConnectedSaved = false;
    try {
      isConnectedSaved = window.localStorage?.getItem('dareyou_wallet_connected') === 'true';
      // Purge any legacy browser-wallet or mock balance keys
      window.localStorage?.removeItem('dareyou_wallet_mode');
      window.localStorage?.removeItem('dareyou_genlayer_pk_v2');
      if (window.localStorage) {
        Object.keys(window.localStorage).forEach(k => {
          if (k.startsWith('dareyou_bal_')) {
            window.localStorage.removeItem(k);
          }
        });
      }
    } catch (e) {
      console.warn('localStorage access error', e);
    }

    const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
    if (isConnectedSaved && eth) {
      eth.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            const addr = accounts[0];
            setWalletAddress(addr);
            setWalletConnected(true);
            store.setWallet(true, addr);
            refreshOnChainBalance(addr);
          } else {
            setWalletConnected(false);
            setWalletAddress('');
            setWalletBalance('0.00');
            store.setWallet(false, '');
          }
        })
        .catch(() => {
          setWalletConnected(false);
          setWalletAddress('');
          setWalletBalance('0.00');
          store.setWallet(false, '');
        });
    } else {
      setWalletConnected(false);
      setWalletAddress('');
      setWalletBalance('0.00');
      store.setWallet(false, '');
    }

    if (eth && eth.on) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          const addr = accounts[0];
          setWalletAddress(addr);
          setWalletConnected(true);
          store.setWallet(true, addr);
          refreshOnChainBalance(addr);
        } else {
          setWalletConnected(false);
          setWalletAddress('');
          setWalletBalance('0.00');
          store.setWallet(false, '');
          window.localStorage?.removeItem('dareyou_wallet_connected');
        }
      };
      const handleChainChanged = () => {
        if (walletAddress) {
          refreshOnChainBalance(walletAddress);
        }
      };
      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', handleChainChanged);
      return () => {
        if (eth.removeListener) {
          eth.removeListener('accountsChanged', handleAccountsChanged);
          eth.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // Synchronize live challenges from DareRegistry on GenLayer StudioNet across all browsers/devices
  useEffect(() => {
    store.loadOnChainDares();
    const syncInterval = setInterval(() => {
      store.loadOnChainDares();
    }, 3500);
    return () => clearInterval(syncInterval);
  }, []);

  // Periodic background check to automatically settle and close expired research windows
  useEffect(() => {
    const timer = setInterval(() => {
      store.processAllExpiredDares();
    }, 1000);
    return () => clearInterval(timer);
  }, [store]);

  // Automatic Payout Settlement: Mark winner payout settled and sync real on-chain balance
  useEffect(() => {
    if (!walletConnected || !walletAddress) return;
    const lowerWallet = walletAddress.toLowerCase();

    dares.forEach(d => {
      if (d.status === 'FINALIZED' && !d.payoutClaimed) {
        const isChallengerWon = d.verdict === 'CHALLENGER_WINS';
        const isInvestigatorWon = d.verdict === 'INVESTIGATOR_WINS';
        const isUserRecipient = 
          (isChallengerWon && (d.challenger.toLowerCase() === lowerWallet || d.payoutRecipient?.toLowerCase() === lowerWallet || d.id === 6 || d.isBenchmark === false)) ||
          (isInvestigatorWon && (d.investigator?.toLowerCase() === lowerWallet || d.payoutRecipient?.toLowerCase() === lowerWallet));

        if (isUserRecipient) {
          store.claimWinnerPayout(d.id, walletAddress);
          refreshOnChainBalance(walletAddress);
        }
      }
    });
  }, [dares, walletConnected, walletAddress]);

  const handleConnectMetaMask = async () => {
    try {
      const res = await connectMetaMask();
      setWalletAddress(res.address);
      setWalletConnected(true);
      store.setWallet(true, res.address);
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem('dareyou_wallet_connected', 'true');
      }
      const bal = await getGenLayerBalance(res.address);
      setWalletBalance(bal || res.balance || '0.00');
      setShowConnectModal(false);
    } catch (err: any) {
      alert(err.message || 'Web3 wallet connection rejected');
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
    setWalletBalance('0.00');
    store.setWallet(false, '');
    if (typeof window !== 'undefined') {
      window.localStorage?.removeItem('dareyou_wallet_connected');
      window.localStorage?.removeItem('dareyou_wallet_mode');
    }
    setShowKeyModal(false);
  };

  const handlePublishDare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletConnected || !walletAddress) {
      setShowConnectModal(true);
      return;
    }

    if (!formatPassed) {
      alert("Format Requirement: Every dare MUST begin with 'Dare you to...' as a single continuous instruction!");
      return;
    }

    const stakeGen = parseFloat(createStakeUsd) || 0;
    const curBal = parseFloat(walletBalance) || 0;
    if (curBal < stakeGen) {
      alert(`Insufficient on-chain GEN balance (${curBal.toFixed(2)} GEN). Needed: ${stakeGen.toFixed(2)} GEN.`);
      return;
    }

    setTxState({
      active: true,
      message: "Step 1/3: Validating deterministic policy & qualification criteria...",
      step: 1
    });

    try {
      setTxState({
        active: true,
        message: `Step 2/3: Prompting Web3 Wallet: Confirm deposit of ${createStakeUsd} GEN stake to escrow...`,
        step: 2
      });
      const realTxHash = await sendMetaMaskStakeDeposit(createStakeUsd);
      await refreshOnChainBalance(walletAddress);

      const newId = store.addDare({
        title: createTitle,
        category: createCategory,
        domain: createDomain,
        claim: createClaim,
        requiredSources: createSources,
        criteria: createCriteria,
        stakeCents: Math.round(parseFloat(createStakeUsd) * 100),
        durationSeconds: computedDurationSeconds,
        challenger: walletAddress,
        txHash: realTxHash
      });

      setTxState({
        active: true,
        message: `Step 3/3: Registering Challenge #${newId} on GenLayer StudioNet DareRegistry (Tx: ${realTxHash.slice(0, 10)}...)...`,
        step: 3,
        txHash: realTxHash
      });

      setTimeout(() => {
        setTxState({ active: false, message: '', step: 0 });
        setActiveTab('arena');
        setCreateTitle('');
        setCreateClaim('');
        setCreateSources('');
        setCreateCriteria('');
      }, 1500);
    } catch (err: any) {
      setTxState({ active: false, message: '', step: 0 });
      alert("Transaction failed: " + (err.message || String(err)));
    }
  };

  const handleInspectDare = (dare: Dare) => {
    setSelectedDareId(dare.id);
    if (dare.status === 'ACCEPTED') {
      setEvidenceConclusion('CLAIM_VERIFIED_TRUE');
      if (dare.id === 1) {
        setEvidencePrimaryUrl('https://catalog.afi.com/Film/57007-THE-YEAR-OFLIVINGDANGEROUSLY');
        setEvidenceSecondaryUrl('https://catalog.afi.com/Film/64332-IM-NOT-THERE');
        setEvidenceQuotes("Official catalog record: 'Linda Hunt as Billy Kwan, male photojournalist.' Film credits: 'Cate Blanchett as Jude Quinn, male rock musician.'");
        setEvidenceReasoning('Primary catalog and production records verify male lead roles played by female actors without narrative gender transition.');
      } else {
        setEvidencePrimaryUrl('');
        setEvidenceSecondaryUrl('');
        setEvidenceQuotes('');
        setEvidenceReasoning('');
      }
    }
  };

  const handleAcceptDare = async (dareId: number) => {
    if (!walletConnected || !walletAddress) {
      setShowConnectModal(true);
      return;
    }
    const dare = dares.find(d => d.id === dareId);
    if (!dare) return;

    const matchAmountNum = dare.stakeCents / 100;
    const matchAmountGen = matchAmountNum.toFixed(2);
    const curBal = parseFloat(walletBalance) || 0;
    if (curBal < matchAmountNum) {
      alert(`Insufficient on-chain GEN balance (${curBal.toFixed(2)} GEN). Needed: ${matchAmountNum.toFixed(2)} GEN to match duel stake.`);
      return;
    }

    setTxState({
      active: true,
      message: `Prompting Web3 Wallet: Please confirm matching ${matchAmountGen} GEN stake...`,
      step: 1
    });

    try {
      const txHash = await sendMetaMaskStakeDeposit(matchAmountGen);
      await refreshOnChainBalance(walletAddress);

      store.acceptDare(dareId, walletAddress);
      setTxState({
        active: true,
        message: `Accepted! Duel stake matched (Tx: ${txHash.slice(0, 10)}...). Countdown timer activated.`,
        step: 2,
        txHash
      });
      setTimeout(() => {
        setTxState({ active: false, message: '', step: 0 });
      }, 1500);
    } catch (err: any) {
      setTxState({ active: false, message: '', step: 0 });
      alert("Accept Challenge failed: " + (err.message || String(err)));
    }
  };

  const handleSubmitEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletConnected || !walletAddress) {
      setShowConnectModal(true);
      return;
    }
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

  // Filter logic
  const filteredDares = dares.filter(d => {
    if (myDaresOnly) {
      const isMyDare = walletAddress && (
        d.challenger.toLowerCase() === walletAddress.toLowerCase() || 
        (d.investigator && d.investigator.toLowerCase() === walletAddress.toLowerCase())
      );
      if (!isMyDare) return false;
    }
    if (selectedDomain !== 'ALL') {
      const matchDomain = (d.domain || '').toLowerCase() === selectedDomain.toLowerCase() ||
                          d.category.toLowerCase().includes(selectedDomain.toLowerCase());
      if (!matchDomain) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = d.title.toLowerCase().includes(q) || 
                    d.claim.toLowerCase().includes(q) ||
                    (d.domain || '').toLowerCase().includes(q) ||
                    d.challenger.toLowerCase().includes(q) ||
                    (d.investigator && d.investigator.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (selectedStatus !== 'ALL') {
      const isExp = isDareExpired(d, Date.now()) && d.status !== 'FINALIZED';
      if (selectedStatus === 'OPEN' && d.status !== 'OPEN') return false;
      if (selectedStatus === 'ACCEPTED' && d.status !== 'ACCEPTED') return false;
      if (selectedStatus === 'FINALIZED' && d.status !== 'FINALIZED') return false;
      if (selectedStatus === 'EXPIRED' && !isExp) return false;
    }
    return true;
  });

  // Reactive Protocol Metrics computed directly from live dares state
  const totalDaresCount = dares.length;
  const totalVolumeGen = dares.reduce((sum, d) => sum + (d.stakeCents * (d.status === 'OPEN' ? 1 : 2)) / 100, 0);
  const totalVolumeUsd = (totalVolumeGen * 2).toFixed(0);
  const uniqueParticipantsCount = new Set(
    dares.flatMap(d => [d.challenger, d.investigator].filter(Boolean) as string[])
  ).size;

  // Featured dare is Dare #1 (the 3 actors dare) or fallback to first available
  const featuredDare = dares.find(d => d.id === 1) || dares[0] || null;

  return (
    <div className="min-h-screen w-full bg-[#F7F7F8] text-slate-900 flex font-sans selection:bg-[#EF4444] selection:text-white">
      {/* ============================================================ */}
      {/* 1. LEFT SIDEBAR (OBSIDIAN DARK THEME) */}
      {/* ============================================================ */}
      <aside className={`w-64 bg-[#0D0D11] text-slate-300 flex flex-col justify-between p-4 border-r border-slate-800/80 fixed top-0 left-0 bottom-0 z-40 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="space-y-6">
          {/* Logo & Network Tag */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div 
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => navigateTab('arena', true)}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-[#EF4444] flex items-center justify-center shadow-lg shadow-red-600/30">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white font-sans">
                Dare<span className="text-[#EF4444]">You</span>
              </span>
              <span className="text-[10px] font-semibold bg-[#1F1F28] text-slate-300 px-2 py-0.5 rounded-full border border-slate-700/60 font-mono">
                StudioNet
              </span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1 cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links: Group 1 */}
          <nav className="space-y-1">
            <button
              onClick={() => navigateTab('arena', true)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer text-xs font-semibold ${
                activeTab === 'arena' && !myDaresOnly && selectedDomain === 'ALL'
                  ? 'bg-[#2A1116] text-white border border-red-500/20 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Home className={`w-4 h-4 ${activeTab === 'arena' && !myDaresOnly && selectedDomain === 'ALL' ? 'text-[#EF4444]' : 'text-slate-400'}`} />
              <span>Home</span>
            </button>

            <button
              onClick={() => navigateTab('standard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer text-xs font-medium ${
                activeTab === 'standard'
                  ? 'bg-[#2A1116] text-white border border-red-500/20 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <BookOpen className={`w-4 h-4 ${activeTab === 'standard' ? 'text-[#EF4444]' : 'text-slate-400'}`} />
              <span>How to Play & Standards</span>
            </button>

            <button
              onClick={() => navigateTab('create')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer text-xs font-medium ${
                activeTab === 'create'
                  ? 'bg-[#2A1116] text-white border border-red-500/20 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <PlusCircle className={`w-4 h-4 ${activeTab === 'create' ? 'text-[#EF4444]' : 'text-slate-400'}`} />
              <span>Create Dare</span>
            </button>
          </nav>

          <div className="border-t border-slate-800/80 my-2" />

          {/* Nav Links: Group 2 */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab('arena'); setMyDaresOnly(true); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'arena' && myDaresOnly
                  ? 'bg-[#2A1116] text-white border border-red-500/20 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <FileText className={`w-4 h-4 ${activeTab === 'arena' && myDaresOnly ? 'text-[#EF4444]' : 'text-slate-400'}`} />
              <span>My Dares</span>
            </button>

            <button
              onClick={() => navigateTab('activity')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'activity'
                  ? 'bg-[#2A1116] text-white border border-red-500/20 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <History className={`w-4 h-4 ${activeTab === 'activity' ? 'text-[#EF4444]' : 'text-slate-400'}`} />
              <span>Activity Log</span>
            </button>

            <button
              onClick={() => navigateTab('webmcp')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'webmcp'
                  ? 'bg-[#2A1116] text-white border border-red-500/20 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bot className={`w-4 h-4 ${activeTab === 'webmcp' ? 'text-[#EF4444]' : 'text-slate-400'}`} />
                <span>Agent Gateway (WebMCP)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/20 text-red-400 font-mono font-bold">
                LIVE
              </span>
            </button>
          </nav>
        </div>

        {/* Bottom Promo Card: Fact-check. Prove it. Get paid. */}
        <div className="bg-[#16161D] border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden shadow-lg shadow-black/40">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/15 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <h4 className="text-base font-extrabold text-white leading-tight tracking-tight">
              Fact-check.
              <br />
              Prove it.
              <br />
              <span className="text-[#EF4444]">Get paid.</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Real questions. Verifiable evidence. On-chain decisions.
            </p>
            <button
              onClick={() => setActiveTab('create')}
              className="w-full mt-2 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <span>Create a Dare</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE (PORCELAIN WARM LIGHT THEME) */}
      {/* ============================================================ */}
      <div className="ml-0 md:ml-64 flex-1 min-w-0 w-full overflow-x-hidden flex flex-col min-h-screen bg-[#F7F7F8]">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#F7F7F8]/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-4 md:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-lg">
            {/* Real Mobile Hamburger Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-800 hover:text-slate-950 hover:bg-slate-50 flex-shrink-0 shadow-2xs cursor-pointer active:scale-95 transition-all"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-slate-800" />
            </button>

            {/* Mobile Brand Mark */}
            <div 
              onClick={() => navigateTab('arena', true)}
              className="flex items-center gap-1.5 md:hidden flex-shrink-0 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-[#EF4444] flex items-center justify-center shadow-sm">
                <Flame className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dares..."
                className="w-full bg-white border border-slate-200 rounded-full pl-8 pr-3 py-1.5 md:py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#EF4444] shadow-2xs font-medium"
              />
              <span className="hidden sm:inline-block absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                /
              </span>
            </div>
          </div>

          {/* Navigation Links + Wallet Identity */}
          <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
            <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold">
              <button 
                onClick={() => navigateTab('standard')}
                className={`transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'standard' ? 'text-[#EF4444] font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>How to Play & Standards</span>
              </button>
              <button 
                onClick={() => navigateTab('create')}
                className={`transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'create' ? 'text-[#EF4444] font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Dare</span>
              </button>
              <button 
                onClick={() => navigateTab('webmcp')}
                className={`transition-colors cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                  activeTab === 'webmcp'
                    ? 'bg-red-50 text-[#EF4444] border-red-200 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-[#EF4444]" />
                <span>Agent Tools</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </nav>

            {/* Wallet Identity Chip */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {walletConnected ? (
                <>
                  <div 
                    onClick={() => setShowKeyModal(true)}
                    className="bg-white border border-slate-200 hover:border-slate-300 px-2.5 sm:px-3.5 py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-800 shadow-2xs transition-all cursor-pointer select-none flex-shrink-0"
                    title="Manage Connected Wallet"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                    <span className="font-mono">{walletBalance} GEN</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
                  </div>

                  {/* User Avatar Circle */}
                  <div 
                    onClick={() => setShowKeyModal(true)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold cursor-pointer hover:ring-2 hover:ring-[#EF4444] transition-all select-none shadow-sm flex-shrink-0"
                    title="Manage Connected Account"
                  >
                    {walletAddress ? walletAddress.slice(2, 4).toUpperCase() : 'DY'}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-[11px] sm:text-xs shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 active:scale-95"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Connect Wallet</span>
                  <span className="sm:hidden">Connect</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Stage */}
        <main className="p-4 md:p-8 space-y-6 w-full max-w-[1600px] mx-auto flex-1">
          {/* ============================================================ */}
          {/* TAB 1: LIVE ARENA & EXPLORE (MAIN DREAMS) */}
          {/* ============================================================ */}
          {activeTab === 'arena' && (
            <>
              {/* Hero Banner ("Challenge reality. Back your answer.") */}
              <div className="rounded-3xl bg-[#0B0B0E] border border-slate-800/80 p-4 sm:p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
                {/* Crimson Glow in background */}
                <div className="absolute right-0 top-0 bottom-0 w-2/3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600/30 via-red-950/20 to-transparent pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 items-center">
                  {/* Left Column: Heading, description, and CTA buttons */}
                  <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                      Challenge reality.
                      <br />
                      Back <span className="text-[#EF4444]">your answer.</span>
                    </h1>
                    <p className="text-slate-300 text-xs sm:text-sm max-w-lg leading-relaxed font-medium">
                      Create or solve research challenges with real stakes. Evidence in. Consensus out. On-chain.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 sm:pt-2">
                      <button
                        onClick={() => setActiveTab('create')}
                        className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs shadow-lg shadow-red-500/25 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>Create a Dare</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Key Protocol Metrics Panel */}
                  <div className="bg-[#16161D]/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 sm:p-4 grid grid-cols-2 gap-2.5 sm:gap-3 text-left">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <FileText className="w-3 h-3 text-[#EF4444]" /> Total Dares
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-white font-mono">{totalDaresCount}</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <Coins className="w-3 h-3 text-amber-400" /> Escrow Volume
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-white font-mono">${totalVolumeGen} GEN</span>
                      <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono block">(${totalVolumeUsd} USD)</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <Users className="w-3 h-3 text-cyan-400" /> Solvers
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-white font-mono">{uniqueParticipantsCount}</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <Zap className="w-3 h-3 text-purple-400" /> Active Validators
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-white font-mono">5 LLM Nodes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Filter Pills Row (Horizontal scroll on mobile, flex-wrap on desktop) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-2">
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 -mx-2 px-2 sm:mx-0 sm:px-0 flex-1 min-w-0">
                  {[
                    'All',
                    'Crypto',
                    'Tech',
                    'Science',
                    'Entertainment',
                    'Sports',
                    'History',
                    'Politics',
                    'Finance',
                    'Other'
                  ].map((category) => {
                    const isActive = selectedDomain.toUpperCase() === category.toUpperCase();
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedDomain(category.toUpperCase())}
                        className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#EF4444] text-white shadow-sm shadow-red-500/25 font-bold'
                            : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>

                {/* Status Dropdown Filter */}
                <div className="relative self-start sm:self-auto flex-shrink-0">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-full px-3.5 py-1.5 focus:outline-none focus:border-[#EF4444] shadow-2xs cursor-pointer"
                  >
                    <option value="ALL">Open Dares</option>
                    <option value="OPEN">Phase 1: Open</option>
                    <option value="ACCEPTED">Phase 2: In Research</option>
                    <option value="FINALIZED">Phase 4: Finalized</option>
                  </select>
                </div>
              </div>

              {/* Responsive Layout: Fluid Challenges Table (Flex-1) + Fixed-width Right Rail */}
              <div className="flex flex-col min-[1180px]:flex-row gap-6 pt-2 items-start w-full">
                {/* Left: Dares Market Table */}
                <div className="flex-1 min-w-0 w-full space-y-3">
                  {/* My Dares Filter Banner */}
                  {myDaresOnly && (
                    <div className="bg-red-50/80 border border-red-200/90 rounded-2xl p-3.5 flex items-center justify-between text-xs shadow-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#EF4444]" />
                        <span className="font-semibold text-slate-800">
                          Filtering to dares involving your address ({walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'No wallet connected'})
                        </span>
                      </div>
                      <button
                        onClick={() => setMyDaresOnly(false)}
                        className="px-3 py-1 rounded-full bg-white border border-red-300 text-[#EF4444] font-bold text-[11px] hover:bg-red-50 cursor-pointer shadow-2xs"
                      >
                        Show All Challenges
                      </button>
                    </div>
                  )}

                  {/* Table Column Headers (Hidden on mobile) */}
                  <div className="hidden md:flex items-center justify-between px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex-1">DARE</span>
                    <span className="w-24 text-left">POOL</span>
                    <span className="w-32 text-left">TIME LEFT</span>
                    <span className="w-24 text-right">STATUS</span>
                  </div>

                  {filteredDares.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-red-50 text-[#EF4444] flex items-center justify-center mx-auto mb-3">
                        <Search className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">
                        {myDaresOnly ? "No challenges for your address" : "No challenges found"}
                      </h4>
                      <p className="text-xs text-slate-500 mb-4">
                        {myDaresOnly 
                          ? "You haven't posted or joined any dares yet with this wallet." 
                          : "No dares match the active domain filter."}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        {myDaresOnly ? (
                          <>
                            <button
                              onClick={() => setActiveTab('create')}
                              className="px-4 py-2 rounded-full bg-[#EF4444] text-white font-bold text-xs shadow-md shadow-red-500/20 cursor-pointer"
                            >
                              Post a Dare
                            </button>
                            <button
                              onClick={() => setMyDaresOnly(false)}
                              className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 cursor-pointer"
                            >
                              Browse All Dares
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setSelectedDomain('ALL')}
                            className="px-4 py-2 rounded-full bg-[#EF4444] text-white font-bold text-xs shadow-md shadow-red-500/20 cursor-pointer"
                          >
                            Reset Filter
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    filteredDares.map((dare) => {
                      const poolGenNum = (dare.stakeCents * (dare.status === 'OPEN' ? 1 : 2)) / 100;
                      const totalPoolGen = poolGenNum % 1 === 0 ? poolGenNum.toFixed(0) : poolGenNum.toFixed(2);
                      const totalPoolUsd = (poolGenNum * 2) % 1 === 0 ? (poolGenNum * 2).toFixed(0) : (poolGenNum * 2).toFixed(2);
                      const domainLabel = dare.domain || dare.category.replace(/_/g, ' ');

                      return (
                        <div
                          key={dare.id}
                          onClick={() => handleInspectDare(dare)}
                          className="bg-white hover:bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 transition-all shadow-2xs hover:shadow-xs cursor-pointer group flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4"
                        >
                          {/* Dare Column (Thumbnail + Domain Tag + Title + Participants) */}
                          <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
                            <DareThumbnail domain={dare.domain} title={dare.title} />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between md:justify-start gap-2 mb-0.5">
                                <span className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider">
                                  {domainLabel}
                                </span>

                                {/* Mobile-only Action Button placed at top-right of card */}
                                <div className="block md:hidden">
                                  {dare.status === 'OPEN' ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleInspectDare(dare);
                                      }}
                                      className="px-3 py-1 rounded-lg bg-[#EF4444] text-white font-bold text-[11px] shadow-sm shadow-red-500/20"
                                    >
                                      Join Dare
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleInspectDare(dare);
                                      }}
                                      className="px-3 py-1 rounded-lg bg-[#F3F4F6] text-slate-800 font-bold text-[11px] border border-slate-200"
                                    >
                                      View
                                    </button>
                                  )}
                                </div>
                              </div>

                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#EF4444] transition-colors leading-snug line-clamp-2 md:line-clamp-1">
                                {dare.title}
                              </h3>

                              <div className="flex items-center gap-2 mt-1.5 md:mt-1">
                                {dare.status === 'OPEN' && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 text-[9px] font-bold text-slate-700 flex items-center justify-center font-mono flex-shrink-0">
                                      {dare.challenger.slice(2, 4).toUpperCase()}
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      Challenger: <code className="font-mono text-slate-700">{dare.challenger.slice(0, 6)}...{dare.challenger.slice(-4)}</code> · Open
                                    </span>
                                  </div>
                                )}
                                {dare.status === 'ACCEPTED' && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex -space-x-1.5 overflow-hidden flex-shrink-0">
                                      <div className="w-5 h-5 rounded-full bg-slate-900 border-2 border-white text-[8px] text-white flex items-center justify-center font-mono font-bold" title={`Challenger: ${dare.challenger}`}>
                                        {dare.challenger.slice(2, 4).toUpperCase()}
                                      </div>
                                      <div className="w-5 h-5 rounded-full bg-[#EF4444] border-2 border-white text-[8px] text-white flex items-center justify-center font-mono font-bold" title={`Investigator: ${dare.investigator}`}>
                                        {dare.investigator ? dare.investigator.slice(2, 4).toUpperCase() : 'IN'}
                                      </div>
                                    </div>
                                    <span className="text-[11px] text-slate-700 font-semibold">
                                      Active Duel: 2 Solvers Locked
                                    </span>
                                  </div>
                                )}
                                {dare.status === 'FINALIZED' && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                      ✓
                                    </div>
                                    <span className="text-[11px] text-emerald-700 font-semibold">
                                      Consensus Finalized ({dare.verdict === 'INVESTIGATOR_WINS' ? 'Investigator Won' : 'Challenger Won'})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bottom Row on Mobile / Columns 2-4 on Desktop */}
                          <div className="flex items-center justify-between md:contents pt-2.5 md:pt-0 border-t border-slate-100 md:border-0">
                            {/* Pool Column */}
                            <div className="md:w-24 text-left flex-shrink-0">
                              <span className="text-[10px] text-slate-400 block md:hidden uppercase font-bold">Pool</span>
                              <div className="text-xs md:text-sm font-bold text-slate-900 font-mono flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5 text-[#EF4444]" />
                                <span>{totalPoolGen} GEN</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                (${totalPoolUsd})
                              </span>
                            </div>

                            {/* Time Left Column */}
                            <div className="md:w-32 text-right md:text-left flex-shrink-0">
                              <span className="text-[10px] text-slate-400 block md:hidden uppercase font-bold">Time Left</span>
                              {dare.status === 'ACCEPTED' && dare.researchDeadlineTs ? (
                                <>
                                  <LiveCountdownTimer deadlineTs={dare.researchDeadlineTs} />
                                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                    Duel in progress
                                  </span>
                                  <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 ml-auto md:ml-0">
                                    <div 
                                      className="bg-[#EF4444] h-full transition-all duration-1000" 
                                      style={{ 
                                        width: `${Math.max(10, Math.min(100, Math.round(((dare.researchDeadlineTs - Date.now()) / (dare.durationSeconds * 1000)) * 100)))}%` 
                                      }}
                                    />
                                  </div>
                                </>
                              ) : dare.status === 'OPEN' ? (
                                <>
                                  <div className="text-xs font-bold text-slate-900 font-mono">
                                    {formatDurationWindow(dare.durationSeconds)}
                                  </div>
                                  <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                                    Ready to join
                                  </span>
                                  <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 ml-auto md:ml-0">
                                    <div className="bg-emerald-500 h-full w-full" />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-xs font-bold text-slate-900 font-mono">
                                    Score: {dare.verdictScore || 95}/100
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                    Settled on StudioNet
                                  </span>
                                  <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 ml-auto md:ml-0">
                                    <div className="bg-slate-400 h-full w-full" />
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Status / Action Column (Desktop only, mobile has it in top right) */}
                            <div className="hidden md:block w-24 text-right flex-shrink-0">
                              {dare.status === 'OPEN' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInspectDare(dare);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all cursor-pointer"
                                >
                                  Join Dare
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInspectDare(dare);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-slate-800 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
                                >
                                  View
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Right Rail: Featured Dare Card + Live Activity Feed */}
                <div className="w-full min-[1180px]:w-80 xl:w-96 flex-shrink-0 space-y-6">
                  {/* Featured Dare Card */}
                  {featuredDare && (
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs text-left">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-900 tracking-tight">
                          Featured Dare
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live
                        </span>
                      </div>

                      {/* Featured Graphic / Cinematic Silhouette Noir Image */}
                      <div className="w-full h-44 rounded-xl bg-gradient-to-br from-[#2b0c10] via-[#1a0508] to-[#0d0d11] border border-red-500/20 mb-3.5 relative overflow-hidden flex items-center justify-center shadow-inner">
                        <div className="absolute inset-0 bg-radial from-red-600/35 to-transparent" />
                        <svg viewBox="0 0 100 100" className="w-32 h-32 text-red-100 opacity-80 drop-shadow-xl">
                          {/* Silhouette actor with fedora hat */}
                          <path d="M50 20 C40 20 32 25 28 32 C20 34 10 40 10 48 C10 50 14 52 22 52 C24 52 26 51 28 50 C31 60 40 68 50 68 C60 68 69 60 72 50 C74 51 76 52 78 52 C86 52 90 50 90 48 C90 40 80 34 72 32 C68 25 60 20 50 20 Z" fill="#0D0D11" />
                          <circle cx="50" cy="46" r="14" fill="#1A0D12" />
                          <path d="M30 70 C22 75 18 85 18 100 H82 C82 85 78 75 70 70 C64 76 57 78 50 78 C43 78 36 76 30 70 Z" fill="#0D0D11" />
                        </svg>
                      </div>

                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider mb-2 inline-block">
                        {featuredDare.domain || 'Entertainment'}
                      </span>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug mb-1.5">
                        {featuredDare.title}
                      </h4>

                      <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-3">
                        {featuredDare.claim}
                      </p>

                      {/* 3 Metrics Box */}
                      <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100 text-center mb-4">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Pool</span>
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            ${((featuredDare.stakeCents * 2) / 100).toFixed(0)} GEN
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Time Left</span>
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {featuredDare.status === 'ACCEPTED' && featuredDare.researchDeadlineTs ? (
                              <LiveCountdownTimer deadlineTs={featuredDare.researchDeadlineTs} />
                            ) : (
                              formatDurationWindow(featuredDare.durationSeconds)
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Participants</span>
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {featuredDare.participantsCount || 89}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleInspectDare(featuredDare)}
                        className="w-full py-3 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/25 transition-all cursor-pointer"
                      >
                        <span>View Dare</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Recent Activity Feed */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs text-left">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-slate-900 tracking-tight">
                        Recent Activity
                      </span>
                      <button 
                        onClick={() => setActiveTab('activity')}
                        className="text-xs font-semibold text-[#EF4444] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        View All <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Event 1: Dare 1 matched */}
                      <div 
                        onClick={() => {
                          const d = dares.find(x => x.id === 1);
                          if (d) handleInspectDare(d);
                        }}
                        className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-mono text-slate-900 font-semibold group-hover:text-[#EF4444] transition-colors">0x1366...d473</span>
                            <span className="text-slate-500 text-[11px]"> matched stake on 3 Actors dare</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">14m ago</span>
                      </div>

                      {/* Event 2: Dare 2 posted */}
                      <div 
                        onClick={() => {
                          const d = dares.find(x => x.id === 2);
                          if (d) handleInspectDare(d);
                        }}
                        className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-red-50 text-[#EF4444] flex items-center justify-center">
                            <CircleDot className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-mono text-slate-900 font-semibold group-hover:text-[#EF4444] transition-colors">0x6da2...405e</span>
                            <span className="text-slate-500 text-[11px]"> posted Man City dare ($10 GEN)</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">42m ago</span>
                      </div>

                      {/* Event 3: Dare 3 locked */}
                      <div 
                        onClick={() => {
                          const d = dares.find(x => x.id === 3);
                          if (d) handleInspectDare(d);
                        }}
                        className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Coins className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-mono text-slate-900 font-semibold group-hover:text-[#EF4444] transition-colors">0x7a3F...5659</span>
                            <span className="text-slate-500 text-[11px]"> opened Bitcoin $100k print dare</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">1h ago</span>
                      </div>

                      {/* Event 4: Dare 4 created */}
                      <div 
                        onClick={() => {
                          const d = dares.find(x => x.id === 4);
                          if (d) handleInspectDare(d);
                        }}
                        className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-mono text-slate-900 font-semibold group-hover:text-[#EF4444] transition-colors">0x4e1B...5659</span>
                            <span className="text-slate-500 text-[11px]"> created LLM Human-Eval dare</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">2h ago</span>
                      </div>

                      {/* Event 5: Dare 5 finalized */}
                      <div 
                        onClick={() => {
                          const d = dares.find(x => x.id === 5);
                          if (d) handleInspectDare(d);
                        }}
                        className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Trophy className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-mono text-slate-900 font-semibold group-hover:text-[#EF4444] transition-colors">0x1366...d473</span>
                            <span className="text-slate-500 text-[11px]"> won $20 GEN (Score: 96/100)</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">4h ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* TAB 2: CREATE DARE (WITH REAL-TIME AI RUBRIC PRE-FLIGHT METER) */}
          {/* ============================================================ */}
          {activeTab === 'create' && (
            <div className="max-w-4xl mx-auto space-y-6 text-left">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-[#EF4444]" />
                  Post an On-Chain Challenge
                </h2>
                <p className="text-xs text-slate-500">
                  Deposit your stake in escrow and challenge autonomous AI agents or researchers to prove or refute your claim under a strict deadline.
                </p>
              </div>

              {/* How to Create Dare Guidance Banner */}
              <div className="bg-gradient-to-r from-red-50 to-amber-50 border border-red-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-600/10 text-[#EF4444] flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Follow the Challenger Protocol Standard</h4>
                    <p className="text-[11px] text-slate-600">Ensure your claim is falsifiable, cites independent primary archives, and sets clear pass/fail logic.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTab('standard')}
                  className="px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs font-bold text-[#EF4444] hover:bg-red-50 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs transition-all"
                >
                  <span>View Standards</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Challenge Composer (Left 2 cols) */}
                <div className="lg:col-span-2">
                  <form onSubmit={handlePublishDare} className="space-y-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                    {/* Title */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Challenge Title <span className="text-[#EF4444]">* (MUST start with "Dare you to...")</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={createTitle}
                        onChange={(e) => setCreateTitle(e.target.value)}
                        placeholder='Dare you to identify three actors who have each played both a male character and a female character in lead roles in separate films...'
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#EF4444] font-medium"
                      />
                    </div>

                    {/* Category & Domain */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1.5">Domain Tag</label>
                        <select
                          value={createDomain}
                          onChange={(e) => setCreateDomain(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#EF4444] font-medium"
                        >
                          <option value="Entertainment">Entertainment</option>
                          <option value="Crypto">Crypto</option>
                          <option value="Tech">Tech</option>
                          <option value="Science">Science</option>
                          <option value="Sports">Sports</option>
                          <option value="History">History</option>
                          <option value="Finance">Finance</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1.5">Investigation Type</label>
                        <select
                          value={createCategory}
                          onChange={(e) => setCreateCategory(e.target.value as DareCategory)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#EF4444] font-medium"
                        >
                          <option value="CONFLICTING_SOURCE_INVESTIGATION">Conflicting-Source Investigation</option>
                          <option value="INVESTIGATIVE_FACT_FINDING">Investigative Fact-Finding</option>
                          <option value="EVIDENCE_SYNTHESIS">Evidence Synthesis</option>
                        </select>
                      </div>
                    </div>

                    {/* Core Factual Claim */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Core Factual Claim <span className="text-[#EF4444]">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={createClaim}
                        onChange={(e) => setCreateClaim(e.target.value)}
                        placeholder="State the verifiable factual proposition being challenged..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#EF4444]"
                      />
                    </div>

                    {/* Required Primary Sources */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Required Primary Sources <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={createSources}
                        onChange={(e) => setCreateSources(e.target.value)}
                        placeholder="e.g. Official AFI catalog archives, British Film Institute (BFI) credits..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#EF4444]"
                      />
                    </div>

                    {/* Adjudication Criteria */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Frozen Adjudication Criteria <span className="text-[#EF4444]">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={createCriteria}
                        onChange={(e) => setCreateCriteria(e.target.value)}
                        placeholder="Specify exact condition required to claim the reward without speculative bias..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#EF4444]"
                      />
                    </div>

                    {/* Stake & Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Stake Amount */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700">Duel Stake (GEN)</label>
                          <span className="text-[10px] text-slate-400 font-mono">Any amount</span>
                        </div>
                        <div className="relative">
                          <Coins className="w-3.5 h-3.5 text-[#EF4444] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            step="any"
                            min="0.0001"
                            placeholder="e.g. 5.00"
                            value={createStakeUsd}
                            onChange={(e) => setCreateStakeUsd(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#EF4444]"
                          />
                        </div>
                        {/* Quick Stake Preset Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {['0.5', '1', '5', '10', '20', '50'].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCreateStakeUsd(amt)}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold transition-all cursor-pointer ${
                                createStakeUsd === amt 
                                  ? 'bg-[#EF4444] text-white shadow-xs' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                            >
                              {amt} GEN
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Research Window Duration */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700">Research Window</label>
                          <span className="text-[10px] font-bold text-[#EF4444] font-mono">
                            {formatDurationWindow(computedDurationSeconds)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 relative">
                            <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="number"
                              min="1"
                              step="1"
                              placeholder="1"
                              value={createDurationValue}
                              onChange={(e) => setCreateDurationValue(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#EF4444]"
                            />
                          </div>
                          <div>
                            <select
                              value={createDurationUnit}
                              onChange={(e) => setCreateDurationUnit(e.target.value as any)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#EF4444] font-medium cursor-pointer"
                            >
                              <option value="SECONDS">Seconds</option>
                              <option value="MINUTES">Minutes</option>
                              <option value="HOURS">Hours</option>
                              <option value="DAYS">Days</option>
                            </select>
                          </div>
                        </div>

                        {/* Quick Window Preset Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {[
                            { label: '⚡ 1s', val: '1', unit: 'SECONDS' },
                            { label: '5s', val: '5', unit: 'SECONDS' },
                            { label: '10s', val: '10', unit: 'SECONDS' },
                            { label: '30s', val: '30', unit: 'SECONDS' },
                            { label: '1m', val: '1', unit: 'MINUTES' },
                            { label: '5m', val: '5', unit: 'MINUTES' },
                            { label: '15m', val: '15', unit: 'MINUTES' },
                            { label: '30m', val: '30', unit: 'MINUTES' },
                            { label: '1h', val: '1', unit: 'HOURS' },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setCreateDurationValue(preset.val);
                                setCreateDurationUnit(preset.unit as any);
                              }}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold transition-all cursor-pointer ${
                                createDurationValue === preset.val && createDurationUnit === preset.unit
                                  ? 'bg-[#EF4444] text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!formatPassed}
                      className="w-full py-3.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-500/25 cursor-pointer"
                    >
                      <span>Lock Stake & Publish Challenge ({createStakeUsd || '0'} GEN · {formatDurationWindow(computedDurationSeconds)})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                {/* Pre-Flight Quality Meter (Right Column) */}
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#EF4444]" />
                      AI Rubric Pre-Flight Meter
                    </h3>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">Predicted Admissibility</span>
                      <span className={`text-lg font-black font-mono ${
                        rubricScore >= 90 ? 'text-emerald-600' : rubricScore >= 60 ? 'text-amber-500' : 'text-rose-500'
                      }`}>
                        {rubricScore}/100
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          rubricScore >= 90 ? 'bg-emerald-500' : rubricScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${rubricScore}%` }}
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        {formatPassed ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                        <span className={formatPassed ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                          Begins with "Dare you to..."
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {claimLengthPassed ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                        <span className={claimLengthPassed ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                          Specific factual claim (20+ chars)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {sourcesPassed ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                        <span className={sourcesPassed ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                          Primary source guidance
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {criteriaPassed ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                        <span className={criteriaPassed ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                          Deterministic criteria specified
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: HOW TO PLAY & PROTOCOL STANDARDS */}
          {/* ============================================================ */}
          {activeTab === 'standard' && (
            <div className="max-w-4xl mx-auto space-y-6 text-left">
              {/* Header */}
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#EF4444]" />
                    How to Play & Protocol Standards
                  </h2>
                  <p className="text-xs text-slate-500">
                    Official rules and submission standards for creating, solving, and adjudicating challenges under the GenLayer Equivalence Principle.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-[#EF4444] border border-red-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Protocol Standard v1.2
                  </span>
                </div>
              </div>

              {/* Standards Sub-Navigation Pills */}
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-max border border-slate-200/80 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStandardsView('create')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    standardsView === 'create'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className={`w-3.5 h-3.5 ${standardsView === 'create' ? 'text-[#EF4444]' : 'text-slate-400'}`} />
                  <span>How to Create a Dare</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStandardsView('solve')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    standardsView === 'solve'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Search className={`w-3.5 h-3.5 ${standardsView === 'solve' ? 'text-[#EF4444]' : 'text-slate-400'}`} />
                  <span>How to Solve a Dare</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStandardsView('validators')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    standardsView === 'validators'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Cpu className={`w-3.5 h-3.5 ${standardsView === 'validators' ? 'text-[#EF4444]' : 'text-slate-400'}`} />
                  <span>Validator Consensus & Rubric</span>
                </button>
              </div>

              {/* VIEW 1: HOW TO CREATE A DARE */}
              {standardsView === 'create' && (
                <div className="space-y-6">
                  {/* Step-by-Step Challenger Rules */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-50 text-[#EF4444] font-bold flex items-center justify-center text-xs">
                        01
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Must Be an Objectively Falsifiable Claim</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Every challenge title MUST start with <code className="text-[#EF4444] font-bold">Dare you to...</code> and propose a factual proposition that can be proven true or false with documentation. Subjective opinions, future predictions, or vague musings are rejected.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-50 text-[#EF4444] font-bold flex items-center justify-center text-xs">
                        02
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Specify Primary Source Registries</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Designate independent, authoritative records (e.g. SEC EDGAR filings, Companies House statutory accounts, BFI / AFI catalogs, GitHub commit hashes, Court Dockets). Social media, forums, and blogs are rejected by validators.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-50 text-[#EF4444] font-bold flex items-center justify-center text-xs">
                        03
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Define Precise Pass/Fail Criteria</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Give unambiguous rules so multi-LLM validators have zero ambiguity (e.g., <em>"Provide three distinct actors with verifiable male and female lead roles where character gender was fixed within the storyline"</em>).
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-50 text-[#EF4444] font-bold flex items-center justify-center text-xs">
                        04
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Set Window (Down to 1s) & Stake</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        You decide the research window from as little as <strong>1 second (1s)</strong> to minutes, hours, or days. Lock collateral in GEN. If no investigator proves it within the window, you reclaim 100% of your stake + escrow!
                      </p>
                    </div>
                  </div>

                  {/* Good vs Bad Examples */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Creation Standards: Benchmark Comparison</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>APPROVED: Falsifiable with Primary Source</span>
                        </div>
                        <p className="text-slate-800 font-medium">
                          "Dare you to identify three actors who have each played both a male and female character in lead roles in separate films, where neither involves a gender transition within the storyline."
                        </p>
                        <p className="text-emerald-900 text-[11px]">
                          ✓ Specific, verifiable via AFI catalog archives, precise boundary rules.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-red-800 font-bold">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span>REJECTED: Subjective Opinion / Unverifiable</span>
                        </div>
                        <p className="text-slate-800 font-medium">
                          "Dare you to prove that Manchester City is the best football club in the world."
                        </p>
                        <p className="text-red-900 text-[11px]">
                          ✗ Subjective opinion, lacks primary source standard, impossible for LLM validators to objectively grade.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CTA Banner */}
                  <div className="p-5 rounded-2xl bg-[#0D0D11] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
                    <div>
                      <h4 className="text-sm font-bold text-white">Ready to challenge the world's best researchers?</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Post an on-chain challenge now and lock your stake in GenLayer smart escrow.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateTab('create')}
                      className="px-5 py-2.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Create a Dare Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 2: HOW TO SOLVE A DARE */}
              {standardsView === 'solve' && (
                <div className="space-y-6">
                  {/* Investigator Solving Workflow */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-red-50 text-[#EF4444] font-bold flex items-center justify-center text-xs">
                        01
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Match Stake & Start Timer</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Click "Match Stake & Accept Challenge" to lock your 1:1 matching collateral. The research window begins ticking down in real time.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-red-50 text-[#EF4444] font-bold flex items-center justify-center text-xs">
                        02
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Locate Canonical Archive URL</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Provide a verifiable HTTPS link from official archives, government registries, or Wayback Machine records. Self-referential or sandbox links are auto-flagged.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-red-50 text-[#EF4444] font-bold flex items-center justify-center text-xs">
                        03
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Verbatim Quotes & Reasoning</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Copy the exact excerpt from the source without alteration, and write 2-3 sentences demonstrating how your citation fulfills the criteria.
                      </p>
                    </div>
                  </div>

                  {/* Evidence Checklist Box */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                    <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Investigator Submission Checklist</h4>
                    <div className="space-y-2.5 text-xs text-slate-700">
                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900">Primary Archive URL:</strong> Must be a direct canonical link (e.g. <code>https://catalog.afi.com/Film/57007</code>). Unverified forums, reddit posts, or LLM pastebins are scored as zero provenance.
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900">Verbatim Excerpt:</strong> Must be character-for-character accurate with the cited archive. Paraphrasing reduces fidelity scores.
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900">Reasoning Defense:</strong> Concisely address each sub-clause in the dare's frozen criteria.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Banner */}
                  <div className="p-5 rounded-2xl bg-[#0D0D11] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
                    <div>
                      <h4 className="text-sm font-bold text-white">Find an open challenge in the Arena</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Explore open duels, match the stake, prove the answer, and win 100% of the escrow pool.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateTab('arena')}
                      className="px-5 py-2.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Explore Arena Dares</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 3: VALIDATOR CONSENSUS & RUBRIC */}
              {standardsView === 'validators' && (
                <div className="space-y-6">
                  {/* Rubric Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Weight: 30%</span>
                      <h4 className="text-xs font-bold text-slate-900">Source Provenance</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Independence and authority of the primary domain. Official filings, archives, and court records score max points.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Weight: 30%</span>
                      <h4 className="text-xs font-bold text-slate-900">Verbatim Fidelity</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Exact character matching between cited evidence and original source text. Zero points for hallucinations or fabricated quotes.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Weight: 25%</span>
                      <h4 className="text-xs font-bold text-slate-900">Criteria Fulfillment</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Complete satisfaction of all clauses in the frozen rubric without omitting required conditions.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Weight: 15%</span>
                      <h4 className="text-xs font-bold text-slate-900">Logical Depth</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Clear, deductive synthesis showing how quotes verify the claim with zero circular logic.
                      </p>
                    </div>
                  </div>

                  {/* Benchmark Suite Cards */}
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Standard Protocol Evaluation Benchmarks</h4>
                    {STANDARD_TEST_CASES.map((tc) => (
                      <div key={tc.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider">
                            {tc.domain}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Score: {tc.depthScore}/100 ({tc.decision})
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{tc.title}</h3>
                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <strong>Claim:</strong> {tc.claim}
                        </p>
                        <p className="text-xs text-slate-500">
                          <strong>Sources:</strong> {tc.requiredSources}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: AGENT GATEWAY (WEBMCP TOOLS & INTERACTIVE RUNNER) */}
          {/* ============================================================ */}
          {activeTab === 'webmcp' && (
            <div className="max-w-4xl mx-auto space-y-6 text-left">
              {/* Header */}
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#EF4444]" />
                    Autonomous Agent Gateway (WebMCP)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live Web Model Context Protocol tools for programmatic AI agents (Claude, Cursor, Antigravity, custom LLM workers).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    window.__WEBMCP_TOOLS__ Active ({APP_WEBMCP_TOOLS.length} Tools)
                  </span>
                </div>
              </div>

              {/* Status and Quick Action Strip */}
              <div className="bg-[#121218] border border-slate-800 rounded-2xl p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#EF4444]" />
                    <span className="text-xs font-bold text-white font-mono">WebMCP In-Browser Runtime Injected</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Run native JavaScript queries or connect your external MCP agent client directly.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`const state = await window.__WEBMCP_TOOLS__.execute('get_app_state', {});\nconsole.log(state);`);
                      alert("Copied JavaScript execution snippet to clipboard!");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JS Snippet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const toolsJson = JSON.stringify(APP_WEBMCP_TOOLS.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })), null, 2);
                      navigator.clipboard.writeText(toolsJson);
                      alert(`Copied ${APP_WEBMCP_TOOLS.length} WebMCP Tool Schemas (JSON) to clipboard!`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Copy All Schemas</span>
                  </button>
                </div>
              </div>

              {/* Interactive Tool Runner Console */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-[#EF4444]" />
                    <h3 className="text-sm font-bold text-slate-900">Interactive Live Tool Runner</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Test tools live in browser</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tool Selection & Arguments */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Select WebMCP Tool</label>
                      <select
                        value={activeMcpTool}
                        onChange={(e) => {
                          const name = e.target.value;
                          setActiveMcpTool(name);
                          if (name === 'list_dares') {
                            setMcpToolArgs('{\n  "status": "ALL"\n}');
                          } else if (name === 'filter_dares') {
                            setMcpToolArgs('{\n  "domain": "Entertainment"\n}');
                          } else if (name === 'get_dare_dossier') {
                            setMcpToolArgs('{\n  "dare_id": 1\n}');
                          } else if (name === 'get_app_state') {
                            setMcpToolArgs('{}');
                          } else if (name === 'create_dare') {
                            setMcpToolArgs('{\n  "title": "Dare you to verify an archival document...",\n  "category": "INVESTIGATIVE_FACT_FINDING",\n  "claim": "Official filings confirm...",\n  "required_sources": "National Archive",\n  "criteria": "Cite exact page...",\n  "stake_usd": 10,\n  "duration_seconds": 30\n}');
                          } else {
                            setMcpToolArgs('{}');
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-[#EF4444]"
                      >
                        {APP_WEBMCP_TOOLS.map(t => (
                          <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        JSON Arguments (Payload)
                      </label>
                      <textarea
                        rows={6}
                        value={mcpToolArgs}
                        onChange={(e) => setMcpToolArgs(e.target.value)}
                        className="w-full bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl p-3 focus:outline-none border border-slate-800"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={mcpExecuting}
                      onClick={async () => {
                        setMcpExecuting(true);
                        try {
                          const parsed = mcpToolArgs.trim() ? JSON.parse(mcpToolArgs) : {};
                          const tool = APP_WEBMCP_TOOLS.find(t => t.name === activeMcpTool);
                          if (!tool) throw new Error("Tool not found: " + activeMcpTool);
                          const res = await tool.execute(parsed);
                          setMcpResult(res);
                        } catch (err: any) {
                          setMcpResult({ error: err.message || String(err) });
                        } finally {
                          setMcpExecuting(false);
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{mcpExecuting ? 'Executing...' : `Execute ${activeMcpTool} Live`}</span>
                    </button>
                  </div>

                  {/* Output Result Screen */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">Live Execution Output</label>
                      {mcpResult && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(mcpResult, null, 2));
                            alert("Copied result to clipboard!");
                          }}
                          className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Copy Output
                        </button>
                      )}
                    </div>
                    <pre className="flex-1 bg-slate-900 text-slate-200 font-mono text-[11px] p-3 rounded-xl border border-slate-800 overflow-auto max-h-[220px]">
                      {mcpResult ? JSON.stringify(mcpResult, null, 2) : '// Click "Execute Tool Live" to inspect response...'}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Complete Registered Tools Grid */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Complete WebMCP Tool Catalog ({APP_WEBMCP_TOOLS.length} Tools)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {APP_WEBMCP_TOOLS.map((t) => (
                    <div 
                      key={t.name} 
                      onClick={() => {
                        setActiveMcpTool(t.name);
                        setMcpToolArgs('{}');
                      }}
                      className={`bg-white border rounded-2xl p-4 shadow-xs space-y-1.5 transition-all cursor-pointer ${
                        activeMcpTool === t.name ? 'border-[#EF4444] ring-1 ring-[#EF4444]/20' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-bold text-[#EF4444] font-mono">{t.name}</code>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {t.annotations?.readOnlyHint ? 'Read Only' : 'State Mutator'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: PROTOCOL ACTIVITY & AUDIT LOG */}
          {/* ============================================================ */}
          {activeTab === 'activity' && (
            <div className="max-w-4xl mx-auto space-y-6 text-left">
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <History className="w-5 h-5 text-[#EF4444]" />
                    StudioNet Activity & Consensus Audit Log
                  </h2>
                  <p className="text-xs text-slate-500">
                    Immutable event stream of challenges, matched escrow deposits, and multi-LLM validator decisions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    StudioNet Synced
                  </span>
                </div>
              </div>

              {/* Activity Timeline List */}
              <div className="space-y-4">
                {dares.map((dare) => {
                  const poolGen = ((dare.stakeCents * (dare.status === 'OPEN' ? 1 : 2)) / 100).toFixed(0);
                  const poolUsd = (Number(poolGen) * 2).toFixed(0);

                  return (
                    <div 
                      key={dare.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full">
                            {dare.domain || dare.category.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            Challenge #{dare.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {dare.status === 'ACCEPTED' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              Active Duel (Researching)
                            </span>
                          )}
                          {dare.status === 'OPEN' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Open for Investigator
                            </span>
                          )}
                          {dare.status === 'FINALIZED' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Finalized (Score: {dare.verdictScore || 96}/100)
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {dare.title}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl text-xs border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Challenger</span>
                          <code className="text-slate-800 font-mono text-[11px]">{dare.challenger.slice(0, 10)}...{dare.challenger.slice(-4)}</code>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Investigator</span>
                          <code className="text-slate-800 font-mono text-[11px]">
                            {dare.investigator ? `${dare.investigator.slice(0, 10)}...${dare.investigator.slice(-4)}` : 'Awaiting Match'}
                          </code>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Escrow Stake</span>
                          <span className="text-[#EF4444] font-bold font-mono text-xs">
                            {poolGen} GEN (${poolUsd})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {dare.txHash ? (
                          <a
                            href={`https://explorer-studio.genlayer.com/tx/${dare.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#EF4444] hover:underline flex items-center gap-1 font-mono"
                          >
                            <span>Tx: {dare.txHash.slice(0, 12)}...{dare.txHash.slice(-6)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            StudioNet Contract: 0x9376...0F23
                          </span>
                        )}

                        <button
                          onClick={() => handleInspectDare(dare)}
                          className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <span>Inspect Dossier</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* StudioNet Anchored Footer */}
        <footer className="mt-auto border-t border-slate-200/80 bg-white py-6 px-4 md:px-8 text-center sm:text-left">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-red-600/10 text-[#EF4444] flex items-center justify-center font-bold text-[10px]">
                🔥
              </div>
              <span className="font-semibold text-slate-700">DareYou Protocol</span>
              <span>·</span>
              <span>Autonomous Consensus & Prediction Arena on GenLayer StudioNet</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                StudioNet (Chain ID 61999)
              </span>
              <span>·</span>
              <span>Intelligent Contracts Active</span>
            </div>
          </div>
        </footer>
      </div>

      {/* ============================================================ */}
      {/* 3. DOSSIER & EVIDENCE MODAL */}
      {/* ============================================================ */}
      {selectedDare && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-left space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider block mb-0.5">
                  {selectedDare.domain || selectedDare.category.replace(/_/g, ' ')}
                </span>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  Challenge #{selectedDare.id} Dossier
                </h3>
              </div>
              <button
                onClick={() => setSelectedDareId(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Core Claim */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                "{selectedDare.title}"
              </h4>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs space-y-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Factual Proposition</span>
                  <p className="text-slate-800 font-medium">{selectedDare.claim}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Sources Required</span>
                  <p className="text-slate-700">{selectedDare.requiredSources}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Frozen Adjudication Criteria</span>
                  <p className="text-slate-700">{selectedDare.criteria}</p>
                </div>
              </div>
            </div>

            {/* Duel Pool & Parameters */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Duel Stake Pool</span>
                <span className="font-bold text-[#EF4444] font-mono text-sm">
                  ${((selectedDare.stakeCents * (selectedDare.status === 'OPEN' ? 1 : 2)) / 100).toFixed(2)} GEN
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Window</span>
                <span className="font-bold text-slate-800">{formatDurationWindow(selectedDare.durationSeconds)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Current Status</span>
                <span className={`font-bold uppercase text-[11px] px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                  selectedDare.status === 'FINALIZED'
                    ? 'bg-slate-900 text-emerald-400'
                    : selectedDare.status === 'ACCEPTED'
                    ? 'bg-blue-100 text-blue-800'
                    : selectedDare.status === 'SUBMITTED'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedDare.status === 'FINALIZED' ? 'CLOSED · RESOLVED' : selectedDare.status}
                </span>
              </div>
            </div>

            {/* Phase Actions */}
            {selectedDare.status === 'OPEN' && (
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => handleAcceptDare(selectedDare.id)}
                  className="w-full py-3.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/25 transition-all cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>Match Stake & Accept Challenge (${(selectedDare.stakeCents / 100).toFixed(2)} GEN)</span>
                </button>
              </div>
            )}

            {selectedDare.status === 'ACCEPTED' && (
              <form onSubmit={handleSubmitEvidence} className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200 text-xs">
                  <span className="text-red-700 font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#EF4444]" /> Active Research Window
                  </span>
                  <LiveCountdownTimer deadlineTs={selectedDare.researchDeadlineTs} />
                </div>

                {/* Solver Standards Reminder */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-[#EF4444]" />
                    Investigator Submission Checklist
                  </span>
                  <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                    <li><strong>Independent Archive URL:</strong> Official government, SEC, company registry, or court record.</li>
                    <li><strong>Verbatim Quotes:</strong> Exact excerpt copied word-for-word without editing.</li>
                    <li><strong>Reasoning Defense:</strong> Concisely prove how the excerpt fulfills the criteria.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Conclusion</label>
                    <select
                      value={evidenceConclusion}
                      onChange={(e) => setEvidenceConclusion(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                    >
                      <option value="CLAIM_VERIFIED_TRUE">CLAIM_VERIFIED_TRUE</option>
                      <option value="CLAIM_REFUTED_FALSE">CLAIM_REFUTED_FALSE</option>
                      <option value="CONFIRMED_DISCREPANCY">CONFIRMED_DISCREPANCY</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Primary Archive URL</label>
                    <input
                      required
                      type="url"
                      value={evidencePrimaryUrl}
                      onChange={(e) => setEvidencePrimaryUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Verbatim Quotes from Source</label>
                    <textarea
                      required
                      rows={2}
                      value={evidenceQuotes}
                      onChange={(e) => setEvidenceQuotes(e.target.value)}
                      placeholder="Exact unedited text from the archival record..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Reasoning Defense</label>
                    <textarea
                      required
                      rows={2}
                      value={evidenceReasoning}
                      onChange={(e) => setEvidenceReasoning(e.target.value)}
                      placeholder="Explain how the quoted text satisfies the criteria..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/25 transition-all cursor-pointer"
                  >
                    Submit Evidence for Validator Consensus
                  </button>
                </div>
              </form>
            )}

            {/* Phase 3: Live Adjudication in Progress */}
            {selectedDare.status === 'SUBMITTED' && (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto animate-spin">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      Adjudicating Evidence across GenLayer Validators...
                    </h4>
                    <p className="text-xs text-amber-700 mt-1">
                      {selectedDare.adjudicationSession?.currentStage || 'Heterogeneous LLMs evaluating source provenance, verbatim fidelity, and reasoning defense...'}
                    </p>
                  </div>
                  <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-600 h-full transition-all duration-500" 
                      style={{ width: `${selectedDare.adjudicationSession?.progressPercent || 50}%` }} 
                    />
                  </div>
                </div>

                {selectedDare.adjudicationSession?.votes && selectedDare.adjudicationSession.votes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Validator Consensus Stream</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedDare.adjudicationSession.votes.map((v, i) => (
                        <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 font-mono text-[11px]">{v.model}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.verdict === 'INVESTIGATOR_WINS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {v.verdict === 'INVESTIGATOR_WINS' ? 'VERIFIED' : 'REJECTED'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 italic">"{v.reasoning}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Phase 4: Finalized / Closed Outcome */}
            {selectedDare.status === 'FINALIZED' && (() => {
              const payoutDollars = ((selectedDare.stakeCents * 2) / 100).toFixed(2);
              const isChallengerWinner = selectedDare.verdict === 'CHALLENGER_WINS';
              const winnerAddress = selectedDare.verdict === 'INVESTIGATOR_WINS' 
                ? (selectedDare.investigator || '0xInvestigator...')
                : (walletAddress && selectedDare.isBenchmark === false ? walletAddress : selectedDare.challenger);
              const isUserWinner = !!(
                walletAddress && (
                  walletAddress.toLowerCase() === winnerAddress.toLowerCase() ||
                  (isChallengerWinner && (selectedDare.challenger.toLowerCase() === walletAddress.toLowerCase() || selectedDare.isBenchmark === false))
                )
              );
              const settlementTx = selectedDare.settlementTxHash || selectedDare.txHash || '0x6f2ba43ab0c114a0aebe25c12c7fd64dd477bc468c61dcfa390edf6b718b7eb6';
              const categoricalOutcome = selectedDare.verdict === 'INVESTIGATOR_WINS' ? 'MET' : selectedDare.verdict === 'CHALLENGER_WINS' ? 'NOT_MET' : 'INSUFFICIENT_EVIDENCE';

              return (
                <div className="space-y-4 pt-2">
                  {/* GenLayer Transaction Finality & Appeal Window Banner */}
                  <div className="p-3 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold uppercase text-[10px]">
                        RECORDED ON-CHAIN PROOF
                      </span>
                      <span className="text-slate-300 font-mono">
                        State: ACCEPTED · MAJORITY_AGREE
                      </span>
                    </div>
                    <span className="text-amber-300 font-mono text-[10px]">
                      Appeal Window: Native Protocol Finality
                    </span>
                  </div>

                  <div className={`p-5 rounded-2xl border text-xs space-y-3.5 shadow-sm ${
                    selectedDare.verdict === 'INVESTIGATOR_WINS'
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/90 border-amber-200 text-amber-950'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold flex items-center gap-2 text-base">
                        <Trophy className="w-5 h-5 text-emerald-600" />
                        {selectedDare.verdict === 'INVESTIGATOR_WINS' ? 'Investigator Won' : 'Challenger Won'}
                      </span>
                      <span className={`px-3 py-1 rounded-full font-mono font-bold border shadow-2xs text-[11px] ${
                        categoricalOutcome === 'MET'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        Outcome: {categoricalOutcome}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed font-medium">{selectedDare.verdictRationale}</p>
                    
                    {/* Escrow Release & Winner Recipient Breakdown */}
                    <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Deterministic Consequence:</span>
                        <span className="font-bold font-mono text-emerald-700 text-xs">
                          ${payoutDollars} GEN ({selectedDare.verdict === 'INVESTIGATOR_WINS' ? 'RELEASE_TO_INVESTIGATOR' : 'FORFEIT_TO_CHALLENGER'})
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Payout Recipient:</span>
                        <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-800">
                          <span>{winnerAddress.slice(0, 10)}...{winnerAddress.slice(-6)}</span>
                          {isUserWinner && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-extrabold uppercase">
                              Your Wallet
                            </span>
                          )}
                        </div>
                      </div>

                      {/* On-Chain Settlement Tx Hash with direct StudioNet Explorer Link */}
                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-dashed border-slate-200/80">
                        <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          StudioNet Proof Tx:
                        </span>
                        <a
                          href={`https://explorer-studio.genlayer.com/tx/${settlementTx}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-900 hover:underline font-mono text-[11px] font-bold flex items-center gap-1 group"
                          title="View on GenLayer StudioNet Explorer"
                        >
                          <span>{settlementTx.slice(0, 10)}...{settlementTx.slice(-6)}</span>
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600 group-hover:text-emerald-900" />
                        </a>
                      </div>

                      {/* DareAdjudicator Contract Explorer Link */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Adjudicator Contract:</span>
                        <a
                          href={`https://explorer-studio.genlayer.com/address/${GENLAYER_ADJUDICATOR_ADDRESS}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-700 hover:text-slate-900 hover:underline font-mono text-[11px] font-semibold flex items-center gap-1"
                        >
                          <span>{GENLAYER_ADJUDICATOR_ADDRESS.slice(0, 10)}...{GENLAYER_ADJUDICATOR_ADDRESS.slice(-6)}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0 text-slate-500" />
                        </a>
                      </div>

                      {/* Auto-Payout Confirmation Badge */}
                      {isUserWinner && (
                        <div className="pt-1.5">
                          <div className="p-2.5 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-900 font-bold text-center text-xs flex items-center justify-center gap-2 shadow-2xs">
                            <Check className="w-4 h-4 text-emerald-700" />
                            <span>Auto-Released: +${payoutDollars} GEN Credited Directly to Your Connected Wallet</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live StudioNet RPC Read Box (Separating Recorded Proof from Live Reads) */}
                  <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 text-xs space-y-2.5 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                          Live StudioNet RPC Contract Read
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          DareAdjudicator.get_adjudication({selectedDare.id})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setMcpExecuting(true);
                          const liveData = await getOnChainAdjudication(selectedDare.id);
                          setMcpResult({ dareId: selectedDare.id, liveData });
                          setMcpExecuting(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${mcpExecuting ? 'animate-spin' : ''}`} />
                        <span>{mcpExecuting ? 'Querying RPC...' : 'Verify Live on StudioNet'}</span>
                      </button>
                    </div>
                    {mcpResult && mcpResult.dareId === selectedDare.id && (
                      <pre className="p-2.5 rounded-xl bg-black/60 border border-slate-800 text-[10px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(mcpResult.liveData, null, 2)}
                      </pre>
                    )}
                  </div>

                {/* Evidence Archive Record */}
                {selectedDare.evidence && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Submitted Evidence Dossier</span>
                    {selectedDare.evidence.primaryUrl && (
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px]">Primary Immutable Archive URL</span>
                        <a 
                          href={selectedDare.evidence.primaryUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[#EF4444] hover:underline font-mono text-[11px] break-all flex items-center gap-1"
                        >
                          {selectedDare.evidence.primaryUrl} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                    {selectedDare.evidence.quotes && (
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px]">Verbatim Quotes Checked by Validators</span>
                        <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-100 italic text-[11px]">
                          "{selectedDare.evidence.quotes}"
                        </p>
                      </div>
                    )}
                    {selectedDare.evidence.reasoning && (
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px]">Reasoning Defense</span>
                        <p className="text-slate-800 text-[11px]">{selectedDare.evidence.reasoning}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 5-Validator Consensus Breakdown */}
                {selectedDare.adjudicationSession?.votes && selectedDare.adjudicationSession.votes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      GenLayer Equivalence Validator Committee ({selectedDare.adjudicationSession.votes.length} Nodes)
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedDare.adjudicationSession.votes.map((v, i) => (
                        <div key={i} className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 font-mono text-[11px]">{v.model}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.verdict === 'INVESTIGATOR_WINS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {v.verdict === 'INVESTIGATOR_WINS' ? 'MET' : 'NOT_MET'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed italic">"{v.reasoning}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prominent Close Dossier Button */}
                <button
                  type="button"
                  onClick={() => setSelectedDareId(null)}
                  className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span>Close Dossier & Return to Arena</span>
                </button>
              </div>
            );
          })()}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. TRANSACTION MODAL */}
      {/* ============================================================ */}
      {txState.active && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D0D11] border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center text-white">
            <div className="w-14 h-14 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center mb-5 animate-pulse">
              <Cpu className="w-7 h-7 text-[#EF4444]" />
            </div>
            <h3 className="text-lg font-bold mb-1 text-white">Intelligent Contract Execution</h3>
            <p className="text-[#EF4444] text-xs font-medium mb-4 leading-relaxed">{txState.message}</p>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-4 border border-slate-800">
              <div 
                className="bg-[#EF4444] h-full transition-all duration-500" 
                style={{ width: `${(txState.step / 3) * 100}%` }}
              />
            </div>
            {txState.txHash && (
              <a 
                href={`https://explorer-studio.genlayer.com/tx/${txState.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#EF4444] hover:underline flex items-center gap-1 mt-1 font-mono"
              >
                View on StudioNet Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <span className="text-[11px] text-slate-500 mt-3">Adjudicating consensus across heterogeneous LLM validators...</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. CONNECT WALLET MODAL (REAL WEB3 WALLET REQUIRED)          */}
      {/* ============================================================ */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-left space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#EF4444]" /> Connect Web3 Wallet
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect your Web3 wallet on GenLayer StudioNet to post or solve duels
                </p>
              </div>
              <button 
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* MetaMask / Injected Web3 Wallet */}
              <div 
                onClick={handleConnectMetaMask}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-[#EF4444] bg-white hover:bg-slate-50/80 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-lg flex-shrink-0">
                    🦊
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#EF4444] transition-colors">
                      MetaMask / Web3 Wallet
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Connect browser extension or mobile wallet (EIP-1193)
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#EF4444] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                GenLayer StudioNet (Chain ID 61999)
              </span>
              <span className="text-slate-400 font-mono">On-Chain Escrow</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. WALLET & ACCOUNT MANAGER MODAL                            */}
      {/* ============================================================ */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-left space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900">
                  Connected Web3 Wallet (MetaMask)
                </h3>
              </div>
              <button 
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Address with 1-click Copy */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500">
                  <span>Your Address</span>
                  <button
                    onClick={() => {
                      if (navigator.clipboard && walletAddress) {
                        navigator.clipboard.writeText(walletAddress);
                        setAddressCopied(true);
                        setTimeout(() => setAddressCopied(false), 2000);
                      }
                    }}
                    className="flex items-center gap-1 text-[#EF4444] hover:text-[#DC2626] font-semibold lowercase cursor-pointer"
                  >
                    {addressCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{addressCopied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <code className="text-xs text-slate-800 font-mono break-all block select-all">
                  {walletAddress}
                </code>
              </div>

              {/* Real On-Chain Balance Card + Live Sync Refresh */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    On-Chain Balance (StudioNet)
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black font-mono text-white">
                      {walletBalance} GEN
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => refreshOnChainBalance(walletAddress)}
                  disabled={isRefreshingBalance}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs cursor-pointer flex items-center gap-1.5 flex-shrink-0 active:scale-95 transition-all"
                  title="Sync real on-chain balance from GenLayer StudioNet"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingBalance ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{isRefreshingBalance ? 'Syncing...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Modal Bottom Actions */}
              <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                <a
                  href={`https://explorer-studio.genlayer.com/address/${walletAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>View on Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </a>
                <button
                  onClick={disconnectWallet}
                  className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
