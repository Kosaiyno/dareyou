# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json

class DareRegistry(gl.Contract):
    """
    DareRegistry is the core lifecycle and challenge state manager for DareYou.
    
    Responsibilities:
    1. Creates and tracks unique football intelligence dares.
    2. Validates categories, required fields, and stake requirements.
    3. Manages dare state transitions:
       CREATED -> OPEN -> ACCEPTED -> SUBMITTED -> ADJUDICATING -> FINALIZED (or FORFEITED, CANCELLED)
    4. Freezes evaluation criteria upon acceptance so the challenger cannot alter terms.
    5. Enforces strict submission deadlines and timeout forfeit protections.
    """
    owner: Address
    dare_counter: u256
    dares: TreeMap[u256, str]
    authorized_adjudicator: Address
    authorized_escrow: Address

    def __init__(self):
        self.owner = gl.message.sender_address
        self.dare_counter = u256(0)
        self.authorized_adjudicator = gl.message.sender_address
        self.authorized_escrow = gl.message.sender_address

    @gl.public.view
    def get_registry_stats(self) -> str:
        return (
            "DareRegistry Owner: " + str(self.owner)
            + " | Total Dares: " + str(self.dare_counter)
        )

    @gl.public.view
    def get_total_dares(self) -> u256:
        return self.dare_counter

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

    @gl.public.write
    def set_authorized_modules(self, adjudicator: str, escrow: str) -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.owner):
            raise Exception("Unauthorized: Only registry owner can set authorized modules")
        self.authorized_adjudicator = Address(adjudicator)
        self.authorized_escrow = Address(escrow)
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
        clean_title = str(title).strip()
        clean_cat = str(category).upper().strip()
        clean_claim = str(claim_statement).strip()
        clean_sources = str(required_sources_desc).strip()
        clean_criteria = str(evaluation_criteria).strip()

        if len(clean_title) == 0:
            raise ValueError("Dare title cannot be empty")
        if clean_cat not in ["MATCH_FACTS", "HISTORICAL_RECORDS", "DISCIPLINARY", "AWARDS_STATISTICS"]:
            raise ValueError("Category must be MATCH_FACTS, HISTORICAL_RECORDS, DISCIPLINARY, or AWARDS_STATISTICS")
        if len(clean_claim) == 0:
            raise ValueError("Claim statement cannot be empty")
        if len(clean_sources) == 0:
            raise ValueError("Required sources description cannot be empty")
        if len(clean_criteria) == 0:
            raise ValueError("Evaluation criteria cannot be empty")
        if stake_amount_cents <= 0:
            raise ValueError("Stake amount must be greater than zero")
        if duration_seconds < 300:
            raise ValueError("Investigation duration must be at least 300 seconds (5 minutes)")

        new_id = u256(int(self.dare_counter) + 1)
        self.dare_counter = new_id

        created_ts = 0
        try:
            created_ts = int(gl.block.timestamp)
        except Exception:
            pass

        dare_record = {
            "dare_id": int(new_id),
            "challenger": str(gl.message.sender_address),
            "investigator": None,
            "title": clean_title,
            "category": clean_cat,
            "claim_statement": clean_claim,
            "required_sources_desc": clean_sources,
            "evaluation_criteria": clean_criteria,
            "stake_amount_cents": int(stake_amount_cents),
            "duration_seconds": int(duration_seconds),
            "submission_deadline_ts": 0,
            "status": "OPEN",
            "created_at": created_ts,
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
            raise ValueError("Challenger cannot accept their own dare")

        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        duration = dare.get("duration_seconds", 3600)
        deadline = current_ts + duration

        dare["investigator"] = caller
        dare["status"] = "ACCEPTED"
        dare["accepted_at"] = current_ts
        dare["submission_deadline_ts"] = deadline

        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def mark_submitted(self, dare_id: int) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")

        dare = json.loads(self.dares[d_key])
        if dare.get("status") != "ACCEPTED":
            raise ValueError(f"Cannot submit evidence for dare in status '{dare.get('status')}', must be 'ACCEPTED'")

        caller = str(gl.message.sender_address)
        if caller != dare.get("investigator"):
            raise Exception("Unauthorized: Only the assigned investigator can submit evidence")

        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        # Deadline check
        if current_ts > dare.get("submission_deadline_ts", 0) > 0:
            raise ValueError("Submission deadline has passed. Dare is forfeited.")

        dare["status"] = "SUBMITTED"
        dare["submitted_at"] = current_ts
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def claim_timeout_forfeit(self, dare_id: int) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")

        dare = json.loads(self.dares[d_key])
        if dare.get("status") != "ACCEPTED":
            raise ValueError(f"Cannot claim timeout on dare in status '{dare.get('status')}'")

        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        deadline = dare.get("submission_deadline_ts", 0)
        if current_ts <= deadline and deadline > 0:
            raise ValueError(f"Deadline has not expired yet. Current: {current_ts}, Deadline: {deadline}")

        # Investigator forfeited by missing deadline. Challenger wins!
        dare["status"] = "FINALIZED"
        dare["verdict"] = "FORFEIT_TIMEOUT"
        dare["winner"] = dare.get("challenger")
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def finalize_adjudication(self, dare_id: int, verdict: str, winner: str) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")

        caller = str(gl.message.sender_address)
        if caller != str(self.authorized_adjudicator) and caller != str(self.owner):
            raise Exception("Unauthorized: Only authorized adjudicator or owner can finalize verdicts")

        dare = json.loads(self.dares[d_key])
        if dare.get("status") not in ["SUBMITTED", "ADJUDICATING"]:
            raise ValueError(f"Cannot finalize dare in status '{dare.get('status')}'")

        clean_verdict = str(verdict).upper().strip()
        if clean_verdict not in ["INVESTIGATOR_WINS", "CHALLENGER_WINS", "INCONCLUSIVE", "INVALID_CHALLENGE"]:
            raise ValueError(f"Invalid verdict enum: {clean_verdict}")

        dare["status"] = "FINALIZED"
        dare["verdict"] = clean_verdict
        dare["winner"] = str(winner) if winner else None
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def cancel_open_dare(self, dare_id: int) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")

        dare = json.loads(self.dares[d_key])
        if dare.get("status") != "OPEN":
            raise ValueError(f"Cannot cancel dare in status '{dare.get('status')}', must be 'OPEN'")

        caller = str(gl.message.sender_address)
        if caller != dare.get("challenger") and caller != str(self.owner):
            raise Exception("Unauthorized: Only challenger or owner can cancel an open dare")

        dare["status"] = "CANCELLED"
        self.dares[d_key] = json.dumps(dare)
        return True
