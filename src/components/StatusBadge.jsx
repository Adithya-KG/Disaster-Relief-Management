const styleByValue = {
  'Critical Level': 'badge badge-critical',
  critical: 'badge badge-critical',
  high: 'badge badge-warning',
  medium: 'badge badge-neutral',
  low: 'badge badge-calm',
  Normal: 'badge badge-calm',
  available: 'badge badge-calm',
  standby: 'badge badge-neutral',
  assigned: 'badge badge-warning',
  pending: 'badge badge-warning',
  in_transit: 'badge badge-calm',
};

export default function StatusBadge({ value }) {
  return <span className={styleByValue[value] || 'badge badge-neutral'}>{value}</span>;
}
