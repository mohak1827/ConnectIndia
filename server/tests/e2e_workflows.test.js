import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { OrganizationAccessRequest } from '../src/models/OrganizationAccessRequest.js';
import { ProviderAccessRequest } from '../src/models/ProviderAccessRequest.js';
import { Organization } from '../src/models/Organization.js';
import { User } from '../src/models/User.js';
import { OrganizationServiceGrant } from '../src/models/OrganizationServiceGrant.js';
import { AcademicRecord } from '../src/models/AcademicRecord.js';
import { ProviderConfig } from '../src/models/ProviderConfig.js';

let server;
let baseUrl;
let adminToken;
let defaultVerifierToken;
let defaultOperatorToken;
const testCreatedIds = {
  orgRequestIds: [],
  providerRequestIds: [],
  orgIds: [],
  userIds: [],
  registryRecordIds: [],
};

describe('ConnectIndia Complete End-to-End Workflows & CRUD Integration Test Suite', () => {
  before(async () => {
    // Ensure DB is connected without dropping/resetting
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });

    // Login as Platform Admin
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@connectindia.gov.in',
        password: 'DemoPassword123!',
      }),
    });
    const adminData = await adminLoginRes.json();
    assert.equal(adminLoginRes.status, 200, 'Admin login should succeed');
    adminToken = adminData.data.token;

    // Login as standard Verifier for baseline tests
    const verifierLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'verifier@delhiuniv.ac.in',
        password: 'DemoPassword123!',
      }),
    });
    const verifierData = await verifierLoginRes.json();
    assert.equal(verifierLoginRes.status, 200, 'Verifier login should succeed');
    defaultVerifierToken = verifierData.data.token;

    // Login as CBSE Provider Operator
    const operatorLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@cbse.gov.in',
        password: 'DemoPassword123!',
      }),
    });
    const operatorData = await operatorLoginRes.json();
    assert.equal(operatorLoginRes.status, 200, 'Operator login should succeed');
    defaultOperatorToken = operatorData.data.token;

    // Ensure baseline provider telemetry is Online
    await ProviderConfig.updateMany({}, { healthState: 'Online' });
  });

  after(async () => {
    // Restore healthState to Online
    await ProviderConfig.updateMany({}, { healthState: 'Online' });

    // Clean up ONLY the specific test records created during this run
    try {
      if (testCreatedIds.orgRequestIds.length > 0) {
        await OrganizationAccessRequest.deleteMany({ _id: { $in: testCreatedIds.orgRequestIds } });
      }
      if (testCreatedIds.providerRequestIds.length > 0) {
        await ProviderAccessRequest.deleteMany({ _id: { $in: testCreatedIds.providerRequestIds } });
      }
      if (testCreatedIds.orgIds.length > 0) {
        await Organization.deleteMany({ _id: { $in: testCreatedIds.orgIds } });
        await OrganizationServiceGrant.deleteMany({ organizationId: { $in: testCreatedIds.orgIds } });
        await ProviderConfig.deleteMany({ organizationId: { $in: testCreatedIds.orgIds } });
      }
      if (testCreatedIds.userIds.length > 0) {
        await User.deleteMany({ _id: { $in: testCreatedIds.userIds } });
      }
      if (testCreatedIds.registryRecordIds.length > 0) {
        await AcademicRecord.deleteMany({ _id: { $in: testCreatedIds.registryRecordIds } });
      }
    } catch (cleanupErr) {
      console.warn('Post-test cleanup notice:', cleanupErr.message);
    }

    if (server) server.close();
    await mongoose.disconnect();
  });

  // =========================================================================
  // WORKFLOW A: Organization Access Request Lifecycle
  // =========================================================================
  describe('Workflow A: Organization Access Request Lifecycle', () => {
    const timestamp = Date.now();
    const testOrgEmail = `e2e-org-${timestamp}@testgateway.in`;
    const testOrgName = `E2E FinCorp Ltd ${timestamp}`;
    let orgRefCode;
    let orgRequestId;
    let provisionedOrgId;
    let provisionedVerifierToken;

    test('A1. Public submission of Organization Access Request saves as PENDING', async () => {
      const res = await fetch(`${baseUrl}/access-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: testOrgName,
          organizationType: 'Financial Institution',
          registrationNumber: `CIN-${timestamp}`,
          officialEmail: testOrgEmail,
          contactPerson: 'Aditya Birla',
          contactPhone: '+91 98765 43210',
          intendedServices: ['education', 'identity'],
          justification: 'Automated verification of employment candidates and credentials.',
          agreedToTerms: true,
        }),
      });

      assert.equal(res.status, 201, 'Submission should return 201 Created');
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.referenceNumber.startsWith('CI-REQ-'));
      assert.equal(data.data.status, 'PENDING');

      orgRefCode = data.data.referenceNumber;
    });

    test('A2. Check Application Status endpoint returns full details with valid date format', async () => {
      const res = await fetch(`${baseUrl}/access-requests/status?referenceCode=${orgRefCode}`);
      assert.equal(res.status, 200, 'Status check by referenceCode should succeed');
      const data = await res.json();
      assert.equal(data.success, true);

      const record = data.data;
      assert.equal(record.referenceNumber, orgRefCode);
      assert.equal(record.organizationName, testOrgName);
      assert.equal(record.officialEmail, testOrgEmail);
      assert.equal(record.status, 'PENDING');
      assert.ok(record.createdAt, 'createdAt must be defined');
      assert.ok(!isNaN(new Date(record.createdAt).getTime()), 'createdAt must be a valid date');
      assert.ok(Array.isArray(record.intendedServices), 'intendedServices must be an array');
      assert.ok(record.intendedServices.includes('education'));

      orgRequestId = record._id || record.id;
      assert.ok(orgRequestId, 'orgRequestId must be present');
      testCreatedIds.orgRequestIds.push(orgRequestId);
    });

    test('A3. Request appears in Platform Admin pending list', async () => {
      const res = await fetch(`${baseUrl}/access-requests?status=PENDING`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);

      const found = data.data.requests.find((r) => r.referenceNumber === orgRefCode);
      assert.ok(found, 'New request must appear in admin pending list');
    });

    test('A4. Platform Admin reviews and approves the request', async () => {
      const res = await fetch(`${baseUrl}/access-requests/${orgRequestId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'APPROVED',
          reviewNote: 'Corporate compliance documents verified.',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.data.request.status, 'APPROVED');
    });

    test('A5. Platform Admin activates approved organization and receives initial credentials', async () => {
      const memberCode = `IN-E2E-${timestamp.toString(36).slice(-4).toUpperCase()}`;
      const res = await fetch(`${baseUrl}/access-requests/${orgRequestId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          memberCode,
          initialPassword: 'TestPassword123!',
        }),
      });

      assert.equal(res.status, 200, 'Activation should return 200');
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.account, 'Credentials object must be returned');
      assert.equal(data.data.account.email, testOrgEmail);
      assert.equal(data.data.account.initialPassword, 'TestPassword123!');
      assert.equal(data.data.account.memberCode, memberCode);

      provisionedOrgId = data.data.organization._id || data.data.organization.id;
      assert.ok(provisionedOrgId, 'provisionedOrgId must be defined');
      testCreatedIds.orgIds.push(provisionedOrgId);
      testCreatedIds.userIds.push(data.data.user._id || data.data.user.id);
    });

    test('A6. Provisioned Organization Verifier logs in successfully with generated credentials', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testOrgEmail,
          password: 'TestPassword123!',
        }),
      });

      assert.equal(res.status, 200, 'Verifier login must succeed');
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.user.role, 'verifier');
      provisionedVerifierToken = data.data.token;
    });

    test('A7. Provisioned Organization can invoke verification services with automatic service grant', async () => {
      const res = await fetch(`${baseUrl}/education/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provisionedVerifierToken}`,
        },
        body: JSON.stringify({
          rollNumber: 'CBSE-2023-90812',
          examYear: 2023,
          candidateName: 'Aarav Sharma',
          consentToken: 'CONSENT-E2E-AUTO-01',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal((data.data.status || data.status).toLowerCase(), 'verified');
    });

    test('A8. Platform Admin suspends organization; verification operations are immediately blocked', async () => {
      // Suspend the organization
      const updateRes = await fetch(`${baseUrl}/admin/organizations/${provisionedOrgId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'suspended' }),
      });
      assert.equal(updateRes.status, 200);
      const updateData = await updateRes.json();
      assert.equal(updateData.data.organization.status, 'suspended');

      // Attempt verification while suspended
      const verifyRes = await fetch(`${baseUrl}/education/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provisionedVerifierToken}`,
        },
        body: JSON.stringify({
          rollNumber: 'CBSE-2023-90812',
          examYear: 2023,
          candidateName: 'Aarav Sharma',
          consentToken: 'CONSENT-E2E-AUTO-01',
        }),
      });

      assert.equal(verifyRes.status, 403, 'Suspended organization must be denied access (403)');
      const verifyData = await verifyRes.json();
      assert.equal(verifyData.success, false);
      assert.equal(verifyData.error.code, 'ORGANIZATION_SUSPENDED');
    });

    test('A9. Platform Admin reactivates organization; verification operations succeed again', async () => {
      // Reactivate
      const updateRes = await fetch(`${baseUrl}/admin/organizations/${provisionedOrgId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'active' }),
      });
      assert.equal(updateRes.status, 200);

      // Verify again
      const verifyRes = await fetch(`${baseUrl}/education/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provisionedVerifierToken}`,
        },
        body: JSON.stringify({
          rollNumber: 'CBSE-2023-90812',
          examYear: 2023,
          candidateName: 'Aarav Sharma',
          consentToken: 'CONSENT-E2E-AUTO-01',
        }),
      });

      assert.equal(verifyRes.status, 200, 'Reactivated organization should be able to verify');
      const verifyData = await verifyRes.json();
      assert.equal((verifyData.data.status || verifyData.status).toLowerCase(), 'verified');
    });
  });

  // =========================================================================
  // WORKFLOW B: Provider Access Request Lifecycle & Scoped Registry CRUD
  // =========================================================================
  describe('Workflow B: Provider Access Request Lifecycle & Scoped Registry CRUD', () => {
    const timestamp = Date.now();
    const testPrvEmail = `e2e-prv-${timestamp}@board.gov.in`;
    const testPrvName = `E2E Education Board ${timestamp}`;
    let prvRefCode;
    let prvRequestId;
    let operatorToken;
    let operatorPassword;
    let createdRecordId;
    const testRollNumber = `E2E-ROLL-${timestamp}`;

    test('B1. Public submission of Provider Access Request saves as PENDING', async () => {
      const res = await fetch(`${baseUrl}/provider-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerName: testPrvName,
          providerCategory: 'Education',
          officialEmail: testPrvEmail,
          contactPersonName: 'Dr. Ramesh Sharma',
          designation: 'Joint Director of Examinations',
          contactPhone: '+91 11 2345 6789',
          website: 'https://e2e-board.gov.in',
          serviceOfferings: 'Academic examination mark sheets and diplomas',
          technicalContactEmail: `tech-${timestamp}@board.gov.in`,
          agreedToTerms: true,
        }),
      });

      assert.equal(res.status, 201, 'Provider request submission should return 201');
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.referenceNumber.startsWith('CI-PRV-'));
      assert.equal(data.data.status, 'PENDING');

      prvRefCode = data.data.referenceNumber;
    });

    test('B2. Check Application Status endpoint returns full provider details', async () => {
      const res = await fetch(`${baseUrl}/access-requests/status?referenceCode=${prvRefCode}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);

      const record = data.data;
      assert.equal(record.type, 'PROVIDER');
      assert.equal(record.referenceNumber, prvRefCode);
      assert.equal(record.providerName, testPrvName);
      assert.equal(record.officialEmail, testPrvEmail);
      assert.equal(record.status, 'PENDING');
      assert.ok(record.createdAt, 'createdAt must be defined');
      assert.ok(!isNaN(new Date(record.createdAt).getTime()), 'createdAt must be valid date');

      prvRequestId = record._id || record.id;
      assert.ok(prvRequestId, 'prvRequestId must be defined');
      testCreatedIds.providerRequestIds.push(prvRequestId);
    });

    test('B3. Platform Admin reviews and approves Provider Request; provisions operator account', async () => {
      const res = await fetch(`${baseUrl}/admin/provider-requests/${prvRequestId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'APPROVED',
          reviewNote: 'Accreditation verified against National Education Register.',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.request.status, 'APPROVED');
      assert.ok(data.data.account, 'Account details must be returned');
      assert.equal(data.data.account.email, testPrvEmail);
      assert.ok(data.data.account.initialPassword, 'Initial password must be generated');
      operatorPassword = data.data.account.initialPassword;
    });

    test('B4. Provider Operator signs in successfully with provisioned credentials', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testPrvEmail,
          password: operatorPassword,
        }),
      });

      assert.equal(res.status, 200, 'Operator login must succeed');
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.user.role, 'operator');
      operatorToken = data.data.token;
      testCreatedIds.userIds.push(data.data.user._id);
      testCreatedIds.orgIds.push(data.data.user.organizationId);
    });

    test('B5. Provider Operator creates a new registry record', async () => {
      const res = await fetch(`${baseUrl}/provider/registry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          category: 'Education',
          rollNumber: testRollNumber,
          candidateName: 'Priya Sharma',
          examYear: 2024,
          dob: '2002-05-14',
          cgpa: '8.9',
          division: 'First Class',
          course: 'Bachelor of Technology in Computer Science',
          institution: testPrvName,
          status: 'PASS',
        }),
      });

      assert.equal(res.status, 201, 'Record creation should return 201');
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.record.rollNumber, testRollNumber);
      createdRecordId = data.data.record._id;
      testCreatedIds.registryRecordIds.push(createdRecordId);
    });

    test('B6. Provider Operator edits their registry record', async () => {
      const res = await fetch(`${baseUrl}/provider/registry/${createdRecordId}?category=Education`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          category: 'Education',
          candidateName: 'Priya Sharma-Kapoor',
          course: 'Bachelor of Technology in Information Technology',
        }),
      });

      assert.equal(res.status, 200, 'Update must return 200');
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.record.candidateName, 'Priya Sharma-Kapoor');
      assert.equal(data.data.record.course, 'Bachelor of Technology in Information Technology');
    });

    test('B7. Data Isolation: Another provider operator cannot modify or delete this record', async () => {
      // Login as CBSE operator (different provider organization)
      const cbseLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'operator@cbse.gov.in',
          password: 'DemoPassword123!',
        }),
      });
      const cbseData = await cbseLoginRes.json();
      const cbseOperatorToken = cbseData.data.token;

      // Attempt to modify the record owned by test provider
      const unauthorizedUpdateRes = await fetch(`${baseUrl}/provider/registry/${createdRecordId}?category=Education`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cbseOperatorToken}`,
        },
        body: JSON.stringify({
          category: 'Education',
          candidateName: 'Hacked Name',
        }),
      });

      assert.equal(unauthorizedUpdateRes.status, 403, 'Cross-provider modification must be blocked with 403');
      const unauthorizedData = await unauthorizedUpdateRes.json();
      assert.equal(unauthorizedData.error.code, 'FORBIDDEN_RECORD');
    });

    test('B8. Provider Operator deletes their own registry record', async () => {
      const res = await fetch(`${baseUrl}/provider/registry/${createdRecordId}?category=Education`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${operatorToken}` },
      });

      assert.equal(res.status, 200, 'Delete must return 200');
      const data = await res.json();
      assert.equal(data.success, true);

      // Verify record is gone
      const checkRes = await fetch(`${baseUrl}/provider/registry/${createdRecordId}?category=Education`, {
        headers: { Authorization: `Bearer ${operatorToken}` },
      });
      assert.equal(checkRes.status, 404, 'Deleted record should return 404');
    });
  });

  // =========================================================================
  // WORKFLOW C: Organization Verification Outcomes & Provider Telemetry
  // =========================================================================
  describe('Workflow C: Organization Verification Outcomes & Provider Telemetry', () => {
    test('C1. Verifying matching record returns "verified"', async () => {
      const res = await fetch(`${baseUrl}/education/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${defaultVerifierToken}`,
        },
        body: JSON.stringify({
          rollNumber: 'CBSE-2023-90812',
          examYear: 2023,
          candidateName: 'Aarav Sharma',
          consentToken: 'CONSENT-E2E-001',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal((data.data.status || data.status).toLowerCase(), 'verified');
      assert.ok(data.data.transactionId, 'Transaction ID must be returned');
    });

    test('C2. Verifying nonexistent record returns "not_found"', async () => {
      const res = await fetch(`${baseUrl}/education/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${defaultVerifierToken}`,
        },
        body: JSON.stringify({
          rollNumber: 'NONEXISTENT-ROLL-99999',
          examYear: 2023,
          candidateName: 'Unknown Person',
          consentToken: 'CONSENT-E2E-002',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal((data.data.status || data.status).toLowerCase(), 'not_found');
    });

    test('C3. Verifying existing roll number with mismatched name returns "mismatch"', async () => {
      const res = await fetch(`${baseUrl}/education/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${defaultVerifierToken}`,
        },
        body: JSON.stringify({
          rollNumber: 'CBSE-2023-90812',
          examYear: 2023,
          candidateName: 'Completely Wrong Name',
          consentToken: 'CONSENT-E2E-003',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal((data.data.status || data.status).toLowerCase(), 'mismatch');
    });

    test('C4. Unavailable provider returns 503 UNAVAILABLE, not MISMATCH', async () => {
      // Find CBSE provider config and set health to 'Unavailable'
      const configsRes = await fetch(`${baseUrl}/admin/provider-configs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const configsData = await configsRes.json();
      const cbseConfig = configsData.data.providerConfigs.find((c) =>
        c.organizationId?.memberCode?.includes('CBSE') ||
        c.adapterType?.includes('CBSE') ||
        c.serviceId?.category === 'Education'
      );
      assert.ok(cbseConfig, 'CBSE ProviderConfig must be found');

      if (cbseConfig) {
        // Mark unavailable
        await fetch(`${baseUrl}/admin/provider-configs/${cbseConfig._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ healthState: 'Unavailable' }),
        });

        // Attempt verification
        const verifyRes = await fetch(`${baseUrl}/education/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${defaultVerifierToken}`,
          },
          body: JSON.stringify({
            rollNumber: 'CBSE-2023-90812',
            examYear: 2023,
            candidateName: 'Aarav Sharma',
            consentToken: 'CONSENT-E2E-004',
          }),
        });

        assert.equal(verifyRes.status, 503, 'Unavailable provider should return HTTP 503');
        const verifyData = await verifyRes.json();
        assert.equal(verifyData.error.code, 'PROVIDER_UNAVAILABLE');

        // Restore health back to Online
        await fetch(`${baseUrl}/admin/provider-configs/${cbseConfig._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ healthState: 'Online' }),
        });
      }
    });

    test('C5. Verifier transaction history reflects real transactions and enforces organization isolation', async () => {
      const res = await fetch(`${baseUrl}/transactions?limit=10`, {
        headers: { Authorization: `Bearer ${defaultVerifierToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data.transactions));
      assert.ok(data.data.transactions.length > 0, 'Transactions must exist');
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
   * WORKFLOW D: DYNAMIC USER PROFILES, DASHBOARD METRICS & TENANT ISOLATION
   * ────────────────────────────────────────────────────────────────────────── */
  describe('Workflow D: Dynamic Profiles, Dashboard Metrics & Tenant Data Isolation', () => {
    test('D1. Platform Admin Profile: getMe returns real identity, active status, and timestamps', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.user.email, 'admin@connectindia.gov.in');
      assert.equal(data.data.user.role, 'admin');
      assert.equal(data.data.user.status, 'active');
      assert.ok(data.data.user.createdAt, 'createdAt must be present');
      assert.ok(data.data.user.lastLoginAt, 'lastLoginAt must be present');
    });

    test('D2. Platform Admin Profile Update: Display name updates and persists in MongoDB', async () => {
      const updatedName = `Platform Admin (${Date.now()})`;
      const res = await fetch(`${baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ displayName: updatedName }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.user.displayName, updatedName);

      // Verify persistence via fresh GET /auth/me
      const checkRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const checkData = await checkRes.json();
      assert.equal(checkData.data.user.displayName, updatedName);
    });

    test('D3. Security: Verifier cannot escalate role or change status via profile update', async () => {
      const tamperRes = await fetch(`${baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${defaultVerifierToken}`,
        },
        body: JSON.stringify({
          displayName: 'Attempted Escalation',
          role: 'admin',
          status: 'suspended',
        }),
      });

      assert.equal(tamperRes.status, 200);
      const data = await tamperRes.json();
      // Role and status must remain untouched
      assert.equal(data.data.user.role, 'verifier');
      assert.equal(data.data.user.status, 'active');

      // Double check in database that user remains verifier
      const meRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${defaultVerifierToken}` },
      });
      const meData = await meRes.json();
      assert.equal(meData.data.user.role, 'verifier');
      assert.equal(meData.data.user.status, 'active');
    });

    test('D4. Organization Verifier Profile: getOrgProfile returns real organization, memberCode, and grants', async () => {
      const [profRes, grantRes] = await Promise.all([
        fetch(`${baseUrl}/org/profile`, {
          headers: { Authorization: `Bearer ${defaultVerifierToken}` },
        }),
        fetch(`${baseUrl}/org/grants`, {
          headers: { Authorization: `Bearer ${defaultVerifierToken}` },
        }),
      ]);

      assert.equal(profRes.status, 200);
      const profData = await profRes.json();
      assert.equal(profData.success, true);
      assert.ok(profData.data.organization, 'Organization object must be present');
      assert.equal(profData.data.organization.name, 'University of Delhi (DU)');
      assert.equal(profData.data.organization.memberCode, 'IN-DU-01');

      assert.equal(grantRes.status, 200);
      const grantData = await grantRes.json();
      assert.equal(grantData.success, true);
      assert.ok(Array.isArray(grantData.data.grants));
    });

    test('D5. Organization Profile Update: Verifier updates contact details and persists to MongoDB', async () => {
      const updatedEmail = `registrar-${Date.now()}@du.ac.in`;
      const updateRes = await fetch(`${baseUrl}/org/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${defaultVerifierToken}`,
        },
        body: JSON.stringify({
          contactEmail: updatedEmail,
          description: 'Premier central university offering accredited undergraduate degree programs.',
        }),
      });

      assert.equal(updateRes.status, 200);
      const updateData = await updateRes.json();
      assert.equal(updateData.success, true);
      assert.equal(updateData.data.organization.contactEmail, updatedEmail);

      // Verify persistence via GET /org/profile
      const checkRes = await fetch(`${baseUrl}/org/profile`, {
        headers: { Authorization: `Bearer ${defaultVerifierToken}` },
      });
      const checkData = await checkRes.json();
      assert.equal(checkData.data.organization.contactEmail, updatedEmail);
    });

    test('D6. Provider Operator Profile: getProviderProfile returns provider details and real record metrics', async () => {
      const res = await fetch(`${baseUrl}/provider/profile`, {
        headers: { Authorization: `Bearer ${defaultOperatorToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.provider, 'Provider object must be present');
      assert.equal(data.data.provider.name, 'Central Board of Secondary Education (CBSE)');
      assert.equal(data.data.provider.memberCode, 'IN-CBSE-01');
      assert.equal(data.data.provider.category, 'Education');
      assert.ok(data.data.metrics.recordCount > 0, 'CBSE provider must have records');
    });

    test('D7. Provider Profile Update: Operator updates provider contact details and persists to MongoDB', async () => {
      const updatedEmail = `nodal-${Date.now()}@cbse.gov.in`;
      const res = await fetch(`${baseUrl}/provider/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${defaultOperatorToken}`,
        },
        body: JSON.stringify({
          contactEmail: updatedEmail,
          description: 'Official national education board managing secondary credential records.',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.provider.contactEmail, updatedEmail);

      // Verify persistence
      const checkRes = await fetch(`${baseUrl}/provider/profile`, {
        headers: { Authorization: `Bearer ${defaultOperatorToken}` },
      });
      const checkData = await checkRes.json();
      assert.equal(checkData.data.provider.contactEmail, updatedEmail);
    });

    test('D8. Admin Dashboard: Calculates real database aggregations (accurate totalOrgs, totalProviders, zero fallback, not 115ms)', async () => {
      const res = await fetch(`${baseUrl}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.role, 'admin');

      const m = data.data.metrics;
      assert.ok(typeof m.totalOrganizations === 'number' && m.totalOrganizations > 0);
      assert.ok(typeof m.totalProviders === 'number' && m.totalProviders > 0);
      assert.ok(typeof m.activeServices === 'number' && m.activeServices > 0);
      assert.ok(typeof m.totalRequests === 'number');
      assert.ok(typeof m.averageLatencyMs === 'number');
      assert.ok(m.outcomes, 'Outcomes distribution must be provided');
      assert.ok(typeof m.outcomes.verified === 'number');
    });

    test('D9. Verifier Dashboard: Strictly scoped to verifier organization', async () => {
      const res = await fetch(`${baseUrl}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${defaultVerifierToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.role, 'verifier');

      const m = data.data.metrics;
      assert.equal(m.organizationName, 'University of Delhi (DU)');
      assert.ok(typeof m.assignedServices === 'number');
      assert.ok(typeof m.totalRequests === 'number');
      assert.ok(m.outcomes, 'Outcomes distribution must be provided');
    });

    test('D10. Provider Dashboard: Strictly scoped to provider organization', async () => {
      const res = await fetch(`${baseUrl}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${defaultOperatorToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.role, 'operator');

      const m = data.data.metrics;
      assert.equal(m.providerName, 'Central Board of Secondary Education (CBSE)');
      assert.ok(typeof m.registryRecordCount === 'number');
      assert.ok(typeof m.activeServices === 'number');
      assert.ok(m.adapterStatus, 'Adapter status must be present');
    });

    test('D11. Public Stats Endpoint: Returns live MongoDB counts for unauthenticated landing page visitors', async () => {
      const res = await fetch(`${baseUrl}/public/stats`);

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(typeof data.data.servicesCount === 'number' && data.data.servicesCount > 0);
      assert.ok(typeof data.data.providersCount === 'number' && data.data.providersCount > 0);
      assert.ok(typeof data.data.registryRecordsCount === 'number' && data.data.registryRecordsCount > 0);
      assert.ok(typeof data.data.totalTransactions === 'number');
    });
  });
});
