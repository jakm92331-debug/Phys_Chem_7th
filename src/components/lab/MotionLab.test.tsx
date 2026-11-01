import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MotionLab } from './MotionLab'
import { ProgressProvider } from '@/state/progress'
import { findArabicUnits } from '@/lib/content-standards'
import type { LabMission } from '@/types/content'
import { MATH_PROBE } from '@/test/probe'

const MISSIONS: LabMission[] = [
  { id: 'motion-try-speeds', title: 'مجرّب السرعات', description: 'جرّب ثلاث سرعات', xp: 15 },
  { id: 'motion-switch-frame', title: 'عيون أخرى', description: 'بدّل المرجع', xp: 15 },
]

function renderLab() {
  return render(
    <ProgressProvider>
      <MotionLab entryId="lesson-01-motion-rest" missions={MISSIONS} />
    </ProgressProvider>,
  )
}

/**
 * The motion lab is the reference implementation of the unit standard:
 * every live reading must be an English SI symbol, `m/s` included.
 */
describe('MotionLab measurements', () => {
  it('shows the speed readouts in m/s, distances in m and time in s', () => {
    renderLab()
    // both car speed controls
    const sliders = document.querySelectorAll('.lab-slider__out')
    expect(sliders.length).toBe(2)
    for (const slider of sliders) {
      expect(slider.querySelector('.measure[aria-label$=" m/s"]')).toBeInTheDocument()
      expect(slider.querySelector('.measure[aria-label$=" km/h"]')).toBeInTheDocument()
    }

    const readouts = screen.getByLabelText('قياسات حيّة')
    const readoutText = readouts.textContent ?? ''
    expect(readoutText).toContain('s')
    expect(readoutText).toContain('m/s')
    // relative-speed readout is the accent card
    expect(readouts.querySelectorAll('.measure[aria-label$=" m/s"]').length).toBeGreaterThanOrEqual(1)
  })

  it('never prints an Arabic unit anywhere in the lab UI', () => {
    const { container } = renderLab()
    expect(
      findArabicUnits(container.textContent ?? ''),
      'المختبر يجب ألّا يعرض أي وحدة عربية',
    ).toEqual([])
    expect(container.textContent).not.toContain('م/ث')
    expect(container.textContent).not.toContain('كم/ساعة')
  })

  it('explains the prediction challenge with KaTeX and English units', () => {
    renderLab()
    const predict = screen.getByRole('region', { name: 'تحدّي التنبّؤ' })
    expect(predict.querySelector('.katex')).not.toBeNull()
    expect(findArabicUnits(predict.textContent ?? '')).toEqual([])
  })
})

describe('MotionLab: mission copy is maths-aware', () => {
  it('renders the mission title (and description) with KaTeX', () => {
    const missions: LabMission[] = [
      { id: 'm1', title: MATH_PROBE, description: MATH_PROBE, xp: 10 },
      { id: 'm2', title: 'مهمة بلا رياضيات', description: 'وصف بلا رياضيات', xp: 10 },
    ]
    const { container } = render(
      <ProgressProvider>
        <MotionLab entryId="lesson-01-motion-rest" missions={missions} />
      </ProgressProvider>,
    )

    const first = container.querySelectorAll('.lab-missions li')[0]
    expect(first.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2)
    expect(first.textContent).not.toContain('$')
    expect(container.querySelectorAll('.math--error')).toHaveLength(0)
    // mission copy lives inside inline elements → maths stays inline
    expect(first.querySelectorAll('.math--block')).toHaveLength(0)

    // a mission without maths renders as plain text
    const second = container.querySelectorAll('.lab-missions li')[1]
    expect(second.querySelectorAll('.katex')).toHaveLength(0)
    expect(second.textContent).toContain('مهمة بلا رياضيات')
  })
})
