# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json

class DareAdjudicator(gl.Contract):
    """
    DareAdjudicator is the GenLayer Intelligent Contract at the heart of DareYou.
    
    Responsibilities:
    1. Reads the frozen challenge criteria and the investigator's evidence dossier.
    2. Executes multi-validator consensus adjudication under the GenLayer Equivalence Principle.
    3. Evaluates source relevance, evidentiary support, and resolution of contradictory claims.
    4. Emits a strictly constrained, machine-readable verdict:
       - INVESTIGATOR_WINS: Evidence satisfies criteria, sources are authentic, claim proved/disproved accurately.
       - CHALLENGER_WINS: Evidence fails criteria, lacks required sources, or reasoning is defective.
       - INCONCLUSIVE: Sources directly conflict with equal authority or claim is materially indeterminate.
       - INVALID_CHALLENGE: Challenge was fundamentally ambiguous, non-evaluable, or contradictory from genesis.
    5. Stores the final consensus adjudication record.
    """
    owner: Address
    adjudication_records: TreeMap[u256, str]

    def __init__(self):
        self.owner = gl.message.sender_address

    @gl.public.view
    def get_adjudication(self, dare_id: int) -> str:
        d_key = u256(dare_id)
        if d_key in self.adjudication_records:
            return str(self.adjudication_records[d_key])
        return "Adjudication record not found for dare: " + str(dare_id)

    @gl.public.write
    def adjudicate_evidence(
        self,
        dare_id: int,
        title: str,
        category: str,
        claim_statement: str,
        required_sources_desc: str,
        evaluation_criteria: str,
        conclusion: str,
        primary_source_url: str,
        secondary_source_url: str,
        verbatim_quotes: str,
        reasoning_defense: str
    ) -> str:
        d_key = u256(dare_id)

        clean_title = str(title).strip()
        clean_claim = str(claim_statement).strip()
        clean_req_sources = str(required_sources_desc).strip()
        clean_criteria = str(evaluation_criteria).strip()
        clean_conclusion = str(conclusion).strip()
        clean_quotes = str(verbatim_quotes).strip()
        clean_reasoning = str(reasoning_defense).strip()

        # Deterministic sanity check: Empty quotes cannot win
        if len(clean_quotes) == 0:
            auto_reject = json.dumps({
                "verdict": "CHALLENGER_WINS",
                "score": 0,
                "criteria_fulfillment": False,
                "rationale": "Investigator submitted no verifiable quotes to support the conclusion."
            })
            self.adjudication_records[d_key] = auto_reject
            return auto_reject

        def get_input() -> str:
            return (
                f"=== FROZEN CHALLENGE SPECIFICATION ===\n"
                f"Dare ID: {dare_id}\n"
                f"Title: {clean_title}\n"
                f"Category: {category}\n"
                f"Investigated Claim: {clean_claim}\n"
                f"Required Sources: {clean_req_sources}\n"
                f"Success Evaluation Criteria: {clean_criteria}\n\n"
                f"=== INVESTIGATOR SUBMITTED EVIDENCE DOSSIER ===\n"
                f"Investigator Conclusion: {clean_conclusion}\n"
                f"Primary Source URL: {primary_source_url}\n"
                f"Secondary Source URL: {secondary_source_url}\n"
                f"Verbatim Evidence Quotes: {clean_quotes}\n"
                f"Reasoning Defense & Source Analysis: {clean_reasoning}\n\n"
                f"=== ADJUDICATION DIRECTIVES ===\n"
                f"1. Evidentiary Parity: If the quotes and sources substantiate the conclusion according to the criteria, decision is INVESTIGATOR_WINS.\n"
                f"2. Substandard Evidence: If quotes fail to prove the claim, ignore required sources, or contradict official records, decision is CHALLENGER_WINS.\n"
                f"3. Inconclusive Discrepancy: If equally authoritative official sources directly conflict without resolution, decision is INCONCLUSIVE.\n"
                f"4. Ambiguity: If the original dare had fatal ambiguity rendering fair judgment impossible, decision is INVALID_CHALLENGE."
            )

        raw_result = gl.eq_principle.prompt_non_comparative(
            get_input,
            task=(
                f"Act as an impartial, elite sports intelligence arbiter. Evaluate the submitted evidence "
                f"for football challenge '{clean_title}'. "
                f"Output a valid JSON object with keys: "
                f"'verdict' ('INVESTIGATOR_WINS', 'CHALLENGER_WINS', 'INCONCLUSIVE', or 'INVALID_CHALLENGE'), "
                f"'score' (integer 0-100), "
                f"'criteria_fulfillment' (boolean), "
                f"'rationale' (concise 1-2 sentence explanation)."
            ),
            criteria="""
                1. The output is a valid JSON object with keys: verdict, score, criteria_fulfillment, and rationale.
                2. The verdict is exactly one of: INVESTIGATOR_WINS, CHALLENGER_WINS, INCONCLUSIVE, or INVALID_CHALLENGE.
                3. If the evidence quotes and sources reliably satisfy the frozen evaluation criteria, verdict is INVESTIGATOR_WINS.
                4. If the evidence fails the criteria, lacks mandatory sources, or draws unsupported conclusions, verdict is CHALLENGER_WINS.
                5. If official match records directly contradict with equal credibility, verdict is INCONCLUSIVE.
                6. If the challenge was inherently unanswerable or contradictory from genesis, verdict is INVALID_CHALLENGE.
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

        # Verify JSON
        try:
            parsed = json.loads(clean_json_str)
            raw_v = str(parsed.get("verdict", "INCONCLUSIVE")).upper().strip()
            if raw_v not in ["INVESTIGATOR_WINS", "CHALLENGER_WINS", "INCONCLUSIVE", "INVALID_CHALLENGE"]:
                clean_json_str = json.dumps({
                    "verdict": "INCONCLUSIVE",
                    "score": 50,
                    "criteria_fulfillment": False,
                    "rationale": "Adjudication output fell back to inconclusive due to irregular output format."
                })
        except Exception:
            clean_json_str = json.dumps({
                "verdict": "INCONCLUSIVE",
                "score": 50,
                "criteria_fulfillment": False,
                "rationale": "Adjudication output fell back to inconclusive due to parsing exception."
            })

        self.adjudication_records[d_key] = clean_json_str
        return clean_json_str
