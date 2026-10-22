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
       - Acceptance window: 3600 to 604800 seconds (1 hour to 7 days)
       - Research window: 300 to 259200 seconds (5 mins to 3 days)
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

    @gl.public.view
    def validate_proposal(
        self,
        category: str,
        title: str,
        claim_statement: str,
        required_sources_desc: str,
        evaluation_criteria: str,
        acceptance_window_seconds: int,
        research_window_seconds: int
    ) -> bool:
        clean_category = str(category).upper().strip()
        clean_dare = str(title).strip()
        clean_claim = str(claim_statement).strip()
        clean_sources = str(required_sources_desc).strip()
        clean_criteria = str(evaluation_criteria).strip()

        # 1. Format Requirement: Must begin with 'Dare you to '
        if not clean_dare.lower().startswith("dare you to "):
            raise ValueError(
                "Format Error: Every dare MUST begin with 'Dare you to...' as a single complete instruction."
            )
        if len(clean_dare) < 40:
            raise ValueError(
                "Format Error: Dare instruction must be a complete, substantive task of at least 40 characters."
            )

        # 2. Supported Category Check
        valid_categories = [
            "INVESTIGATIVE_FACT_FINDING",
            "CONFLICTING_SOURCE_INVESTIGATION",
            "EVIDENCE_SYNTHESIS",
            "MATCH_FACTS",
            "HISTORICAL_RECORDS",
            "DISCIPLINARY",
            "AWARDS_STATISTICS"
        ]
        if clean_category not in valid_categories:
            raise ValueError(
                f"Unsupported category '{clean_category}'. Must be one of: {', '.join(valid_categories)}"
            )

        # 3. Mandatory Field Completeness & Quality Floors
        if len(clean_claim) < 25:
            raise ValueError("Claim statement must be at least 25 characters with verifiable detail")
        if len(clean_sources) < 20:
            raise ValueError("Required sources description must specify mandatory primary/secondary archives")
        if len(clean_criteria) < 30:
            raise ValueError("Evaluation criteria must explicitly define observable success/failure rubrics")

        # 4. Timer Bounds
        if acceptance_window_seconds < 3600 or acceptance_window_seconds > 604800:
            raise ValueError("Acceptance window must be between 1 hour (3600s) and 7 days (604800s)")
        if research_window_seconds < 300 or research_window_seconds > 259200:
            raise ValueError("Research window must be between 5 minutes (300s) and 3 days (259200s)")

        return True

    @gl.public.write
    def validate_and_record_proposal(
        self,
        challenger: str,
        category: str,
        title: str,
        claim_statement: str,
        required_sources_desc: str,
        evaluation_criteria: str,
        acceptance_window_seconds: int,
        research_window_seconds: int
    ) -> bool:
        self.validate_proposal(
            category=category,
            title=title,
            claim_statement=claim_statement,
            required_sources_desc=required_sources_desc,
            evaluation_criteria=evaluation_criteria,
            acceptance_window_seconds=acceptance_window_seconds,
            research_window_seconds=research_window_seconds
        )
        clean_challenger = str(challenger).strip()
        clean_category = str(category).upper().strip()
        clean_dare = str(title).strip()
        clean_claim = str(claim_statement).strip()
        clean_sources = str(required_sources_desc).strip()
        clean_criteria = str(evaluation_criteria).strip()

        # 1. Format Requirement: Must begin with 'Dare you to '
        if not clean_dare.lower().startswith("dare you to "):
            raise ValueError(
                "Format Error: Every dare MUST begin with 'Dare you to...' as a single complete instruction."
            )
        if len(clean_dare) < 40:
            raise ValueError(
                "Format Error: Dare instruction must be a complete, substantive task of at least 40 characters."
            )

        # 2. Supported Category Check
        valid_categories = [
            "INVESTIGATIVE_FACT_FINDING",
            "CONFLICTING_SOURCE_INVESTIGATION",
            "EVIDENCE_SYNTHESIS"
        ]
        if clean_category not in valid_categories:
            raise ValueError(
                f"Unsupported category '{clean_category}'. Must be one of: {', '.join(valid_categories)}"
            )

        # 3. Mandatory Field Completeness & Quality Floors
        if len(clean_dare) < 40:
            raise ValueError("Challenge dare instruction must be at least 40 characters describing the specific inquiry")
        if len(clean_claim) < 25:
            raise ValueError("Claim statement must be at least 25 characters with verifiable detail")
        if len(clean_sources) < 20:
            raise ValueError("Required sources description must specify mandatory primary/secondary archives")
        if len(clean_criteria) < 30:
            raise ValueError("Evaluation criteria must explicitly define observable success/failure rubrics")

        # 4. Timer Bounds
        if acceptance_window_seconds < 3600 or acceptance_window_seconds > 604800:
            raise ValueError("Acceptance window must be between 1 hour (3600s) and 7 days (604800s)")
        if research_window_seconds < 300 or research_window_seconds > 259200:
            raise ValueError("Research window must be between 5 minutes (300s) and 3 days (259200s)")

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
