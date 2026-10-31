import { describe, expect, it } from 'vitest'
import {
  averageSpeed,
  checkPrediction,
  describeRelativeMotion,
  distanceCovered,
  formatMeasure,
  isAtRestRelative,
  positionAt,
  predictPosition,
  relativePositionAt,
  relativeVelocity,
} from './motion'

describe('uniform motion helpers', () => {
  it('computes position for constant velocity', () => {
    expect(positionAt(0, 5, 4)).toBe(20)
    expect(positionAt(10, 3, 2)).toBe(16)
    expect(positionAt(7, 0, 100)).toBe(7)
  })

  it('computes distance covered (always non-negative)', () => {
    expect(distanceCovered(6, 3)).toBe(18)
    expect(distanceCovered(-6, 3)).toBe(18)
    expect(distanceCovered(6, -2)).toBe(0)
  })

  it('computes average speed as distance / time and guards t<=0', () => {
    expect(averageSpeed(100, 20)).toBe(5) // the worked example in lesson 1
    expect(averageSpeed(60, 12)).toBe(5)
    expect(averageSpeed(50, 0)).toBe(0)
  })
})

describe('relative motion (frames of reference)', () => {
  it('relative velocity is v_object - v_observer', () => {
    expect(relativeVelocity(20, 20)).toBe(0)
    expect(relativeVelocity(12, 5)).toBe(7)
    expect(relativeVelocity(5, 12)).toBe(-7)
  })

  it('equal velocities mean rest relative to each other, even while moving', () => {
    expect(isAtRestRelative(15, 15)).toBe(true)
    expect(isAtRestRelative(15, 0)).toBe(false)
    // separation stays constant over time
    const gap0 = relativePositionAt(30, 15, 0, 15, 0)
    const gap10 = relativePositionAt(30, 15, 0, 15, 10)
    expect(gap0).toBe(30)
    expect(gap10).toBe(30)
  })

  it('describes approaching / receding correctly', () => {
    // object ahead (+gap) but slower than observer → gap closes → approaching
    expect(describeRelativeMotion(40, 5, 12)).toBe('approaching')
    // object ahead and faster → receding
    expect(describeRelativeMotion(40, 12, 5)).toBe('receding')
    // same speed → at rest relative
    expect(describeRelativeMotion(40, 8, 8)).toBe('at-rest')
    // object behind (-gap) and faster → approaching
    expect(describeRelativeMotion(-40, 12, 5)).toBe('approaching')
  })
})

describe('prediction challenge', () => {
  it('predicts future position with x + v·t', () => {
    expect(predictPosition(10, 8, 5)).toBe(50)
  })

  it('accepts near guesses and rejects far ones, with speed-scaled tolerance', () => {
    expect(checkPrediction(50, 50, 8).correct).toBe(true)
    expect(checkPrediction(52, 50, 8).correct).toBe(true) // within max(3, 2.8)
    expect(checkPrediction(70, 50, 8).correct).toBe(false)
    expect(checkPrediction(70, 50, 8).error).toBe(20)
    // higher speed → wider tolerance
    expect(checkPrediction(105, 100, 20).correct).toBe(true)
  })
})

describe('formatting', () => {
  it('formats measures with at most one decimal', () => {
    expect(formatMeasure(12)).toBe('12')
    expect(formatMeasure(12.34)).toBe('12.3')
    expect(formatMeasure(0.04)).toBe('0')
  })
})
