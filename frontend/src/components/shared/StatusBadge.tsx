const statusMap: Record<string, string> = {
  draft: 'badge-gray',
  pending_review: 'badge-yellow',
  published: 'badge-green',
  rejected: 'badge-red',
  archived: 'badge-gray',
  pending: 'badge-yellow',
  completed: 'badge-green',
  failed: 'badge-red',
  refunded: 'badge-blue',
  processing: 'badge-yellow',
  paid: 'badge-green',
  ready: 'badge-green',
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = statusMap[status] || 'badge-gray';
  return <span className={cls}>{status.replace('_', ' ')}</span>;
}
