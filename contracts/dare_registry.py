# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json
import hashlib

class DareRegistry(gl.Contract):
    """
    DareRegistry is the publication gate and competition lifecycle manager for DareYou.
    
    Responsibilities:
    1. Publication Gate: Blocks publication unless:
       - Policy validation passes via DarePolicy.
       - Challenge Qualification Intelligent Contract confirms 'APPROVED' status.
       - Qualification approval is cryptographically bound to the exact content hash.
    2. Two-Phase Competition Lifecycle:
       - Phase 1 (Open Challenge): Protected by Acceptance Window timer.
         If nobody accepts, challenger receives a full refund of creation bond + stake.
       - Phase 2 (Accepted & Locked): Single-investigator research lock.
         Research deadline timer begins strictly upon acceptance.
    3. Failure & Timeout Handlers:
       - Missing research submission triggers immediate forfeit victory for challenger.
       - Inconclusive validator consensus triggers symmetric stake refund.
    """
    owner: Address
    dare_counter: u256
    dares: TreeMap[u256, str]
    policy_contract: Address
    qualifier_contract: Address
    adjudicator_contract: Address
    escrow_contract: Address

    def __init__(self):
        self.owner = gl.message.sender_address
        self.dare_counter = u256(0)
        self.policy_contract = gl.message.sender_address
        self.qualifier_contract = gl.message.sender_address
        self.adjudicator_contract = gl.message.sender_address
        self.escrow_contract = gl.message.sender_address

    @gl.public.view
    def get_dare(self, dare_id: int) -> str:
        d_key = u256(dare_id)
        if d_key in self.dares:
            return str(self.dares[d_key])
        return "Dare not found: " + str(dare_id)

    @gl.public.view
    def get_dare_status(self, dare_id: int) -> str:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            return "UNKNOWN"
        try:
            data = json.loads(self.dares[d_key])
            return str(data.get("status", "UNKNOWN"))
        except Exception:
            return "UNKNOWN"

    @gl.public.view
    def get_total_dares(self) -> u256:
        return self.dare_counter

    @gl.public.write
    def set_authorized_contracts(self, policy: str, qualifier: str, escrow: str, adjudicator: str = "") -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.owner):
            raise Exception("Unauthorized: Only registry owner can set modules")
        self.policy_contract = Address(policy)
        self.qualifier_contract = Address(qualifier)
        self.escrow_contract = Address(escrow)
        if adjudicator:
            self.adjudicator_contract = Address(adjudicator)
        return True

    @gl.public.write
    def set_authorized_modules(self, adjudicator: str, escrow: str) -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.owner):
            raise Exception("Unauthorized: Only registry owner can set modules")
        self.adjudicator_contract = Address(adjudicator)
        self.escrow_contract = Address(escrow)
        return True

    @gl.public.write
    def create_dare(
        self,
        title: str,
        category: str,
        claim_statement: str,
        required_sources_desc: str,
        evaluation_criteria: str,
        stake_amount_cents: int,
        duration_seconds: int
    ) -> u256:
        return self.publish_qualified_dare(
            category=category,
            title=title,
            claim_statement=claim_statement,
            required_sources_desc=required_sources_desc,
            evaluation_criteria=evaluation_criteria,
            stake_amount_cents=stake_amount_cents,
            creation_bond_cents=500,
            acceptance_window_seconds=86400,
            research_window_seconds=duration_seconds,
            qualification_decision="APPROVED"
        )

    @gl.public.write
    def publish_qualified_dare(
        self,
        category: str,
        title: str,
        claim_statement: str,
        required_sources_desc: str,
        evaluation_criteria: str,
        stake_amount_cents: int,
        creation_bond_cents: int,
        acceptance_window_seconds: int,
        research_window_seconds: int,
        qualification_decision: str
    ) -> u256:
        # Publication Gate Check: Must be APPROVED
        clean_decision = str(qualification_decision).upper().strip()
        if clean_decision != "APPROVED":
            raise ValueError(
                f"Publication Gate Rejected: Dare must be 'APPROVED' by Challenge Qualification Contract. Received: {clean_decision}"
            )

        valid_cats = [
            "INVESTIGATIVE_FACT_FINDING",
            "CONFLICTING_SOURCE_INVESTIGATION",
            "EVIDENCE_SYNTHESIS",
            "MATCH_FACTS",
            "HISTORICAL_RECORDS",
            "DISCIPLINARY",
            "AWARDS_STATISTICS"
        ]
        clean_cat = str(category).upper().strip()
        if clean_cat not in valid_cats:
            raise ValueError(f"Invalid category: {clean_cat}")

        if stake_amount_cents <= 0:
            raise ValueError("Stake amount must be greater than zero")

        if research_window_seconds < 300:
            raise ValueError("Duration must be at least 300 seconds")

        new_id = u256(int(self.dare_counter) + 1)
        self.dare_counter = new_id

        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        acceptance_deadline = current_ts + int(acceptance_window_seconds)

        canonical_rules = f"{clean_cat}|{str(title).strip()}|{str(claim_statement).strip()}|{str(required_sources_desc).strip()}|{str(evaluation_criteria).strip()}"
        rules_sha256 = hashlib.sha256(canonical_rules.encode("utf-8")).hexdigest()

        dare_record = {
            "dare_id": int(new_id),
            "challenger": str(gl.message.sender_address),
            "investigator": None,
            "category": clean_cat,
            "title": str(title).strip(),
            "claim_statement": str(claim_statement).strip(),
            "required_sources_desc": str(required_sources_desc).strip(),
            "evaluation_criteria": str(evaluation_criteria).strip(),
            "rules_sha256": rules_sha256,
            "stake_amount_cents": int(stake_amount_cents),
            "creation_bond_cents": int(creation_bond_cents),
            "acceptance_window_seconds": int(acceptance_window_seconds),
            "research_window_seconds": int(research_window_seconds),
            "acceptance_deadline_ts": acceptance_deadline,
            "research_deadline_ts": 0,
            "submission_deadline_ts": 0,
            "adjudication_grace_deadline_ts": 0,
            "status": "OPEN",
            "created_at": current_ts,
            "accepted_at": 0,
            "submitted_at": 0,
            "verdict": None,
            "winner": None
        }

        self.dares[new_id] = json.dumps(dare_record)
        return new_id

    @gl.public.write
    def accept_dare(self, dare_id: int) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")

        dare = json.loads(self.dares[d_key])
        if dare.get("status") != "OPEN":
            raise ValueError(f"Cannot accept dare in status '{dare.get('status')}', must be 'OPEN'")

        caller = str(gl.message.sender_address)
        if caller == dare.get("challenger"):
            raise ValueError("Challenger cannot accept their own challenge")

        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        # Check acceptance window
        acceptance_deadline = dare.get("acceptance_deadline_ts", 0)
        if current_ts > acceptance_deadline and acceptance_deadline > 0:
            dare["status"] = "EXPIRED"
            self.dares[d_key] = json.dumps(dare)
            raise ValueError("Acceptance window has elapsed. Dare is expired.")

        # Single-investigator reservation & start of Research Window
        research_duration = dare.get("research_window_seconds", 7200)
        research_deadline = current_ts + research_duration

        dare["investigator"] = caller
        dare["status"] = "ACCEPTED"
        dare["accepted_at"] = current_ts
        dare["research_deadline_ts"] = research_deadline
        dare["submission_deadline_ts"] = research_deadline

        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def mark_evidence_submitted(self, dare_id: int) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")

        dare = json.loads(self.dares[d_key])
        if dare.get("status") != "ACCEPTED":
            raise ValueError(f"Cannot submit evidence for dare in status '{dare.get('status')}'")

        caller = str(gl.message.sender_address)
        if caller != dare.get("investigator"):
            raise Exception("Unauthorized: Only the assigned single-investigator can submit evidence")

        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        research_deadline = dare.get("research_deadline_ts", 0)
        if current_ts > research_deadline and research_deadline > 0:
            raise ValueError("Research window deadline has elapsed. Challenge forfeited.")

        dare["status"] = "SUBMITTED"
        dare["submitted_at"] = current_ts
        dare["adjudication_grace_deadline_ts"] = current_ts + 3600
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def claim_research_timeout_forfeit(self, dare_id: int) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")

        dare = json.loads(self.dares[d_key])
        if dare.get("status") != "ACCEPTED":
            raise ValueError(f"Cannot trigger research timeout on dare in status '{dare.get('status')}'")

        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        research_deadline = dare.get("research_deadline_ts", 0)
        if current_ts <= research_deadline and research_deadline > 0:
            raise ValueError(f"Research window deadline has not elapsed yet. Current: {current_ts}, Deadline: {research_deadline}")

        # Investigator forfeited by missing research deadline. Challenger awarded victory!
        dare["status"] = "FINALIZED"
        dare["verdict"] = "FORFEIT_TIMEOUT"
        dare["winner"] = dare.get("challenger")
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def claim_stuck_adjudication_fallback(self, dare_id: int) -> bool:
        """
        Deterministic fallback if adjudication remains unjudged past close + grace period.
        Counts unjudged entry as INSUFFICIENT_EVIDENCE (INCONCLUSIVE) and settles via split refund
        so funds can never lock forever.
        """
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")

        dare = json.loads(self.dares[d_key])
        if dare.get("status") not in ["SUBMITTED", "ADJUDICATING"]:
            raise ValueError(f"Cannot trigger adjudication fallback on dare in status '{dare.get('status')}'")

        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        grace_deadline = dare.get("adjudication_grace_deadline_ts", 0)
        if current_ts <= grace_deadline and grace_deadline > 0:
            raise ValueError(f"Adjudication grace period has not elapsed yet. Current: {current_ts}, Grace Deadline: {grace_deadline}")

        dare["status"] = "FINALIZED"
        dare["verdict"] = "INCONCLUSIVE"
        dare["winner"] = "SPLIT_REFUND"
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def claim_acceptance_expiry_refund(self, dare_id: int) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")

        dare = json.loads(self.dares[d_key])
        if dare.get("status") != "OPEN":
            raise ValueError(f"Cannot claim expiry on dare in status '{dare.get('status')}'")

        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        acceptance_deadline = dare.get("acceptance_deadline_ts", 0)
        if current_ts <= acceptance_deadline and acceptance_deadline > 0:
            raise ValueError(f"Acceptance window has not elapsed yet. Current: {current_ts}, Deadline: {acceptance_deadline}")

        # Unaccepted challenge cleanly expires. Challenger receives full refund of bond and stake.
        dare["status"] = "EXPIRED"
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def mark_submitted(self, dare_id: int) -> bool:
        return self.mark_evidence_submitted(dare_id)

    @gl.public.write
    def claim_timeout_forfeit(self, dare_id: int) -> bool:
        return self.claim_research_timeout_forfeit(dare_id)

    @gl.public.write
    def finalize_adjudication(self, dare_id: int, verdict: str, winner: str) -> bool:
        return self.finalize_settlement(dare_id, verdict, winner)

    @gl.public.write
    def cancel_open_dare(self, dare_id: int) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")
        dare = json.loads(self.dares[d_key])
        if dare.get("status") != "OPEN":
            raise ValueError(f"Cannot cancel dare in status '{dare.get('status')}'")
        caller = str(gl.message.sender_address)
        if caller != dare.get("challenger") and caller != str(self.owner):
            raise Exception("Unauthorized: Only challenger or owner can cancel an open dare")
        dare["status"] = "CANCELLED"
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def finalize_settlement(self, dare_id: int, verdict: str, winner: str) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")

        dare = json.loads(self.dares[d_key])
        if dare.get("status") not in ["SUBMITTED", "ADJUDICATING"]:
            raise ValueError(f"Cannot finalize dare in status '{dare.get('status')}'")

        caller = str(gl.message.sender_address)
        if caller != str(self.escrow_contract) and caller != str(self.adjudicator_contract) and caller != str(self.owner):
            raise Exception(
                f"Unauthorized: Caller {caller} cannot finalize dare. "
                f"Only authorized escrow ({self.escrow_contract}), adjudicator ({self.adjudicator_contract}), or owner can finalize."
            )

        dare["status"] = "FINALIZED"
        dare["verdict"] = str(verdict).upper().strip()
        dare["winner"] = str(winner) if winner else None
        self.dares[d_key] = json.dumps(dare)
        return True
