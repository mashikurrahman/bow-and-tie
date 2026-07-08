import { useStore } from '../store/StoreContext'

export default function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
