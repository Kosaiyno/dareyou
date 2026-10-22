# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json

class EvidenceRegistry(gl.Contract):
    """
    EvidenceRegistry records and freezes evidence submitted by investigating agents.
    
    Responsibilities:
    1. Accepts submissions only from the assigned investigator (authenticated via DareRegistry).
    2. Records timestamps, source URLs, and verbatim quotes.
    3. Enforces an immutable freeze on the raw evidence dossier prior to adjudication (no verdict metadata).
    4. Prevents post-submission tampering.
    5. Validates dare status is ACCEPTED (research window active) before accepting evidence.
    """
    owner: Address
    authorized_registry: Address
    evidence_dossiers: TreeMap[u256, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.authorized_registry = gl.message.sender_address

    @gl.public.view
    def get_evidence(self, dare_id: int) -> str:
        d_key = u256(dare_id)
        if d_key in self.evidence_dossiers:
            return str(self.evidence_dossiers[d_key])
        return "Evidence dossier not found for dare: " + str(dare_id)

    @gl.public.view
    def has_evidence(self, dare_id: int) -> bool:
        return u256(dare_id) in self.evidence_dossiers

    @gl.public.write
    def set_authorized_registry(self, registry_address: str) -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.owner):
            raise Exception("Unauthorized: Only owner can set registry")
        self.authorized_registry = Address(registry_address)
        return True

    @gl.public.write
    def submit_evidence(
        self,
        dare_id: int,
        investigator_address: str,
        conclusion: str,
        primary_source_url: str,
        secondary_source_url: str,
        verbatim_quotes: str,
        reasoning_defense: str
    ) -> bool:
        d_key = u256(dare_id)
        if d_key in self.evidence_dossiers:
            raise ValueError(f"Evidence already submitted and frozen for dare {dare_id}")

        if not self.authorized_registry or str(self.authorized_registry) == "0x0000000000000000000000000000000000000000":
            raise Exception("Unauthorized: EvidenceRegistry has no authorized DareRegistry configured")

        # Authenticate investigator against frozen DareRegistry record
        reg_contract = gl.get_contract_at(self.authorized_registry)
        raw_dare = reg_contract.view().get_dare(dare_id)
        dare_data = json.loads(str(raw_dare))
        
        # Verify dare is in ACCEPTED status (research window active)
        dare_status = dare_data.get("status")
        if dare_status != "ACCEPTED":
            raise ValueError(f"Cannot submit evidence: dare status is '{dare_status}', must be 'ACCEPTED' (research window active).")

        assigned_investigator = dare_data.get("investigator")
        if not assigned_investigator:
            raise ValueError(f"Dare {dare_id} has no assigned investigator. Cannot submit evidence.")
        
        caller = str(gl.message.sender_address)
        if caller != assigned_investigator:
            raise Exception(f"Unauthorized: Only assigned investigator ({assigned_investigator}) can submit evidence for this dare.")
        
        # Verify research deadline hasn't passed (if timestamps are absolute Unix timestamps)
        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass
        research_deadline = dare_data.get("research_deadline_ts", 0)
        if current_ts > 1000000 and research_deadline > 1000000 and current_ts > research_deadline:
            raise ValueError("Research window deadline has elapsed. Challenge forfeited.")

        clean_conclusion = str(conclusion).strip()
        clean_primary = str(primary_source_url).strip()
        clean_secondary = str(secondary_source_url).strip()
        clean_quotes = str(verbatim_quotes).strip()
        clean_reasoning = str(reasoning_defense).strip()

        if len(clean_conclusion) == 0:
            raise ValueError("Conclusion cannot be empty")
        if len(clean_primary) == 0:
            raise ValueError("Primary source URL cannot be empty")
        if len(clean_quotes) == 0:
            raise ValueError("Verbatim quotes cannot be empty")
        if len(clean_reasoning) == 0:
            raise ValueError("Reasoning defense cannot be empty")

        created_ts = 0
        try:
            created_ts = int(gl.block.timestamp)
        except Exception:
            pass

        dossier = {
            "dare_id": int(dare_id),
            "investigator": str(investigator_address),
            "conclusion": clean_conclusion,
            "primary_source_url": clean_primary,
            "secondary_source_url": clean_secondary if clean_secondary else "N/A",
            "verbatim_quotes": clean_quotes,
            "reasoning_defense": clean_reasoning,
            "submitted_at": created_ts,
            "is_frozen": True
        }

        self.evidence_dossiers[d_key] = json.dumps(dossier)
        return True
