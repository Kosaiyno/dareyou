/**
 * WebMCP (Web Model Context Protocol) In-Browser Registration Module
 * 
 * Provides native browser AI agents with full bidirectional control over the
 * application alongside human users via the shared reactive Zustand store.
 * 
 * Pillars:
 * 1. Dual Registration: Native `document.modelContext.registerTool` + Global `window.__WEBMCP_TOOLS__` fallback.
 * 2. Shared Reactive State: Direct reads/writes to `useStore.getState()` — zero DOM scraping or synthetic clicks.
 * 3. Self-Correction & Auditing: Validation tools to self-verify constraints and recover via undo/redo.
 */

import { useStore } from '../store/useStore';
import type { DareCategory, EvidenceData } from '../store/useStore';

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
    description: 'Returns the complete reactive state of DareYou, including all active dares, selected dare, active UI tab, and wallet connection.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    annotations: { readOnlyHint: true },
    execute: async () => {
      const state = useStore.getState();
      return {
        success: true,
        message: 'Successfully retrieved DareYou reactive state.',
        activeTab: state.activeTab,
        selectedDareId: state.selectedDareId,
        categoryFilter: state.categoryFilter,
        walletConnected: state.walletConnected,
        walletAddress: state.walletAddress,
        totalDares: state.dares.length,
        daresSummary: {
          open: state.dares.filter(d => d.status === 'OPEN').length,
          accepted: state.dares.filter(d => d.status === 'ACCEPTED').length,
          submitted: state.dares.filter(d => d.status === 'SUBMITTED').length,
          finalized: state.dares.filter(d => d.status === 'FINALIZED').length
        },
        dares: state.dares.map(d => ({
          id: d.id,
          title: d.title,
          category: d.category,
          status: d.status,
          stakeUsd: (d.stakeCents / 100).toFixed(2),
          durationMinutes: Math.round(d.durationSeconds / 60),
          challenger: d.challenger,
          investigator: d.investigator || null
        }))
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
        message: `Retrieved dossier for Dare #${targetId}.`,
        dare
      };
    }
  },
  {
    name: 'list_dares',
    description: 'Filter and list challenges by status (OPEN, ACCEPTED, SUBMITTED, FINALIZED, ALL) or category.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['OPEN', 'ACCEPTED', 'SUBMITTED', 'FINALIZED', 'ALL'],
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

      const filtered = dares.filter(d => {
        if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
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
  // 2. CORE CRUD & WORKFLOW ACTIONS
  // =========================================================================
  {
    name: 'create_dare',
    description: 'Creates a new football investigation challenge adhering to the Dare Acceptance Standard. Title MUST start with "Dare you to ".',
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
          description: 'Optional challenger wallet or identifier address.'
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
      const { validateDare, addDare } = useStore.getState();
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

      const newId = addDare({
        title: args.title,
        category: args.category,
        claim: args.claim,
        requiredSources: args.required_sources,
        criteria: args.criteria,
        stakeCents: Math.round(args.stake_usd * 100),
        durationSeconds: Math.round(args.duration_minutes * 60),
        challenger: args.challenger_address
      });

      return {
        success: true,
        dare_id: newId,
        message: `Dare #${newId} successfully published to DareYou arena.`
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
    name: 'delete_dare',
    description: 'Removes / cancels an open dare that has not yet been accepted by an investigator.',
    inputSchema: {
      type: 'object',
      properties: {
        dare_id: { type: 'number', description: 'ID of the dare to delete.' }
      },
      required: ['dare_id'],
      additionalProperties: false
    },
    execute: async (args: { dare_id: number }) => {
      const state = useStore.getState();
      const target = state.dares.find(d => d.id === args.dare_id);
      if (!target) return { success: false, message: `Dare #${args.dare_id} not found.` };
      if (target.status !== 'OPEN') {
        return { success: false, message: `Cannot cancel dare in status "${target.status}".` };
      }
      const ok = state.deleteDare(args.dare_id);
      return { success: ok, message: `Dare #${args.dare_id} removed.` };
    }
  },
  {
    name: 'accept_dare',
    description: 'Accepts an open dare as investigator. Locks matching stake and starts the single-investigator countdown timer.',
    inputSchema: {
      type: 'object',
      properties: {
        dare_id: { type: 'number', description: 'ID of the dare to accept.' },
        investigator_address: { type: 'string', description: 'Investigator wallet address or agent identifier.' }
      },
      required: ['dare_id', 'investigator_address'],
      additionalProperties: false
    },
    execute: async (args: { dare_id: number; investigator_address: string }) => {
      const state = useStore.getState();
      const target = state.dares.find(d => d.id === args.dare_id);
      if (!target) return { success: false, message: `Dare #${args.dare_id} not found.` };
      if (target.status !== 'OPEN') {
        return { success: false, message: `Cannot accept dare in status "${target.status}".` };
      }
      const ok = state.acceptDare(args.dare_id, args.investigator_address);
      return {
        success: ok,
        message: `Dare #${args.dare_id} accepted by ${args.investigator_address}. Research window started.`,
        duration_minutes: Math.round(target.durationSeconds / 60)
      };
    }
  },
  {
    name: 'submit_evidence',
    description: 'Submits the final research dossier for an accepted dare. Freezes primary quotes, URLs, and reasoning defense for consensus.',
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
        message: `Evidence dossier submitted and frozen for Dare #${args.dare_id}. Awaiting validator consensus.`,
        dossier
      };
    }
  },
  {
    name: 'adjudicate_dare',
    description: 'Triggers GenLayer validator consensus adjudication on a submitted dare dossier.',
    inputSchema: {
      type: 'object',
      properties: {
        dare_id: { type: 'number', description: 'ID of the submitted dare to adjudicate.' },
        verdict: {
          type: 'string',
          enum: ['INVESTIGATOR_WINS', 'CHALLENGER_WINS'],
          description: 'Validator consensus verdict.'
        },
        score: { type: 'number', description: 'Research depth score (0 to 100).' },
        rationale: { type: 'string', description: 'Consensus reasoning rationale.' }
      },
      required: ['dare_id', 'verdict'],
      additionalProperties: false
    },
    execute: async (args: {
      dare_id: number;
      verdict: 'INVESTIGATOR_WINS' | 'CHALLENGER_WINS';
      score?: number;
      rationale?: string;
    }) => {
      const state = useStore.getState();
      const target = state.dares.find(d => d.id === args.dare_id);
      if (!target) return { success: false, message: `Dare #${args.dare_id} not found.` };
      const ok = state.adjudicateDare(args.dare_id, args.verdict, args.score, args.rationale);
      return {
        success: ok,
        message: `Dare #${args.dare_id} finalized with verdict "${args.verdict}". Pool settled.`
      };
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
      if (target.status !== 'ACCEPTED') {
        return { success: false, message: `Dare #${args.dare_id} is in status "${target.status}", cannot claim timeout.` };
      }
      const ok = state.claimTimeoutForfeit(args.dare_id, args.challenger_address);
      return {
        success: ok,
        message: `Timeout forfeit processed for Dare #${args.dare_id}. Escrow transferred to challenger.`
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
        message: res.valid ? 'All platform state constraints are healthy.' : `Found ${res.issues.length} potential issues.`,
        summary: res.summary,
        issues: res.issues,
        recommendations: res.recommendations
      };
    }
  },

  // =========================================================================
  // 4. HISTORY, PERSISTENCE & CONTROL
  // =========================================================================
  {
    name: 'undo',
    description: 'Reverts the most recent state mutation across the DareYou platform (undo).',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    execute: async () => {
      const ok = useStore.getState().undo();
      return {
        success: ok,
        message: ok ? 'Successfully reverted last action (Undo).' : 'No previous actions to undo.'
      };
    }
  },
  {
    name: 'redo',
    description: 'Re-applies the most recently undone state mutation (redo).',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    execute: async () => {
      const ok = useStore.getState().redo();
      return {
        success: ok,
        message: ok ? 'Successfully re-applied action (Redo).' : 'No undone actions to redo.'
      };
    }
  },
  {
    name: 'clear_state',
    description: 'Resets the DareYou state store back to the 10 canonical standard test cases.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    execute: async () => {
      useStore.getState().clearState();
      return { success: true, message: 'State store reset to baseline standard test cases.' };
    }
  },
  {
    name: 'save_project',
    description: 'Persists the complete state to browser localStorage and returns the JSON snapshot string.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    execute: async () => {
      const json = useStore.getState().saveProject();
      return { success: true, message: 'Project snapshot persisted to localStorage.', snapshot: json };
    }
  },
  {
    name: 'load_project',
    description: 'Restores DareYou state from localStorage or an optional supplied JSON backup string.',
    inputSchema: {
      type: 'object',
      properties: {
        backup_json: { type: 'string', description: 'Optional JSON snapshot to restore from.' }
      },
      additionalProperties: false
    },
    execute: async (args: { backup_json?: string }) => {
      const ok = useStore.getState().loadProject(args.backup_json);
      return {
        success: ok,
        message: ok ? 'State successfully restored from project backup.' : 'Failed to restore project state.'
      };
    }
  }
];

/**
 * Registers all DareYou WebMCP tools into both:
 * 1. Native `document.modelContext` (for browser AI agents supporting WebMCP standard)
 * 2. Global `window.__WEBMCP_TOOLS__` (for DevTools F12 console testing & headless runners)
 */
export async function registerAppWebMCPTools() {
  console.log('[WebMCP] Initializing Dual Tool Registration for DareYou...');

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
      console.log(`[WebMCP Native] Successfully registered ${nativeRegisteredCount} tools on document.modelContext.`);
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

    console.log(`[WebMCP Fallback] Exposed ${APP_WEBMCP_TOOLS.length} tools to window.__WEBMCP_TOOLS__. Testable via DevTools console.`);
  }

  return {
    totalTools: APP_WEBMCP_TOOLS.length,
    nativeSupported: typeof document !== 'undefined' && !!(document as any).modelContext?.registerTool
  };
}
