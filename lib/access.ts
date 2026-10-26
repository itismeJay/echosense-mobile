export type AppTab = 'alerts' | 'analytics' | 'settings' | 'profile';

export interface AccessUser {
  role: string;
  is_super_admin?: boolean;
}

export function isAdmin(user: AccessUser | null | undefined): boolean {
  return Boolean(user && (user.is_super_admin || user.role === 'admin'));
}

/** Reports read /logs/stats; counselors and admins only. */
export function canViewReports(user: AccessUser | null | undefined): boolean {
  return Boolean(user && (isAdmin(user) || user.role === 'counselor'));
}

export function canViewSystemInfo(user: AccessUser | null | undefined): boolean {
  return isAdmin(user);
}

export function canViewTechnicalDetails(
  user: AccessUser | null | undefined
): boolean {
  return isAdmin(user);
}

/** Super admins see every school, so each alert shows its school. */
export function showsSchoolOnAlerts(user: AccessUser | null | undefined): boolean {
  return Boolean(user?.is_super_admin);
}

/** Tabs in display order. Staff: Alerts and Profile. */
export function visibleTabs(user: AccessUser | null | undefined): AppTab[] {
  const tabs: AppTab[] = ['alerts'];
  if (canViewReports(user)) tabs.push('analytics');
  if (canViewSystemInfo(user)) tabs.push('settings');
  tabs.push('profile');
  return tabs;
}

export function roleLabel(user: AccessUser | null | undefined): string {
  if (user?.is_super_admin) return 'Super administrator';
  switch ((user?.role ?? '').toLowerCase()) {
    case 'admin':
      return 'School administrator';
    case 'counselor':
      return 'Guidance counselor';
    case 'staff':
      return 'Teacher';
    default:
      return 'Staff';
  }
}
