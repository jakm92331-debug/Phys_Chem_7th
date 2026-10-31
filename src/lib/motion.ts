/**
 * Pure physics helpers for the «الحركة والسكون» interactive laboratory.
 *
 * The lab models *uniform rectilinear motion* (حركة مستقيمة منتظمة):
 * constant speed along a straight track. These functions are deliberately
 * framework-free so they can be unit-tested and reused by future labs.
 *
 * Units: metres (m), seconds (s), metres per second (m/s).
 */

/** Position after time `t` for motion starting at `x0` with constant velocity `v`. */
export function positionAt(x0: number, v: number, t: number): number {
  return x0 + v * t
}

/** Distance covered when moving at constant speed `v` for time `t`. Always ≥ 0. */
export function distanceCovered(v: number, t: number): number {
  return Math.abs(v) * Math.max(0, t)
}

/** Average speed = distance ÷ time. Returns 0 when time is not positive. */
export function averageSpeed(distance: number, time: number): number {
  if (time <= 0) return 0
  return distance / time
}

/**
 * Velocity of an object as seen by a moving observer (1-D Galilean relativity):
 * v_relative = v_object − v_observer.
 */
export function relativeVelocity(vObject: number, vObserver: number): number {
  return vObject - vObserver
}

/**
 * Position of an object relative to a moving observer after time `t`.
 * Both start at their own initial positions at t = 0.
 */
export function relativePositionAt(
  xObject0: number,
  vObject: number,
  xObserver0: number,
  vObserver: number,
  t: number,
): number {
  return positionAt(xObject0, vObject, t) - positionAt(xObserver0, vObserver, t)
}

/** True when the object does not change position relative to the observer. */
export function isAtRestRelative(vObject: number, vObserver: number): boolean {
  return relativeVelocity(vObject, vObserver) === 0
}

export type RelativeMotionKind = 'at-rest' | 'approaching' | 'receding' | 'passing-same-direction'

/**
 * Describes how an object appears to a moving observer, given their current
 * separation `gap = xObject − xObserver` and velocities.
 */
export function describeRelativeMotion(
  gap: number,
  vObject: number,
  vObserver: number,
): RelativeMotionKind {
  const vRel = relativeVelocity(vObject, vObserver)
  if (vRel === 0) return 'at-rest'
  if (gap === 0) return 'passing-same-direction'
  // If the object is ahead (gap > 0) and closing the gap (vRel < 0) → approaching.
  const closing = (gap > 0 && vRel < 0) || (gap < 0 && vRel > 0)
  return closing ? 'approaching' : 'receding'
}

/** Predicts where an object will be after `dt` seconds at constant velocity. */
export function predictPosition(xNow: number, v: number, dt: number): number {
  return xNow + v * dt
}

/**
 * Checks a student's position prediction.
 * Tolerance scales slightly with speed so the task stays fair at high speeds.
 */
export function checkPrediction(
  predicted: number,
  actual: number,
  speed: number,
): { correct: boolean; error: number } {
  const error = Math.abs(predicted - actual)
  const tolerance = Math.max(3, Math.abs(speed) * 0.35)
  return { correct: error <= tolerance, error }
}

/** Formats a measurement with up to one decimal place, trimming trailing .0 */
export function formatMeasure(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
