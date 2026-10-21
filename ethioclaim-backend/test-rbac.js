const http = require('http');

const BASE_URL = 'http://localhost:3001/api/v1';

async function request(path, options = {}) {
  const url = new URL(BASE_URL + path);
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...options.headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(body);
          } catch {
            data = body;
          }
          resolve({ status: res.statusCode, data });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Login failed for ${email} with status ${res.status}: ${JSON.stringify(res.data)}`);
  }
  return res.data.accessToken || res.data.token;
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('\n🔒 Starting EthioClaim Comprehensive RBAC Verification...\n');

  try {
    // 1. Authenticate Personas
    console.log('1. Authenticating test accounts...');
    const adminToken = await login('admin@ethioclaim.test', 'Password123!');
    console.log('  ✓ Admin logged in');
    const examinerToken = await login('examiner@ethioclaim.test', 'Password123!');
    console.log('  ✓ Examiner logged in');
    const intakeToken = await login('intake@ethioclaim.test', 'Password123!');
    console.log('  ✓ Intake Officer logged in');

    // 2. Test INTAKE_USER Permissions & Boundaries
    console.log('\n2. Testing INTAKE_USER boundaries (Least Privilege)...');
    
    // Intake cannot access Admin Users
    const intakeAdminUsers = await request('/admin/users', { token: intakeToken });
    assert(intakeAdminUsers.status === 403, 'Intake user blocked from GET /admin/users (403 Forbidden)');

    // Intake cannot access Admin Audit Logs
    const intakeAudit = await request('/admin/audit-log', { token: intakeToken });
    assert(intakeAudit.status === 403, 'Intake user blocked from GET /admin/audit-log (403 Forbidden)');

    // Intake cannot access Admin Pipeline Telemetry
    const intakeOps = await request('/admin/operations/analysis', { token: intakeToken });
    assert(intakeOps.status === 403, 'Intake user blocked from GET /admin/operations/analysis (403 Forbidden)');

    // Intake can create a claim
    const newClaimRes = await request('/claims', {
      method: 'POST',
      token: intakeToken,
      body: {
        policyNumber: 'MTR-000001',
        claimant: {
          fullName: 'Alemayehu Tadesse',
          phone: '+251911223344',
        },
        vehicle: {
          make: 'Toyota',
          model: 'Corolla',
          plateNumber: 'AA-1234-A',
        },
        incident: {
          occurredAt: '2026-10-15T10:00:00Z',
          description: 'Rear collision at Meskel Square intersection while stationary.',
        },
      },
    });
    assert(newClaimRes.status === 201 || newClaimRes.status === 200, 'Intake user successfully created claim (201 Created)');
    const testClaimId = newClaimRes.data?.id;

    if (testClaimId) {
      // Intake cannot create examiner assessment
      const intakeAssess = await request(`/claims/${testClaimId}/assessment`, {
        method: 'POST',
        token: intakeToken,
        body: {
          severity: 'MODERATE',
          estimatedLossEtb: 30000,
          currency: 'ETB',
          notes: 'Intake attempting assessment',
        },
      });
      assert(intakeAssess.status === 403, 'Intake user blocked from POST /claims/:id/assessment (403 Forbidden)');

      // Intake cannot record examiner final decision
      const intakeDecision = await request(`/claims/${testClaimId}/decision`, {
        method: 'POST',
        token: intakeToken,
        body: {
          decision: 'RECOMMEND_APPROVAL',
          notes: 'Intake attempting decision',
        },
      });
      assert(intakeDecision.status === 403, 'Intake user blocked from POST /claims/:id/decision (403 Forbidden)');

      // Intake CAN submit the draft claim
      const submitClaimRes = await request(`/claims/${testClaimId}/submit`, {
        method: 'POST',
        token: intakeToken,
        body: {
          confirmationNotes: 'All initial documentation and incident particulars verified.',
        },
      });
      assert(submitClaimRes.status === 200 || submitClaimRes.status === 201, 'Intake user submitted draft claim for review (200 OK)');
    }

    // 3. Test EXAMINER Permissions & Boundaries
    console.log('\n3. Testing EXAMINER boundaries...');

    // Examiner cannot access Admin Users
    const examinerAdminUsers = await request('/admin/users', { token: examinerToken });
    assert(examinerAdminUsers.status === 403, 'Examiner blocked from GET /admin/users (403 Forbidden)');

    // Examiner cannot access Admin Policies creation
    const examinerCreatePolicy = await request('/admin/policies', {
      method: 'POST',
      token: examinerToken,
      body: {
        policyNumber: 'MTR-999999',
        holderName: 'Unauthorized Policy',
        vehicleRegistration: 'AA-0000-X',
      },
    });
    assert(examinerCreatePolicy.status === 403, 'Examiner blocked from POST /admin/policies (403 Forbidden)');

    // Examiner cannot create new intake claims (Intake only)
    const examinerCreateClaim = await request('/claims', {
      method: 'POST',
      token: examinerToken,
      body: {
        policyNumber: 'MTR-000001',
        incidentDate: '2026-10-15',
        claimantName: 'Examiner Attempt',
        claimantPhone: '+251911223344',
      },
    });
    assert(examinerCreateClaim.status === 403, 'Examiner blocked from POST /claims intake (403 Forbidden)');

    // Examiner cannot close claim (Admin only)
    if (testClaimId) {
      const examinerClose = await request(`/claims/${testClaimId}/close`, {
        method: 'POST',
        token: examinerToken,
        body: {
          reason: 'SETTLED',
          notes: 'Examiner attempting closure',
        },
      });
      assert(examinerClose.status === 403, 'Examiner blocked from POST /claims/:id/close (403 Forbidden)');

      // Examiner CAN request additional information/evidence
      const reqInfo = await request(`/claims/${testClaimId}/request-information`, {
        method: 'POST',
        token: examinerToken,
        body: {
          message: 'Please provide clear close-up photos of rear bumper fasteners and chassis frame.',
          requestedItems: ['Chassis alignment photo', 'Garage initial repair estimate'],
        },
      });
      assert(reqInfo.status === 200 || reqInfo.status === 201, 'Examiner successfully dispatched request-information (200 OK)');

      // Examiner CAN record assessment
      const examinerAssess = await request(`/claims/${testClaimId}/assessment`, {
        method: 'POST',
        token: examinerToken,
        body: {
          severity: 'MODERATE',
          estimatedLossEtb: 38000,
          currency: 'ETB',
          notes: 'Rear bumper plastic deformation and light mount replacement needed.',
        },
      });
      assert(examinerAssess.status === 200 || examinerAssess.status === 201, 'Examiner successfully recorded assessment (201 Created)');

      // Examiner CAN record final decision
      const examinerDec = await request(`/claims/${testClaimId}/decision`, {
        method: 'POST',
        token: examinerToken,
        body: {
          decision: 'RECOMMEND_APPROVAL',
          notes: 'Loss estimation is consistent with policy coverage limits.',
          estimatedLossEtb: 38000,
        },
      });
      assert(examinerDec.status === 200 || examinerDec.status === 201, 'Examiner successfully recorded decision (200 OK)');
    }

    // 4. Test ADMIN Privileges
    console.log('\n4. Testing ADMIN privileges...');

    // Admin can access GET /admin/users
    const adminUsers = await request('/admin/users', { token: adminToken });
    const userList = adminUsers.data?.items || adminUsers.data?.users || [];
    assert(adminUsers.status === 200 && Array.isArray(userList), 'Admin accessed GET /admin/users (200 OK)');

    // Admin can access GET /admin/audit-log
    const adminAudit = await request('/admin/audit-log', { token: adminToken });
    assert(adminAudit.status === 200 && Array.isArray(adminAudit.data?.items), 'Admin accessed GET /admin/audit-log (200 OK)');

    // Admin can access GET /admin/operations/analysis
    const adminOps = await request('/admin/operations/analysis', { token: adminToken });
    assert(adminOps.status === 200 && Array.isArray(adminOps.data?.items), 'Admin accessed GET /admin/operations/analysis (200 OK)');

    // Admin can assign examiner
    if (testClaimId) {
      const examinerUser = userList.find((u) => u.role === 'EXAMINER');
      if (examinerUser) {
        const assignRes = await request(`/claims/${testClaimId}/assign`, {
          method: 'PATCH',
          token: adminToken,
          body: {
            examinerId: examinerUser.id,
            note: 'Assigned to senior examiner for review.',
          },
        });
        assert(assignRes.status === 200, 'Admin successfully assigned examiner to claim (200 OK)');
      }

      // Admin can close claim
      const closeRes = await request(`/claims/${testClaimId}/close`, {
        method: 'POST',
        token: adminToken,
        body: {
          reason: 'SETTLED',
          notes: 'Final settlement processed and approved.',
        },
      });
      assert(closeRes.status === 200, 'Admin successfully closed claim file (200 OK)');
    }

    // 5. Summary
    console.log(`\n========================================`);
    console.log(`RBAC Verification Finished: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

run();
