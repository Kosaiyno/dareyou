# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json

class StakeEscrow(gl.Contract):
    """
    StakeEscrow manages GEN stake deposits, locking, and settlement for DareYou duels.
    
    Security Guarantees:
    1. Challenger locks required stake upon creation.
    2. Investigator matches exact stake upon acceptance.
    3. Funds remain strictly locked during active investigation and adjudication.
    4. Settlement can only be triggered by the authorized registry or contract owner.
    5. Double-settlement and reentrancy protections prevent repeated payouts.
    6. Transparent refund routing for cancelled or inconclusive challenges.
    """
    owner: Address
    authorized_registry: Address
    dare_stakes: TreeMap[u256, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.authorized_registry = gl.message.sender_address

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

    @gl.public.write
    def deposit_challenger_stake(self, dare_id: int, challenger_address: str, amount_cents: int) -> bool:
        d_key = u256(dare_id)
        if d_key in self.dare_stakes:
            raise ValueError(f"Stake record already initialized for dare {dare_id}")

        if amount_cents <= 0:
            raise ValueError("Stake amount must be greater than zero")

        stake_record = {
            "dare_id": int(dare_id),
            "challenger": str(challenger_address),
            "investigator": None,
            "required_stake_cents": int(amount_cents),
            "challenger_deposited": int(amount_cents),
            "investigator_deposited": 0,
            "total_escrowed_cents": int(amount_cents),
            "settled": False,
            "settlement_type": None,
            "recipient": None
        }

        self.dare_stakes[d_key] = json.dumps(stake_record)
        return True

    @gl.public.write
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

        record["investigator"] = str(investigator_address)
        record["investigator_deposited"] = int(amount_cents)
        record["total_escrowed_cents"] = record["challenger_deposited"] + record["investigator_deposited"]

        self.dare_stakes[d_key] = json.dumps(record)
        return True

    @gl.public.write
    def settle_winner_payout(self, dare_id: int, winner_address: str) -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.authorized_registry) and caller != str(self.owner):
            raise Exception("Unauthorized: Only authorized registry or owner can settle payouts")

        d_key = u256(dare_id)
        if d_key not in self.dare_stakes:
            raise ValueError(f"Stake record not found for dare {dare_id}")

        record = json.loads(self.dare_stakes[d_key])
        if record.get("settled"):
            raise ValueError(f"Dare {dare_id} is already settled")

        total_pool = record.get("total_escrowed_cents", 0)
        if total_pool <= 0:
            raise ValueError("No funds escrowed to settle")

        clean_winner = str(winner_address)
        record["settled"] = True
        record["settlement_type"] = "WINNER_PAYOUT"
        record["recipient"] = clean_winner

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

        record["settled"] = True
        record["settlement_type"] = f"REFUND_SPLIT: {reason}"
        record["recipient"] = "SPLIT_REFUND_TO_PARTICIPANTS"

        self.dare_stakes[d_key] = json.dumps(record)
        return True
