# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json

class AgentReputation(gl.Contract):
    """
    AgentReputation maintains on-chain track records of AI agents competing in DareYou.
    
    Responsibilities:
    1. Records authorized duel outcomes (wins, losses, forfeits).
    2. Tracks volume staked and calculated win rates.
    3. Exposes public reputation profiles for autonomous agents to inspect before accepting dares.
    """
    owner: Address
    authorized_registry: Address
    agent_profiles: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.authorized_registry = gl.message.sender_address

    @gl.public.view
    def get_agent_profile(self, agent_address: str) -> str:
        clean_addr = str(agent_address)
        if clean_addr in self.agent_profiles:
            return str(self.agent_profiles[clean_addr])
        return json.dumps({
            "agent_address": clean_addr,
            "wins": 0,
            "losses": 0,
            "forfeits": 0,
            "total_duels": 0,
            "total_staked_cents": 0,
            "win_rate_percent": 0
        })

    @gl.public.write
    def set_authorized_registry(self, registry_address: str) -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.owner):
            raise Exception("Unauthorized: Only owner can set authorized registry")
        self.authorized_registry = Address(registry_address)
        return True

    @gl.public.write
    def record_outcome(
        self,
        winner_address: str,
        loser_address: str,
        stake_cents: int,
        is_forfeit: bool
    ) -> bool:
        caller = str(gl.message.sender_address)
        if caller != str(self.authorized_registry) and caller != str(self.owner):
            raise Exception("Unauthorized: Only registry or owner can update reputation")

        win_addr = str(winner_address)
        lose_addr = str(loser_address)

        # Update winner
        win_profile = {
            "agent_address": win_addr,
            "wins": 0,
            "losses": 0,
            "forfeits": 0,
            "total_duels": 0,
            "total_staked_cents": 0,
            "win_rate_percent": 0
        }
        if win_addr in self.agent_profiles:
            try:
                win_profile = json.loads(self.agent_profiles[win_addr])
            except Exception:
                pass

        win_profile["wins"] += 1
        win_profile["total_duels"] += 1
        win_profile["total_staked_cents"] += int(stake_cents)
        win_profile["win_rate_percent"] = int((win_profile["wins"] / win_profile["total_duels"]) * 100)
        self.agent_profiles[win_addr] = json.dumps(win_profile)

        # Update loser
        lose_profile = {
            "agent_address": lose_addr,
            "wins": 0,
            "losses": 0,
            "forfeits": 0,
            "total_duels": 0,
            "total_staked_cents": 0,
            "win_rate_percent": 0
        }
        if lose_addr in self.agent_profiles:
            try:
                lose_profile = json.loads(self.agent_profiles[lose_addr])
            except Exception:
                pass

        lose_profile["losses"] += 1
        if is_forfeit:
            lose_profile["forfeits"] += 1
        lose_profile["total_duels"] += 1
        lose_profile["total_staked_cents"] += int(stake_cents)
        lose_profile["win_rate_percent"] = int((lose_profile["wins"] / lose_profile["total_duels"]) * 100)
        self.agent_profiles[lose_addr] = json.dumps(lose_profile)

        return True
