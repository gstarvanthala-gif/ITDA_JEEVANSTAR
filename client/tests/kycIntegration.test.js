import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readClientFile = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('investor mock KYC page is registered and reachable from dashboard navigation', async () => {
  const [app, layout] = await Promise.all([
    readClientFile('../src/App.jsx'),
    readClientFile('../src/layouts/DashboardLayout.jsx'),
  ]);

  assert.match(app, /import KycPage from '\.\/pages\/investor\/KycPage';/);
  assert.match(app, /path="\/investor\/kyc"[\s\S]*?<RoleRoute allowedRoles=\{\['investor'\]\}><KycPage \/><\/RoleRoute>/);
  assert.match(layout, /label: 'KYC', to: '\/investor\/kyc'/);
});

test('KYC API wrappers preserve the investor status and submission contracts', async () => {
  const api = await readClientFile('../src/services/api.js');

  assert.match(api, /export const kycApi = \{\s*getStatus: \(\) => api\.get\('\/kyc\/status'\),\s*submit: \(payload\) => api\.post\('\/kyc\/submit', payload\),\s*\};/);
});

test('admin KYC decisions use verify/reject routes and submit the required note', async () => {
  const [api, dashboard] = await Promise.all([
    readClientFile('../src/services/api.js'),
    readClientFile('../src/pages/admin/AdminDashboard.jsx'),
  ]);

  assert.ok(api.includes("const kycReviewActions = { verified: 'verify', rejected: 'reject' };"));
  assert.ok(api.includes('api.put(`/kyc/${id}/${kycReviewActions[status] || status}`, { reviewNote })'));
  assert.ok(dashboard.includes('await adminApi.reviewKyc(recordId, confirmAction.status, reviewNote.trim())'));
  assert.ok(dashboard.includes('Fictional review note'));
});