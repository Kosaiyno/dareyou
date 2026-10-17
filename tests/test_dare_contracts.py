"""
Unit & Integration tests for DareYou Smart Contract suite:
- DareRegistry
- StakeEscrow
- EvidenceRegistry
- DareAdjudicator
- AgentReputation
- End-to-End Duel Lifecycle
"""

import sys
import os
import json
import unittest

# --- Mock GenLayer Runtime for Local Unit Testing ---
class Address(str):
    def __repr__(self):
        return f"Address('{self}')"


class u256(int):
    def __new__(cls, val):
        return super().__new__(cls, val)


class TreeMap(dict):
    pass


class DynArray(list):
    pass


class MockMessage:
    def __init__(self):
        self.sender_address = Address("0xChallenger111111111111111111111111111111")
        self.origin_address = Address("0xChallenger111111111111111111111111111111")


class MockBlock:
    def __init__(self):
        self.timestamp = 1792000000


class MockEqPrinciple:
    def __init__(self):
        self.mock_response = None

    def prompt_non_comparative(self, get_input_fn, task="", criteria=""):
        if self.mock_response is not None:
            return self.mock_response

        user_input = get_input_fn()
        if "=== VALIDATOR-FETCHED ARCHIVAL EXCERPT ===" in user_input or "=== INVESTIGATOR EVIDENCE DOSSIER ===" in user_input or "=== INVESTIGATOR SUBMITTED EVIDENCE DOSSIER ===" in user_input:
            if "Unsubstantiated Twitter claim" in user_input or "unverified social media" in user_input:
                return json.dumps({
                    "outcome": "NOT_MET",
                    "quote_verified": False,
                    "extracted_quote": "",
                    "rationale": "Evidence relies on unverified social media rather than required official sources."
                })
            elif "Conflicting official records" in user_input:
                return json.dumps({
                    "outcome": "INSUFFICIENT_EVIDENCE",
                    "quote_verified": False,
                    "extracted_quote": "",
                    "rationale": "UEFA and national federation match sheets directly contradict on goal attribution."
                })
            else:
                return json.dumps({
                    "outcome": "MET",
                    "quote_verified": True,
                    "extracted_quote": "Official UEFA match report confirms goals were scored by Bernardo Silva and Akanji.",
                    "rationale": "Investigator supplied authoritative official match report proving the claim."
                })

        # Challenge Qualification prompt (dare_qualifier.py)
        if "messi" in user_input.lower():
            return json.dumps({
                "decision": "REJECTED",
                "observable_criteria": False,
                "immutable_source_feasible": True,
                "rationale": "Trivial, widely known historical fact requiring no investigative research synthesis."
            })
        elif "mbappe" in user_input.lower() or "hat-trick" in user_input.lower():
            return json.dumps({
                "decision": "REJECTED",
                "observable_criteria": False,
                "immutable_source_feasible": False,
                "rationale": "Explicitly excluded: predictive future event rather than historical factual investigation."
            })
        elif "ronaldo" in user_input.lower() or "pele" in user_input.lower():
            return json.dumps({
                "decision": "REJECTED",
                "observable_criteria": False,
                "immutable_source_feasible": False,
                "rationale": "Explicitly excluded: subjective opinion poll with unobservable, non-factual criteria."
            })
        elif "secret unreleased private audio" in user_input.lower() or "audio" in user_input.lower():
            return json.dumps({
                "decision": "REJECTED",
                "observable_criteria": False,
                "immutable_source_feasible": False,
                "rationale": "Impossible task: relies on non-existent, unobservable private material."
            })
        elif "haaland" in user_input.lower():
            return json.dumps({
                "decision": "APPROVED",
                "observable_criteria": True,
                "immutable_source_feasible": True,
                "rationale": "Genuine factual inquiry requiring cross-referencing UEFA official match sheets and broadcast logs."
            })
        elif "sneijder" in user_input.lower() or "felipe melo" in user_input.lower():
            return json.dumps({
                "decision": "APPROVED",
                "observable_criteria": True,
                "immutable_source_feasible": True,
                "rationale": "Exemplary conflicting-source challenge requiring reconciliation of amended FIFA technical dispatches."
            })
        elif "medina cantalejo" in user_input.lower():
            return json.dumps({
                "decision": "APPROVED",
                "observable_criteria": True,
                "immutable_source_feasible": True,
                "rationale": "High-depth evidence synthesis combining referee statements and disciplinary committee publications."
            })
        else:
            return json.dumps({
                "decision": "APPROVED",
                "observable_criteria": True,
                "immutable_source_feasible": True,
                "rationale": "Meets research qualification criteria."
            })


class MockContract:
    def __new__(cls, *args, **kwargs):
        obj = super().__new__(cls)
        # Auto-initialize storage containers
        obj.dares = TreeMap()
        obj.dare_counter = u256(0)
        obj.dare_stakes = TreeMap()
        obj.evidence_dossiers = TreeMap()
        obj.adjudication_records = TreeMap()
        obj.agent_profiles = TreeMap()
        return obj


class MockPublicWrite:
    @staticmethod
    def payable(f):
        return f

    def __call__(self, f):
        return f


class MockPublic:
    @staticmethod
    def view(f):
        return f

    write = MockPublicWrite()


class MockWeb:
    def render(self, url, mode="text"):
        return (
            "Official UEFA match report confirms goals were scored by Bernardo Silva and Akanji. "
            "Official FIFA match report confirms Zidane sent off in 110th minute (direct red card). "
            "Historical matches and disciplinary records archive."
        )


class MockNonDet:
    def __init__(self):
        self.web = MockWeb()


class MockGLModule:
    def __init__(self):
        self.Contract = MockContract
        self.message = MockMessage()
        self.block = MockBlock()
        self.eq_principle = MockEqPrinciple()
        self.public = MockPublic()
        self.nondet = MockNonDet()

    def get_contract_at(self, addr):
        class MockTarget:
            def emit_transfer(self, value=0, on="accepted"):
                pass
        return MockTarget()


# Register mocks in sys.modules
if "genlayer" in sys.modules:
    genlayer_mock = sys.modules["genlayer"]
    mock_gl = genlayer_mock.gl
    if not hasattr(mock_gl, "nondet"):
        mock_gl.nondet = MockNonDet()
    mock_gl.eq_principle = MockEqPrinciple()
else:
    mock_gl = MockGLModule()
    genlayer_mock = type(sys)("genlayer")
    genlayer_mock.gl = mock_gl
    genlayer_mock.Address = Address
    genlayer_mock.u256 = u256
    genlayer_mock.TreeMap = TreeMap
    genlayer_mock.DynArray = DynArray
    sys.modules["genlayer"] = genlayer_mock

# Add contracts path to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "contracts")))
from dare_registry import DareRegistry
from stake_escrow import StakeEscrow
from evidence_registry import EvidenceRegistry
from dare_adjudicator import DareAdjudicator
from agent_reputation import AgentReputation


class TestDareYouContracts(unittest.TestCase):
    def setUp(self):
        self.challenger = "0xChallenger111111111111111111111111111111"
        self.investigator = "0xInvestigator2222222222222222222222222222"
        self.intruder = "0xIntruder99999999999999999999999999999999"

        mock_gl.message.sender_address = Address(self.challenger)
        mock_gl.block.timestamp = 1792000000
        mock_gl.eq_principle.mock_response = None

        self.registry = DareRegistry()
        self.escrow = StakeEscrow()
        self.evidence = EvidenceRegistry()
        self.adjudicator = DareAdjudicator()
        self.reputation = AgentReputation()

        # Wire up authorized contracts
        self.registry.set_authorized_modules(
            adjudicator=str(Address("0xAdjudicatorContract")),
            escrow=str(Address("0xEscrowContract"))
        )
        self.escrow.set_authorized_registry(str(Address("0xRegistryContract")))
        self.evidence.set_authorized_registry(str(Address("0xRegistryContract")))
        self.reputation.set_authorized_registry(str(Address("0xRegistryContract")))

    def test_dare_creation_and_validations(self):
        did = self.registry.create_dare(
            title="Did Haaland score with right foot in 2023 UCL semi-final 2nd leg?",
            category="MATCH_FACTS",
            claim_statement="Erling Haaland scored with his right foot during the match.",
            required_sources_desc="Official UEFA match report and BBC Sport match feed.",
            evaluation_criteria="Prove whether goal #2 was scored with right foot, left foot, or header.",
            stake_amount_cents=1000,
            duration_seconds=3600
        )
        self.assertEqual(int(did), 1)
        self.assertEqual(self.registry.get_dare_status(1), "OPEN")

        dare = json.loads(self.registry.get_dare(1))
        self.assertEqual(dare["challenger"], self.challenger)
        self.assertEqual(dare["stake_amount_cents"], 1000)

        # Validations: invalid category
        with self.assertRaises(ValueError):
            self.registry.create_dare("T", "INVALID_CAT", "C", "S", "E", 1000, 3600)

        # Zero stake
        with self.assertRaises(ValueError):
            self.registry.create_dare("T", "MATCH_FACTS", "C", "S", "E", 0, 3600)

        # Short duration
        with self.assertRaises(ValueError):
            self.registry.create_dare("T", "MATCH_FACTS", "C", "S", "E", 1000, 100)

    def test_dare_acceptance_and_self_accept_rejection(self):
        self.registry.create_dare("T", "MATCH_FACTS", "C", "S", "E", 1000, 3600)

        # Challenger cannot accept their own dare
        with self.assertRaises(ValueError):
            self.registry.accept_dare(1)

        # Investigator accepts
        mock_gl.message.sender_address = Address(self.investigator)
        self.assertTrue(self.registry.accept_dare(1))
        self.assertEqual(self.registry.get_dare_status(1), "ACCEPTED")

        dare = json.loads(self.registry.get_dare(1))
        self.assertEqual(dare["investigator"], self.investigator)
        self.assertEqual(dare["submission_deadline_ts"], 1792000000 + 3600)

    def test_escrow_staking_and_payout(self):
        # Challenger locks 1000 cents
        self.escrow.deposit_challenger_stake(1, self.challenger, 1000)
        s_info = json.loads(self.escrow.get_stake_info(1))
        self.assertEqual(s_info["total_escrowed_cents"], 1000)

        # Investigator matches 1000 cents
        self.escrow.deposit_investigator_stake(1, self.investigator, 1000)
        s_info = json.loads(self.escrow.get_stake_info(1))
        self.assertEqual(s_info["total_escrowed_cents"], 2000)

        # Non-matching deposit rejected
        with self.assertRaises(ValueError):
            self.escrow.deposit_investigator_stake(2, self.investigator, 500)

        # Settle winner (authorized)
        mock_gl.message.sender_address = Address(self.challenger)  # owner
        self.escrow.settle_winner_payout(1, self.investigator)
        s_info = json.loads(self.escrow.get_stake_info(1))
        self.assertTrue(s_info["settled"])
        self.assertEqual(s_info["recipient"], self.investigator)

        # Double settlement rejected
        with self.assertRaises(ValueError):
            self.escrow.settle_winner_payout(1, self.investigator)

        # Unauthorized claimant rejected
        mock_gl.message.sender_address = Address(self.intruder)
        with self.assertRaises(Exception):
            self.escrow.claim_winner_payout(1)

        # Designated winner claims payout
        mock_gl.message.sender_address = Address(self.investigator)
        self.assertTrue(self.escrow.claim_winner_payout(1))
        s_info = json.loads(self.escrow.get_stake_info(1))
        self.assertTrue(s_info["claimed"])
        self.assertEqual(s_info["claimant"], self.investigator)

        # Double-claim rejected (double-payout protection)
        with self.assertRaises(ValueError):
            self.escrow.claim_winner_payout(1)

        # Emergency recovery: intruder rejected, owner permitted
        mock_gl.message.sender_address = Address(self.intruder)
        with self.assertRaises(Exception):
            self.escrow.emergency_withdraw_rescue(self.intruder, 1000)

        mock_gl.message.sender_address = Address(self.challenger)  # owner
        self.assertTrue(self.escrow.emergency_withdraw_rescue(self.challenger, 1000))

    def test_evidence_submission_and_immutability(self):
        self.evidence.submit_evidence(
            dare_id=1,
            investigator_address=self.investigator,
            conclusion="CLAIM_REFUTED",
            primary_source_url="https://uefa.com/match/2023-semi",
            secondary_source_url="https://bbc.com/sport/football",
            verbatim_quotes="Official UEFA match report confirms Bernardo Silva scored goals 1 & 2; Haaland did not score.",
            reasoning_defense="Primary official source contradicts the premise of the claim entirely."
        )
        self.assertTrue(self.evidence.has_evidence(1))
        ev = json.loads(self.evidence.get_evidence(1))
        self.assertEqual(ev["conclusion"], "CLAIM_REFUTED")
        self.assertTrue(ev["is_frozen"])

        # Cannot submit twice
        with self.assertRaises(ValueError):
            self.evidence.submit_evidence(1, self.investigator, "X", "url", "", "Q", "R")

    def test_dare_adjudication_investigator_wins(self):
        res = self.adjudicator.adjudicate_evidence(
            dare_id=1,
            title="Did Haaland score with right foot?",
            category="MATCH_FACTS",
            claim_statement="Erling Haaland scored with right foot.",
            required_sources_desc="UEFA official match report.",
            evaluation_criteria="Prove if claim is true or false with match report.",
            conclusion="CLAIM_REFUTED",
            primary_source_url="https://uefa.com",
            secondary_source_url="https://bbc.com",
            verbatim_quotes="Official UEFA match report confirms goals were scored by Bernardo Silva and Akanji.",
            reasoning_defense="Player did not register a goal in this fixture."
        )
        parsed = json.loads(res)
        self.assertEqual(parsed["verdict"], "INVESTIGATOR_WINS")
        self.assertTrue(parsed["quote_verified"])
        self.assertEqual(parsed["consequence"], "RELEASE_ESCROW_TO_INVESTIGATOR")

    def test_dare_adjudication_empty_quotes_rejection(self):
        res = self.adjudicator.adjudicate_evidence(
            dare_id=2,
            title="Title",
            category="MATCH_FACTS",
            claim_statement="Claim",
            required_sources_desc="Sources",
            evaluation_criteria="Criteria",
            conclusion="Win",
            primary_source_url="https://source.com",
            secondary_source_url="",
            verbatim_quotes="",  # Empty quotes
            reasoning_defense="Trust me bro"
        )
        parsed = json.loads(res)
        self.assertEqual(parsed["verdict"], "CHALLENGER_WINS")
        self.assertFalse(parsed["quote_verified"])
        self.assertEqual(parsed["consequence"], "FORFEIT_ESCROW_TO_CHALLENGER")

    def test_forfeit_timeout_mechanism(self):
        self.registry.create_dare("T", "MATCH_FACTS", "C", "S", "E", 1000, 3600)
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)

        # Before deadline, timeout fails
        mock_gl.block.timestamp = 1792001000
        with self.assertRaises(ValueError):
            self.registry.claim_timeout_forfeit(1)

        # After deadline expires (1792000000 + 3600 = 1792003600)
        mock_gl.block.timestamp = 1792005000
        mock_gl.message.sender_address = Address(self.challenger)
        self.registry.claim_timeout_forfeit(1)
        self.assertEqual(self.registry.get_dare_status(1), "FINALIZED")

        dare = json.loads(self.registry.get_dare(1))
        self.assertEqual(dare["verdict"], "FORFEIT_TIMEOUT")
        self.assertEqual(dare["winner"], self.challenger)

    def test_agent_reputation_tracking(self):
        mock_gl.message.sender_address = Address(self.challenger)  # owner
        self.reputation.record_outcome(
            winner_address=self.investigator,
            loser_address=self.challenger,
            stake_cents=1000,
            is_forfeit=False
        )
        win_prof = json.loads(self.reputation.get_agent_profile(self.investigator))
        self.assertEqual(win_prof["wins"], 1)
        self.assertEqual(win_prof["win_rate_percent"], 100)

        lose_prof = json.loads(self.reputation.get_agent_profile(self.challenger))
        self.assertEqual(lose_prof["losses"], 1)
        self.assertEqual(lose_prof["win_rate_percent"], 0)

    def test_full_end_to_end_duel_flow(self):
        # 1. Challenger creates dare
        mock_gl.message.sender_address = Address(self.challenger)
        did = self.registry.create_dare(
            title="Was Zidane sent off in 2006 World Cup Final?",
            category="DISCIPLINARY",
            claim_statement="Zinedine Zidane received a direct red card in the 2006 final.",
            required_sources_desc="FIFA official match report and official match video log.",
            evaluation_criteria="Verify whether the card was yellow-to-red or direct red, and minute.",
            stake_amount_cents=2500,
            duration_seconds=7200
        )
        self.escrow.deposit_challenger_stake(1, self.challenger, 2500)
        self.assertEqual(self.registry.get_dare_status(1), "OPEN")

        # 2. Investigator accepts and stakes
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)
        self.escrow.deposit_investigator_stake(1, self.investigator, 2500)
        self.assertEqual(self.registry.get_dare_status(1), "ACCEPTED")

        # 3. Investigator submits evidence
        self.evidence.submit_evidence(
            dare_id=1,
            investigator_address=self.investigator,
            conclusion="CLAIM_VERIFIED_TRUE",
            primary_source_url="https://fifa.com/worldcup/archive/2006/match/974",
            secondary_source_url="https://theguardian.com/football/2006/jul/09/worldcup2006",
            verbatim_quotes="Official FIFA match report confirms Zidane sent off in 110th minute (direct red card).",
            reasoning_defense="Both FIFA official log and independent media confirm exact minute and direct dismissal."
        )
        self.registry.mark_submitted(1)
        self.assertEqual(self.registry.get_dare_status(1), "SUBMITTED")

        # 4. Adjudication by GenLayer validators
        adj_json = self.adjudicator.adjudicate_evidence(
            dare_id=1,
            title="Was Zidane sent off in 2006 World Cup Final?",
            category="DISCIPLINARY",
            claim_statement="Zinedine Zidane received a direct red card in the 2006 final.",
            required_sources_desc="FIFA official match report.",
            evaluation_criteria="Verify whether the card was yellow-to-red or direct red.",
            conclusion="CLAIM_VERIFIED_TRUE",
            primary_source_url="https://fifa.com/worldcup/archive/2006/match/974",
            secondary_source_url="https://theguardian.com",
            verbatim_quotes="Official UEFA match report confirms Zidane sent off in 110th minute.",
            reasoning_defense="Dismissal verified."
        )
        adj = json.loads(adj_json)
        self.assertEqual(adj["verdict"], "INVESTIGATOR_WINS")

        # 5. Settlement & finality
        mock_gl.message.sender_address = Address(self.challenger)  # owner
        self.registry.finalize_adjudication(1, "INVESTIGATOR_WINS", self.investigator)
        self.escrow.settle_winner_payout(1, self.investigator)
        self.reputation.record_outcome(self.investigator, self.challenger, 2500, False)

        # Check final states
        self.assertEqual(self.registry.get_dare_status(1), "FINALIZED")
        s_info = json.loads(self.escrow.get_stake_info(1))
        self.assertTrue(s_info["settled"])
        self.assertEqual(s_info["recipient"], self.investigator)


if __name__ == "__main__":
    unittest.main()
