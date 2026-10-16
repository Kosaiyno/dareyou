# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json
import hashlib

class DareQualifier(gl.Contract):
    """
    DareQualifier is the GenLayer Intelligent Contract responsible for Challenge Qualification.

    Design Rules Enforced:
    1. Rejects vague or unobservable inputs up front before a challenge can open.
    2. The LLM never sets numeric scores or amounts: it returns a small fixed categorical
       decision ('APPROVED', 'REJECTED', 'NEEDS_REVISION') plus boolean criteria checks.
    3. Deterministic Python code maps the categorical decision to a frozen rules hash.
    """
    owner: Address
    qualification_records: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address

    @gl.public.view
    def get_qualification(self, content_hash: str) -> str:
        clean_hash = str(content_hash).strip()
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

        # 1. Deterministic Format Check: Must begin with 'Dare you to '
        if not clean_title.lower().startswith("dare you to "):
            auto_reject = json.dumps({
                "decision": "REJECTED",
                "observable_criteria": False,
                "immutable_source_feasible": False,
                "rules_sha256": "",
                "rationale": "Format Failure: Every dare MUST begin with 'Dare you to...' as a single complete instruction."
            })
            self.qualification_records[clean_hash] = auto_reject
            return auto_reject

        # 2. Deterministic Vague / Subjective Input Filter
        combined_lower = (clean_title + " " + clean_claim + " " + clean_criteria).lower()
        vague_phrases = [
            "who is the best",
            "most underrated",
            "good progress",
            "high quality work",
            "who argued better",
            "in your opinion"
        ]
        for phrase in vague_phrases:
            if phrase in combined_lower or len(clean_criteria) < 20:
                vague_reject = json.dumps({
                    "decision": "REJECTED",
                    "observable_criteria": False,
                    "immutable_source_feasible": False,
                    "rules_sha256": "",
                    "rationale": "Rejected up front: Criteria contain vague, subjective, or unobservable terms."
                })
                self.qualification_records[clean_hash] = vague_reject
                return vague_reject

        # Compute deterministic SHA-256 rules hash to freeze the agreement specification
        canonical_spec = f"{clean_cat}|{clean_title}|{clean_claim}|{clean_sources}|{clean_criteria}"
        rules_sha256 = hashlib.sha256(canonical_spec.encode("utf-8")).hexdigest()

        def get_input() -> str:
            return (
                f"=== PROPOSED DAREYOU CHALLENGE SPECIFICATION ===\n"
                f"Category: {clean_cat}\n"
                f"Dare Instruction: {clean_title}\n"
                f"Factual Claim: {clean_claim}\n"
                f"Required Immutable Sources: {clean_sources}\n"
                f"Observable Evaluation Criteria: {clean_criteria}\n\n"
                f"=== QUALIFICATION RUBRIC ===\n"
                f"1. Observable Criteria: Must specify concrete, falsifiable facts (dates, filings, verbatim text, or archival discrepancies), NOT subjective opinions or vague goals.\n"
                f"2. Immutable Source Feasibility: Must be verifiable via public immutable archives (Archive.org id_ snapshots, Wikipedia oldid revisions, SEC/Companies House filings, or pinned GitHub commits).\n"
                f"3. Non-Trivial Scope: Must require genuine source cross-referencing rather than subjective taste or future speculation."
            )

        raw_result = gl.eq_principle.prompt_non_comparative(
            get_input,
            task=(
                "Evaluate whether this proposed challenge has observable, checkable criteria and feasible immutable sources. "
                "Do NOT output any numeric scores or prices. "
                "Output ONLY a valid JSON object with keys: "
                "'decision' ('APPROVED', 'REJECTED', or 'NEEDS_REVISION'), "
                "'observable_criteria' (boolean), "
                "'immutable_source_feasible' (boolean), and "
                "'rationale' (1 sentence explanation)."
            ),
            criteria="""
                1. Output is valid JSON with keys: decision, observable_criteria, immutable_source_feasible, rationale.
                2. decision is strictly one of: APPROVED, REJECTED, NEEDS_REVISION.
                3. Reject anything subjective, unobservable, or based on future events.
                4. Approve only when criteria are concrete, checkable against public archival evidence, and unambiguous.
            """
        )

        result_str = str(raw_result).strip()
        clean_json_str = result_str
        if "```" in clean_json_str or not clean_json_str.startswith("{"):
            first_brace = clean_json_str.find("{")
            last_brace = clean_json_str.rfind("}")
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                clean_json_str = clean_json_str[first_brace : last_brace + 1]

        # Deterministic code maps the LLM's categorical judgment to the final frozen record
        try:
            parsed = json.loads(clean_json_str)
            raw_d = str(parsed.get("decision", "REJECTED")).upper().strip()
            obs = bool(parsed.get("observable_criteria", False))
            feas = bool(parsed.get("immutable_source_feasible", False))
            rat = str(parsed.get("rationale", "Evaluated by GenLayer validator consensus."))

            if raw_d == "APPROVED" and obs and feas:
                final_decision = "APPROVED"
            elif raw_d == "NEEDS_REVISION":
                final_decision = "NEEDS_REVISION"
            else:
                final_decision = "REJECTED"

            final_record = json.dumps({
                "decision": final_decision,
                "observable_criteria": obs,
                "immutable_source_feasible": feas,
                "rules_sha256": rules_sha256 if final_decision == "APPROVED" else "",
                "rationale": rat
            })
        except Exception:
            final_record = json.dumps({
                "decision": "REJECTED",
                "observable_criteria": False,
                "immutable_source_feasible": False,
                "rules_sha256": "",
                "rationale": "Qualification output failed strict JSON schema validation."
            })

        self.qualification_records[clean_hash] = final_record
        return final_record
