import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

let server;
let baseUrl;

before(async () => {
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
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
});

async function loginUser(email, password = 'DemoPassword123!') {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  assert.equal(res.status, 200, `Login should succeed for ${email}: ${JSON.stringify(data)}`);
  assert.ok(data.data.token, `Token should be issued for ${email}`);
  return { token: data.data.token, user: data.data.user };
}

test('Verification Scoping & Account Validation Test Suite', async (t) => {
  await t.test('1. Admin (admin@connectindia.gov.in) has full platform access', async () => {
    const { token, user } = await loginUser('admin@connectindia.gov.in');
    assert.equal(user.role, 'admin');

    const res = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.data.metrics.approvedOrganizations >= 1);
  });

  await t.test('2. Provider Operator (operator@cbse.gov.in) is strictly locked to Education', async () => {
    const { token, user } = await loginUser('operator@cbse.gov.in');
    assert.equal(user.role, 'operator');
    assert.equal(user.organization.category, 'Education');

    // Fetch registry records — category defaults and locks to Education
    const res = await fetch(`${baseUrl}/provider/registry`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.data.category, 'Education');
    assert.equal(data.data.idField, 'rollNumber');

    // Attempting to query Insurance should be locked to operator org category
    const resIns = await fetch(`${baseUrl}/provider/registry?category=Insurance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resIns.status, 200);
    const dataIns = await resIns.json();
    assert.equal(dataIns.data.category, 'Education');
  });

  await t.test('3. Provider Operator (operator@insurance.mock) is strictly locked to Insurance', async () => {
    const { token, user } = await loginUser('operator@insurance.mock');
    assert.equal(user.role, 'operator');
    assert.equal(user.organization.category, 'Insurance');

    const res = await fetch(`${baseUrl}/provider/registry`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.data.category, 'Insurance');
    assert.equal(data.data.idField, 'policyNumber');
  });

  await t.test('4. Verifier (verifier@delhiuniversity.ac.in) receives ONLY Education and Identity grants', async () => {
    const { token, user } = await loginUser('verifier@delhiuniversity.ac.in');
    assert.equal(user.role, 'verifier');

    // Get entitled services
    const res = await fetch(`${baseUrl}/org/services`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const services = data.data.services;
    assert.ok(services.length >= 2, 'Should have at least Education and Identity');

    const categories = services.map((s) => s.category);
    assert.ok(categories.includes('Education'), 'Must include Education');
    assert.ok(categories.includes('Identity'), 'Must include Identity');
    assert.ok(!categories.includes('Insurance'), 'Must NOT include Insurance');
    assert.ok(!categories.includes('Employment'), 'Must NOT include Employment');
    assert.ok(!categories.includes('Business'), 'Must NOT include Business');

    // Education verification succeeds
    const eduRes = await fetch(`${baseUrl}/verify/education`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        rollNumber: 'CBSE-2023-90812',
        examYear: 2023,
        candidateName: 'Aarav Sharma',
        purpose: 'academic_verification',
      }),
    });
    assert.equal(eduRes.status, 200);

    // Insurance verification is strictly DENIED by policy engine (no grant)
    const insRes = await fetch(`${baseUrl}/verify/insurance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        policyNumber: 'INS-HLTH-2024-001234',
        insurerCode: 'DEMO-INSURER-01',
        policyType: 'Health',
      }),
    });
    assert.equal(insRes.status, 403, 'Unauthorized sector must return 403');
    const insData = await insRes.json();
    assert.equal(insData.status, 'DENIED');
  });

  await t.test('5. Verifier (verifier@reliance.mock) receives ONLY Insurance and Identity grants', async () => {
    const { token, user } = await loginUser('verifier@reliance.mock');
    assert.equal(user.role, 'verifier');

    const res = await fetch(`${baseUrl}/org/services`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const services = data.data.services;

    const categories = services.map((s) => s.category);
    assert.ok(categories.includes('Insurance'), 'Must include Insurance');
    assert.ok(!categories.includes('Education'), 'Must NOT include Education');
    assert.ok(!categories.includes('Employment'), 'Must NOT include Employment');
    assert.ok(!categories.includes('Business'), 'Must NOT include Business');

    // Insurance verification succeeds
    const insRes = await fetch(`${baseUrl}/verify/insurance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        policyNumber: 'INS-HLTH-2024-001234',
        insurerCode: 'DEMO-INSURER-01',
        policyType: 'Health',
        purpose: 'insurance_verification',
      }),
    });
    assert.equal(insRes.status, 200);

    // Education verification is strictly DENIED (no grant)
    const eduRes = await fetch(`${baseUrl}/verify/education`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        rollNumber: 'CBSE-2023-90812',
        examYear: 2023,
        candidateName: 'Aarav Sharma',
        purpose: 'academic_verification',
      }),
    });
    assert.equal(eduRes.status, 403, 'Unauthorized sector must return 403');
  });

  await t.test('6. Chitkara University (madhav@chitkara.edu.in) has ONLY Education and Identity grants', async () => {
    const { token, user } = await loginUser('madhav@chitkara.edu.in');
    assert.equal(user.role, 'verifier');
    assert.equal(user.organization.name, 'Chitkara University');

    const res = await fetch(`${baseUrl}/org/services`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const services = data.data.services;
    assert.equal(services.length, 2, 'Must have exactly 2 entitled services');

    const categories = services.map((s) => s.category);
    assert.ok(categories.includes('Education'));
    assert.ok(categories.includes('Identity'));
    assert.ok(!categories.includes('Insurance'));
  });
});
