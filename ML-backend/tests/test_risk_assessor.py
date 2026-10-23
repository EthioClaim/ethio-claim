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
