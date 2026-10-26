import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canViewReports,
  canViewSystemInfo,
  canViewTechnicalDetails,
  roleLabel,
  showsSchoolOnAlerts,
  visibleTabs,
} from '../lib/access.ts';

const staff = { role: 'staff', is_super_admin: false };
const counselor = { role: 'counselor', is_super_admin: false };
const admin = { role: 'admin', is_super_admin: false };
const superAdmin = { role: 'admin', is_super_admin: true };

test('tabs per role', () => {
  assert.deepEqual(visibleTabs(staff), ['alerts', 'profile']);
  assert.deepEqual(visibleTabs(counselor), ['alerts', 'analytics', 'profile']);
  assert.deepEqual(visibleTabs(admin), ['alerts', 'analytics', 'settings', 'profile']);
  assert.deepEqual(visibleTabs(superAdmin), ['alerts', 'analytics', 'settings', 'profile']);
  assert.deepEqual(visibleTabs(null), ['alerts', 'profile']);
});

test('staff never get reports, system info or technical details', () => {
  for (const check of [canViewReports, canViewSystemInfo, canViewTechnicalDetails]) {
    assert.equal(check(staff), false);
    assert.equal(check(null), false);
  }
  assert.equal(canViewReports(counselor), true);
  assert.equal(canViewSystemInfo(counselor), false);
  assert.equal(canViewSystemInfo(admin), true);
});

test('a super admin with any role string still counts as an admin', () => {
  assert.equal(canViewSystemInfo({ role: 'staff', is_super_admin: true }), true);
});

test('only super admins see the school on each alert', () => {
  assert.equal(showsSchoolOnAlerts(superAdmin), true);
  assert.equal(showsSchoolOnAlerts(admin), false);
  assert.equal(showsSchoolOnAlerts(staff), false);
});

test('role labels are sentence case', () => {
  assert.equal(roleLabel(staff), 'Teacher');
  assert.equal(roleLabel(counselor), 'Guidance counselor');
  assert.equal(roleLabel(admin), 'School administrator');
  assert.equal(roleLabel(superAdmin), 'Super administrator');
});
