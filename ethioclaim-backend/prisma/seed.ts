import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding EthioClaim database...');

  // ── Seed Users ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ethioclaim.test' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@ethioclaim.test',
      passwordHash,
      role: 'ADMIN',
      active: true,
    },
  });

  const examiner = await prisma.user.upsert({
    where: { email: 'examiner@ethioclaim.test' },
    update: {},
    create: {
      name: 'Abebe Kebede',
      email: 'examiner@ethioclaim.test',
      passwordHash,
      role: 'EXAMINER',
      active: true,
    },
  });

  const intakeUser = await prisma.user.upsert({
    where: { email: 'intake@ethioclaim.test' },
    update: {},
    create: {
      name: 'Fatuma Ahmed',
      email: 'intake@ethioclaim.test',
      passwordHash,
      role: 'INTAKE_USER',
      active: true,
    },
  });

  console.log('✓ Users seeded:', admin.email, examiner.email, intakeUser.email);

  // ── Seed Policies ─────────────────────────────────────────────────────────
  const policies = [
    {
      policyNumber: 'MTR-000001',
      normalizedPolicyNumber: 'MTR000001',
      holderName: 'Tigist Haile',
      vehicleRegistration: 'AA-1234-A',
      vehicleMake: 'Toyota',
      vehicleModel: 'Corolla',
      insurer: 'Awash Insurance',
      status: 'ACTIVE' as const,
      validFrom: new Date('2025-01-01'),
      validTo: new Date('2026-12-31'),
      coverageAmount: 500000,
    },
    {
      policyNumber: 'MTR-000002',
      normalizedPolicyNumber: 'MTR000002',
      holderName: 'Bekele Tadesse',
      vehicleRegistration: 'AA-5678-B',
      vehicleMake: 'Hyundai',
      vehicleModel: 'Elantra',
      insurer: 'Ethiopian Insurance',
      status: 'ACTIVE' as const,
      validFrom: new Date('2025-06-01'),
      validTo: new Date('2026-05-31'),
      coverageAmount: 350000,
    },
    {
      policyNumber: 'MTR-000003',
      normalizedPolicyNumber: 'MTR000003',
      holderName: 'Almaz Girma',
      vehicleRegistration: 'AA-9012-C',
      vehicleMake: 'Suzuki',
      vehicleModel: 'Alto',
      insurer: 'Nyala Insurance',
      status: 'EXPIRED' as const,
      validFrom: new Date('2023-01-01'),
      validTo: new Date('2024-12-31'),
      coverageAmount: 200000,
    },
    {
      policyNumber: 'MTR-000123',
      normalizedPolicyNumber: 'MTR000123',
      holderName: 'Dawit Solomon',
      vehicleRegistration: 'OR-1122-D',
      vehicleMake: 'Toyota',
      vehicleModel: 'Land Cruiser',
      insurer: 'Awash Insurance',
      status: 'ACTIVE' as const,
      validFrom: new Date('2025-03-01'),
      validTo: new Date('2027-02-28'),
      coverageAmount: 1200000,
    },
    {
      policyNumber: 'MTR-000200',
      normalizedPolicyNumber: 'MTR000200',
      holderName: 'Hana Tesfaye',
      vehicleRegistration: 'AA-3344-E',
      vehicleMake: 'Nissan',
      vehicleModel: 'Sunny',
      insurer: 'Global Insurance',
      status: 'SUSPENDED' as const,
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2026-12-31'),
      coverageAmount: 300000,
    },
  ];

  for (const p of policies) {
    await prisma.policy.upsert({
      where: { policyNumber: p.policyNumber },
      update: {},
      create: p,
    });
  }

  console.log(`✓ ${policies.length} policies seeded`);

  // ── Seed Sample Claims ─────────────────────────────────────────────────────
  const existingClaims = await prisma.claim.count();
  if (existingClaims === 0) {
    const policy1 = await prisma.policy.findFirst({ where: { policyNumber: 'MTR-000001' } });
    const policy2 = await prisma.policy.findFirst({ where: { policyNumber: 'MTR-000002' } });

    const claim1 = await prisma.claim.create({
      data: {
        claimNumber: 'EC-2026-00001',
        status: 'UNDER_REVIEW',
        policyVerification: 'VERIFIED',
        claimantFullName: 'Tigist Haile',
        claimantPhone: '+251911000001',
        claimantEmail: 'tigist@example.com',
        vehiclePlateNumber: 'AA-1234-A',
        vehicleMake: 'Toyota',
        vehicleModel: 'Corolla',
        vehicleYear: 2019,
        incidentOccurredAt: new Date('2026-10-10T09:30:00Z'),
        incidentLocation: 'Bole Road, Addis Ababa',
        incidentDescription: 'Rear-end collision at traffic light. Significant bumper damage and trunk deformation.',
        incidentType: 'COLLISION',
        policyId: policy1?.id,
        createdById: intakeUser.id,
      },
    });

    await prisma.auditEvent.create({
      data: {
        claimId: claim1.id,
        actorId: intakeUser.id,
        action: 'CLAIM_CREATED',
        summary: 'Claim submitted via intake portal',
      },
    });

    const claim2 = await prisma.claim.create({
      data: {
        claimNumber: 'EC-2026-00002',
        status: 'READY_FOR_REVIEW',
        policyVerification: 'VERIFIED',
        claimantFullName: 'Bekele Tadesse',
        claimantPhone: '+251922000002',
        claimantEmail: 'bekele@example.com',
        vehiclePlateNumber: 'AA-5678-B',
        vehicleMake: 'Hyundai',
        vehicleModel: 'Elantra',
        vehicleYear: 2021,
        incidentOccurredAt: new Date('2026-10-12T14:00:00Z'),
        incidentLocation: 'Megenagna, Addis Ababa',
        incidentDescription: 'Side-swipe collision resulting in door panel damage and mirror loss.',
        incidentType: 'COLLISION',
        policyId: policy2?.id,
        createdById: intakeUser.id,
      },
    });

    await prisma.auditEvent.create({
      data: {
        claimId: claim2.id,
        actorId: intakeUser.id,
        action: 'CLAIM_CREATED',
        summary: 'Claim submitted via intake portal',
      },
    });

    const claim3 = await prisma.claim.create({
      data: {
        claimNumber: 'EC-2026-00003',
        status: 'ASSESSED',
        policyVerification: 'VERIFIED',
        claimantFullName: 'Dawit Solomon',
        claimantPhone: '+251933000003',
        vehiclePlateNumber: 'OR-1122-D',
        vehicleMake: 'Toyota',
        vehicleModel: 'Land Cruiser',
        vehicleYear: 2020,
        incidentOccurredAt: new Date('2026-10-08T08:00:00Z'),
        incidentLocation: 'Jemo, Addis Ababa',
        incidentDescription: 'Front-end collision with concrete barrier. Hood and radiator damaged.',
        incidentType: 'COLLISION',
        createdById: intakeUser.id,
      },
    });

    await prisma.examinerAssessment.create({
      data: {
        claimId: claim3.id,
        severity: 'SEVERE',
        estimatedLossEtb: 85000,
        currency: 'ETB',
        notes: 'Front-end structural damage. Workshop quote reviewed. Loss estimate approved.',
        examinerId: examiner.id,
      },
    });

    await prisma.auditEvent.createMany({
      data: [
        {
          claimId: claim3.id,
          actorId: intakeUser.id,
          action: 'CLAIM_CREATED',
          summary: 'Claim submitted via intake portal',
        },
        {
          claimId: claim3.id,
          actorId: examiner.id,
          action: 'ASSESSMENT_CREATED',
          summary: 'Examiner assessment recorded: SEVERE, ETB 85,000',
        },
      ],
    });

    console.log('✓ 3 sample claims seeded');
  } else {
    console.log(`ℹ ${existingClaims} claims already exist, skipping claim seed`);
  }

  console.log('✅ Seeding complete!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  Admin:    admin@ethioclaim.test    / Password123!');
  console.log('  Examiner: examiner@ethioclaim.test / Password123!');
  console.log('  Intake:   intake@ethioclaim.test   / Password123!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
