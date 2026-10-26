export type ReviewStatus = 'active' | 'reviewed' | 'resolved';
export type AlertListTab = 'needs-review' | 'all';

export interface ReviewAction {
  status: ReviewStatus;
  label: string;
  primary: boolean;
}

/** Any stored status other than reviewed or resolved still needs review. */
export function normalizeReviewStatus(status: string | null | undefined): ReviewStatus {
  const value = (status ?? '').trim().toLowerCase();
  return value === 'reviewed' || value === 'resolved' ? value : 'active';
}

export function reviewStatusLabel(status: string | null | undefined): string {
  switch (normalizeReviewStatus(status)) {
    case 'reviewed':
      return 'Reviewed';
    case 'resolved':
      return 'Resolved';
    default:
      return 'Needs review';
  }
}

/** The same actions, in the same order, as the web alert detail page. */
export function getReviewActions(status: string | null | undefined): ReviewAction[] {
  switch (normalizeReviewStatus(status)) {
    case 'reviewed':
      return [
        { status: 'resolved', label: 'Mark resolved', primary: true },
        { status: 'active', label: 'Move back to Needs review', primary: false },
      ];
    case 'resolved':
      return [
        { status: 'active', label: 'Move back to Needs review', primary: false },
      ];
    default:
      return [
        { status: 'reviewed', label: 'Mark reviewed', primary: true },
        { status: 'resolved', label: 'Mark resolved', primary: false },
      ];
  }
}

export function buildReviewRequest(
  alertId: number,
  status: ReviewStatus
): { path: string; body: { status: ReviewStatus } } {
  if (!Number.isSafeInteger(alertId) || alertId <= 0) {
    throw new Error('Invalid alert id');
  }
  if (status !== 'active' && status !== 'reviewed' && status !== 'resolved') {
    throw new Error('Invalid review status');
  }
  return { path: `/alerts/${alertId}/review`, body: { status } };
}

export function reviewConfirmation(status: ReviewStatus): string {
  switch (status) {
    case 'reviewed':
      return 'Marked as reviewed.';
    case 'resolved':
      return 'Marked as resolved.';
    default:
      return 'Moved back to Needs review.';
  }
}

/** Query params for the alert list tabs. "All" sends no status filter. */
export function alertListParams(tab: AlertListTab): { status?: ReviewStatus } {
  return tab === 'needs-review' ? { status: 'active' } : {};
}
