import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { ProviderAccessRequest } from '../src/models/ProviderAccessRequest.js';
import { Organization } from '../src/models/Organization.js';
import { ProviderConfig } from '../src/models/ProviderConfig.js';

describe('Password Management, Provider Activation & Reset Suite', () => {
  let server;
  let baseUrl;
  let adminToken;
  let operatorToken;
  let verifierToken;

  const testProviderEmail = `test-prv-${Date.now()}@provider.mock`;
  const testVerifierEmail = `test-ver-${Date.now()}@verifier.mock`;
  let providerRequestId;
  let generatedProviderPassword;

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
    assert.equal(adminLoginRes.status, 200, 'Admin login should succeed');
    const adminData = await adminLoginRes.json();
    adminToken = adminData.data.token;
  });

  after(async () => {
    // Cleanup created test records
    await User.deleteMany({ email: { $in: [testProviderEmail, testVerifierEmail] } });
    if (providerRequestId) {
      await ProviderAccessRequest.findByIdAndDelete(providerRequestId);
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  });

  test('1. Provider Request Creation and Approval with Auto-Generated Password', async () => {
    // Create provider request
    const reqRes = await fetch(`${baseUrl}/provider-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerName: 'Auto Pass Provider',
        providerCategory: 'Insurance',
        officialEmail: testProviderEmail,
        contactPersonName: 'Vikram Mehta',
        designation: 'Tech Lead',
        contactPhone: '+91 98765 43210',
        website: 'https://autopass.mock',
        serviceOfferings: 'Auto insurance policy verification',
        agreedToTerms: true,
      }),
    });
    assert.equal(reqRes.status, 201);
    const reqData = await reqRes.json();
    providerRequestId = reqData.data._id;

    // Admin approves provider request without explicit password -> triggers auto-generate
    const reviewRes = await fetch(`${baseUrl}/admin/provider-requests/${providerRequestId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'APPROVED',
        reviewNote: 'Verified documents.',
      }),
    });

    assert.equal(reviewRes.status, 200);
    const reviewData = await reviewRes.json();
    assert.equal(reviewData.success, true);
    assert.ok(reviewData.data.account, 'Account credentials must be returned upon approval');
    assert.equal(reviewData.data.account.email, testProviderEmail);
    assert.ok(reviewData.data.account.initialPassword, 'A secure password must be auto-generated');
    assert.ok(reviewData.data.account.initialPassword.length >= 8, 'Generated password must be >= 8 chars');
    generatedProviderPassword = reviewData.data.account.initialPassword;

    // Provider operator logs in using the generated password
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testProviderEmail,
        password: generatedProviderPassword,
      }),
    });

    assert.equal(loginRes.status, 200, 'Provider operator must be able to log in with generated password');
    const loginData = await loginRes.json();
    assert.equal(loginData.data.user.role, 'operator');
    operatorToken = loginData.data.token;
  });

  test('2. Provider Operator Changes Password using /auth/change-password', async () => {
    // Attempt with invalid current password should fail
    const failRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword123!',
        newPassword: 'BrandNewPassword456!',
      }),
    });
    assert.equal(failRes.status, 400);

    // Attempt with valid current password should succeed
    const successRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        currentPassword: generatedProviderPassword,
        newPassword: 'BrandNewPassword456!',
      }),
    });
    assert.equal(successRes.status, 200);
    const successData = await successRes.json();
    assert.equal(successData.success, true);

    // Log in with new password
    const newLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testProviderEmail,
        password: 'BrandNewPassword456!',
      }),
    });
    assert.equal(newLoginRes.status, 200, 'Must log in with newly updated password');
  });

  test('3. Admin Resets Provider Password using /admin/provider-requests/:id/reset-password', async () => {
    const resetRes = await fetch(`${baseUrl}/admin/provider-requests/${providerRequestId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({}),
    });

    assert.equal(resetRes.status, 200);
    const resetData = await resetRes.json();
    assert.equal(resetData.success, true);
    assert.ok(resetData.data.account.newPassword, 'New password must be generated');
    const resetPass = resetData.data.account.newPassword;

    // Login with the reset password
    const resetLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testProviderEmail,
        password: resetPass,
      }),
    });
    assert.equal(resetLoginRes.status, 200, 'Provider operator must be able to log in with reset password');
  });

  test('4. Organization Verifier Changes Password using /auth/change-password', async () => {
    // Login as Delhi University Verifier
    const duLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'verifier@delhiuniversity.ac.in',
        password: 'DemoPassword123!',
      }),
    });
    assert.equal(duLoginRes.status, 200);
    const duData = await duLoginRes.json();
    verifierToken = duData.data.token;

    // Change password
    const changeRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifierToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'DemoPassword123!',
        newPassword: 'UpdatedVerifierPass123!',
      }),
    });
    assert.equal(changeRes.status, 200);

    // Verify login with new password
    const checkLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'verifier@delhiuniversity.ac.in',
        password: 'UpdatedVerifierPass123!',
      }),
    });
    assert.equal(checkLoginRes.status, 200);
    const checkData = await checkLoginRes.json();
    const newVerifierToken = checkData.data.token;

    // Restore original DemoPassword123! so seed demo credentials remain intact
    const restoreRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newVerifierToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'UpdatedVerifierPass123!',
        newPassword: 'DemoPassword123!',
      }),
    });
    assert.equal(restoreRes.status, 200);
  });

  test('5. Setting Provider Health to Unavailable blocks Operator login, restoring Online restores access', async () => {
    // 1. Fetch CBSE operator and its provider config
    const cbseOperator = await User.findOne({ email: 'operator@cbse.gov.in' });
    assert.ok(cbseOperator, 'CBSE operator must exist');

    const cbseConfig = await ProviderConfig.findOne({ organizationId: cbseOperator.organizationId });
    assert.ok(cbseConfig, 'CBSE provider config must exist');

    // 2. Set CBSE provider health to Unavailable (Offline)
    const offlineRes = await fetch(`${baseUrl}/admin/provider-configs/${cbseConfig._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ healthState: 'Unavailable' }),
    });
    assert.equal(offlineRes.status, 200);

    // 3. Try to log in as CBSE operator -> must be rejected with 403
    const blockedLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@cbse.gov.in',
        password: 'DemoPassword123!',
      }),
    });
    assert.equal(blockedLoginRes.status, 403, 'Login must be blocked with 403 when provider is Unavailable');
    const blockedData = await blockedLoginRes.json();
    assert.ok(
      ['PROVIDER_OFFLINE', 'ORGANIZATION_SUSPENDED', 'ACCOUNT_INACTIVE'].includes(blockedData.error?.code),
      `Expected offline error code but got ${blockedData.error?.code}`
    );

    // 4. Restore provider health to Online
    const onlineRes = await fetch(`${baseUrl}/admin/provider-configs/${cbseConfig._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ healthState: 'Online' }),
    });
    assert.equal(onlineRes.status, 200);

    // 5. Try to log in again -> must succeed with 200
    const allowedLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@cbse.gov.in',
        password: 'DemoPassword123!',
      }),
    });
    assert.equal(allowedLoginRes.status, 200, 'Login must succeed when provider is restored Online');
    const allowedData = await allowedLoginRes.json();
    assert.equal(allowedData.data.user.email, 'operator@cbse.gov.in');
  });
});
