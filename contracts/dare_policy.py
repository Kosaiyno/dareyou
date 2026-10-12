# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json

class DarePolicy(gl.Contract):
    """
    DarePolicy is the deterministic policy enforcement module for DareYou.
    
    Responsibilities:
    1. Validates supported categories:
       - INVESTIGATIVE_FACT_FINDING
       - CONFLICTING_SOURCE_INVESTIGATION
       - EVIDENCE_SYNTHESIS
    2. Enforces protocol bounds:
       - Minimum duel stake: 1000 cents ($10.00 / 10 GEN)
       - Creation bond: 500 cents ($5.00 / 5 GEN)
       - Acceptance window: 3600 to 604800 seconds (1 hour to 7 days)
       - Research window: 1800 to 259200 seconds (30 mins to 3 days)
    3. Rate limits: Max 3 concurrently open challenges per challenger address.
    4. Deterministic schema integrity checks (mandatory non-empty fields, character minimums).
    """
    owner: Address
    active_dares_per_challenger: TreeMap[str, u256]
    policy_version: u256

    def __init__(self):
        self.owner = gl.message.sender_address
        self.policy_version = u256(1)

    @gl.public.view
    def get_policy_version(self) -> u256:
        return self.policy_version

    @gl.public.view
    def get_active_dares_count(self, challenger_address: str) -> u256:
        clean_addr = str(challenger_address)
        if clean_addr in self.active_dares_per_challenger:
            return self.active_dares_per_challenger[clean_addr]
        return u256(0)

    @gl.public.write
    def validate_and_record_proposal(
        self,
        challenger: str,
        category: str,
        title: str,
        claim_statement: str,
        required_sources_desc: str,
        evaluation_criteria: str,
        stake_amount_cents: int,
        creation_bond_cents: int,
        acceptance_window_seconds: int,
        research_window_seconds: int
    ) -> bool:
        clean_challenger = str(challenger).strip()
        clean_category = str(category).upper().strip()
        clean_title = str(title).strip()
        clean_claim = str(claim_statement).strip()
        clean_sources = str(required_sources_desc).strip()
        clean_criteria = str(evaluation_criteria).strip()

        # 1. Supported Category Check
        valid_categories = [
            "INVESTIGATIVE_FACT_FINDING",
            "CONFLICTING_SOURCE_INVESTIGATION",
            "EVIDENCE_SYNTHESIS"
        ]
        if clean_category not in valid_categories:
            raise ValueError(
                f"Unsupported category '{clean_category}'. Must be one of: {', '.join(valid_categories)}"
            )

        # 2. Mandatory Field Completeness & Quality Floors
        if len(clean_title) < 15:
            raise ValueError("Challenge title must be at least 15 characters describing the specific inquiry")
        if len(clean_claim) < 25:
            raise ValueError("Claim statement must be at least 25 characters with verifiable detail")
        if len(clean_sources) < 20:
            raise ValueError("Required sources description must specify mandatory primary/secondary archives")
        if len(clean_criteria) < 30:
            raise ValueError("Evaluation criteria must explicitly define observable success/failure rubrics")

        # 3. Stake and Bond Bounds
        if stake_amount_cents < 1000:
            raise ValueError("Minimum challenge duel stake is 1000 cents ($10.00 / 10 GEN)")
        if creation_bond_cents < 500:
            raise ValueError("Minimum anti-spam creation bond is 500 cents ($5.00 / 5 GEN)")

        # 4. Timer Bounds
        if acceptance_window_seconds < 3600 or acceptance_window_seconds > 604800:
            raise ValueError("Acceptance window must be between 1 hour (3600s) and 7 days (604800s)")
        if research_window_seconds < 1800 or research_window_seconds > 259200:
            raise ValueError("Research window must be between 30 minutes (1800s) and 3 days (259200s)")

        # 5. Rate Limiting: Max 3 open challenges per agent
        current_active = int(self.get_active_dares_count(clean_challenger))
        if current_active >= 3:
            raise ValueError(f"Rate limit exceeded: Challenger {clean_challenger} already has 3 open challenges")

        # Record active proposal count
        self.active_dares_per_challenger[clean_challenger] = u256(current_active + 1)
        return True

    @gl.public.write
    def release_rate_limit(self, challenger: str) -> bool:
        clean_challenger = str(challenger).strip()
        current = int(self.get_active_dares_count(clean_challenger))
        if current > 0:
            self.active_dares_per_challenger[clean_challenger] = u256(current - 1)
        return True
