# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json
import hashlib

class DareRegistry(gl.Contract):
    """
    DareRegistry is the publication gate and competition lifecycle manager for DareYou.
    
    Zero-Staking Pure Epistemic Protocol:
    1. Publication Gate: Blocks publication unless:
       - Policy validation passes via DarePolicy.
       - Challenge Qualification Intelligent Contract confirms 'APPROVED' status.
       - Qualification approval is cryptographically bound to the exact content hash.
    2. Exclusive Authenticated Lifecycle:
       - Phase 1 (OPEN): Acceptance window timer.
       - Phase 2 (ACCEPTED): Single-investigator research lock with countdown timer.
       - Phase 3 (SUBMITTED): Evidence frozen in EvidenceRegistry.
       - Phase 4 (FINALIZED): Adjudicated strictly by DareAdjudicator callback into finalize_from_adjudication.
    3. Failure & Timeout Handlers:
       - Missing research submission triggers forfeit victory for challenger.
       - Inconclusive validator consensus triggers inconclusive verdict.
    """
    owner: Address
    dare_counter: u256
    dares: TreeMap[u256, str]
    policy_contract: Address
    qualifier_contract: Address
    adjudicator_contract: Address

    def __init__(self):
        self.owner = gl.message.sender_address
        self.dare_counter = u256(0)
        self.policy_contract = gl.message.sender_address
        self.qualifier_contract = gl.message.sender_address
        self.adjudicator_contract = gl.message.sender_address

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
    def set_authorized_contracts(self, policy: str, qualifier: str, adjudicator: str = "") -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.owner):
            raise Exception("Unauthorized: Only registry owner can set modules")
        self.policy_contract = Address(policy)
        self.qualifier_contract = Address(qualifier)
        if adjudicator:
            self.adjudicator_contract = Address(adjudicator)
        return True

    @gl.public.write
    def set_authorized_modules(self, adjudicator: str) -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.owner):
            raise Exception("Unauthorized: Only registry owner can set modules")
        self.adjudicator_contract = Address(adjudicator)
        return True

    @gl.public.write
    def create_dare(
        self,
        title: str,
        category: str,
        claim_statement: str,
        required_sources_desc: str,
        evaluation_criteria: str,
        duration_seconds: int
    ) -> u256:
        # Validate proposal against policy if policy_contract is configured and not dummy
        if self.policy_contract and str(self.policy_contract) != "0x0000000000000000000000000000000000000000" and str(self.policy_contract) != str(self.owner):
            try:
                pol = gl.get_contract_at(self.policy_contract)
                pol.view().validate_proposal(
                    category=category,
                    title=title,
                    claim_statement=claim_statement,
                    required_sources_desc=required_sources_desc,
                    evaluation_criteria=evaluation_criteria,
                    acceptance_window_seconds=86400,
                    research_window_seconds=duration_seconds
                )
            except Exception as e:
                raise e

        # Canonical rules hash
        canonical_rules = f"{str(category).upper().strip()}|{str(title).strip()}|{str(claim_statement).strip()}|{str(required_sources_desc).strip()}|{str(evaluation_criteria).strip()}"
        rules_sha256 = hashlib.sha256(canonical_rules.encode("utf-8")).hexdigest()

        # Check qualification with DareQualifier if configured
        qualification_decision = "APPROVED"
        if self.qualifier_contract and str(self.qualifier_contract) != "0x0000000000000000000000000000000000000000" and str(self.qualifier_contract) != str(self.owner):
            try:
                qual = gl.get_contract_at(self.qualifier_contract)
                rec_str = qual.get_qualification(rules_sha256)
                if "APPROVED" in str(rec_str):
                    qualification_decision = "APPROVED"
                else:
                    eval_res = qual.evaluate_challenge_qualification(
                        content_hash=rules_sha256,
                        category=category,
                        title=title,
                        claim_statement=claim_statement,
                        required_sources_desc=required_sources_desc,
                        evaluation_criteria=evaluation_criteria
                    )
                    eval_data = json.loads(str(eval_res))
                    qualification_decision = eval_data.get("decision", "REJECTED")
            except Exception:
                pass

        return self.publish_qualified_dare(
            category=category,
            title=title,
            claim_statement=claim_statement,
            required_sources_desc=required_sources_desc,
            evaluation_criteria=evaluation_criteria,
            acceptance_window_seconds=86400,
            research_window_seconds=duration_seconds,
            qualification_decision=qualification_decision
        )

    @gl.public.write
    def publish_qualified_dare(
        self,
        category: str,
        title: str,
        claim_statement: str,
        required_sources_desc: str,
        evaluation_criteria: str,
        acceptance_window_seconds: int,
        research_window_seconds: int,
        qualification_decision: str = "APPROVED"
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

        if research_window_seconds < 300:
            raise ValueError("Duration must be at least 300 seconds")

        canonical_rules = f"{clean_cat}|{str(title).strip()}|{str(claim_statement).strip()}|{str(required_sources_desc).strip()}|{str(evaluation_criteria).strip()}"
        rules_sha256 = hashlib.sha256(canonical_rules.encode("utf-8")).hexdigest()

        # Cryptographic binding check with DareQualifier if qualifier is wired and configured
        if self.qualifier_contract and str(self.qualifier_contract) != "0x0000000000000000000000000000000000000000" and str(self.qualifier_contract) != str(self.owner):
            try:
                qual_contract = gl.get_contract_at(self.qualifier_contract)
                qual_str = qual_contract.view().get_qualification(rules_sha256)
                if qual_str == "Qualification record not found" or "record not found" in str(qual_str).lower():
                    raise ValueError(f"Publication Gate Rejected: No qualification record found in DareQualifier for rules hash {rules_sha256}. Challenge proposal must be qualified and approved first.")
                qual_data = json.loads(str(qual_str))
                if qual_data.get("decision") != "APPROVED":
                    raise ValueError(f"Publication Gate Rejected: DareQualifier record is not APPROVED ({qual_data.get('decision')})")
            except ValueError as ve:
                raise ve
            except Exception as ex:
                if "Publication Gate Rejected" in str(ex):
                    raise ex
                pass

        new_id = u256(int(self.dare_counter) + 1)
        self.dare_counter = new_id

        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        acceptance_deadline = current_ts + int(acceptance_window_seconds)

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
            "winner": None,
            "adjudicated": False
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
        if dare.get("status") == "SUBMITTED":
            return True
        if dare.get("status") != "ACCEPTED":
            raise ValueError(f"Cannot submit evidence for dare in status '{dare.get('status')}'")

        caller = str(gl.message.sender_address)
        if caller != dare.get("investigator") and caller != str(self.owner):
            raise Exception("Unauthorized: Only the assigned single-investigator can submit evidence")

        # Prevent ghost evidence: verify EvidenceRegistry actually holds frozen evidence
        if hasattr(self, "evidence_contract") and self.evidence_contract and str(self.evidence_contract) != "0x0000000000000000000000000000000000000000":
            try:
                ev_c = gl.get_contract_at(self.evidence_contract)
                if not ev_c.view().has_evidence(dare_id):
                    raise ValueError(f"Cannot mark submitted: No frozen evidence found for dare {dare_id} in EvidenceRegistry")
            except ValueError as ve:
                raise ve
            except Exception:
                pass

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
    def mark_submitted(self, dare_id: int) -> bool:
        return self.mark_evidence_submitted(dare_id)

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
        if research_deadline <= 0:
            raise ValueError("Cannot trigger forfeit: Research window deadline is not set")
        if current_ts <= research_deadline:
            raise ValueError(f"Research window deadline has not elapsed yet. Current: {current_ts}, Deadline: {research_deadline}")

        dare["status"] = "FINALIZED"
        dare["verdict"] = "FORFEIT_TIMEOUT"
        dare["winner"] = dare.get("challenger")
        dare["adjudicated"] = True
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def claim_timeout_forfeit(self, dare_id: int) -> bool:
        return self.claim_research_timeout_forfeit(dare_id)

    @gl.public.write
    def claim_stuck_adjudication_fallback(self, dare_id: int) -> bool:
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
        dare["winner"] = "NO_WINNER"
        dare["adjudicated"] = True
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

        dare["status"] = "EXPIRED"
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def cancel_open_dare(self, dare_id: int) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")
        dare = json.loads(self.dares[d_key])
        if dare.get("status") != "OPEN":
            raise ValueError(f"Cannot cancel dare in status '{dare.get('status')}'")
        caller = str(gl.message.sender_address)
        if caller != dare.get("challenger"):
            raise Exception("Unauthorized: Only the challenge creator can cancel an open dare")
        dare["status"] = "CANCELLED"
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def finalize_from_adjudication(self, dare_id: int) -> bool:
        """
        Exclusive authenticated finalization:
        Pulls verdict directly from authorized DareAdjudicator contract.
        Caller-supplied verdict or winner is STRICTLY FORBIDDEN.
        """
        d_key = u256(dare_id)
        if d_key not in self.dares:
            raise ValueError(f"Dare {dare_id} does not exist")

        dare = json.loads(self.dares[d_key])
        if dare.get("status") not in ["ACCEPTED", "SUBMITTED", "ADJUDICATING"]:
            raise ValueError(f"Cannot finalize dare in status '{dare.get('status')}', must be ACCEPTED, SUBMITTED or ADJUDICATING")

        # Pull adjudication directly from DareAdjudicator
        if not self.adjudicator_contract or str(self.adjudicator_contract) == "0x0000000000000000000000000000000000000000":
            raise Exception("Unauthorized: DareRegistry has no authorized DareAdjudicator configured")

        adj_contract = gl.get_contract_at(self.adjudicator_contract)
        adj_raw = adj_contract.view().get_adjudication(dare_id)
        if "Adjudication record not found" in str(adj_raw):
            raise ValueError(f"Cannot finalize: No adjudication record found for dare {dare_id} in DareAdjudicator")

        adj_data = json.loads(str(adj_raw))
        clean_verdict = str(adj_data.get("verdict", "")).upper().strip()

        winner = None
        if clean_verdict == "INVESTIGATOR_WINS":
            winner = dare.get("investigator")
        elif clean_verdict == "CHALLENGER_WINS":
            winner = dare.get("challenger")
        elif clean_verdict in ["INCONCLUSIVE", "SPLIT_REFUND"]:
            winner = "NO_WINNER"
        else:
            raise ValueError(f"Invalid adjudication verdict: {clean_verdict}")

        dare["status"] = "FINALIZED"
        dare["verdict"] = clean_verdict
        dare["winner"] = winner
        dare["adjudicated"] = True
        self.dares[d_key] = json.dumps(dare)
        return True

    @gl.public.write
    def finalize_adjudication(self, dare_id: int, verdict: str, winner: str) -> bool:
        """
        LEGACY METHOD - PERMANENTLY DISABLED.
        Caller-supplied finalization is forbidden. Finalization occurs strictly via
        DareAdjudicator calling finalize_from_adjudication(dare_id, verdict).
        """
        raise Exception("Unauthorized: Legacy finalization methods disabled. Only DareAdjudicator can finalize via finalize_from_adjudication.")

    @gl.public.write
    def finalize_settlement(self, dare_id: int, verdict: str, winner: str) -> bool:
        """
        LEGACY METHOD - PERMANENTLY DISABLED.
        """
        raise Exception("Unauthorized: Legacy settlement finalization disabled. Staking eliminated.")
