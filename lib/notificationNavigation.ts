export type PendingAlertAction =
  | { type: 'wait' }
  | { type: 'none' }
  | { type: 'navigate'; alertId: string };

export function resolvePendingAlertAction(options: {
  authChecked: boolean;
  navigationReady: boolean;
  isAuthenticated: boolean;
  pendingAlertId: string | null;
}): PendingAlertAction {
  const {
    authChecked,
    navigationReady,
    isAuthenticated,
    pendingAlertId,
  } = options;
  if (!pendingAlertId) return { type: 'none' };
  if (!authChecked || !navigationReady || !isAuthenticated) {
    return { type: 'wait' };
  }
  return { type: 'navigate', alertId: pendingAlertId };
}
