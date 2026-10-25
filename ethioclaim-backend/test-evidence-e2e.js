const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3006;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

async function request(reqPath, options = {}) {
  const url = new URL(BASE_URL + reqPath);
  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const req = client.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          ...(options.body && typeof options.body === 'object' && !(options.body instanceof Buffer)
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...options.headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let data;
          try {
            data = JSON.parse(buffer.toString('utf-8'));
          } catch {
            data = buffer.toString('utf-8');
          }
          resolve({ status: res.statusCode, headers: res.headers, data, buffer });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      if (typeof options.body === 'object' && !(options.body instanceof Buffer)) {
        req.write(JSON.stringify(options.body));
      } else {
        req.write(options.body);
      }
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

async function uploadMultipart(claimId, token, filename, fileBuffer, mimeType = 'image/jpeg') {
  const boundary = '----EthioClaimBoundary' + Date.now();
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([
    Buffer.from(header, 'utf-8'),
    fileBuffer,
    Buffer.from(footer, 'utf-8'),
  ]);

  return request(`/claims/${claimId}/evidence`, {
    method: 'POST',
    token,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
    body,
  });
}

// Generate a valid minimal 1x1 JPEG image buffer
function generateTestJpeg() {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x00, 0xff, 0xd9
  ]);
}

async function run() {
  console.log('\n🔍 Starting EthioClaim Evidence & Examiner Workflow Verification...\n');

  try {
    // 1. Authenticate Personas
    console.log('1. Authenticating test users...');
    const adminToken = await login('admin@ethioclaim.test', 'Password123!');
    const examinerToken = await login('examiner@ethioclaim.test', 'Password123!');
    const intakeToken = await login('intake@ethioclaim.test', 'Password123!');
    console.log('  ✓ Admin, Examiner, and Intake tokens secured.');

    // 2. Test Unauthenticated Access to Evidence
    console.log('\n2. Testing unauthenticated evidence access (Security)...');
    const unauthEv = await request('/evidence');
    assert(unauthEv.status === 401, 'Unauthenticated request to GET /evidence blocked (401 Unauthorized)');

    const unauthStream = await request('/evidence/some-fake-id/file');
    assert(unauthStream.status === 401, 'Unauthenticated image stream without token blocked (401 Unauthorized)');

    // 3. Create Claim via Intake User
    console.log('\n3. Creating claim via Intake Officer...');
    const claimRes = await request('/claims', {
      method: 'POST',
      token: intakeToken,
      body: {
        policyNumber: 'MTR-000001',
        claimant: {
          fullName: 'Tewodros Kassahun',
          phone: '+251911998877',
        },
        vehicle: {
          make: 'Toyota',
          model: 'Hilux',
          plateNumber: 'ET-5432-B',
        },
        incident: {
          occurredAt: '2026-10-18T14:30:00Z',
          description: 'Side mirror and door dent caused by parking graze.',
        },
      },
    });
    assert(claimRes.status === 201 || claimRes.status === 200, 'Claim created successfully');
    const claimId = claimRes.data?.id;
    console.log(`  ✓ Claim ID: ${claimId}`);

    // 4. Upload Evidence Photo
    console.log('\n4. Uploading vehicle photographic evidence...');
    const jpegBuffer = generateTestJpeg();
    const uploadRes = await uploadMultipart(claimId, intakeToken, 'door_dent_evidence.jpg', jpegBuffer);
    assert(uploadRes.status === 201 || uploadRes.status === 202 || uploadRes.status === 200, 'Evidence photo accepted by intake');
    const evidenceId = uploadRes.data?.id;
    console.log(`  ✓ Evidence ID: ${evidenceId}`);
    assert(evidenceId != null, 'Valid evidence ID returned in intake upload response');

    // 5. Test Examiner Isolation Before Assignment
    console.log('\n5. Testing Examiner queue isolation before assignment...');
    const examinerEvBefore = await request('/evidence', { token: examinerToken });
    assert(examinerEvBefore.status === 200, 'Examiner can access GET /evidence');
    const itemsBefore = examinerEvBefore.data?.items || examinerEvBefore.data || [];
    const foundBefore = itemsBefore.find(e => e.id === evidenceId);
    assert(!foundBefore, 'Unassigned claim evidence is NOT visible in examiner evidence queue');

    // Test direct stream access with examiner token before assignment
    const streamBefore = await request(`/evidence/${evidenceId}/file?token=${encodeURIComponent(examinerToken)}`);
    assert(streamBefore.status === 403, 'Unassigned examiner blocked from direct file stream (403 Forbidden)');

    // 6. Admin Assigns Claim to Examiner
    console.log('\n6. Admin assigning claim to Examiner...');
    const examinerMe = await request('/auth/me', { token: examinerToken });
    const examinerId = examinerMe.data?.id;
    const assignRes = await request(`/claims/${claimId}/assign`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        examinerId,
        note: 'Assigned for forensic photo inspection and assessment',
      },
    });
    assert(assignRes.status === 200, 'Claim successfully assigned to Examiner');

    // 7. Test Examiner Access After Assignment
    console.log('\n7. Testing Examiner queue and file streaming after assignment...');
    const examinerEvAfter = await request('/evidence', { token: examinerToken });
    assert(examinerEvAfter.status === 200, 'Examiner retrieved evidence queue');
    const itemsAfter = examinerEvAfter.data?.items || examinerEvAfter.data || [];
    const foundAfter = itemsAfter.find(e => e.id === evidenceId);
    assert(foundAfter != null, 'Assigned claim evidence is now VISIBLE in examiner evidence queue');
    assert(foundAfter?.claim != null, 'Evidence record includes attached claim metadata');
    assert(foundAfter?.url != null, 'Evidence record contains working image URL');

    // 8. Test Direct Authenticated Image Streaming via Query Token
    console.log('\n8. Testing authenticated image stream with ?token=... (Browser <img> compatibility)...');
    const streamAfter = await request(`/evidence/${evidenceId}/file?token=${encodeURIComponent(examinerToken)}`);
    assert(streamAfter.status === 200, 'Image streamed successfully via ?token= query parameter (200 OK)');
    assert(streamAfter.headers['content-type']?.includes('image'), `Content-Type is image/*: ${streamAfter.headers['content-type']}`);
    assert(streamAfter.buffer.length > 0, `Streamed ${streamAfter.buffer.length} bytes of image data`);

    // 9. Test Evidence Metadata & Analysis Endpoint
    console.log('\n9. Testing evidence metadata & AI analysis endpoint...');
    const evDetail = await request(`/evidence/${evidenceId}`, { token: examinerToken });
    assert(evDetail.status === 200, 'Examiner retrieved evidence metadata (200 OK)');
    assert(evDetail.data?.sha256 != null, 'SHA-256 cryptographic digest present');

    // 10. Summary
    console.log(`\n========================================`);
    console.log(`E2E Verification Finished: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('E2E Verification failed:', err);
    process.exit(1);
  }
}

run();
