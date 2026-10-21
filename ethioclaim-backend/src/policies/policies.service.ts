import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function normalizePolicyNumber(pn: string): string {
  return pn.replace(/[-\s]/g, '').toUpperCase();
}

@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  async verify(policyNumber: string) {
    const normalized = normalizePolicyNumber(policyNumber);
    const policy = await this.prisma.policy.findFirst({
      where: {
        OR: [
          { policyNumber: { equals: policyNumber, mode: 'insensitive' } },
          { normalizedPolicyNumber: normalized },
        ],
      },
    });

    if (!policy) {
      return { found: false, status: 'NOT_FOUND', policy: null };
    }

    return {
      found: true,
      status: policy.status,
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      validFrom: policy.validFrom,
      validTo: policy.validTo,
      insurer: policy.insurer,
      policy: {
        id: policy.id,
        policyNumber: policy.policyNumber,
        status: policy.status,
        policyholderName: policy.holderName,
        holderName: policy.holderName,
        vehicleRegistration: policy.vehicleRegistration,
        vehiclePlate: policy.vehicleRegistration,
        vehicleMake: policy.vehicleMake,
        vehicleModel: policy.vehicleModel,
        validFrom: policy.validFrom,
        validTo: policy.validTo,
        insurer: policy.insurer,
        coverageAmount: policy.coverageAmount?.toString(),
      },
    };
  }

  async findById(id: string) {
    const policy = await this.prisma.policy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Policy not found');
    return {
      id: policy.id,
      policyNumber: policy.policyNumber,
      status: policy.status,
      policyholderName: policy.holderName,
      holderName: policy.holderName,
      vehicleRegistration: policy.vehicleRegistration,
      vehicleMake: policy.vehicleMake,
      vehicleModel: policy.vehicleModel,
      insurer: policy.insurer,
      validFrom: policy.validFrom,
      validTo: policy.validTo,
      coverageAmount: policy.coverageAmount?.toString(),
    };
  }
}
