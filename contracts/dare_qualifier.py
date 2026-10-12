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

        # Format check: Must begin with 'Dare you to '
        if not clean_title.lower().startswith("dare you to "):
            auto_reject = json.dumps({
                "decision": "REJECTED",
                "depth_score": 0,
                "non_obvious": False,
                "verifiable": False,
                "rationale": "Format Failure: Dares MUST begin with 'Dare you to...' as a single complete instruction."
            })
            self.qualification_records[clean_hash] = auto_reject
            return auto_reject

        def get_input() -> str:
            return (
                f"=== PROPOSED DAREYOU FOOTBALL CHALLENGE ===\n"
                f"Content Hash: {clean_hash}\n"
                f"Category: {clean_cat}\n"
                f"Continuous Dare Instruction: {clean_title}\n"
                f"Factual Claim to Investigate: {clean_claim}\n"
                f"Required Sources Specification: {clean_sources}\n"
                f"Success / Adjudication Criteria: {clean_criteria}\n\n"
                f"=== MANDATORY ACCEPTANCE RUBRIC (ALL 8 MUST PASS) ===\n"
                f"1. Concrete & Identifiable Subject: Real, specific football event, transfer, or controversy.\n"
                f"2. Substantive Research Difficulty: Requires deep source comparison, methodology discrepancy, or evidence synthesis. REJECT trivia, basic lookups, obvious yes/no questions, or tasks answerable from 1 quick search.\n"
                f"3. Factual Legitimacy: Based on real events, not invented controversies or false premises.\n"
                f"4. Accessible Evidence: Verifiable via public archives or tools (no private/secret footage).\n"
                f"5. Clear Deliverable: Explicitly states what responding agent must establish, reconstruct, compare, or explain.\n"
                f"6. Verifiable Success Criteria: Objective outcome evaluable by an independent adjudicator (no subjective taste or 'best/underrated').\n"
                f"7. Reasonable Time Constraint: Suitable for stated research window (typically 20-45 mins).\n"
                f"8. Fair & Bounded Scope: Finite, constrained task.\n\n"
                f"=== QUALIFICATION DECISIONS ===\n"
                f"- APPROVED: All 8 mandatory criteria fully satisfied. Genuine substantive football investigation.\n"
                f"- REJECTED: Fails any criterion: basic trivia, future prediction, subjective opinion, impossible task, or disguised spam.\n"
                f"- NEEDS_REVISION: Meaningful inquiry but criteria are ambiguous or scope is unbounded."
            )

        raw_result = gl.eq_principle.prompt_non_comparative(
            get_input,
            task=(
                f"Act as an elite academic peer-review arbiter for football intelligence challenges. "
                f"Evaluate if proposed dare '{clean_title}' satisfies all 8 mandatory acceptance criteria. "
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
                3. If the dare is basic trivia, simple lookup, future prediction, subjective debate, or obvious fact, decision is REJECTED.
                4. If the dare is a difficult, verifiable, multi-source investigation with a clear deliverable and time limit, decision is APPROVED.
                5. If the factual inquiry is worthwhile but criteria are vague or unobservable, decision is NEEDS_REVISION.
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
