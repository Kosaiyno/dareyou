"""
Labelled test suite for DareYou Challenge Qualification Protocol:
Verifies DarePolicy and DareQualifier against:
1. Trivial questions disguised with verbose wording (REJECTED)
2. Future prediction-market questions (REJECTED)
3. Subjective opinion debates (REJECTED)
4. Impossible / unobservable tasks (REJECTED)
5. Research-intensive multi-source fact-finding (APPROVED)
6. Conflicting-source investigations (APPROVED)
7. Evidence synthesis inquiries (APPROVED)
8. Deterministic policy bounds and rate limits
9. Publication gate binding on DareRegistry
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
        self.sender_address = Address("0xChallengerAgent001")


class MockBlock:
    def __init__(self):
        self.timestamp = 1792100000


class MockEqPrinciple:
    def __init__(self):
        self.mock_response = None

    def prompt_non_comparative(self, get_input_fn, task="", criteria=""):
        if self.mock_response is not None:
            return self.mock_response

        user_input = get_input_fn()

        # Label 1: Trivial fact check
        if "Was Lionel Messi a player for FC Barcelona" in user_input:
            return json.dumps({
                "decision": "REJECTED",
                "depth_score": 10,
                "non_obvious": False,
                "verifiable": True,
                "rationale": "Trivial, widely known historical fact requiring no investigative research synthesis."
            })
        # Label 2: Future Prediction Market
        elif "Will Kylian Mbappe score a hat-trick in the upcoming" in user_input:
            return json.dumps({
                "decision": "REJECTED",
                "depth_score": 0,
                "non_obvious": False,
                "verifiable": False,
                "rationale": "Explicitly excluded: predictive future event rather than historical factual investigation."
            })
        # Label 3: Subjective opinion
        elif "Is Cristiano Ronaldo a better player than Pele" in user_input:
            return json.dumps({
                "decision": "REJECTED",
                "depth_score": 5,
                "non_obvious": False,
                "verifiable": False,
                "rationale": "Explicitly excluded: subjective opinion poll with unobservable, non-factual criteria."
            })
        # Label 4: Impossible task
        elif "Find secret unreleased private audio" in user_input:
            return json.dumps({
                "decision": "REJECTED",
                "depth_score": 20,
                "non_obvious": True,
                "verifiable": False,
                "rationale": "Impossible task: relies on non-existent, unobservable private material."
            })
        # Label 5: Research-intensive multi-source
        elif "Did Erling Haaland score with his right foot in the 2023 UCL semi-final" in user_input:
            return json.dumps({
                "decision": "APPROVED",
                "depth_score": 92,
                "non_obvious": True,
                "verifiable": True,
                "rationale": "Genuine factual inquiry requiring cross-referencing UEFA official match sheets and broadcast logs."
            })
        # Label 6: Conflicting-source investigation
        elif "Sneijder goal or a Felipe Melo own goal" in user_input:
            return json.dumps({
                "decision": "APPROVED",
                "depth_score": 96,
                "non_obvious": True,
                "verifiable": True,
                "rationale": "Exemplary conflicting-source challenge requiring reconciliation of amended FIFA technical dispatches."
            })
        # Label 7: Evidence synthesis
        elif "Medina Cantalejo via electronic communication" in user_input:
            return json.dumps({
                "decision": "APPROVED",
                "depth_score": 95,
                "non_obvious": True,
                "verifiable": True,
                "rationale": "High-depth evidence synthesis combining referee statements and disciplinary committee publications."
            })
        else:
            return json.dumps({
                "decision": "APPROVED",
                "depth_score": 90,
                "non_obvious": True,
                "verifiable": True,
                "rationale": "Meets research qualification criteria."
            })


class MockContract:
    def __new__(cls, *args, **kwargs):
        obj = super().__new__(cls)
        obj.active_dares_per_challenger = TreeMap()
        obj.policy_version = u256(1)
        obj.qualification_records = TreeMap()
        obj.dares = TreeMap()
        obj.dare_counter = u256(0)
        return obj


class MockPublic:
    @staticmethod
    def view(f):
        return f

    @staticmethod
    def write(f):
        return f


class MockGLModule:
    def __init__(self):
        self.Contract = MockContract
        self.message = MockMessage()
        self.block = MockBlock()
        self.eq_principle = MockEqPrinciple()
        self.public = MockPublic()


# Register mocks in sys.modules
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
from dare_policy import DarePolicy
from dare_qualifier import DareQualifier
from dare_registry import DareRegistry


class TestChallengeQualificationProtocol(unittest.TestCase):
    def setUp(self):
        self.challenger = "0xChallengerAgent001"
        self.investigator = "0xInvestigatorAgent002"
        mock_gl.message.sender_address = Address(self.challenger)
        mock_gl.block.timestamp = 1792100000
        mock_gl.eq_principle.mock_response = None

        self.policy = DarePolicy()
        self.qualifier = DareQualifier()
        self.registry = DareRegistry()

        self.registry.set_authorized_contracts(
            policy=str(Address("0xPolicy")),
            qualifier=str(Address("0xQualifier")),
            escrow=str(Address("0xEscrow"))
        )

    # --- Test 1: Trivial Question Rejection ---
    def test_label_1_trivial_question_rejected(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_trivial_001",
            category="INVESTIGATIVE_FACT_FINDING",
            title="Was Lionel Messi a player for FC Barcelona during 2015?",
            claim_statement="Lionel Messi was an official squad member of FC Barcelona in 2015.",
            required_sources_desc="Wikipedia and general football archives.",
            evaluation_criteria="Verify whether player was registered in official Spanish league roster."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "REJECTED")
        self.assertFalse(parsed["non_obvious"])

    # --- Test 2: Future Prediction Rejection ---
    def test_label_2_future_prediction_rejected(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_pred_002",
            category="INVESTIGATIVE_FACT_FINDING",
            title="Will Kylian Mbappe score a hat-trick in the upcoming match?",
            claim_statement="Kylian Mbappe will score 3 goals in the next match.",
            required_sources_desc="Future broadcast logs.",
            evaluation_criteria="Evaluate live match result after completion."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "REJECTED")
        self.assertFalse(parsed["verifiable"])

    # --- Test 3: Subjective Opinion Debate Rejection ---
    def test_label_3_subjective_opinion_rejected(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_opinion_003",
            category="INVESTIGATIVE_FACT_FINDING",
            title="Is Cristiano Ronaldo a better player than Pele historically?",
            claim_statement="Cristiano Ronaldo is objectively superior to Pele.",
            required_sources_desc="Subjective sports commentary.",
            evaluation_criteria="Determine who had greater historical impact."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "REJECTED")

    # --- Test 4: Impossible Task Rejection ---
    def test_label_4_impossible_task_rejected(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_impos_004",
            category="INVESTIGATIVE_FACT_FINDING",
            title="Find secret unreleased private audio of World Cup referee?",
            claim_statement="Referees secretly admitted an intentional bad call in private.",
            required_sources_desc="Classified unreleased archives.",
            evaluation_criteria="Produce authentic private audio tape transcript."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "REJECTED")

    # --- Test 5: Research-Intensive Multi-Source (APPROVED) ---
    def test_label_5_research_intensive_approved(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_haaland_005",
            category="INVESTIGATIVE_FACT_FINDING",
            title="Did Erling Haaland score with his right foot in the 2023 UCL semi-final 2nd leg?",
            claim_statement="Erling Haaland scored with his right foot during the 4-0 second-leg win.",
            required_sources_desc="Official UEFA match sheet and at least 1 Tier-1 broadcast recap archive.",
            evaluation_criteria="Verify official goal minutes and accredited body part, or refute with official dispatch."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "APPROVED")
        self.assertTrue(parsed["non_obvious"])
        self.assertGreaterEqual(parsed["depth_score"], 80)

    # --- Test 6: Conflicting-Source Investigation (APPROVED) ---
    def test_label_6_conflicting_sources_approved(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_sneijder_006",
            category="CONFLICTING_SOURCE_INVESTIGATION",
            title="Was the 2010 quarter-final goal credited to Sneijder goal or a Felipe Melo own goal?",
            claim_statement="FIFA originally recorded an own goal before formally reattributing to Sneijder.",
            required_sources_desc="Original FIFA match sheet vs amended Technical Study Group dispatch.",
            evaluation_criteria="Analyze discrepancies between match-day log and post-tournament technical report."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "APPROVED")
        self.assertGreaterEqual(parsed["depth_score"], 90)

    # --- Test 7: Evidence Synthesis (APPROVED) ---
    def test_label_7_evidence_synthesis_approved(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_zidane_007",
            category="EVIDENCE_SYNTHESIS",
            title="Did fourth official notify referee about Zidane headbutt via Medina Cantalejo via electronic communication?",
            claim_statement="The fourth official alerted the referee using the internal headset system.",
            required_sources_desc="Official FIFA referee debriefing notes and published technical dispatches.",
            evaluation_criteria="Synthesize radio-communication timeline with official referee dismissal dispatches."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "APPROVED")

    # --- Test 8: Deterministic Policy Enforcement ---
    def test_policy_bounds_and_rate_limits(self):
        # Unsupported category
        with self.assertRaises(ValueError):
            self.policy.validate_and_record_proposal(
                self.challenger, "BASIC_STATS_LOOKUP", "Valid title length for testing",
                "Valid claim statement length for testing", "Valid required sources description",
                "Valid evaluation criteria description", 1000, 500, 3600, 3600
            )

        # Low stake
        with self.assertRaises(ValueError):
            self.policy.validate_and_record_proposal(
                self.challenger, "INVESTIGATIVE_FACT_FINDING", "Valid title length for testing",
                "Valid claim statement length for testing", "Valid required sources description",
                "Valid evaluation criteria description", 500, 500, 3600, 3600
            )

        # Low creation bond
        with self.assertRaises(ValueError):
            self.policy.validate_and_record_proposal(
                self.challenger, "INVESTIGATIVE_FACT_FINDING", "Valid title length for testing",
                "Valid claim statement length for testing", "Valid required sources description",
                "Valid evaluation criteria description", 1000, 200, 3600, 3600
            )

        # Rate limit test: allow 3, reject 4th
        self.policy.validate_and_record_proposal(
            self.challenger, "INVESTIGATIVE_FACT_FINDING", "Valid title length 1",
            "Valid claim statement length for testing", "Valid required sources description",
            "Valid evaluation criteria description", 1000, 500, 3600, 3600
        )
        self.policy.validate_and_record_proposal(
            self.challenger, "INVESTIGATIVE_FACT_FINDING", "Valid title length 2",
            "Valid claim statement length for testing", "Valid required sources description",
            "Valid evaluation criteria description", 1000, 500, 3600, 3600
        )
        self.policy.validate_and_record_proposal(
            self.challenger, "INVESTIGATIVE_FACT_FINDING", "Valid title length 3",
            "Valid claim statement length for testing", "Valid required sources description",
            "Valid evaluation criteria description", 1000, 500, 3600, 3600
        )
        self.assertEqual(int(self.policy.get_active_dares_count(self.challenger)), 3)

        # 4th should be blocked by rate limiter
        with self.assertRaises(ValueError):
            self.policy.validate_and_record_proposal(
                self.challenger, "INVESTIGATIVE_FACT_FINDING", "Valid title length 4",
                "Valid claim statement length for testing", "Valid required sources description",
                "Valid evaluation criteria description", 1000, 500, 3600, 3600
            )

    # --- Test 9: Publication Gate Enforcement on DareRegistry ---
    def test_publication_gate_and_dual_timers(self):
        # Publication gate rejects unapproved challenges
        with self.assertRaises(ValueError):
            self.registry.publish_qualified_dare(
                category="INVESTIGATIVE_FACT_FINDING",
                title="Trivial question attempt",
                claim_statement="Valid claim statement length for testing",
                required_sources_desc="Valid required sources description",
                evaluation_criteria="Valid evaluation criteria description",
                stake_amount_cents=1000,
                creation_bond_cents=500,
                acceptance_window_seconds=3600,
                research_window_seconds=3600,
                qualification_decision="REJECTED"  # Rejected by AI Qualifier!
            )

        # Publication gate permits APPROVED challenges
        did = self.registry.publish_qualified_dare(
            category="INVESTIGATIVE_FACT_FINDING",
            title="Did Erling Haaland score with right foot in 2023 semi-final?",
            claim_statement="Erling Haaland scored with his right foot during the 4-0 second-leg win.",
            required_sources_desc="Official UEFA match sheet and at least 1 Tier-1 broadcast recap archive.",
            evaluation_criteria="Verify official goal minutes and accredited body part, or refute with official dispatch.",
            stake_amount_cents=1000,
            creation_bond_cents=500,
            acceptance_window_seconds=3600,
            research_window_seconds=7200,
            qualification_decision="APPROVED"
        )
        self.assertEqual(int(did), 1)
        self.assertEqual(self.registry.get_dare_status(1), "OPEN")

        # Investigator accepts -> starts Phase 2 research timer
        mock_gl.message.sender_address = Address(self.investigator)
        self.registry.accept_dare(1)
        self.assertEqual(self.registry.get_dare_status(1), "ACCEPTED")

        dare = json.loads(self.registry.get_dare(1))
        self.assertEqual(dare["investigator"], self.investigator)
        self.assertEqual(dare["research_deadline_ts"], 1792100000 + 7200)

        # 3rd party cannot submit evidence (single-investigator reservation)
        mock_gl.message.sender_address = Address("0xIntruder999")
        with self.assertRaises(Exception):
            self.registry.mark_evidence_submitted(1)


if __name__ == "__main__":
    unittest.main()
