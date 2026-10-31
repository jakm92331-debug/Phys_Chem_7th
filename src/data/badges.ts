import type { Badge } from '@/types/content'

/**
 * Achievement badges. Every badge is tied to a meaningful learning action —
 * never to raw clicks. Earning rules live in `evaluateBadges` inside the
 * progress store so they stay testable.
 */
export const BADGES: Badge[] = [
  {
    id: 'first-steps',
    title: 'أولى الخطوات',
    description: 'بدأت رحلتك العلمية وأكملت أول مرحلة تعلّم.',
    icon: 'rocket',
    condition: 'أكمل أول مرحلة في أيّ درس',
  },
  {
    id: 'lab-explorer',
    title: 'مستكشف المختبر',
    description: 'أنجزت أول مهمّة في المختبر التفاعلي.',
    icon: 'flask',
    condition: 'أنجز مهمّة واحدة في المختبر التفاعلي',
  },
  {
    id: 'lab-master',
    title: 'باحث المختبر',
    description: 'أنجزت ثلاث مهام مختبرية — أنت تجرّب كالعلماء!',
    icon: 'compass',
    condition: 'أنجز 3 مهام في المختبر التفاعلي',
  },
  {
    id: 'sharp-mind',
    title: 'عقل حادّ',
    description: 'حقّقت نتيجة ممتازة (80٪ فأكثر) في اختبار درس.',
    icon: 'target',
    condition: 'احصل على 80٪ فأكثر في «اختبر نفسك»',
  },
  {
    id: 'first-lesson',
    title: 'أول إنجاز',
    description: 'أكملت درسك الأول بالكامل من البداية إلى الملخص.',
    icon: 'award',
    condition: 'أكمل درساً كاملاً بجميع مراحله',
  },
  {
    id: 'xp-300',
    title: 'نجم صاعد',
    description: 'جمعت 300 نقطة خبرة من أنشطة تعلّم حقيقية.',
    icon: 'flame',
    condition: 'اجمع 300 نقطة خبرة',
  },
]

export function getBadge(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id)
}
