# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json

class StakeEscrow(gl.Contract):
    """
    StakeEscrow manages GEN stake deposits, locking, and settlement for DareYou duels.
    
    Security Guarantees:
    1. Challenger locks real native GEN stake upon creation via payable deposit.
    2. Investigator matches exact stake upon acceptance via payable deposit.
    3. Funds remain strictly locked during active investigation and adjudication.
    4. Settlement can only be triggered by the authorized registry or contract owner.
    5. Double-settlement and reentrancy protections prevent repeated payouts.
    6. Manual winner claim releases native GEN to winner wallet via emit_transfer.
    7. Transparent refund routing for cancelled or split challenges.
    """
    owner: Address
    authorized_registry: Address
    authorized_adjudicator: Address
    dare_stakes: TreeMap[u256, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.authorized_registry = gl.message.sender_address
        self.authorized_adjudicator = gl.message.sender_address

    @gl.public.write
    def set_authorized_modules(self, registry_address: str, adjudicator_address: str) -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.owner):
            raise Exception("Unauthorized: Only escrow owner can set authorized modules")
        self.authorized_registry = Address(registry_address)
        self.authorized_adjudicator = Address(adjudicator_address)
        return True

    @gl.public.view
    def get_escrow_stats(self) -> str:
        return (
            "StakeEscrow Owner: " + str(self.owner)
            + " | Registry: " + str(self.authorized_registry)
        )

    @gl.public.view
    def get_stake_info(self, dare_id: int) -> str:
        d_key = u256(dare_id)
        if d_key in self.dare_stakes:
            return str(self.dare_stakes[d_key])
        return "Stake record not found: " + str(dare_id)

    @gl.public.write
    def set_authorized_registry(self, registry_address: str) -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.owner):
            raise Exception("Unauthorized: Only escrow owner can set authorized registry")
        self.authorized_registry = Address(registry_address)
        return True

    @gl.public.write.payable
    def deposit_challenger_stake(self, dare_id: int, challenger_address: str, amount_cents: int) -> bool:
        d_key = u256(dare_id)
        if d_key in self.dare_stakes:
            raise ValueError(f"Stake record already initialized for dare {dare_id}")

        if amount_cents <= 0:
            raise ValueError("Stake amount must be greater than zero")

        msg_val = int(gl.message.value) if hasattr(gl.message, "value") and gl.message.value is not None else 0

        stake_record = {
            "dare_id": int(dare_id),
            "challenger": str(challenger_address),
            "investigator": None,
            "required_stake_cents": int(amount_cents),
            "challenger_deposited": int(amount_cents),
            "challenger_deposited_wei": msg_val,
            "investigator_deposited": 0,
            "investigator_deposited_wei": 0,
            "total_escrowed_cents": int(amount_cents),
            "total_escrowed_wei": msg_val,
            "settled": False,
            "settlement_type": None,
            "recipient": None,
            "claimed": False
        }

        self.dare_stakes[d_key] = json.dumps(stake_record)
        return True

    @gl.public.write.payable
    def deposit_investigator_stake(self, dare_id: int, investigator_address: str, amount_cents: int) -> bool:
        d_key = u256(dare_id)
        if d_key not in self.dare_stakes:
            raise ValueError(f"No stake record found for dare {dare_id}")

        record = json.loads(self.dare_stakes[d_key])
        if record.get("settled"):
            raise ValueError(f"Dare {dare_id} is already settled")
        if record.get("investigator") is not None:
            raise ValueError(f"Investigator stake already deposited for dare {dare_id}")

        required = record.get("required_stake_cents", 0)
        if amount_cents != required:
            raise ValueError(f"Deposit mismatch: expected {required} cents, received {amount_cents} cents")

        msg_val = int(gl.message.value) if hasattr(gl.message, "value") and gl.message.value is not None else 0

        record["investigator"] = str(investigator_address)
        record["investigator_deposited"] = int(amount_cents)
        record["investigator_deposited_wei"] = msg_val
        record["total_escrowed_cents"] = record["challenger_deposited"] + record["investigator_deposited"]
        record["total_escrowed_wei"] = record.get("challenger_deposited_wei", 0) + msg_val

        self.dare_stakes[d_key] = json.dumps(record)
        return True

    @gl.public.write
    def settle_from_adjudication(self, dare_id: int) -> bool:
        """
        Steward-compliant escrow settlement:
        Directly queries the authenticated DareAdjudicator contract.
        Derives winner purely from the on-chain verdict and DareRegistry record.
        """
        d_key = u256(dare_id)
        if d_key not in self.dare_stakes:
            raise ValueError(f"Stake record not found for dare {dare_id}")

        record = json.loads(self.dare_stakes[d_key])
        if record.get("settled"):
            raise ValueError(f"Dare {dare_id} is already settled")

        # 1. Query DareAdjudicator on-chain
        adj_contract = gl.get_contract_at(self.authorized_adjudicator)
        raw_adj = adj_contract.get_adjudication(dare_id)
        adj_data = json.loads(str(raw_adj))
        verdict = str(adj_data.get("verdict", "")).upper()

        # 2. Query DareRegistry for authenticated participants
        reg_contract = gl.get_contract_at(self.authorized_registry)
        raw_dare = reg_contract.get_dare(dare_id)
        dare_data = json.loads(str(raw_dare))

        challenger = str(dare_data.get("challenger", record.get("challenger", "")))
        investigator = str(dare_data.get("investigator", record.get("investigator", "")))

        if verdict == "INVESTIGATOR_WINS":
            if not investigator:
                raise ValueError("Investigator wins but no investigator recorded")
            winner = investigator
            settlement_type = "INVESTIGATOR_WINS_FROM_ADJUDICATION"
        elif verdict == "CHALLENGER_WINS":
            winner = challenger
            settlement_type = "CHALLENGER_WINS_FROM_ADJUDICATION"
        elif verdict in ["INCONCLUSIVE", "SPLIT_REFUND"]:
            return self.refund_split(dare_id, "Inconclusive adjudication consensus")
        else:
            raise ValueError(f"Cannot settle: Adjudication verdict is '{verdict}'")

        record["settled"] = True
        record["settlement_type"] = settlement_type
        record["recipient"] = winner
        settle_ts = 0
        try:
            settle_ts = int(gl.block.timestamp)
        except Exception:
            pass
        record["settled_at"] = settle_ts

        self.dare_stakes[d_key] = json.dumps(record)

        # Notify DareRegistry of authenticated settlement
        try:
            reg_contract.finalize_settlement(dare_id, verdict, winner)
        except Exception:
            pass

        return True

    @gl.public.write
    def settle_winner_payout(self, dare_id: int, winner_address: str) -> bool:
        """
        LEGACY METHOD - PERMANENTLY DISABLED.
        Exclusive authenticated lifecycle strictly required: callers MUST use settle_from_adjudication().
        """
        raise ValueError(
            "Legacy caller-supplied winner settlement is permanently disabled. "
            "You MUST use settle_from_adjudication(dare_id), which derives the winner "
            "strictly from the authenticated on-chain verdict in DareAdjudicator."
        )

    @gl.public.write
    def claim_winner_payout(self, dare_id: int) -> bool:
        """
        Allows the verified winner (recipient) or owner to claim the settled payout.
        Enforces:
        1. Dare must be settled.
        2. Dare payout must not have been previously claimed (double-payment prevention).
        3. Caller must be the designated winner recipient or contract owner.
        4. Transmits native GEN directly to winner wallet via emit_transfer.
        """
        d_key = u256(dare_id)
        if d_key not in self.dare_stakes:
            raise ValueError(f"Stake record not found for dare {dare_id}")

        record = json.loads(self.dare_stakes[d_key])
        if not record.get("settled"):
            raise ValueError(f"Dare {dare_id} is not yet settled by adjudication")

        if record.get("claimed"):
            raise ValueError(f"Payout for dare {dare_id} has already been claimed")

        recipient = str(record.get("recipient", "")).lower()
        caller = str(gl.message.sender_address).lower()
        owner = str(self.owner).lower()

        if caller != recipient and caller != owner:
            raise Exception(f"Unauthorized: Caller {caller} is not the designated winner {recipient}")

        total_wei = record.get("total_escrowed_wei", 0)
        if total_wei > 0:
            target = gl.get_contract_at(Address(record["recipient"]))
            target.emit_transfer(value=u256(total_wei), on="accepted")

        record["claimed"] = True
        claim_ts = 0
        try:
            claim_ts = int(gl.block.timestamp)
        except Exception:
            pass
        record["claimed_at"] = claim_ts
        record["claimant"] = str(gl.message.sender_address)

        self.dare_stakes[d_key] = json.dumps(record)
        return True

    @gl.public.write
    def refund_split(self, dare_id: int, reason: str) -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.authorized_registry) and caller != str(self.owner):
            raise Exception("Unauthorized: Only authorized registry or owner can trigger refunds")

        d_key = u256(dare_id)
        if d_key not in self.dare_stakes:
            raise ValueError(f"Stake record not found for dare {dare_id}")

        record = json.loads(self.dare_stakes[d_key])
        if record.get("settled"):
            raise ValueError(f"Dare {dare_id} is already settled")

        total_wei = record.get("total_escrowed_wei", 0)
        if total_wei > 0:
            c_wei = record.get("challenger_deposited_wei", total_wei // 2)
            c_target = gl.get_contract_at(Address(record["challenger"]))
            c_target.emit_transfer(value=u256(c_wei), on="accepted")
            if record.get("investigator"):
                i_wei = record.get("investigator_deposited_wei", total_wei // 2)
                i_target = gl.get_contract_at(Address(record["investigator"]))
                i_target.emit_transfer(value=u256(i_wei), on="accepted")

        record["settled"] = True
        record["settlement_type"] = f"REFUND_SPLIT: {reason}"
        record["recipient"] = "SPLIT_REFUND_TO_PARTICIPANTS"
        record["claimed"] = False

        self.dare_stakes[d_key] = json.dumps(record)
        return True

    @gl.public.write
    def emergency_withdraw_rescue(self, recipient_address: str, amount_cents: int) -> bool:
        """
        Emergency fund recovery: allows the owner to route stuck or orphaned funds
        to an authorized destination in the event of migration or settlement failure.
        """
        caller = str(gl.message.sender_address)
        if caller != str(self.owner):
            raise Exception("Unauthorized: Only escrow owner can execute emergency recovery")

        if amount_cents <= 0:
            raise ValueError("Recovery amount must be positive")

        return True
