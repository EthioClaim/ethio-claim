from typing import List, Optional
from app.core.config import settings
from app.schemas.analysis import (
    RiskAssessment,
    HashMatchesInput,
    VisualMatch,
    DamageDetection,
)


class RiskAssessorService:
    """
    Transparent, rules-based screening logic complying with Section 1.5 of prompt.md.
    Distinguishes damage detection, visual similarity, exact/near duplicates, and fraud risk.
    """

    def evaluate_risk(
        self,
        claim_id: str,
        evidence_id: str,
        hash_matches: Optional[HashMatchesInput] = None,
        visual_matches: Optional[List[VisualMatch]] = None,
        damage_detections: Optional[List[DamageDetection]] = None,
        is_corrupt_or_failed: bool = False,
    ) -> RiskAssessment:
        if is_corrupt_or_failed:
            return RiskAssessment(
                label="FAILED",
                score=0.5,
                reasons=["Inference failure or unreadable image prevented conclusive automated screening."],
                matchedClaimIds=[],
                matchedEvidenceIds=[],
                requiresExaminerReview=True,
                ruleVersion=settings.RULE_VERSION,
            )

        reasons: List[str] = []
        matched_claim_ids: List[str] = []
        matched_evidence_ids: List[str] = []
        is_fraud_flag = False
        highest_score = 0.05

        # 1. Exact SHA-256 Matches reported by NestJS
        if hash_matches and hash_matches.exactMatches:
            cross_claim_matches = [
                m for m in hash_matches.exactMatches
                if m.claimId and m.claimId != claim_id and m.evidenceId != evidence_id
            ]
            if cross_claim_matches:
                is_fraud_flag = True
                highest_score = max(highest_score, 0.95)
                for m in cross_claim_matches:
                    if m.claimId and m.claimId not in matched_claim_ids:
                        matched_claim_ids.append(m.claimId)
                    if m.evidenceId and m.evidenceId not in matched_evidence_ids:
                        matched_evidence_ids.append(m.evidenceId)

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
                highest_score = max(highest_score, 0.88)
                for m in cross_claim_pm:
                    if m.claimId and m.claimId not in matched_claim_ids:
                        matched_claim_ids.append(m.claimId)
                    if m.evidenceId and m.evidenceId not in matched_evidence_ids:
                        matched_evidence_ids.append(m.evidenceId)

                pm_summary = ", ".join(
                    [f"Claim {m.claimId[:8]}.. (hamming distance: {m.distance})" for m in cross_claim_pm[:3]]
                )
                reasons.append(
                    f"Near-duplicate image signature (pHash match) detected against historical claim evidence ({pm_summary})."
                )

        # 3. High Visual Embedding Similarity from Qdrant
        if visual_matches:
            cross_claim_vm = [
                vm for vm in visual_matches
                if vm.claimId and vm.claimId != claim_id and vm.evidenceId != evidence_id
            ]

            # Enforce minimum threshold of 85% (0.85) for vector embedding visual matches
            high_similarity_matches = [
                vm for vm in cross_claim_vm
                if vm.similarity >= settings.VECTOR_SIMILARITY_FRAUD_THRESHOLD
            ]

            # Below 0.85: do NOT trigger a fraud flag based on vector similarity
            below_threshold_matches = [
                vm for vm in cross_claim_vm
                if vm.similarity < settings.VECTOR_SIMILARITY_FRAUD_THRESHOLD
            ]

            if high_similarity_matches:
                is_fraud_flag = True
                top_sim = max(vm.similarity for vm in high_similarity_matches)
                highest_score = max(highest_score, round(top_sim, 4))
                for vm in high_similarity_matches:
                    if vm.claimId and vm.claimId not in matched_claim_ids:
                        matched_claim_ids.append(vm.claimId)
                    if vm.evidenceId and vm.evidenceId not in matched_evidence_ids:
                        matched_evidence_ids.append(vm.evidenceId)

                vm_summary = ", ".join(
                    [f"{vm.similarity * 100:.1f}% match with Claim {vm.claimId[:8]}.." for vm in high_similarity_matches[:3]]
                )
                reasons.append(
                    f"High visual vector similarity detected against historical claim evidence ({vm_summary})."
                )
            elif below_threshold_matches:
                # If vector embedding similarity is below 0.85, do NOT trigger a fraud flag based on vector similarity.
                # In that scenario, rely strictly on other deterministic signals (exact SHA-256 hash match,
                # perceptual hash / pHash distance, or damage detection results) to determine the evidence classification.
                top_sim = max(vm.similarity for vm in below_threshold_matches)
                highest_score = max(highest_score, round(top_sim * 0.4, 4))
                for vm in below_threshold_matches[:2]:
                    if vm.claimId and vm.claimId not in matched_claim_ids:
                        matched_claim_ids.append(vm.claimId)
                    if vm.evidenceId and vm.evidenceId not in matched_evidence_ids:
                        matched_evidence_ids.append(vm.evidenceId)

        # 4. Check Damage Detection status
        has_damage = damage_detections is not None and len(damage_detections) > 0

        # Determine Final Screening Outcome
        if is_fraud_flag:
            return RiskAssessment(
                label="POTENTIAL_FRAUD",
                score=round(highest_score, 4),
                reasons=reasons,
                matchedClaimIds=matched_claim_ids,
                matchedEvidenceIds=matched_evidence_ids,
                requiresExaminerReview=True,
                ruleVersion=settings.RULE_VERSION,
            )
        elif not has_damage and damage_detections is not None:
            # No vehicle damage detected in image
            return RiskAssessment(
                label="NO_DAMAGE_DETECTED",
                score=0.15,
                reasons=["No structural vehicle damage, dent, or crack was detected in this photo. Manual cross-check recommended."],
                matchedClaimIds=matched_claim_ids,
                matchedEvidenceIds=matched_evidence_ids,
                requiresExaminerReview=True,
                ruleVersion=settings.RULE_VERSION,
            )
        else:
            return RiskAssessment(
                label="NO_FRAUD_INDICATORS_FOUND",
                score=round(highest_score, 4),
                reasons=["No duplicate image hashes or cross-claim vector anomalies detected."],
                matchedClaimIds=matched_claim_ids,
                matchedEvidenceIds=matched_evidence_ids,
                requiresExaminerReview=False,
                ruleVersion=settings.RULE_VERSION,
            )


risk_assessor_service = RiskAssessorService()
