import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MotionLab } from './MotionLab'
import { ProgressProvider } from '@/state/progress'
import { findArabicUnits } from '@/lib/content-standards'
import type { LabMission } from '@/types/content'

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
      expect(within(slider as HTMLElement).getByText('m/s')).toBeInTheDocument()
      expect(within(slider as HTMLElement).getByText('km/h')).toBeInTheDocument()
    }

    const readouts = screen.getByLabelText('قياسات حيّة')
    const readoutText = readouts.textContent ?? ''
    expect(readoutText).toContain('s')
    expect(readoutText).toContain('m/s')
    // relative-speed readout is the accent card
    expect(within(readouts).getAllByText('m/s').length).toBeGreaterThanOrEqual(1)
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
