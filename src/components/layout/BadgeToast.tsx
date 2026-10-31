import { useEffect } from 'react'
import { X } from 'lucide-react'
import { BADGE_ICONS } from '@/components/icons'
import { getBadge } from '@/data/badges'
import { useProgress } from '@/state/progress'
import './BadgeToast.css'

/** Celebrates newly-earned badges. Auto-dismisses; fully dismissible. */
export function BadgeToast() {
  const { state, dismissNewBadges } = useProgress()
  const fresh = state.newBadges
    .map(getBadge)
    .filter((b): b is NonNullable<typeof b> => Boolean(b))

  useEffect(() => {
    if (fresh.length === 0) return
    const id = window.setTimeout(dismissNewBadges, 7000)
    return () => window.clearTimeout(id)
  }, [fresh.length, dismissNewBadges])

  if (fresh.length === 0) return null

  return (
    <div className="badge-toast-stack" role="status" aria-live="polite">
      {fresh.map((badge) => {
        const Icon = BADGE_ICONS[badge.icon]
        return (
          <div key={badge.id} className="badge-toast">
            <span className="badge-toast__icon">
              <Icon size={26} aria-hidden="true" />
            </span>
            <span className="badge-toast__text">
              <strong>شارة جديدة: {badge.title}</strong>
              <span>{badge.description}</span>
            </span>
            <button
              type="button"
              className="badge-toast__close"
              onClick={dismissNewBadges}
              aria-label="إغلاق إشعار الشارة"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
