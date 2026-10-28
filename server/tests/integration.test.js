import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { seedDatabase } from '../src/db/seed.js';

let server;
let baseUrl;
let verifierToken;
let operatorToken;
let adminToken;

describe('ConnectIndia Interoperability Platform Integration Tests', () => {
  before(async () => {
    // Re-seed DB to known baseline
    await seedDatabase();

    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/v1`;
        resolve();
      });
    });

    // Obtain tokens for roles
    const verifierRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'verifier@delhiuniv.ac.in', password: 'DemoPassword123!' }),
    });
    const verifierData = await verifierRes.json();
    verifierToken = verifierData.data.token;

    const operatorRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@cbse.gov.in', password: 'DemoPassword123!' }),
    });
    const operatorData = await operatorRes.json();
    operatorToken = operatorData.data.token;

    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@connectindia.gov.in', password: 'DemoPassword123!' }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.data.token;
  });

  after(async () => {
    if (server) server.close();
    await mongoose.disconnect();
  });

  test('1. Authentication: Login fails safely for invalid credentials', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'verifier@delhiuniv.ac.in', password: 'WrongPassword!' }),
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'INVALID_CREDENTIALS');
  });

  test('2. RBAC Enforcement: Provider Operator cannot access platform admin endpoints (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/admin/organizations`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'FORBIDDEN');
  });

  test('3. RBAC Enforcement: Platform Admin can access admin endpoints', async () => {
    const res = await fetch(`${baseUrl}/admin/organizations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data.organizations));
  });

  test('4. Verification: Matching fixture returns "verified" status and request ID', async () => {
    const res = await fetch(`${baseUrl}/education/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`,
      },
      body: JSON.stringify({
        rollNumber: 'CBSE-2023-90812',
        examYear: 2023,
        candidateName: 'Aarav Sharma',
        course: 'Class XII Senior Secondary Examination',
        purpose: 'academic_verification',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'verified');
    assert.ok(data.data.requestId.startsWith('REQ-'));
    assert.equal(data.data.record.cgpa, '9.4');
    assert.equal(data.data.disclaimer, 'Demo result — not an official government verification');
  });

  test('5. Verification: Altered details return "mismatch" without declaring fraud', async () => {
    const res = await fetch(`${baseUrl}/education/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`,
      },
      body: JSON.stringify({
        rollNumber: 'CBSE-2023-90812',
        examYear: 2023,
        candidateName: 'Incorrect Name',
        purpose: 'academic_verification',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'mismatch');
    assert.equal(data.data.record, null);
    assert.ok(data.data.explanation.includes('differs'));
  });

  test('6. Resilience: Simulated provider outage returns "unavailable" (503), not mismatch', async () => {
    const res = await fetch(`${baseUrl}/education/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`,
      },
      body: JSON.stringify({
        rollNumber: 'OUTAGE-999',
        examYear: 2023,
        candidateName: 'Aarav Sharma',
        simulateOutage: true,
      }),
    });
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.status, 'unavailable');
  });

  test('7. Policy & Consent: Revoked consent record denies verification (403)', async () => {
    const res = await fetch(`${baseUrl}/education/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`,
      },
      body: JSON.stringify({
        rollNumber: 'CBSE-2022-77291',
        examYear: 2022,
        candidateName: 'Rohan Verma',
        purpose: 'scholarship_evaluation',
      }),
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.status, 'denied');
    assert.equal(data.error.code, 'CONSENT_REVOKED_OR_EXPIRED');
  });

  test('8. Monitoring: Transactions endpoint returns role-scoped activity', async () => {
    const res = await fetch(`${baseUrl}/transactions`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.transactions.length > 0);
  });

  test('9. CSV Export: Generates safe operational metadata without secrets', async () => {
    const res = await fetch(`${baseUrl}/transactions/export`, {
      headers: { Authorization: `Bearer ${verifierToken}` },
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/csv'));
    const text = await res.text();
    assert.ok(text.includes('Request ID'));
    assert.ok(text.includes('CBSE'));
    // Ensure no password hash or secrets are leaked into CSV
    assert.ok(!text.includes('passwordHash'));
    assert.ok(!text.includes('$2a$'));
  });

  test('10. Multi-Sector Verification: Insurance policy returns verified status', async () => {
    const res = await fetch(`${baseUrl}/verify/insurance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        policyNumber: 'INS-HLTH-2024-001234',
        insurerCode: 'DEMO-INSURER-01',
        policyType: 'Health',
        policyHolderRef: 'HOLDER-AK-001',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.status, 'VERIFIED');
    assert.ok(data.data.record);
  });

  test('11. Multi-Sector Verification: Identity document returns verified status', async () => {
    const res = await fetch(`${baseUrl}/verify/identity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        documentRef: 'NID-DEMO-2020-AA1234',
        documentType: 'National ID',
        holderName: 'Aarav Sharma',
        dateOfBirth: '2005-04-12',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.status, 'VERIFIED');
  });

  test('12. Multi-Sector Verification: Employment record returns verified status', async () => {
    const res = await fetch(`${baseUrl}/verify/employment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeRef: 'EMP-TCS-2019-00441',
        employerCode: 'DEMO-EMP-TECH-01',
        employeeName: 'Ramesh Gupta',
        designation: 'Senior Software Engineer',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.status, 'VERIFIED');
  });

  test('13. Multi-Sector Verification: Business registration returns verified status', async () => {
    const res = await fetch(`${baseUrl}/verify/business`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        registrationNumber: 'BIZ-MCA-2018-PVT-77441',
        companyName: 'TechSolutions Corp',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.status, 'VERIFIED');
  });

  test('14. Access Request Workflow: Public submission generates reference code', async () => {
    const res = await fetch(`${baseUrl}/access-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationName: 'HDFC Securities Research',
        organizationType: 'Financial Institution',
        officialEmail: 'compliance@hdfcsec-demo.in',
        contactPersonName: 'Alok Nath',
        designation: 'Compliance Officer',
        contactPhone: '+91 99887 76655',
        reasonForAccess: 'Retail credit assessment and identity checks',
        agreedToTerms: true,
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.referenceNumber);
    assert.equal(data.data.status, 'PENDING');
  });

  test('15. Access Request Workflow: Admin can review and approve application', async () => {
    // 1. List requests
    const listRes = await fetch(`${baseUrl}/access-requests?status=PENDING`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.ok(listData.data.requests.length > 0);

    const targetReq = listData.data.requests[0];

    // 2. Review and approve
    const reviewRes = await fetch(`${baseUrl}/access-requests/${targetReq._id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'APPROVED',
        reviewNote: 'Entity credentials verified against MCA and RBI registry.',
      }),
    });
    assert.equal(reviewRes.status, 200);
    const reviewData = await reviewRes.json();
    assert.equal(reviewData.success, true);
    assert.equal(reviewData.data.request.status, 'APPROVED');
  });

  test('16. Provider Registry CRUD: Operator creates new academic record in database', async () => {
    const res = await fetch(`${baseUrl}/provider/registry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        category: 'Education',
        rollNumber: 'CBSE-2024-TEST99',
        examYear: 2024,
        candidateName: 'Meera Nambiar',
        dob: '2006-03-15',
        course: 'Class XII Senior Secondary Examination',
        institution: 'National Model School, Bangalore',
        issuerCode: 'CBSE',
        cgpa: '9.6',
        division: 'First Class with Distinction',
        status: 'PASS',
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.record.rollNumber, 'CBSE-2024-TEST99');
  });

  test('17. Active Verification Binding: Verifier immediately verifies newly added record', async () => {
    const res = await fetch(`${baseUrl}/education/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`,
      },
      body: JSON.stringify({
        rollNumber: 'CBSE-2024-TEST99',
        examYear: 2024,
        candidateName: 'Meera Nambiar',
        purpose: 'academic_verification',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'verified');
    assert.equal(data.data.record.cgpa, '9.6');
  });

  test('18. Dynamic Outcome: Updating registry record immediately alters subsequent verification', async () => {
    // 1. Operator updates the record's candidateName to 'Meera Nambiar-Rao'
    const listRes = await fetch(`${baseUrl}/provider/registry?search=CBSE-2024-TEST99&category=Education`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const listData = await listRes.json();
    assert.ok(listData.data.records.length > 0);
    const recordId = listData.data.records[0]._id;

    const updateRes = await fetch(`${baseUrl}/provider/registry/${recordId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        category: 'Education',
        candidateName: 'Meera Nambiar-Rao',
      }),
    });
    assert.equal(updateRes.status, 200);

    // 2. Querying with the old candidate name now returns 'mismatch'
    const verifyRes = await fetch(`${baseUrl}/education/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`,
      },
      body: JSON.stringify({
        rollNumber: 'CBSE-2024-TEST99',
        examYear: 2024,
        candidateName: 'Meera Nambiar',
        purpose: 'academic_verification',
      }),
    });
    assert.equal(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.status, 'mismatch');
  });

  test('19. Accuracy: Non-existent record returns "not_found", not fabricated mismatch', async () => {
    const res = await fetch(`${baseUrl}/education/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`,
      },
      body: JSON.stringify({
        rollNumber: 'CBSE-9999-NONEXIST',
        examYear: 2024,
        candidateName: 'Nobody',
        purpose: 'academic_verification',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'not_found');
  });

  test('20. Tenant Isolation: Organization cannot view another org transaction by ID', async () => {
    // Login as Reliance Verifier (different organization than Delhi Univ)
    const relianceRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'verifier@reliance.mock', password: 'DemoPassword123!' }),
    });
    const relianceData = await relianceRes.json();
    const relianceToken = relianceData.data.token;

    // Reliance verifier tries to inspect DU's transaction 'REQ-DEMO-001'
    const res = await fetch(`${baseUrl}/education/requests/REQ-DEMO-001`, {
      headers: { Authorization: `Bearer ${relianceToken}` },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'FORBIDDEN');
  });
});
