# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json

class DareQualifier(gl.Contract):
    """
    DareQualifier is the GenLayer Intelligent Contract responsible for Challenge Qualification.
    
    Core Principle:
    A challenge must NEVER enter the DareYou public arena unless independent GenLayer
    validators confirm that it demands substantive research, observable criteria,
    and multiple authoritative sources.
    
    Rubric Pillars:
    1. Research Depth & Non-Obviousness: Excludes basic stat lookups, obvious facts, and trivial yes/no trivia.
    2. Source Diversity & Feasibility: Requires multi-source corroboration via permanent archives (Wayback id_, official reports).
    3. Factual Verifiability: Rejects future prediction questions, subjective opinions, and unfalsifiable claims.
    4. Anti-Gaming: Catches trivial questions disguised with verbose wording or irrelevant source lists.
    
    Constrained Output:
    - APPROVED: Substantive, fair, verifiable research challenge.
    - REJECTED: Trivial, predictive, opinion-based, impossible, or gaming attempt.
    - NEEDS_REVISION: Meaningful inquiry but criteria are ambiguous or source requirements are defective.
    """
    owner: Address
    qualification_records: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address

    @gl.public.view
    def get_qualification(self, content_hash: str) -> str:
        clean_hash = str(content_hash)
        if clean_hash in self.qualification_records:
            return str(self.qualification_records[clean_hash])
        return "Qualification record not found"

    @gl.public.write
    def evaluate_challenge_qualification(
        self,
        content_hash: str,
        category: str,
        title: str,
        claim_statement: str,
        required_sources_desc: str,
        evaluation_criteria: str
    ) -> str:
        clean_hash = str(content_hash).strip()
        clean_cat = str(category).strip()
        clean_title = str(title).strip()
        clean_claim = str(claim_statement).strip()
        clean_sources = str(required_sources_desc).strip()
        clean_criteria = str(evaluation_criteria).strip()

        def get_input() -> str:
            return (
                f"=== PROPOSED DAREYOU FOOTBALL CHALLENGE ===\n"
                f"Content Hash: {clean_hash}\n"
                f"Category: {clean_cat}\n"
                f"Inquiry Title: {clean_title}\n"
                f"Factual Claim to Investigate: {clean_claim}\n"
                f"Required Sources Specification: {clean_sources}\n"
                f"Success / Adjudication Criteria: {clean_criteria}\n\n"
                f"=== QUALIFICATION EVALUATION DIRECTIVES ===\n"
                f"1. Research Depth: Requires deep investigation or conflicting-source resolution, NOT a simple single-number lookup.\n"
                f"2. Scope Exclusions: Immediately REJECT any prediction-market questions about future matches, subjective opinion polls ('who is the GOAT?'), or obvious trivia.\n"
                f"3. Verifiability: Must have explicit, observable criteria that can be proven via official match sheets or historical archives.\n"
                f"4. Anti-Gaming: Reject trivial or simple yes/no questions padded with verbose filler or irrelevant source requirements.\n"
                f"5. Decision Rules:\n"
                f"   - APPROVED: Genuine substantive football investigation requiring cross-source verification.\n"
                f"   - REJECTED: Trivial fact, future prediction, subjective debate, impossible task, or disguised spam.\n"
                f"   - NEEDS_REVISION: Good factual premise but success criteria are ambiguous or source instructions lack specificity."
            )

        raw_result = gl.eq_principle.prompt_non_comparative(
            get_input,
            task=(
                f"Act as an elite academic peer-review arbiter for football intelligence challenges. "
                f"Evaluate if proposed challenge '{clean_title}' qualifies as a research-intensive investigation. "
                f"Output a valid JSON object with keys: "
                f"'decision' ('APPROVED', 'REJECTED', or 'NEEDS_REVISION'), "
                f"'depth_score' (integer 0-100), "
                f"'non_obvious' (boolean), "
                f"'verifiable' (boolean), "
                f"'rationale' (concise 1-2 sentence explanation)."
            ),
            criteria="""
                1. The output is a valid JSON object with keys: decision, depth_score, non_obvious, verifiable, and rationale.
                2. The decision is exactly one of: APPROVED, REJECTED, or NEEDS_REVISION.
                3. If the challenge is a future prediction, subjective opinion, or obvious single-statistic lookup, decision is REJECTED.
                4. If the challenge requires cross-referencing multiple historical match reports, resolving conflicting sources, or synthesising disparate official facts, decision is APPROVED.
                5. If the factual topic is worthwhile but the success criteria are vague or unobservable, decision is NEEDS_REVISION.
            """,
        )

        result_str = str(raw_result).strip()

        # Sanitize code blocks if returned
        clean_json_str = result_str
        if "```" in clean_json_str:
            first_brace = clean_json_str.find("{")
            last_brace = clean_json_str.rfind("}")
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                clean_json_str = clean_json_str[first_brace : last_brace + 1]
        elif not clean_json_str.startswith("{"):
            first_brace = clean_json_str.find("{")
            last_brace = clean_json_str.rfind("}")
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                clean_json_str = clean_json_str[first_brace : last_brace + 1]

        decision = "REJECTED"
        try:
            parsed = json.loads(clean_json_str)
            raw_d = str(parsed.get("decision", "REJECTED")).upper().strip()
            if raw_d in ["APPROVED", "REJECTED", "NEEDS_REVISION"]:
                decision = raw_d
        except Exception:
            decision = "REJECTED"
            clean_json_str = json.dumps({
                "decision": "REJECTED",
                "depth_score": 0,
                "non_obvious": False,
                "verifiable": False,
                "rationale": "Qualification evaluation failed output parsing requirements."
            })

        self.qualification_records[clean_hash] = clean_json_str
        return clean_json_str
