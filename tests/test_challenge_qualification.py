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

        # Adjudication prompt (dare_adjudicator.py)
        if "=== VALIDATOR-FETCHED ARCHIVAL EXCERPT ===" in user_input or "=== INVESTIGATOR EVIDENCE DOSSIER ===" in user_input or "=== INVESTIGATOR SUBMITTED EVIDENCE DOSSIER ===" in user_input:
            if "unverified social media" in user_input or "Unsubstantiated Twitter claim" in user_input:
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
                    "rationale": "Evidence satisfies required criteria."
                })

        # Label 1: Trivial fact check
        if "messi" in user_input.lower():
            return json.dumps({
                "decision": "REJECTED",
                "observable_criteria": False,
                "immutable_source_feasible": True,
                "rationale": "Trivial, widely known historical fact requiring no investigative research synthesis."
            })
        # Label 2: Future Prediction Market
        elif "mbappe" in user_input.lower() or "hat-trick" in user_input.lower():
            return json.dumps({
                "decision": "REJECTED",
                "observable_criteria": False,
                "immutable_source_feasible": False,
                "rationale": "Explicitly excluded: predictive future event rather than historical factual investigation."
            })
        # Label 3: Subjective opinion
        elif "ronaldo" in user_input.lower() or "pele" in user_input.lower():
            return json.dumps({
                "decision": "REJECTED",
                "observable_criteria": False,
                "immutable_source_feasible": False,
                "rationale": "Explicitly excluded: subjective opinion poll with unobservable, non-factual criteria."
            })
        # Label 4: Impossible task
        elif "secret unreleased private audio" in user_input.lower() or "audio" in user_input.lower():
            return json.dumps({
                "decision": "REJECTED",
                "observable_criteria": False,
                "immutable_source_feasible": False,
                "rationale": "Impossible task: relies on non-existent, unobservable private material."
            })
        # Label 5: Research-intensive multi-source
        elif "haaland" in user_input.lower():
            return json.dumps({
                "decision": "APPROVED",
                "observable_criteria": True,
                "immutable_source_feasible": True,
                "rationale": "Genuine factual inquiry requiring cross-referencing UEFA official match sheets and broadcast logs."
            })
        # Label 6: Conflicting-source investigation
        elif "sneijder" in user_input.lower() or "felipe melo" in user_input.lower():
            return json.dumps({
                "decision": "APPROVED",
                "observable_criteria": True,
                "immutable_source_feasible": True,
                "rationale": "Exemplary conflicting-source challenge requiring reconciliation of amended FIFA technical dispatches."
            })
        # Label 7: Evidence synthesis
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
        obj.active_dares_per_challenger = TreeMap()
        obj.policy_version = u256(1)
        obj.qualification_records = TreeMap()
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
            title="Dare you to verify whether Lionel Messi was a player for FC Barcelona during 2015 within 15 minutes.",
            claim_statement="Lionel Messi was an official squad member of FC Barcelona in 2015.",
            required_sources_desc="Wikipedia and general football archives.",
            evaluation_criteria="Verify whether player was registered in official Spanish league roster."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "REJECTED")
        self.assertFalse(parsed["observable_criteria"])

    # --- Test 2: Future Prediction Rejection ---
    def test_label_2_future_prediction_rejected(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_pred_002",
            category="INVESTIGATIVE_FACT_FINDING",
            title="Dare you to predict if Kylian Mbappe will score a hat-trick in the upcoming match within 15 minutes.",
            claim_statement="Kylian Mbappe will score 3 goals in the next match.",
            required_sources_desc="Future broadcast logs.",
            evaluation_criteria="Evaluate live match result after completion."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "REJECTED")
        self.assertFalse(parsed["observable_criteria"])

    # --- Test 3: Subjective Opinion Debate Rejection ---
    def test_label_3_subjective_opinion_rejected(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_opinion_003",
            category="INVESTIGATIVE_FACT_FINDING",
            title="Dare you to determine if Cristiano Ronaldo is a better player than Pele historically within 15 minutes.",
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
            title="Dare you to find secret unreleased private audio of World Cup referee within 15 minutes.",
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
            title="Dare you to uncover whether Erling Haaland scored with his right foot in the 2023 UCL semi-final 2nd leg within 30 minutes.",
            claim_statement="Erling Haaland scored with his right foot during the 4-0 second-leg win.",
            required_sources_desc="Official UEFA match sheet and at least 1 Tier-1 broadcast recap archive.",
            evaluation_criteria="Verify official goal minutes and accredited body part, or refute with official dispatch."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "APPROVED")
        self.assertTrue(parsed["observable_criteria"])
        self.assertTrue(parsed["immutable_source_feasible"])
        self.assertTrue(len(parsed["rules_sha256"]) > 0)

    # --- Test 6: Conflicting-Source Investigation (APPROVED) ---
    def test_label_6_conflicting_sources_approved(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_sneijder_006",
            category="CONFLICTING_SOURCE_INVESTIGATION",
            title="Dare you to investigate whether the 2010 quarter-final goal was credited to Sneijder goal or a Felipe Melo own goal within 25 minutes.",
            claim_statement="FIFA originally recorded an own goal before formally reattributing to Sneijder.",
            required_sources_desc="Original FIFA match sheet vs amended Technical Study Group dispatch.",
            evaluation_criteria="Analyze discrepancies between match-day log and post-tournament technical report."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "APPROVED")
        self.assertTrue(parsed["observable_criteria"])
        self.assertTrue(parsed["immutable_source_feasible"])

    # --- Test 7: Evidence Synthesis (APPROVED) ---
    def test_label_7_evidence_synthesis_approved(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_zidane_007",
            category="EVIDENCE_SYNTHESIS",
            title="Dare you to reconstruct if fourth official notified referee about Zidane headbutt via Medina Cantalejo via electronic communication within 30 minutes.",
            claim_statement="The fourth official alerted the referee using the internal headset system.",
            required_sources_desc="Official FIFA referee debriefing notes and published technical dispatches.",
            evaluation_criteria="Synthesize radio-communication timeline with official referee dismissal dispatches."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "APPROVED")
        self.assertTrue(parsed["observable_criteria"])
        self.assertTrue(parsed["immutable_source_feasible"])

    # --- Test Format: Missing 'Dare you to ' prefix strictly rejected ---
    def test_format_missing_prefix_rejected(self):
        result_json = self.qualifier.evaluate_challenge_qualification(
            content_hash="hash_no_prefix",
            category="INVESTIGATIVE_FACT_FINDING",
            title="Who scored in the 2023 UCL semi-final?",  # Missing 'Dare you to '
            claim_statement="Valid claim statement length for testing.",
            required_sources_desc="Official UEFA match archives.",
            evaluation_criteria="Verify whether claim matches match report."
        )
        parsed = json.loads(result_json)
        self.assertEqual(parsed["decision"], "REJECTED")
        self.assertIn("Format Failure", parsed["rationale"])

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
                self.challenger, "INVESTIGATIVE_FACT_FINDING", "Dare you to investigate test topic length within 30 mins.",
                "Valid claim statement length for testing", "Valid required sources description",
                "Valid evaluation criteria description", 500, 500, 3600, 3600
            )

        # Low creation bond
        with self.assertRaises(ValueError):
            self.policy.validate_and_record_proposal(
                self.challenger, "INVESTIGATIVE_FACT_FINDING", "Dare you to investigate test topic length within 30 mins.",
                "Valid claim statement length for testing", "Valid required sources description",
                "Valid evaluation criteria description", 1000, 200, 3600, 3600
            )

        # Rate limit test: allow 3, reject 4th
        self.policy.validate_and_record_proposal(
            self.challenger, "INVESTIGATIVE_FACT_FINDING", "Dare you to investigate test topic number 1 within 30 minutes.",
            "Valid claim statement length for testing", "Valid required sources description",
            "Valid evaluation criteria description", 1000, 500, 3600, 3600
        )
        self.policy.validate_and_record_proposal(
            self.challenger, "INVESTIGATIVE_FACT_FINDING", "Dare you to investigate test topic number 2 within 30 minutes.",
            "Valid claim statement length for testing", "Valid required sources description",
            "Valid evaluation criteria description", 1000, 500, 3600, 3600
        )
        self.policy.validate_and_record_proposal(
            self.challenger, "INVESTIGATIVE_FACT_FINDING", "Dare you to investigate test topic number 3 within 30 minutes.",
            "Valid claim statement length for testing", "Valid required sources description",
            "Valid evaluation criteria description", 1000, 500, 3600, 3600
        )
        self.assertEqual(int(self.policy.get_active_dares_count(self.challenger)), 3)

        # 4th should be blocked by rate limiter
        with self.assertRaises(ValueError):
            self.policy.validate_and_record_proposal(
                self.challenger, "INVESTIGATIVE_FACT_FINDING", "Dare you to investigate test topic number 4 within 30 minutes.",
                "Valid claim statement length for testing", "Valid required sources description",
                "Valid evaluation criteria description", 1000, 500, 3600, 3600
            )

    # --- Test 9: Publication Gate Enforcement on DareRegistry ---
    def test_publication_gate_and_dual_timers(self):
        # Publication gate rejects unapproved challenges
        with self.assertRaises(ValueError):
            self.registry.publish_qualified_dare(
                category="INVESTIGATIVE_FACT_FINDING",
                title="Dare you to answer this trivial question attempt within 30 mins.",
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
