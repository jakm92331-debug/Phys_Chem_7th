import type { LabMission } from '@/types/content'
import { MotionLab } from './MotionLab'

export interface LabProps {
  entryId: string
  missions: LabMission[]
}

/**
 * Interactive-lab registry. Lessons reference a lab by id (`labId` in their
 * content file); future labs (pressure, heat, sound…) register here without
 * touching the lesson shell.
 */
const LABS: Record<string, React.ComponentType<LabProps>> = {
  'motion-lab': MotionLab,
}

export function getLab(labId: string | undefined): React.ComponentType<LabProps> | undefined {
  return labId ? LABS[labId] : undefined
}

export function listLabIds(): string[] {
  return Object.keys(LABS)
}
