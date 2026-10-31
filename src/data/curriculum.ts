import type { CurriculumEntry, StageMeta, Unit } from '@/types/content'

/**
 * The official curriculum structure, transcribed exactly from the textbook
 * table of contents (the only textbook source supplied so far).
 *
 * ⚠️ Do not add, remove, rename or reorder entries without authorization.
 * Titles and page numbers below are the verified part of the platform;
 * lesson *content* lives separately in `src/data/lessons/` and is labelled
 * with its own editorial status.
 */

type EntrySeed = Omit<CurriculumEntry, 'unitId'>

function unit(
  id: string,
  order: number,
  title: string,
  subtitle: string,
  description: string,
  theme: Unit['theme'],
  entries: EntrySeed[],
): Unit {
  return {
    id,
    order,
    title,
    subtitle,
    description,
    theme,
    entries: entries.map((e) => ({ ...e, unitId: id })),
  }
}

export const UNITS: Unit[] = [
  unit(
    'unit-1-motion',
    1,
    'الحركة والتحريك',
    'كيف تتحرّك الأشياء؟ ولماذا؟',
    'رحلة في عالم الحركة والقوى: نصف الحركة ونقيسها، ونكتشف كيف تُغيّر القوى حركة الأجسام، وكيف يساعدنا العمل والآلات البسيطة في إنجاز المهام.',
    {
      primary: '#5B5FEF',
      secondary: '#8B7CF6',
      soft: '#EEF0FE',
      icon: 'motion',
      motif: 'trajectory',
    },
    [
      {
        id: 'lesson-01-motion-rest',
        order: 1,
        kind: 'lesson',
        title: 'الحركة والسكون',
        page: 3,
        slug: 'motion-and-rest',
        contentStatus: 'demo-supplementary',
        teaser: 'متى نقول إن جسماً يتحرّك؟ وهل يمكن أن يكون الجسم متحركاً وساكناً في الوقت نفسه؟',
        estimatedMinutes: 35,
      },
      {
        id: 'lesson-02-force-motion',
        order: 2,
        kind: 'lesson',
        title: 'القوة والحركة',
        page: 17,
        slug: 'force-and-motion',
        contentStatus: 'pending',
        teaser: 'كيف تُحرّك القوى الأجسام وتُوقفها وتُغيّر اتجاهها؟',
        estimatedMinutes: 35,
      },
      {
        id: 'lesson-03-forces-one-line',
        order: 3,
        kind: 'lesson',
        title: 'القوى على حامل واحد',
        page: 29,
        slug: 'forces-on-one-support',
        contentStatus: 'pending',
        teaser: 'ماذا يحدث عندما تؤثّر عدّة قوى في الجسم نفسه وعلى الخطّ نفسه؟',
        estimatedMinutes: 35,
      },
      {
        id: 'lesson-04-work-power',
        order: 4,
        kind: 'lesson',
        title: 'العمل والاستطاعة',
        page: 41,
        slug: 'work-and-power',
        contentStatus: 'pending',
        teaser: 'ما معنى «العمل» في الفيزياء؟ ومن الأسرع في إنجازه؟',
        estimatedMinutes: 35,
      },
      {
        id: 'lesson-05-simple-machines',
        order: 5,
        kind: 'lesson',
        title: 'الآلات البسيطة',
        page: 53,
        slug: 'simple-machines',
        contentStatus: 'pending',
        teaser: 'كيف تساعدنا الروافع والبكرات على رفع أثقال كبيرة بجهد صغير؟',
        estimatedMinutes: 40,
      },
    ],
  ),
  unit(
    'unit-2-pressure',
    2,
    'الضغط ودافعة أرخميدس',
    'أسرار السوائل والطفو',
    'نغوص في عالم الضغط: كيف يتولّد في السوائل، ولماذا تطفو السفن العملاقة بينما يغرق مسمار صغير؟',
    {
      primary: '#0899B8',
      secondary: '#22C3D6',
      soft: '#E7F7FB',
      icon: 'fluid',
      motif: 'waves',
    },
    [
      {
        id: 'lesson-06-pressure',
        order: 6,
        kind: 'lesson',
        title: 'الضغط',
        page: 65,
        slug: 'pressure',
        contentStatus: 'pending',
        teaser: 'لماذا يؤلمك طرف القلم الحادّ أكثر من طرفه الآخر رغم تساوي القوة؟',
        estimatedMinutes: 30,
      },
      {
        id: 'lesson-07-pressure-liquids',
        order: 7,
        kind: 'lesson',
        title: 'الضغط في السوائل',
        page: 71,
        slug: 'pressure-in-liquids',
        contentStatus: 'pending',
        teaser: 'كيف يزداد الضغط كلّما غصنا أعمق في الماء؟',
        estimatedMinutes: 35,
      },
      {
        id: 'lesson-08-archimedes',
        order: 8,
        kind: 'lesson',
        title: 'دافعة أرخميدس',
        page: 81,
        slug: 'archimedes-principle',
        contentStatus: 'pending',
        teaser: 'ما القوة الخفية التي تدفع الأجسام إلى الأعلى داخل الماء؟',
        estimatedMinutes: 40,
      },
      {
        id: 'project-09-transport',
        order: 9,
        kind: 'project',
        title: 'مشروع وسائل النقل',
        page: 92,
        slug: 'project-transport',
        contentStatus: 'pending',
        teaser: 'مشروع الوحدة: صمّم وابحث في وسائل النقل من حولك وعلومها.',
        estimatedMinutes: 60,
      },
    ],
  ),
  unit(
    'unit-3-heat',
    3,
    'المادة والحرارة',
    'طاقة الجسيمات الخفية',
    'نتتبّع الحرارة: ما هي؟ كيف تنتقل من جسم إلى آخر؟ ولماذا تتمدد الأجسام عندما تسخن؟',
    {
      primary: '#EE6423',
      secondary: '#F59E0B',
      soft: '#FDF1E7',
      icon: 'heat',
      motif: 'particles',
    },
    [
      {
        id: 'lesson-10-heat',
        order: 10,
        kind: 'lesson',
        title: 'الحرارة',
        page: 93,
        slug: 'heat',
        contentStatus: 'pending',
        teaser: 'ما الفرق بين الحرارة ودرجة الحرارة؟ وكيف نقيس كليهما؟',
        estimatedMinutes: 35,
      },
      {
        id: 'lesson-11-heat-transfer',
        order: 11,
        kind: 'lesson',
        title: 'انتشار الحرارة',
        page: 101,
        slug: 'heat-transfer',
        contentStatus: 'pending',
        teaser: 'بأيّ طرق تنتقل الحرارة؟ ولماذا نشعر بدفء الشمس رغم بعدها الهائل؟',
        estimatedMinutes: 35,
      },
      {
        id: 'lesson-12-thermal-expansion',
        order: 12,
        kind: 'lesson',
        title: 'تمدد الأجسام بالحرارة',
        page: 111,
        slug: 'thermal-expansion',
        contentStatus: 'pending',
        teaser: 'لماذا تترك المهندسين فواصل صغيرة بين قضبان السكك الحديدية؟',
        estimatedMinutes: 35,
      },
    ],
  ),
  unit(
    'unit-4-matter-energy',
    4,
    'المادة والطاقة',
    'من الذرة إلى الموجة',
    'نستكشف بنية المادة من الداخل: الذرات والعناصر والمركّبات، ثم ننتقل إلى عالم الأمواج الصوتية ونختتم بمشروع عملي.',
    {
      primary: '#A21CAF',
      secondary: '#D946EF',
      soft: '#FBEEFB',
      icon: 'atom',
      motif: 'orbit',
    },
    [
      {
        id: 'lesson-13-atom',
        order: 13,
        kind: 'lesson',
        title: 'الذرة',
        page: 123,
        slug: 'the-atom',
        contentStatus: 'pending',
        teaser: 'ممّ تتكوّن أصغر وحدة بناء للمادة في الكون؟',
        estimatedMinutes: 35,
      },
      {
        id: 'lesson-14-elements-compounds',
        order: 14,
        kind: 'lesson',
        title: 'العناصر والمركبات',
        page: 131,
        slug: 'elements-and-compounds',
        contentStatus: 'pending',
        teaser: 'كيف تتّحد الذرات لتصنع كلّ المواد من حولنا؟',
        estimatedMinutes: 35,
      },
      {
        id: 'lesson-15-sound-waves',
        order: 15,
        kind: 'lesson',
        title: 'الأمواج الصوتية',
        page: 141,
        slug: 'sound-waves',
        contentStatus: 'pending',
        teaser: 'كيف ينتقل صوتك في الهواء ليصل إلى أذن صديقك؟',
        estimatedMinutes: 35,
      },
      {
        id: 'project-16-thermal-keeping',
        order: 16,
        kind: 'project',
        title: 'مشروع المحافظة الحرارية للسوائل',
        page: 155,
        slug: 'project-keeping-liquids-warm',
        contentStatus: 'pending',
        teaser: 'مشروع الوحدة: صمّم حلاً يحافظ على حرارة السوائل أطول وقت ممكن.',
        estimatedMinutes: 60,
      },
    ],
  ),
]

/** All 16 curriculum entries in book order. */
export const ALL_ENTRIES: CurriculumEntry[] = UNITS.flatMap((u) => u.entries).sort(
  (a, b) => a.order - b.order,
)

export const TOTAL_LESSONS = ALL_ENTRIES.filter((e) => e.kind === 'lesson').length
export const TOTAL_PROJECTS = ALL_ENTRIES.filter((e) => e.kind === 'project').length

export function getEntryBySlug(slug: string): CurriculumEntry | undefined {
  return ALL_ENTRIES.find((e) => e.slug === slug)
}

export function getUnitForEntry(entry: CurriculumEntry): Unit {
  const found = UNITS.find((u) => u.id === entry.unitId)
  if (!found) throw new Error(`Unit not found for entry ${entry.id}`)
  return found
}

export function getAdjacentEntries(entry: CurriculumEntry): {
  prev?: CurriculumEntry
  next?: CurriculumEntry
} {
  const idx = ALL_ENTRIES.findIndex((e) => e.id === entry.id)
  return {
    prev: idx > 0 ? ALL_ENTRIES[idx - 1] : undefined,
    next: idx < ALL_ENTRIES.length - 1 ? ALL_ENTRIES[idx + 1] : undefined,
  }
}

/** The seven stages of the reusable lesson learning environment. */
export const LESSON_STAGES: StageMeta[] = [
  {
    id: 'hook',
    title: 'التهيئة والاستكشاف',
    shortTitle: 'ابدأ بالفضول',
    description: 'سؤال يثير فضولك وموقف من حياتك اليومية',
  },
  {
    id: 'discover',
    title: 'اكتشف المفهوم',
    shortTitle: 'اكتشف',
    description: 'شرح متدرّج للمفاهيم العلمية الأساسية',
  },
  {
    id: 'lab',
    title: 'المختبر التفاعلي',
    shortTitle: 'جرّب',
    description: 'تجربة افتراضية تتحكّم فيها بنفسك',
  },
  {
    id: 'check',
    title: 'افهم وتحقق',
    shortTitle: 'تحقّق',
    description: 'أسئلة سريعة تكشف فهمك وتصحّح أفكارك',
  },
  {
    id: 'apply',
    title: 'طبّق ما تعلمت',
    shortTitle: 'طبّق',
    description: 'مواقف من الحياة الحقيقية وتحدّيات عملية',
  },
  {
    id: 'quiz',
    title: 'اختبر نفسك',
    shortTitle: 'اختبر',
    description: 'اختبار قصير مع شرح لكلّ إجابة',
  },
  {
    id: 'summary',
    title: 'ملخص الدرس',
    shortTitle: 'الملخص',
    description: 'الأفكار الكبرى والمفردات العلمية',
  },
]
