from typing import List, Optional
from app.core.config import settings
from app.schemas.analysis import (
    RiskAssessment,
    HashMatchesInput,
    VisualMatch,
)


class RiskAssessorService:
    """
    Transparent, rules-based screening logic complying with Section 6 & 8 of ai-backend.md.
    Combines exact hash signals from NestJS, perceptual hash matches from NestJS,
    and visual embedding similarity from Qdrant.
    """

    def evaluate_risk(
        self,
        claim_id: str,
        evidence_id: str,
        hash_matches: Optional[HashMatchesInput] = None,
        visual_matches: Optional[List[VisualMatch]] = None,
        is_corrupt_or_failed: bool = False,
    ) -> RiskAssessment:
        if is_corrupt_or_failed:
            return RiskAssessment(
                label="INCONCLUSIVE",
                score=None,
                reasons=["Image quality, processing failure, or missing history prevented conclusive risk evaluation."],
                requiresExaminerReview=True,
                ruleVersion=settings.RULE_VERSION,
            )

        reasons: List[str] = []
        is_fraud_flag = False

        # 1. Exact SHA-256 Matches reported by NestJS
        if hash_matches and hash_matches.exactMatches:
            cross_claim_matches = [
                m for m in hash_matches.exactMatches
                if m.claimId and m.claimId != claim_id and m.evidenceId != evidence_id
            ]
            if cross_claim_matches:
                is_fraud_flag = True
                matched_summary = ", ".join(
                    [f"Evidence {m.evidenceId[:8]}.. (Claim {m.claimId[:8]}..)" for m in cross_claim_matches[:3]]
                )
                reasons.append(
                    f"Exact SHA-256 match found in historical evidence from another claim ({matched_summary})."
                )

        # 2. Perceptual Hash (pHash) Matches reported by NestJS
        if hash_matches and hash_matches.perceptualMatches:
            cross_claim_pm = [
                m for m in hash_matches.perceptualMatches
                if m.claimId and m.claimId != claim_id and m.evidenceId != evidence_id
                and m.distance <= settings.PERCEPTUAL_HASH_DISTANCE_THRESHOLD
            ]
            if cross_claim_pm:
                is_fraud_flag = True
                pm_summary = ", ".join(
                    [f"Claim {m.claimId[:8]}.. (distance: {m.distance})" for m in cross_claim_pm[:3]]
                )
                reasons.append(
                    f"Perceptual hash match indicates probable resized/recompressed duplicate image ({pm_summary})."
                )

        # 3. High Visual Embedding Similarity from Qdrant
        if visual_matches:
            cross_claim_vm = [
                vm for vm in visual_matches
                if vm.claimId and vm.claimId != claim_id and vm.evidenceId != evidence_id
            ]

            high_similarity_matches = [
                vm for vm in cross_claim_vm
                if vm.similarity >= settings.VECTOR_SIMILARITY_FRAUD_THRESHOLD
            ]

            suspicious_similarity_matches = [
                vm for vm in cross_claim_vm
                if settings.VECTOR_SIMILARITY_SUSPICIOUS_THRESHOLD <= vm.similarity < settings.VECTOR_SIMILARITY_FRAUD_THRESHOLD
            ]

            if high_similarity_matches:
                is_fraud_flag = True
                vm_summary = ", ".join(
                    [f"{vm.similarity * 100:.1f}% match with Claim {vm.claimId[:8]}.." for vm in high_similarity_matches[:3]]
                )
                reasons.append(
                    f"High visual vector similarity detected against historical claim evidence ({vm_summary})."
                )
            elif suspicious_similarity_matches and (hash_matches and (hash_matches.exactMatches or hash_matches.perceptualMatches)):
                is_fraud_flag = True
                reasons.append(
                    "Corroborating moderate visual similarity and perceptual hash matches detected across claims."
                )

        # Determine Final Screening Outcome
        if is_fraud_flag:
            return RiskAssessment(
                label="POTENTIAL_FRAUD",
                score=None,  # Transparent rules-based MVP: score remains null to avoid misleading examiners
                reasons=reasons,
                requiresExaminerReview=True,
                ruleVersion=settings.RULE_VERSION,
            )
        else:
            return RiskAssessment(
                label="NO_FRAUD_INDICATORS_FOUND",
                score=None,
                reasons=["No exact hash collisions, perceptual hash duplicates, or high vector similarity matches found."],
                requiresExaminerReview=False,
                ruleVersion=settings.RULE_VERSION,
            )


risk_assessor_service = RiskAssessorService()
