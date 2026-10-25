import pytest
from app.services.risk_assessor import risk_assessor_service
from app.schemas.analysis import HashMatchesInput, ExactMatchInput, PerceptualMatchInput, VisualMatch


def test_no_fraud_when_no_matches():
    res = risk_assessor_service.evaluate_risk(
        claim_id="claim-1",
        evidence_id="ev-1",
        hash_matches=HashMatchesInput(),
        visual_matches=[],
    )
    assert res.label == "NO_FRAUD_INDICATORS_FOUND"
    assert res.requiresExaminerReview is False


def test_fraud_when_cross_claim_exact_match():
    res = risk_assessor_service.evaluate_risk(
        claim_id="claim-1",
        evidence_id="ev-1",
        hash_matches=HashMatchesInput(
            exactMatches=[ExactMatchInput(evidenceId="ev-99", claimId="claim-99")]
        ),
    )
    assert res.label == "POTENTIAL_FRAUD"
    assert res.requiresExaminerReview is True
    assert len(res.reasons) > 0


def test_fraud_when_high_visual_similarity():
    res = risk_assessor_service.evaluate_risk(
        claim_id="claim-1",
        evidence_id="ev-1",
        visual_matches=[
            VisualMatch(evidenceId="ev-88", claimId="claim-88", similarity=0.92)
        ],
    )
    assert res.label == "POTENTIAL_FRAUD"
    assert res.requiresExaminerReview is True
    assert any("High visual vector similarity" in r for r in res.reasons)


def test_ignore_same_claim_matches():
    res = risk_assessor_service.evaluate_risk(
        claim_id="claim-1",
        evidence_id="ev-1",
        hash_matches=HashMatchesInput(
            exactMatches=[ExactMatchInput(evidenceId="ev-1", claimId="claim-1")]
        ),
        visual_matches=[
            VisualMatch(evidenceId="ev-1", claimId="claim-1", similarity=1.0)
        ],
    )
    assert res.label == "NO_FRAUD_INDICATORS_FOUND"
    assert res.requiresExaminerReview is False


def test_fraud_when_similarity_at_or_above_85_percent():
    res = risk_assessor_service.evaluate_risk(
        claim_id="claim-1",
        evidence_id="ev-1",
        visual_matches=[
            VisualMatch(evidenceId="ev-77", claimId="claim-77", similarity=0.85)
        ],
    )
    assert res.label == "POTENTIAL_FRAUD"
    assert res.requiresExaminerReview is True
    assert any("High visual vector similarity" in r for r in res.reasons)


def test_no_fraud_when_similarity_below_85_percent():
    # Below 0.85 similarity must not trigger fraud; rely on damage detection
    res = risk_assessor_service.evaluate_risk(
        claim_id="claim-1",
        evidence_id="ev-1",
        visual_matches=[
            VisualMatch(evidenceId="ev-66", claimId="claim-66", similarity=0.849)
        ],
        damage_detections=[],
    )
    # When no damage detected and no fraud signals above threshold, deterministic signal classifies as NO_DAMAGE_DETECTED
    assert res.label == "NO_DAMAGE_DETECTED"
    assert not any("High visual vector similarity" in r for r in res.reasons)


def test_deterministic_signals_govern_when_similarity_below_85_percent():
    # Below 0.85 similarity with an exact hash match triggers fraud strictly via exact hash
    res = risk_assessor_service.evaluate_risk(
        claim_id="claim-1",
        evidence_id="ev-1",
        hash_matches=HashMatchesInput(
            exactMatches=[ExactMatchInput(evidenceId="ev-55", claimId="claim-55")]
        ),
        visual_matches=[
            VisualMatch(evidenceId="ev-66", claimId="claim-66", similarity=0.82)
        ],
    )
    assert res.label == "POTENTIAL_FRAUD"
    assert any("Exact SHA-256 match" in r for r in res.reasons)
    assert not any("High visual vector similarity" in r for r in res.reasons)

