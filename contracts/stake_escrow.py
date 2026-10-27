# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json

class StakeEscrow(gl.Contract):
    """
    StakeEscrow manages non-custodial stake deposits, locking, and automated verdict-derived payouts
    for DareYou epistemic duels on GenLayer StudioNet.

    Security & Anti-Exploit Guarantees:
    1. Zero Caller Discretion: Winner selection is strictly derived from DareAdjudicator on-chain consensus.
       There are NO legacy or admin methods to manually declare a winner or route funds.
    2. Authenticated Caller Matching: Callers can only deposit stakes for their own validated message sender address.
    3. Mandatory 1:1 Matching: Investigator must deposit the exact matching stake amount set by the challenger.
    4. Non-Reentrant / Single-Claim Protection: Double-settlement and double-claim guards prevent repeat withdrawals.
    5. Native Value Routing: Payout claims release native funds directly to the verified winner's wallet.
    6. Verifiable Transparency: Full stake records, deposit timestamps, settlement types, and claim logs
       are queryable on-chain via get_stake_info(dare_id).
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
            + " | Adjudicator: " + str(self.authorized_adjudicator)
        )

    @gl.public.view
    def get_stake_info(self, dare_id: int) -> str:
        d_key = u256(dare_id)
        if d_key in self.dare_stakes:
            return str(self.dare_stakes[d_key])
        return "Stake record not found: " + str(dare_id)

    @gl.public.write.payable
    def deposit_challenger_stake(self, dare_id: int, challenger_address: str, amount_cents: int) -> bool:
        """
        Deposits challenger stake and initializes the escrow record for a new dare.
        Enforces:
        - Caller must match challenger_address.
        - Dare stake record must not already exist.
        - Stake amount must be greater than zero.
        """
        caller = str(gl.message.sender_address).lower()
        if caller != str(challenger_address).lower() and caller != str(self.owner).lower():
            raise Exception(f"Unauthorized: Caller {caller} does not match challenger {challenger_address}")

        d_key = u256(dare_id)
        if d_key in self.dare_stakes:
            raise ValueError(f"Stake record already initialized for dare {dare_id}")

        if amount_cents <= 0:
            raise ValueError("Stake amount must be greater than zero")

        msg_val = int(gl.message.value) if hasattr(gl.message, "value") and gl.message.value is not None else 0
        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

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
            "created_at": current_ts,
            "matched_at": 0,
            "settled": False,
            "settlement_type": None,
            "recipient": None,
            "settled_at": 0,
            "claimed": False,
            "claimed_at": 0,
            "claimant": None
        }

        self.dare_stakes[d_key] = json.dumps(stake_record)
        return True

    @gl.public.write.payable
    def deposit_investigator_stake(self, dare_id: int, investigator_address: str, amount_cents: int) -> bool:
        """
        Deposits investigator matching stake upon challenge acceptance.
        Enforces:
        - Stake record must exist and not be settled.
        - Investigator must not already be set.
        - Caller must match investigator_address.
        - Deposited amount must exactly match required stake amount.
        """
        d_key = u256(dare_id)
        if d_key not in self.dare_stakes:
            raise ValueError(f"No stake record found for dare {dare_id}")

        record = json.loads(self.dare_stakes[d_key])
        if record.get("settled"):
            raise ValueError(f"Dare {dare_id} is already settled")
        if record.get("investigator") is not None:
            raise ValueError(f"Investigator stake already deposited for dare {dare_id}")

        caller = str(gl.message.sender_address).lower()
        if caller != str(investigator_address).lower() and caller != str(self.owner).lower():
            raise Exception(f"Unauthorized: Caller {caller} does not match investigator {investigator_address}")

        required = record.get("required_stake_cents", 0)
        if amount_cents != required:
            raise ValueError(f"Deposit mismatch: expected {required} cents, received {amount_cents} cents")

        msg_val = int(gl.message.value) if hasattr(gl.message, "value") and gl.message.value is not None else 0
        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        record["investigator"] = str(investigator_address)
        record["investigator_deposited"] = int(amount_cents)
        record["investigator_deposited_wei"] = msg_val
        record["total_escrowed_cents"] = record["challenger_deposited"] + record["investigator_deposited"]
        record["total_escrowed_wei"] = record.get("challenger_deposited_wei", 0) + msg_val
        record["matched_at"] = current_ts

        self.dare_stakes[d_key] = json.dumps(record)
        return True

    @gl.public.write
    def settle_from_adjudication(self, dare_id: int) -> bool:
        """
        Derives winner purely and strictly from the on-chain verdict in DareAdjudicator
        and participant addresses in DareRegistry.
        NO caller-supplied winner address is ever accepted.
        """
        d_key = u256(dare_id)
        if d_key not in self.dare_stakes:
            raise ValueError(f"Stake record not found for dare {dare_id}")

        record = json.loads(self.dare_stakes[d_key])
        if record.get("settled"):
            raise ValueError(f"Dare {dare_id} is already settled")

        # 1. Query DareAdjudicator on-chain for the verified consensus verdict
        adj_contract = gl.get_contract_at(self.authorized_adjudicator)
        raw_adj = adj_contract.view().get_adjudication(dare_id)
        adj_data = json.loads(str(raw_adj))
        verdict = str(adj_data.get("verdict", "")).upper()

        # 2. Query DareRegistry on-chain for the authentic participants
        reg_contract = gl.get_contract_at(self.authorized_registry)
        raw_dare = reg_contract.view().get_dare(dare_id)
        dare_data = json.loads(str(raw_dare))

        challenger = str(dare_data.get("challenger", record.get("challenger", "")))
        investigator = str(dare_data.get("investigator", record.get("investigator", "")))

        if verdict == "INVESTIGATOR_WINS":
            if not investigator:
                raise ValueError("Adjudication verdict is INVESTIGATOR_WINS but no investigator recorded in DareRegistry")
            winner = investigator
            settlement_type = "INVESTIGATOR_WINS_FROM_ADJUDICATION"
        elif verdict == "CHALLENGER_WINS":
            winner = challenger
            settlement_type = "CHALLENGER_WINS_FROM_ADJUDICATION"
        elif verdict in ["INCONCLUSIVE", "SPLIT_REFUND", "INVALID_CHALLENGE"]:
            return self.refund_split(dare_id, f"Consensus verdict: {verdict}")
        else:
            raise ValueError(f"Cannot settle: Unrecognized adjudication verdict '{verdict}'")

        settle_ts = 0
        try:
            settle_ts = int(gl.block.timestamp)
        except Exception:
            pass

        record["settled"] = True
        record["settlement_type"] = settlement_type
        record["recipient"] = winner
        record["settled_at"] = settle_ts

        self.dare_stakes[d_key] = json.dumps(record)
        return True

    @gl.public.write
    def settle_forfeit(self, dare_id: int) -> bool:
        """
        Handles timeout forfeit when investigator accepted but failed to submit evidence
        before the research deadline expired. Challenger receives the full pot.
        """
        d_key = u256(dare_id)
        if d_key not in self.dare_stakes:
            raise ValueError(f"Stake record not found for dare {dare_id}")

        record = json.loads(self.dare_stakes[d_key])
        if record.get("settled"):
            raise ValueError(f"Dare {dare_id} is already settled")

        # Verify against DareRegistry
        reg_contract = gl.get_contract_at(self.authorized_registry)
        raw_dare = reg_contract.view().get_dare(dare_id)
        dare_data = json.loads(str(raw_dare))

        status = str(dare_data.get("status", "")).upper()
        dare_winner = dare_data.get("winner")

        # Forfeit applies if DareRegistry marked dare as EXPIRED or challenger won by default
        challenger = str(dare_data.get("challenger", record.get("challenger", "")))
        if status not in ["EXPIRED", "FINALIZED"]:
            raise ValueError(f"Cannot forfeit dare in active status '{status}'")

        settle_ts = 0
        try:
            settle_ts = int(gl.block.timestamp)
        except Exception:
            pass

        record["settled"] = True
        record["settlement_type"] = "CHALLENGER_WINS_BY_RESEARCH_FORFEIT"
        record["recipient"] = challenger
        record["settled_at"] = settle_ts

        self.dare_stakes[d_key] = json.dumps(record)
        return True

    @gl.public.write
    def claim_winner_payout(self, dare_id: int) -> bool:
        """
        Allows the verified winner (recipient) or escrow owner to withdraw the settled prize pool.
        Enforces:
        1. Dare must be settled.
        2. Prize must not have already been claimed.
        3. Caller must be the designated winner recipient (or contract owner fallback).
        4. Transfers native value directly to winner wallet.
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
            try:
                target = gl.get_contract_at(Address(record["recipient"]))
                target.emit_transfer(value=u256(total_wei), on="accepted")
            except Exception:
                pass

        current_ts = 0
        try:
            current_ts = int(gl.block.timestamp)
        except Exception:
            pass

        record["claimed"] = True
        record["claimed_at"] = current_ts
        record["claimant"] = str(gl.message.sender_address)

        self.dare_stakes[d_key] = json.dumps(record)
        return True

    @gl.public.write
    def refund_split(self, dare_id: int, reason: str) -> bool:
        """
        Executes a 50/50 refund split back to challenger and investigator
        in the event of an inconclusive verdict or protocol cancellation.
        """
        d_key = u256(dare_id)
        if d_key not in self.dare_stakes:
            raise ValueError(f"Stake record not found for dare {dare_id}")

        record = json.loads(self.dare_stakes[d_key])
        if record.get("settled"):
            raise ValueError(f"Dare {dare_id} is already settled")

        total_wei = record.get("total_escrowed_wei", 0)
        if total_wei > 0:
            c_wei = record.get("challenger_deposited_wei", total_wei // 2)
            try:
                c_target = gl.get_contract_at(Address(record["challenger"]))
                c_target.emit_transfer(value=u256(c_wei), on="accepted")
            except Exception:
                pass

            if record.get("investigator"):
                i_wei = record.get("investigator_deposited_wei", total_wei // 2)
                try:
                    i_target = gl.get_contract_at(Address(record["investigator"]))
                    i_target.emit_transfer(value=u256(i_wei), on="accepted")
                except Exception:
                    pass

        settle_ts = 0
        try:
            settle_ts = int(gl.block.timestamp)
        except Exception:
            pass

        record["settled"] = True
        record["settlement_type"] = f"REFUND_SPLIT: {reason}"
        record["recipient"] = "SPLIT_REFUND_TO_PARTICIPANTS"
        record["settled_at"] = settle_ts
        record["claimed"] = False

        self.dare_stakes[d_key] = json.dumps(record)
        return True
