# Building an Adversarial Fact-Checking Duel Protocol with GenLayer Intelligent Contracts

This step-by-step tutorial walks through how **DareYou** is architected on **GenLayer StudioNet (Chain ID 61999)** using Python Intelligent Contracts (`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`), why ordinary smart contracts cannot solve adversarial evidentiary disputes, and how we enforce the core GenLayer steward design principles:

1. **The model judges; deterministic code moves money.**
2. **One narrow judgment per transaction with a strict categorical JSON schema.**
3. **Validators fetch immutable evidence themselves, bound the HTML/text in Python, compare SHA-256 digests, and verify verbatim quotes.**
4. **Untrusted content sandboxing & prompt-injection defense.**
5. **Deterministic timeouts and grace-period fallbacks on every waiting state.**

---

## Step 1: Probing Validator Reachability Before Writing the Main Contract

A URL that loads in a local browser may be rate-limited or blocked when requested by GenLayer validator nodes. Before building our adjudication contract, we deploy [`contracts/probe_network.py`](../contracts/probe_network.py) to test live StudioNet validator reachability against immutable sources (pinned GitHub commit SHAs, Wikipedia `?oldid=` permanent revisions, and Archive.org `id_` snapshots):

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import hashlib

class NetworkProbe(gl.Contract):
    last_probe_result: str

    def __init__(self):
        self.last_probe_result = "{}"

    @gl.public.write
    def probe_url(self, target_url: str, expected_keyword: str) -> str:
        clean_url = str(target_url).strip()
        clean_kw = str(expected_keyword).strip()

        def fetch_and_extract() -> str:
            raw_page = gl.nondet.web.render(clean_url, mode="text")
            fetched_text = " ".join(str(raw_page).split())
            bounded = fetched_text[:2000]
            digest = hashlib.sha256(bounded.encode("utf-8")).hexdigest()[:16]
            kw_found = clean_kw.lower() in fetched_text.lower() if clean_kw else True
            return (
                f"URL: {clean_url}\n"
                f"BOUNDED_LENGTH: {len(bounded)}\n"
                f"SHA256_PREFIX: {digest}\n"
                f"KEYWORD_FOUND: {kw_found}\n"
                f"EXCERPT: {bounded[:600]}"
            )

        raw = gl.eq_principle.prompt_non_comparative(
            fetch_and_extract,
            task="Verify whether the fetched immutable page loaded and whether KEYWORD_FOUND is True. Return a JSON object with keys: 'status' ('REACHABLE' or 'UNREACHABLE') and 'keyword_verified' (boolean).",
            criteria="1. Output must be valid JSON with keys 'status' and 'keyword_verified'. 2. No numeric scores."
        )
        self.last_probe_result = str(raw).strip()
        return self.last_probe_result
```

---

## Step 2: Rejecting Vague Inputs Up Front & Freezing the Rules (`DareQualifier`)

If a challenger writes a subjective or unobservable rule (such as *"who is the best actor"* or *"did they make good progress"*), validators will later disagree during adjudication and fail consensus (`UNCERTAIN` or `MAJORITY_DISAGREE`).

In [`contracts/dare_qualifier.py`](../contracts/dare_qualifier.py), we enforce two layers of protection before a challenge can open:

1. **Deterministic Pre-Filter**: Rejects any proposal that lacks the mandatory `"Dare you to ..."` prefix, is shorter than 20 characters in its evaluation criteria, or contains subjective phrases (`"who is the best"`, `"good progress"`, `"in your opinion"`).
2. **Categorical Validator Check + Rules Hash Freeze**:
   - The LLM never outputs a numeric `0-100` score. Instead, it outputs strictly:
     ```json
     {
       "decision": "APPROVED",
       "observable_criteria": true,
       "immutable_source_feasible": true,
       "rationale": "Criteria specify a concrete constant (INITIAL_BASE_FEE = 1000000000 wei) verifiable against an immutable specification snapshot."
     }
     ```
   - Deterministic Python code then computes and freezes the SHA-256 hash of the canonical challenge specification (`rules_sha256`):
     ```python
     canonical_spec = f"{clean_cat}|{clean_title}|{clean_claim}|{clean_sources}|{clean_criteria}"
     rules_sha256 = hashlib.sha256(canonical_spec.encode("utf-8")).hexdigest()
     ```

---

## Step 3: Validator-Fetched Evidence, Bounded Parsing & Prompt-Injection Defense (`DareAdjudicator`)

In [`contracts/dare_adjudicator.py`](../contracts/dare_adjudicator.py), we implement the heart of the protocol:

### 1. Deterministic Pre-Validation & Adversarial Defense
Before invoking the LLM committee, deterministic Python code checks:
- **Empty Quotes / Invalid URL**: Immediate `NOT_MET` -> `CHALLENGER_WINS`.
- **Self-Hosted Domain Blocklist**: Blocks participants from hosting their own mutable evidence (`localhost`, `pastebin.com`, app domains).
- **Prompt-Injection Filter**: Scans `verbatim_quotes`, `reasoning_defense`, and `conclusion` for adversarial instructions (`"ignore previous instructions"`, `"system override"`, `"mark MET"`, `"return investigator_wins"`). Any match immediately settles as `NOT_MET` -> `CHALLENGER_WINS`.

### 2. Fetching Immutable Evidence & Bounding Size in Code
Inside `fetch_and_prepare_evidence()`, each validator node independently fetches `primary_source_url` via `gl.nondet.web.render(clean_url, mode="text")`. Rather than feeding megabytes of raw HTML to the model, Python code normalizes whitespace, locates the 40-character quote anchor, extracts a bounded 2,500-character window around the quote, and computes a 16-character SHA-256 digest:

```python
raw_web = gl.nondet.web.render(clean_url, mode="text")
fetched_text = " ".join(str(raw_web).split())

quote_anchor = clean_quotes[:40].strip().lower()
idx = fetched_text.lower().find(quote_anchor) if len(quote_anchor) >= 8 else -1
if idx != -1:
    start_pos = max(0, idx - 400)
    bounded_excerpt = fetched_text[start_pos : start_pos + 2500]
else:
    bounded_excerpt = fetched_text[:2500]

digest = hashlib.sha256(bounded_excerpt.encode("utf-8")).hexdigest()[:16]
```

### 3. The Model Judges Fixed Outcomes; Deterministic Code Maps Consequences
The LLM prompt sandboxes all untrusted inputs inside `<untrusted_fetched_page>`, `<untrusted_quotes>`, and `<untrusted_reasoning>` tags and requires a fixed categorical JSON response (`outcome`: `"MET"` | `"NOT_MET"` | `"INSUFFICIENT_EVIDENCE"`, `quote_verified`: `bool`, `extracted_quote`: `str`, `rationale`: `str`).

Deterministic Python code then maps that fixed outcome to the exact financial consequence:

```python
if raw_outcome == "MET" and quote_ok:
    outcome = "MET"
    verdict = "INVESTIGATOR_WINS"
    consequence = "RELEASE_ESCROW_TO_INVESTIGATOR"
elif raw_outcome == "NOT_MET" or (raw_outcome == "MET" and not quote_ok):
    outcome = "NOT_MET"
    verdict = "CHALLENGER_WINS"
    consequence = "FORFEIT_ESCROW_TO_CHALLENGER"
else:
    outcome = "INSUFFICIENT_EVIDENCE"
    verdict = "INCONCLUSIVE"
    consequence = "SPLIT_REFUND"
```

---

## Step 4: Deadlines & Deterministic Fallbacks (`DareRegistry`)

To ensure funds never lock forever if a participant disappears or an adjudication stalls, [`contracts/dare_registry.py`](../contracts/dare_registry.py) enforces three deterministic timeout handlers:
1. **`claim_acceptance_expiry_refund(dare_id)`**: If no investigator accepts before `acceptance_deadline_ts`, the challenger reclaims their full deposit.
2. **`claim_research_timeout_forfeit(dare_id)`**: If an investigator accepts a duel but fails to submit evidence before `research_deadline_ts`, the challenger wins by forfeit.
3. **`claim_stuck_adjudication_fallback(dare_id)`**: If a submitted dare remains unfinalized past `adjudication_grace_deadline_ts` (`submitted_at + 3600s`), it deterministically resolves to `INCONCLUSIVE` (`SPLIT_REFUND`).

---

## Step 5: Verifying Live On-Chain Proofs

Run the read-only verifier from the repository root to re-verify all 8 deployed contracts and all finalized StudioNet proof transactions:

```bash
npm run verify:proof
```
