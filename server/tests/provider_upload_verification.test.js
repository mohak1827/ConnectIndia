import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { InsurancePolicySample } from '../src/models/InsurancePolicySample.js';
import { Organization } from '../src/models/Organization.js';
import { ProviderConfig } from '../src/models/ProviderConfig.js';

describe('Authoritative Provider Upload & Verification Suite', () => {
  let server;
  let baseUrl;
  let adminToken;
  let providerToken;
  let verifierToken;
  let testOrgId;

  const testPolicyNum = `POL-TEST-${Date.now()}`;

  before(async () => {
    await connectDB();
    const app = createApp();
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    // 1. Login as Admin
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@connectindia.gov.in',
        password: 'DemoPassword123!',
      }),
    });
    assert.equal(adminLoginRes.status, 200);
    const adminData = await adminLoginRes.json();
    adminToken = adminData.data.token;

    // 2. Login as Insurance Provider Operator
    const prvLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@insurance.mock',
        password: 'DemoPassword123!',
      }),
    });
    assert.equal(prvLoginRes.status, 200);
    const prvData = await prvLoginRes.json();
    providerToken = prvData.data.token;
    testOrgId = prvData.data.user.organizationId?._id || prvData.data.user.organizationId || prvData.data.user.organization?._id;

    // 3. Login as Reliance Verifier (entitled to Insurance and Identity)
    const verLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'verifier@reliance.mock',
        password: 'DemoPassword123!',
      }),
    });
    assert.equal(verLoginRes.status, 200);
    const verData = await verLoginRes.json();
    verifierToken = verData.data.token;
  });

  after(async () => {
    await InsurancePolicySample.deleteMany({ policyNumber: testPolicyNum });
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  });

  test('1. Provider Operator uploads new insurance policy record to registry', async () => {
    const createRes = await fetch(`${baseUrl}/provider/registry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`,
      },
      body: JSON.stringify({
        category: 'Insurance',
        policyNumber: testPolicyNum,
        insurerCode: 'DEMO-INS-01',
        insurerName: 'Madhav ins',
        policyType: 'Health',
        policyHolderName: 'Madhav',
        policyHolderRef: 'HOLDER-001',
        status: 'ACTIVE',
        coverageStartDate: '2024-01-01T00:00:00.000Z',
        coverageEndDate: '2028-12-31T00:00:00.000Z',
        sumInsured: '₹5,00,000',
        premiumStatus: 'PAID',
      }),
    });

    assert.equal(createRes.status, 201, 'Should successfully create registry record');
    const createData = await createRes.json();
    assert.equal(createData.success, true);
    assert.equal(createData.data.record.policyNumber, testPolicyNum);
  });

  test('2. Organization Verifier verifies the newly uploaded policy', async () => {
    const verifyRes = await fetch(`${baseUrl}/verify/insurance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`,
      },
      body: JSON.stringify({
        policyNumber: testPolicyNum,
        insurerCode: 'DEMO-INS-01',
        policyType: 'Health Insurance',
        policyHolderRef: 'HOLDER-AK-001',
        purpose: 'insurance_verification',
      }),
    });

    assert.equal(verifyRes.status, 200, 'Verification should succeed with 200 OK');
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.success, true);
    assert.equal(verifyData.status, 'VERIFIED');
    assert.equal(verifyData.data.status, 'VERIFIED');
    assert.equal(verifyData.data.provider, 'Madhav ins');
    assert.equal(verifyData.data.record.policyRef, testPolicyNum);
    assert.equal(verifyData.data.record.policyHolderName, 'Madhav');
    assert.equal(verifyData.data.record.sumInsured, '₹5,00,000');
  });

  test('3. Setting the Provider to Unavailable sets verification to UNAVAILABLE', async () => {
    const config = await ProviderConfig.findOne({
      $or: [{ organizationId: testOrgId }, { organizationId: new mongoose.Types.ObjectId(testOrgId) }],
    });
    assert.ok(config, `ProviderConfig must exist for org ${testOrgId}`);

    // Set offline
    const offlineRes = await fetch(`${baseUrl}/admin/provider-configs/${config._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ healthState: 'Unavailable' }),
    });
    assert.equal(offlineRes.status, 200);

    // Verifier checks same policy -> must return 503 UNAVAILABLE
    const verifyRes = await fetch(`${baseUrl}/verify/insurance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`,
      },
      body: JSON.stringify({
        policyNumber: testPolicyNum,
        insurerCode: 'DEMO-INS-01',
        policyType: 'Health Insurance',
        purpose: 'insurance_verification',
      }),
    });
    assert.equal(verifyRes.status, 503, 'Should return 503 UNAVAILABLE when provider is offline');
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.status, 'UNAVAILABLE');

    // Restore online
    const onlineRes = await fetch(`${baseUrl}/admin/provider-configs/${config._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ healthState: 'Online' }),
    });
    assert.equal(onlineRes.status, 200);

    // Verify again -> must return 200 VERIFIED
    const verifyRestoredRes = await fetch(`${baseUrl}/verify/insurance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`,
      },
      body: JSON.stringify({
        policyNumber: testPolicyNum,
        insurerCode: 'DEMO-INS-01',
        policyType: 'Health Insurance',
        purpose: 'insurance_verification',
      }),
    });
    assert.equal(verifyRestoredRes.status, 200, 'Should return 200 VERIFIED once restored online');
    const restoredData = await verifyRestoredRes.json();
    assert.equal(restoredData.status, 'VERIFIED');
  });
});
