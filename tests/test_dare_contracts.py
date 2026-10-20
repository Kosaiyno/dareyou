"""
Unit & Integration tests for DareYou Smart Contract suite:
- DareRegistry
- StakeEscrow
- EvidenceRegistry
- DareAdjudicator
- AgentReputation
- End-to-End Duel Lifecycle (Authenticated Flow)
- Regression Tests: Bypass Attempts
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
        self.deployed_instances = {}

    def get_contract_at(self, addr):
        addr_str = str(addr)
        if addr_str in self.deployed_instances:
            return self.deployed_instances[addr_str]
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
        reg_addr = str(Address("0xRegistryContract"))
        adj_addr = str(Address("0xAdjudicatorContract"))
        esc_addr = str(Address("0xEscrowContract"))
        ev_addr = str(Address("0xEvidenceContract"))

        mock_gl.deployed_instances[reg_addr] = self.registry
        mock_gl.deployed_instances[adj_addr] = self.adjudicator
        mock_gl.deployed_instances[esc_addr] = self.escrow
        mock_gl.deployed_instances[ev_addr] = self.evidence

        self.registry.set_authorized_modules(
            adjudicator=adj_addr,
            escrow=esc_addr
        )
        self.escrow.set_authorized_modules(
            registry_address=reg_addr,
            adjudicator_address=adj_addr
        )
        self.evidence.set_authorized_registry(reg_addr)
        self.adjudicator.set_authorized_registries(
            registry_address=reg_addr,
            evidence_address=ev_addr
        )
        self.reputation.set_authorized_registry(reg_addr)

    # ===== DARE REGISTRY TESTS =====

    def test_dare_creation_and_validations(self):
        did = self.registry.create_dare(
            title="Dare you to verify Haaland scored with right foot in 2023 UCL semi-final 2nd leg?",
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
        self.registry.create_dare("Dare you to test acceptance", "MATCH_FACTS", "C", "S", "E", 1000, 3600)

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

    def test_evidence_submission_and_immutability(self):
        # Setup: create dare, accept
        mock_gl.message.sender_address = Address(self.challenger)
        self.registry.create_dare("Dare you to test evidence", "MATCH_FACTS", "C", "S", "E", 1000, 3600)
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)

        # Submit evidence (should work - correct investigator)
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

    # ===== REGRESSION TESTS: BYPASS ATTEMPTS =====

    def test_evidence_registry_rejects_wrong_investigator(self):
        """REGRESSION: EvidenceRegistry must reject submissions from non-assigned investigator"""
        mock_gl.message.sender_address = Address(self.challenger)
        self.registry.create_dare("Dare you to test auth", "MATCH_FACTS", "C", "S", "E", 1000, 3600)
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)

        # Intruder tries to submit evidence
        mock_gl.message.sender_address = Address(self.intruder)
        with self.assertRaises(Exception) as ctx:
            self.evidence.submit_evidence(
                dare_id=1,
                investigator_address=self.intruder,
                conclusion="CLAIM_VERIFIED_TRUE",
                primary_source_url="https://fake.com",
                secondary_source_url="",
                verbatim_quotes="Fake quote",
                reasoning_defense="Fake reasoning"
            )
        self.assertIn("Unauthorized", str(ctx.exception))
        self.assertIn(self.investigator, str(ctx.exception))

    def test_evidence_registry_rejects_before_acceptance(self):
        """REGRESSION: EvidenceRegistry must reject submissions before dare is ACCEPTED"""
        mock_gl.message.sender_address = Address(self.challenger)
        self.registry.create_dare("Dare you to test timing", "MATCH_FACTS", "C", "S", "E", 1000, 3600)
        # Dare is still OPEN, not ACCEPTED

        mock_gl.message.sender_address = Address(self.investigator)
        with self.assertRaises(ValueError) as ctx:
            self.evidence.submit_evidence(
                dare_id=1,
                investigator_address=self.investigator,
                conclusion="CLAIM_VERIFIED_TRUE",
                primary_source_url="https://fake.com",
                secondary_source_url="",
                verbatim_quotes="Fake quote",
                reasoning_defense="Fake reasoning"
            )
        self.assertIn("status is 'OPEN'", str(ctx.exception))

    def test_evidence_registry_rejects_after_deadline(self):
        """REGRESSION: EvidenceRegistry must reject submissions after research deadline"""
        mock_gl.message.sender_address = Address(self.challenger)
        self.registry.create_dare("Dare you to test deadline", "MATCH_FACTS", "C", "S", "E", 1000, 3600)
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)

        # Advance time past deadline
        mock_gl.block.timestamp = 1792005000  # Past 1792003600 (created + 3600)

        mock_gl.message.sender_address = Address(self.investigator)
        with self.assertRaises(ValueError) as ctx:
            self.evidence.submit_evidence(
                dare_id=1,
                investigator_address=self.investigator,
                conclusion="CLAIM_VERIFIED_TRUE",
                primary_source_url="https://fake.com",
                secondary_source_url="",
                verbatim_quotes="Fake quote",
                reasoning_defense="Fake reasoning"
            )
        self.assertIn("deadline has elapsed", str(ctx.exception))

    def test_adjudicator_legacy_rejected_when_frozen_records_exist(self):
        """REGRESSION: Legacy adjudicate_evidence must reject when frozen records exist"""
        mock_gl.message.sender_address = Address(self.challenger)
        self.registry.create_dare("Dare you to test legacy block", "MATCH_FACTS", "C", "S", "E", 1000, 3600)
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)

        # Submit evidence (freezes records)
        self.evidence.submit_evidence(
            dare_id=1,
            investigator_address=self.investigator,
            conclusion="CLAIM_VERIFIED_TRUE",
            primary_source_url="https://uefa.com",
            secondary_source_url="",
            verbatim_quotes="Official quote",
            reasoning_defense="Reasoning"
        )
        self.registry.mark_submitted(1)

        # Try legacy adjudicate_evidence - should be rejected
        with self.assertRaises(ValueError) as ctx:
            self.adjudicator.adjudicate_evidence(
                dare_id=1,
                title="Test",
                category="MATCH_FACTS",
                claim_statement="Claim",
                required_sources_desc="Sources",
                evaluation_criteria="Criteria",
                conclusion="CLAIM_VERIFIED_TRUE",
                primary_source_url="https://uefa.com",
                secondary_source_url="",
                verbatim_quotes="Different quote",  # Different from frozen!
                reasoning_defense="Attempt to override frozen evidence"
            )
        self.assertIn("frozen evidence", str(ctx.exception).lower())
        self.assertIn("adjudicate_from_records", str(ctx.exception))

    def test_escrow_legacy_rejected_when_adjudication_exists(self):
        """REGRESSION: Legacy settle_winner_payout must reject when authenticated adjudication exists"""
        mock_gl.message.sender_address = Address(self.challenger)
        self.registry.create_dare("Dare you to test escrow legacy", "MATCH_FACTS", "C", "S", "E", 1000, 3600)
        self.escrow.deposit_challenger_stake(1, self.challenger, 1000)
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)
        self.escrow.deposit_investigator_stake(1, self.investigator, 1000)

        # Setup evidence and adjudication
        self.evidence.submit_evidence(
            dare_id=1,
            investigator_address=self.investigator,
            conclusion="CLAIM_VERIFIED_TRUE",
            primary_source_url="https://uefa.com",
            secondary_source_url="",
            verbatim_quotes="Official quote",
            reasoning_defense="Reasoning"
        )
        self.registry.mark_submitted(1)
        self.adjudicator.adjudicate_from_records(1)

        # Try legacy settle_winner_payout - should be rejected
        mock_gl.message.sender_address = Address(self.challenger)  # owner
        with self.assertRaises(ValueError) as ctx:
            self.escrow.settle_winner_payout(1, self.intruder)  # Wrong winner!
        self.assertIn("authenticated adjudication", str(ctx.exception).lower())
        self.assertIn("settle_from_adjudication", str(ctx.exception))

    def test_adjudicator_repeat_adjudication_blocked(self):
        """REGRESSION: Repeat adjudication must be blocked"""
        mock_gl.message.sender_address = Address(self.challenger)
        self.registry.create_dare("Dare you to test repeat", "MATCH_FACTS", "C", "S", "E", 1000, 3600)
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)

        self.evidence.submit_evidence(
            dare_id=1,
            investigator_address=self.investigator,
            conclusion="CLAIM_VERIFIED_TRUE",
            primary_source_url="https://uefa.com",
            secondary_source_url="",
            verbatim_quotes="Official quote",
            reasoning_defense="Reasoning"
        )
        self.registry.mark_submitted(1)

        # First adjudication
        self.adjudicator.adjudicate_from_records(1)

        # Second adjudication should fail
        with self.assertRaises(ValueError) as ctx:
            self.adjudicator.adjudicate_from_records(1)
        self.assertIn("already been adjudicated", str(ctx.exception))

    def test_escrow_double_settlement_blocked(self):
        """REGRESSION: Double settlement must be blocked"""
        mock_gl.message.sender_address = Address(self.challenger)
        self.registry.create_dare("Dare you to test double settlement", "MATCH_FACTS", "C", "S", "E", 1000, 3600)
        self.escrow.deposit_challenger_stake(1, self.challenger, 1000)
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)
        self.escrow.deposit_investigator_stake(1, self.investigator, 1000)

        self.evidence.submit_evidence(
            dare_id=1,
            investigator_address=self.investigator,
            conclusion="CLAIM_VERIFIED_TRUE",
            primary_source_url="https://uefa.com",
            secondary_source_url="",
            verbatim_quotes="Official quote",
            reasoning_defense="Reasoning"
        )
        self.registry.mark_submitted(1)
        self.adjudicator.adjudicate_from_records(1)

        mock_gl.message.sender_address = Address(self.challenger)  # owner
        self.escrow.settle_from_adjudication(1)  # First settlement

        # Second settlement should fail
        with self.assertRaises(ValueError) as ctx:
            self.escrow.settle_from_adjudication(1)
        self.assertIn("already settled", str(ctx.exception))

    # ===== AUTHENTICATED FLOW TESTS =====

    def test_authenticated_adjudication_from_records(self):
        """Test adjudicate_from_records binds to frozen DareRegistry + EvidenceRegistry"""
        mock_gl.message.sender_address = Address(self.challenger)
        self.registry.create_dare(
            title="Dare you to verify authenticated adjudication",
            category="MATCH_FACTS",
            claim_statement="Test claim",
            required_sources_desc="Test sources",
            evaluation_criteria="Test criteria",
            stake_amount_cents=1000,
            duration_seconds=3600
        )
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)

        # Freeze evidence
        self.evidence.submit_evidence(
            dare_id=1,
            investigator_address=self.investigator,
            conclusion="CLAIM_VERIFIED_TRUE",
            primary_source_url="https://uefa.com",
            secondary_source_url="",
            verbatim_quotes="Official UEFA match report confirms goals were scored by Bernardo Silva and Akanji.",
            reasoning_defense="Reasoning"
        )
        self.registry.mark_submitted(1)

        # Authenticated adjudication
        res = self.adjudicator.adjudicate_from_records(1)
        parsed = json.loads(res)
        self.assertEqual(parsed["verdict"], "INVESTIGATOR_WINS")
        self.assertTrue(parsed["quote_verified"])

    def test_authenticated_settlement_from_adjudication(self):
        """Test settle_from_adjudication derives winner from on-chain verdict"""
        mock_gl.message.sender_address = Address(self.challenger)
        self.registry.create_dare("Dare you to test settlement", "MATCH_FACTS", "C", "S", "E", 1000, 3600)
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)

        self.escrow.deposit_challenger_stake(1, self.challenger, 1000)
        self.escrow.deposit_investigator_stake(1, self.investigator, 1000)

        self.evidence.submit_evidence(
            dare_id=1,
            investigator_address=self.investigator,
            conclusion="CLAIM_VERIFIED_TRUE",
            primary_source_url="https://uefa.com",
            secondary_source_url="",
            verbatim_quotes="Official UEFA match report confirms goals were scored by Bernardo Silva and Akanji.",
            reasoning_defense="Reasoning"
        )
        self.registry.mark_submitted(1)

        # Adjudicate
        self.adjudicator.adjudicate_from_records(1)

        # Authenticated settlement
        mock_gl.message.sender_address = Address(self.challenger)  # owner
        self.escrow.settle_from_adjudication(1)

        s_info = json.loads(self.escrow.get_stake_info(1))
        self.assertTrue(s_info["settled"])
        self.assertEqual(s_info["recipient"], self.investigator)
        self.assertEqual(s_info["settlement_type"], "INVESTIGATOR_WINS_FROM_ADJUDICATION")

    # ===== FULL END-TO-END AUTHENTICATED FLOW =====

    def test_full_authenticated_duel_flow(self):
        """Complete E2E flow: Create -> Accept -> Freeze Evidence -> Adjudicate -> Settle -> Claim"""
        # 1. Challenger creates dare
        mock_gl.message.sender_address = Address(self.challenger)
        did = self.registry.create_dare(
            title="Dare you to verify Zidane sent off in 2006 World Cup Final?",
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

        # 3. Investigator submits evidence (FREEZES evidence BEFORE adjudication)
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

        # 4. Authenticated Adjudication (binds to frozen records)
        adj_json = self.adjudicator.adjudicate_from_records(1)
        adj = json.loads(adj_json)
        self.assertEqual(adj["verdict"], "INVESTIGATOR_WINS")

        # 5. Authenticated Settlement (derives winner from verdict)
        mock_gl.message.sender_address = Address(self.challenger)  # owner
        self.registry.finalize_adjudication(1, "INVESTIGATOR_WINS", self.investigator)
        self.escrow.settle_from_adjudication(1)

        # 6. Winner claims payout
        mock_gl.message.sender_address = Address(self.investigator)
        self.escrow.claim_winner_payout(1)

        # Check final states
        self.assertEqual(self.registry.get_dare_status(1), "FINALIZED")
        s_info = json.loads(self.escrow.get_stake_info(1))
        self.assertTrue(s_info["settled"])
        self.assertTrue(s_info["claimed"])
        self.assertEqual(s_info["recipient"], self.investigator)
        self.assertEqual(s_info["claimant"], self.investigator)

    # ===== LEGACY PATH TESTS (for backward compatibility) =====

    def test_legacy_adjudication_still_works_for_old_dares(self):
        """Legacy adjudicate_evidence should work when no frozen records exist"""
        res = self.adjudicator.adjudicate_evidence(
            dare_id=999,
            title="Dare you to test legacy path",
            category="MATCH_FACTS",
            claim_statement="Test claim",
            required_sources_desc="Test sources",
            evaluation_criteria="Test criteria",
            conclusion="CLAIM_VERIFIED_TRUE",
            primary_source_url="https://uefa.com",
            secondary_source_url="https://bbc.com",
            verbatim_quotes="Official UEFA match report confirms goals were scored by Bernardo Silva and Akanji.",
            reasoning_defense="Reasoning"
        )
        parsed = json.loads(res)
        self.assertEqual(parsed["verdict"], "INVESTIGATOR_WINS")
        self.assertTrue(parsed["quote_verified"])

    def test_legacy_settlement_still_works_for_old_dares(self):
        """Legacy settle_winner_payout should work when no authenticated adjudication exists"""
        self.escrow.deposit_challenger_stake(999, self.challenger, 1000)
        self.escrow.deposit_investigator_stake(999, self.investigator, 1000)

        mock_gl.message.sender_address = Address(self.challenger)  # owner
        self.escrow.settle_winner_payout(999, self.investigator)

        s_info = json.loads(self.escrow.get_stake_info(999))
        self.assertTrue(s_info["settled"])
        self.assertEqual(s_info["recipient"], self.investigator)
        self.assertEqual(s_info["settlement_type"], "WINNER_PAYOUT_LEGACY")


if __name__ == "__main__":
    unittest.main()