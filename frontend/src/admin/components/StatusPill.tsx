const map: Record<string, string> = {
  Processing: 'pill-yellow',
  Confirmed: 'pill-blue',
  Shipped: 'pill-purple',
  Delivered: 'pill-green',
  Cancelled: 'pill-red',
  'Return Requested': 'pill-yellow',
  Returned: 'pill-grey',
  Requested: 'pill-yellow',
  Approved: 'pill-blue',
  Rejected: 'pill-red',
  Refunded: 'pill-green',
  Paid: 'pill-green',
  Unpaid: 'pill-yellow',
  cod: 'pill-grey',
  bkash: 'pill-purple',
  nagad: 'pill-yellow',
}

export default function StatusPill({ status, label }: { status: string; label?: string }) {
  return <span className={`pill ${map[status] ?? 'pill-grey'}`}>{label ?? status}</span>
}
