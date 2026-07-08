import { ORDER_FLOW, type Order } from '../services/db'

export default function StatusTimeline({ order }: { order: Order }) {
  if (order.status === 'Cancelled') {
    return <div className="status-cancelled">This order was cancelled.</div>
  }
  const currentIndex = ORDER_FLOW.indexOf(order.status)
  const timeMap = new Map(order.timeline.map((t) => [t.status, t.at]))

  return (
    <div className="timeline">
      {ORDER_FLOW.map((step, i) => {
        const done = i <= currentIndex
        const at = timeMap.get(step)
        return (
          <div className={`timeline-step ${done ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`} key={step}>
            <div className="timeline-dot">{done ? '✓' : i + 1}</div>
            <div className="timeline-label">
              <strong>{step}</strong>
              {at && <span>{new Date(at).toLocaleDateString()}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
