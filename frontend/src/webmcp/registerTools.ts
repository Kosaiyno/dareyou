/**
 * WebMCP (Web Model Context Protocol) In-Browser Registration Module
 * 
 * Production Suite for Autonomous AI Agents on GenLayer StudioNet (Chain ID 61999).
 * Provides native AI agents with programmatic control over the decentralized sports
 * intelligence arena alongside human users via the shared reactive store and on-chain contracts.
 * 
 * Pillars:
 * 1. Dual Registration: Native `document.modelContext.registerTool` + Global `window.__WEBMCP_TOOLS__` fallback.
 * 2. Shared Reactive State: Direct reads/writes to `useStore.getState()` — zero DOM scraping or synthetic clicks.
 * 3. On-Chain Backing: Real Intelligent Contract execution on GenLayer StudioNet.
 * 4. Self-Correction & Auditing: Pre-submission validation tools to self-verify policy constraints.
 */

import { useStore, isDareExpired } from '../store/useStore';
import type { DareCategory, EvidenceData } from '../store/useStore';
import { 
  GENLAYER_ADJUDICATOR_ADDRESS, 
  GENLAYER_ESCROW_ADDRESS, 
  GENLAYER_REGISTRY_ADDRESS, 
  GENLAYER_STUDIONET_CHAIN_ID,
  exportGenLayerPrivateKey,
  importGenLayerPrivateKey,
  getOrCreateGenLayerAccount
} from '../services/genlayerService';

export interface WebMCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    additionalProperties: boolean;
  };
  annotations?: {
    readOnlyHint?: boolean;
  };
  execute: (args: any) => Promise<any>;
}

declare global {
  interface Window {
    __WEBMCP_TOOLS__?: {
      list: () => Array<{ name: string; description: string; inputSchema: any; annotations?: any }>;
      execute: (name: string, args: any) => Promise<any>;
      getStoreState: () => any;
    };
  }
}

export const APP_WEBMCP_TOOLS: WebMCPToolDefinition[] = [
  // =========================================================================
  // 1. INSPECTION & STATE TOOLS
  // =========================================================================
  {
    name: 'get_app_state',
    description: 'Returns the complete reactive state of DareYou, including all active dares, selected dare, active UI tab, wallet identity, and contract addresses on StudioNet.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    annotations: { readOnlyHint: true },
    execute: async () => {
      const state = useStore.getState();
      const now = Date.now();
      return {
        success: true,
        message: 'Successfully retrieved DareYou reactive state from GenLayer StudioNet.',
        network: {
          chainId: GENLAYER_STUDIONET_CHAIN_ID,
          registryContract: GENLAYER_REGISTRY_ADDRESS,
          escrowContract: GENLAYER_ESCROW_ADDRESS,
          adjudicatorContract: GENLAYER_ADJUDICATOR_ADDRESS
        },
        activeTab: state.activeTab,
        selectedDareId: state.selectedDareId,
        categoryFilter: state.categoryFilter,
        walletConnected: state.walletConnected,
        walletAddress: state.walletAddress,
        totalDares: state.dares.length,
        daresSummary: {
          open: state.dares.filter(d => d.status === 'OPEN' && !isDareExpired(d, now)).length,
          accepted: state.dares.filter(d => d.status === 'ACCEPTED' && !isDareExpired(d, now)).length,
          expired: state.dares.filter(d => isDareExpired(d, now) && d.status !== 'FINALIZED').length,
          submitted: state.dares.filter(d => d.status === 'SUBMITTED').length,
          finalized: state.dares.filter(d => d.status === 'FINALIZED').length
        },
        dares: state.dares.map(d => {
          const expired = isDareExpired(d, now) && d.status !== 'FINALIZED';
          return {
            id: d.id,
            title: d.title,
            category: d.category,
            status: expired ? 'EXPIRED' : d.status,
            forfeitEligible: expired,
            stakeUsd: (d.stakeCents / 100).toFixed(2),
            durationMinutes: Math.round(d.durationSeconds / 60),
            challenger: d.challenger,
            investigator: d.investigator || null
          };
        })
      };
    }
  },
  {
    name: 'get_selected_dare',
    description: 'Returns full specifications, claims, evaluation rubric, required sources, deadlines, and evidence for the currently selected dare.',
    inputSchema: {
      type: 'object',
      properties: {
        dare_id: {
          type: 'number',
          description: 'Optional ID of dare to inspect. If omitted, returns currently selected dare.'
        }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true },
    execute: async (args: { dare_id?: number }) => {
      const state = useStore.getState();
      const targetId = args.dare_id ?? state.selectedDareId;
      if (!targetId) {
        return { success: false, message: 'No dare is currently selected and no dare_id was provided.' };
      }
      const dare = state.dares.find(d => d.id === targetId);
      if (!dare) {
        return { success: false, message: `Dare #${targetId} not found in state.` };
      }
      return {
        success: true,
        message: `Retrieved dossier and validator consensus for Dare #${targetId}.`,
        dare,
        validatorPanel: dare.adjudicationSession ? {
          totalValidators: dare.adjudicationSession.votes?.length || 5,
          consensusStatus: dare.adjudicationSession.status,
          finalVerdict: dare.verdict || dare.adjudicationSession.finalVerdict,
          averageScore: dare.verdictScore ?? dare.adjudicationSession.averageScore,
          consensusRationale: dare.verdictRationale || dare.adjudicationSession.consensusRationale,
          txHash: dare.txHash || dare.adjudicationSession.txHash,
          receiptStatus: dare.adjudicationSession.receiptStatus || "ACCEPTED (MAJORITY_AGREE)",
          validators: (dare.adjudicationSession.votes || []).map(v => ({
            index: v.validatorIndex,
            address: v.validatorAddress,
            model: v.model,
            verdict: v.verdict,
            score: v.score,
            quotesVerified: v.quotesVerified,
            sourcesIndependent: v.sourcesIndependent,
            reasoning: v.reasoning,
            timestamp: v.timestamp
          }))
        } : null
      };
    }
  },
  {
    name: 'list_dares',
    description: 'Filter and list challenges by status (OPEN, ACCEPTED, SUBMITTED, FINALIZED, EXPIRED, ALL) or category.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['OPEN', 'ACCEPTED', 'SUBMITTED', 'FINALIZED', 'EXPIRED', 'ALL'],
          description: 'Filter by dare status lifecycle.'
        },
        category: {
          type: 'string',
          enum: ['CONFLICTING_SOURCE_INVESTIGATION', 'INVESTIGATIVE_FACT_FINDING', 'EVIDENCE_SYNTHESIS', 'ALL'],
          description: 'Filter by supported research category.'
        }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true },
    execute: async (args: { status?: string; category?: string }) => {
      const { dares } = useStore.getState();
      const statusFilter = args.status || 'ALL';
      const catFilter = args.category || 'ALL';
      const now = Date.now();

      const filtered = dares.filter(d => {
        const expired = isDareExpired(d, now) && d.status !== 'FINALIZED';
        const effectiveStatus = expired ? 'EXPIRED' : d.status;
        if (statusFilter !== 'ALL' && effectiveStatus !== statusFilter) return false;
        if (catFilter !== 'ALL' && d.category !== catFilter) return false;
        return true;
      });

      return {
        success: true,
        message: `Found ${filtered.length} matching dares.`,
        count: filtered.length,
        dares: filtered
      };
    }
  },
  {
    name: 'select_dare',
    description: 'Updates the active selected dare ID in the central state, synchronizing the UI in real time.',
    inputSchema: {
      type: 'object',
      properties: {
        dare_id: { type: 'number', description: 'ID of the dare to select in the UI.' }
      },
      required: ['dare_id'],
      additionalProperties: false
    },
    execute: async (args: { dare_id: number }) => {
      const { dares, setSelectedDareId } = useStore.getState();
      const exists = dares.some(d => d.id === args.dare_id);
      if (!exists) {
        return { success: false, message: `Dare #${args.dare_id} not found.` };
      }
      setSelectedDareId(args.dare_id);
      return { success: true, message: `Selected Dare #${args.dare_id} in UI.` };
    }
  },
  {
    name: 'switch_tab',
    description: 'Switches the active user navigation tab in the UI without clicking any DOM elements.',
    inputSchema: {
      type: 'object',
      properties: {
        tab: {
          type: 'string',
          enum: ['arena', 'playground', 'create', 'webmcp', 'leaderboard', 'audit'],
          description: 'Target navigation tab.'
        }
      },
      required: ['tab'],
      additionalProperties: false
    },
    execute: async (args: { tab: 'arena' | 'playground' | 'create' | 'webmcp' | 'leaderboard' | 'audit' }) => {
      useStore.getState().setActiveTab(args.tab);
      return { success: true, message: `Switched UI active tab to "${args.tab}".` };
    }
  },

  // =========================================================================
  // 2. PRODUCTION CORE ON-CHAIN WORKFLOWS
  // =========================================================================
  {
    name: 'create_dare',
    description: 'Creates a new football investigation challenge adhering to the Dare Acceptance Standard and broadcasts to GenLayer StudioNet. Title MUST start with "Dare you to ".',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Continuous instruction. MUST begin with "Dare you to " (minimum 40 characters).'
        },
        category: {
          type: 'string',
          enum: ['CONFLICTING_SOURCE_INVESTIGATION', 'INVESTIGATIVE_FACT_FINDING', 'EVIDENCE_SYNTHESIS'],
          description: 'Supported research category.'
        },
        claim: {
          type: 'string',
          description: 'Precise factual claim being investigated.'
        },
        required_sources: {
          type: 'string',
          description: 'Authoritative primary sources the investigator must consult.'
        },
        criteria: {
          type: 'string',
          description: 'Frozen rubric specifying what evidence constitutes proof vs refutation.'
        },
        stake_usd: {
          type: 'number',
          description: 'Duel stake in USD/GEN (minimum $10.00).'
        },
        duration_minutes: {
          type: 'number',
          description: 'Research time limit in minutes (5 to 120 minutes).'
        },
        challenger_address: {
          type: 'string',
          description: 'Optional challenger wallet address. If omitted, uses connected GenLayer wallet.'
        }
      },
      required: ['title', 'category', 'claim', 'required_sources', 'criteria', 'stake_usd', 'duration_minutes'],
      additionalProperties: false
    },
    execute: async (args: {
      title: string;
      category: DareCategory;
      claim: string;
      required_sources: string;
      criteria: string;
      stake_usd: number;
      duration_minutes: number;
      challenger_address?: string;
    }) => {
      const { validateDare, addDare, walletAddress } = useStore.getState();
      const validation = validateDare({
        title: args.title,
        category: args.category,
        stakeCents: Math.round(args.stake_usd * 100),
        durationSeconds: Math.round(args.duration_minutes * 60)
      });

      if (!validation.valid) {
        return {
          success: false,
          message: 'Dare rejected by Dare Acceptance Standard validation.',
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      const effectiveChallenger = args.challenger_address || walletAddress;
      const newId = addDare({
        title: args.title,
        category: args.category,
        claim: args.claim,
        requiredSources: args.required_sources,
        criteria: args.criteria,
        stakeCents: Math.round(args.stake_usd * 100),
        durationSeconds: Math.round(args.duration_minutes * 60),
        challenger: effectiveChallenger
      });

      return {
        success: true,
        dare_id: newId,
        message: `Dare #${newId} successfully published to DareYou arena and broadcast to GenLayer StudioNet.`,
        challenger: effectiveChallenger
      };
    }
  },
  {
    name: 'update_dare',
    description: 'Modifies fields of an unaccepted OPEN dare before it gets locked by an investigator.',
    inputSchema: {
      type: 'object',
      properties: {
        dare_id: { type: 'number', description: 'ID of the dare to update.' },
        title: { type: 'string', description: 'Updated title (must begin with "Dare you to ").' },
        claim: { type: 'string', description: 'Updated factual claim.' },
        required_sources: { type: 'string', description: 'Updated source specifications.' },
        criteria: { type: 'string', description: 'Updated adjudication rubric.' },
        stake_usd: { type: 'number', description: 'Updated stake amount in USD.' },
        duration_minutes: { type: 'number', description: 'Updated research window in minutes.' }
      },
      required: ['dare_id'],
      additionalProperties: false
    },
    execute: async (args: {
      dare_id: number;
      title?: string;
      claim?: string;
      required_sources?: string;
      criteria?: string;
      stake_usd?: number;
      duration_minutes?: number;
    }) => {
      const state = useStore.getState();
      const target = state.dares.find(d => d.id === args.dare_id);
      if (!target) return { success: false, message: `Dare #${args.dare_id} not found.` };
      if (target.status !== 'OPEN') {
        return { success: false, message: `Cannot update dare in status "${target.status}". Terms freeze upon acceptance.` };
      }

      const updates: any = {};
      if (args.title) updates.title = args.title;
      if (args.claim) updates.claim = args.claim;
      if (args.required_sources) updates.requiredSources = args.required_sources;
      if (args.criteria) updates.criteria = args.criteria;
      if (args.stake_usd) updates.stakeCents = Math.round(args.stake_usd * 100);
      if (args.duration_minutes) updates.durationSeconds = Math.round(args.duration_minutes * 60);

      const ok = state.updateDare(args.dare_id, updates);
      return { success: ok, message: ok ? `Dare #${args.dare_id} successfully updated.` : 'Update failed.' };
    }
  },
  {
    name: 'accept_dare',
    description: 'Accepts an open dare as investigator. Locks matching stake on GenLayer StakeEscrow contract and starts the countdown timer.',
    inputSchema: {
      type: 'object',
      properties: {
        dare_id: { type: 'number', description: 'ID of the dare to accept.' },
        investigator_address: { type: 'string', description: 'Investigator wallet address.' }
      },
      required: ['dare_id', 'investigator_address'],
      additionalProperties: false
    },
    execute: async (args: { dare_id: number; investigator_address: string }) => {
      const state = useStore.getState();
      const target = state.dares.find(d => d.id === args.dare_id);
      if (!target) return { success: false, message: `Dare #${args.dare_id} not found.` };
      if (target.status !== 'OPEN') {
        return { success: false, message: `Cannot accept dare in status "${target.status}". Must be OPEN.` };
      }
      const ok = state.acceptDare(args.dare_id, args.investigator_address);
      return {
        success: ok,
        message: `Dare #${args.dare_id} accepted by ${args.investigator_address}. Stake matched on StakeEscrow and research timer active.`,
        duration_minutes: Math.round(target.durationSeconds / 60)
      };
    }
  },
  {
    name: 'submit_evidence',
    description: 'Submits the final research dossier for an accepted dare. Freezes primary quotes, URLs, and reasoning defense and triggers on-chain GenLayer consensus.',
    inputSchema: {
      type: 'object',
      properties: {
        dare_id: { type: 'number', description: 'ID of the accepted dare.' },
        conclusion: {
          type: 'string',
          enum: ['CLAIM_VERIFIED_TRUE', 'CLAIM_REFUTED_FALSE', 'CONFIRMED_DISCREPANCY'],
          description: 'Factual determination.'
        },
        primary_url: { type: 'string', description: 'Primary authoritative archive/regulatory URL.' },
        secondary_url: { type: 'string', description: 'Secondary corroborating journalistic/database URL.' },
        quotes: { type: 'string', description: 'Verbatim quotes extracted from authoritative sources.' },
        reasoning: { type: 'string', description: 'Reasoning defense reconciling sources and criteria.' }
      },
      required: ['dare_id', 'conclusion', 'primary_url', 'quotes', 'reasoning'],
      additionalProperties: false
    },
    execute: async (args: {
      dare_id: number;
      conclusion: string;
      primary_url: string;
      secondary_url?: string;
      quotes: string;
      reasoning: string;
    }) => {
      const state = useStore.getState();
      const target = state.dares.find(d => d.id === args.dare_id);
      if (!target) return { success: false, message: `Dare #${args.dare_id} not found.` };
      if (target.status !== 'ACCEPTED') {
        return { success: false, message: `Cannot submit evidence for dare in status "${target.status}". Must be ACCEPTED.` };
      }

      const dossier: EvidenceData = {
        conclusion: args.conclusion,
        primaryUrl: args.primary_url,
        secondaryUrl: args.secondary_url || 'N/A',
        quotes: args.quotes,
        reasoning: args.reasoning
      };

      const ok = state.submitEvidence(args.dare_id, dossier);
      return {
        success: ok,
        message: `Evidence dossier submitted for Dare #${args.dare_id}. Real GenLayer Equivalence Principle consensus triggered on StudioNet.`,
        dossier
      };
    }
  },
  {
    name: 'start_adjudication',
    description: 'Initiates or fast-tracks multi-LLM validator consensus adjudication on a submitted challenge.',
    inputSchema: {
      type: 'object',
      properties: {
        dare_id: { type: 'number', description: 'ID of the submitted dare to adjudicate.' },
        fast_track: { type: 'boolean', description: 'Whether to immediately finalize with verified consensus (default true).' }
      },
      required: ['dare_id'],
      additionalProperties: false
    },
    execute: async (args: { dare_id: number; fast_track?: boolean }) => {
      const state = useStore.getState();
      const target = state.dares.find(d => d.id === args.dare_id);
      if (!target) return { success: false, message: `Dare #${args.dare_id} not found.` };
      if (target.status !== 'SUBMITTED') {
        return { success: false, message: `Dare #${args.dare_id} is in status "${target.status}". Must be SUBMITTED to adjudicate.` };
      }
      if (args.fast_track !== false) {
        const ok = state.fastTrackAdjudication(args.dare_id);
        return { success: ok, message: `Dare #${args.dare_id} fast-tracked and adjudicated. Escrow settled on StudioNet.` };
      } else {
        const ok = state.startAdjudication(args.dare_id);
        return { success: ok, message: `Dare #${args.dare_id} adjudication session initialized.` };
      }
    }
  },
  {
    name: 'claim_timeout_forfeit',
    description: 'Challenger claims total escrowed pool if the assigned investigator failed to submit evidence before the deadline.',
    inputSchema: {
      type: 'object',
      properties: {
        dare_id: { type: 'number', description: 'ID of the dare where the deadline elapsed.' },
        challenger_address: { type: 'string', description: 'Challenger wallet address.' }
      },
      required: ['dare_id', 'challenger_address'],
      additionalProperties: false
    },
    execute: async (args: { dare_id: number; challenger_address: string }) => {
      const state = useStore.getState();
      const target = state.dares.find(d => d.id === args.dare_id);
      if (!target) return { success: false, message: `Dare #${args.dare_id} not found.` };
      const now = Date.now();
      const expired = isDareExpired(target, now);
      if (target.status !== 'ACCEPTED' && target.status !== 'EXPIRED' && !expired) {
        return { success: false, message: `Dare #${args.dare_id} is in status "${target.status}", cannot claim timeout forfeit.` };
      }
      const ok = state.claimTimeoutForfeit(args.dare_id, args.challenger_address);
      return {
        success: ok,
        message: `Timeout forfeit processed for Dare #${args.dare_id}. Full escrow pool transferred to challenger.`
      };
    }
  },
  {
    name: 'process_all_expired',
    description: 'Scans the arena and auto-resolves all expired dares where investigators missed the research deadline.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    execute: async () => {
      const state = useStore.getState();
      const resolvedCount = state.processAllExpiredDares();
      return {
        success: true,
        message: `Processed ${resolvedCount} expired dare(s) for timeout forfeit.`,
        resolvedCount
      };
    }
  },

  // =========================================================================
  // 3. SEMANTIC VALIDATION & SELF-CORRECTION
  // =========================================================================
  {
    name: 'validate_dare',
    description: 'Validates a prospective dare against the 8 mandatory rules of the Dare Acceptance Standard before submission.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Dare instruction candidate.' },
        category: { type: 'string', description: 'Category to check.' },
        stake_usd: { type: 'number', description: 'Proposed stake in USD.' },
        duration_minutes: { type: 'number', description: 'Proposed research window in minutes.' }
      },
      required: ['title'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true },
    execute: async (args: { title: string; category?: string; stake_usd?: number; duration_minutes?: number }) => {
      const { validateDare } = useStore.getState();
      const res = validateDare({
        title: args.title,
        category: args.category,
        stakeCents: args.stake_usd ? Math.round(args.stake_usd * 100) : undefined,
        durationSeconds: args.duration_minutes ? Math.round(args.duration_minutes * 60) : undefined
      });
      return {
        success: true,
        valid: res.valid,
        message: res.valid ? 'Dare candidate complies with Dare Acceptance Standard.' : 'Dare has policy validation errors.',
        errors: res.errors,
        warnings: res.warnings
      };
    }
  },
  {
    name: 'validate_state',
    description: 'Performs a platform-wide audit checking for expired deadlines, missing evidence dossiers, and format errors so agents can self-correct.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    annotations: { readOnlyHint: true },
    execute: async () => {
      const res = useStore.getState().validateState();
      return {
        success: true,
        valid: res.valid,
        message: res.valid ? 'All platform state constraints are healthy.' : `Found ${res.issues.length} potential issue(s).`,
        summary: res.summary,
        issues: res.issues,
        recommendations: res.recommendations
      };
    }
  },

  // =========================================================================
  // 4. ON-CHAIN WALLET & KEY MANAGEMENT
  // =========================================================================
  {
    name: 'get_wallet_identity',
    description: 'Returns the connected GenLayer StudioNet wallet address, private key availability status, and smart contract addresses.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    annotations: { readOnlyHint: true },
    execute: async () => {
      const account = getOrCreateGenLayerAccount();
      const state = useStore.getState();
      return {
        success: true,
        message: 'Retrieved connected GenLayer wallet identity.',
        walletAddress: account.address || state.walletAddress,
        chainId: GENLAYER_STUDIONET_CHAIN_ID,
        contracts: {
          registry: GENLAYER_REGISTRY_ADDRESS,
          escrow: GENLAYER_ESCROW_ADDRESS,
          adjudicator: GENLAYER_ADJUDICATOR_ADDRESS
        }
      };
    }
  },
  {
    name: 'export_wallet_key',
    description: 'Returns the private key of the current GenLayer wallet so the agent or user can persist their identity and funds across browser sessions.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    execute: async () => {
      const pk = exportGenLayerPrivateKey();
      const account = getOrCreateGenLayerAccount();
      return {
        success: true,
        message: 'Exported GenLayer StudioNet private key.',
        walletAddress: account.address,
        privateKey: pk
      };
    }
  },
  {
    name: 'import_wallet_key',
    description: 'Imports a private key into the active session, restoring the agent identity and contract signing authority.',
    inputSchema: {
      type: 'object',
      properties: {
        private_key: { type: 'string', description: 'Hex-encoded private key starting with 0x.' }
      },
      required: ['private_key'],
      additionalProperties: false
    },
    execute: async (args: { private_key: string }) => {
      try {
        const account = importGenLayerPrivateKey(args.private_key);
        useStore.getState().setWallet(true, account.address);
        return {
          success: true,
          message: `Successfully imported wallet key for ${account.address}. Active signing account updated.`,
          walletAddress: account.address
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Failed to import private key: ${err.message || String(err)}`
        };
      }
    }
  }
];

/**
 * Registers all DareYou WebMCP tools into both:
 * 1. Native `document.modelContext` (for browser AI agents supporting WebMCP standard)
 * 2. Global `window.__WEBMCP_TOOLS__` (for DevTools F12 console testing & headless runners)
 */
export async function registerAppWebMCPTools() {
  console.log('[WebMCP] Initializing Production Tool Registration for DareYou...');

  // 1. Native WebMCP Registration
  let nativeRegisteredCount = 0;
  if (typeof document !== 'undefined' && (document as any).modelContext?.registerTool) {
    try {
      for (const tool of APP_WEBMCP_TOOLS) {
        await (document as any).modelContext.registerTool({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
          execute: tool.execute
        });
        nativeRegisteredCount++;
      }
      console.log(`[WebMCP Native] Successfully registered ${nativeRegisteredCount} production tools on document.modelContext.`);
    } catch (err: any) {
      console.warn('[WebMCP Native] Registration notice:', err.message);
    }
  } else {
    console.log('[WebMCP Native] document.modelContext not detected in current browser. Using Global Window fallback.');
  }

  // 2. Global Window Fallback (for DevTools F12, Headless Puppeteer/Playwright, or external browser extensions)
  if (typeof window !== 'undefined') {
    window.__WEBMCP_TOOLS__ = {
      list: () => APP_WEBMCP_TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: t.annotations
      })),
      execute: async (name: string, args: any = {}) => {
        const target = APP_WEBMCP_TOOLS.find(t => t.name === name);
        if (!target) {
          throw new Error(`WebMCP Tool "${name}" not found. Available tools: ${APP_WEBMCP_TOOLS.map(t => t.name).join(', ')}`);
        }
        return await target.execute(args || {});
      },
      getStoreState: () => useStore.getState()
    };

    console.log(`[WebMCP Fallback] Exposed ${APP_WEBMCP_TOOLS.length} production tools to window.__WEBMCP_TOOLS__. Accessible to autonomous agents.`);
  }

  return {
    totalTools: APP_WEBMCP_TOOLS.length,
    nativeSupported: typeof document !== 'undefined' && !!(document as any).modelContext?.registerTool
  };
}
