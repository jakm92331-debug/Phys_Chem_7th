// Run against `npm run dev`; set CHROMIUM_PATH to a local Chromium binary.
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const executablePath = process.env.CHROMIUM_PATH
if (!executablePath) throw new Error('Set CHROMIUM_PATH to a Chromium executable')
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
const dir = 'docs/screenshots'
await mkdir(dir, { recursive: true })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
const errors = []
page.on('pageerror', error => errors.push(error.message))

async function noOverflow(context) {
  const result = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    clipped: [...document.querySelectorAll('body *')].filter(el => {
      const style = getComputedStyle(el), rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height || style.position === 'fixed' || el.closest('.math--block')) return false
      return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1
    }).map(el => `${el.tagName}.${el.className}`).slice(0, 10),
  }))
  assert.ok(result.scroll <= result.width, `${context}: page overflow ${JSON.stringify(result)}`)
  assert.deepEqual(result.clipped, [], `${context}: elements outside viewport`)
}

async function quantityCheck(selector, expected) {
  const measure = page.locator(selector).first()
  await measure.waitFor()
  const info = await measure.evaluate(el => {
    const parts = el.querySelectorAll('.katex-html .base > .mord')
    const number = parts[0]?.getBoundingClientRect(), unit = parts[1]?.getBoundingClientRect()
    return { direction: getComputedStyle(el).direction, bidi: getComputedStyle(el).unicodeBidi,
      text: el.getAttribute('aria-label'), left: number?.left, right: number?.right, unitLeft: unit?.left }
  })
  assert.equal(info.text, expected)
  assert.equal(info.direction, 'ltr')
  assert.equal(info.bidi, 'isolate')
  assert.ok(info.right <= info.unitLeft + 1, JSON.stringify(info))
}

async function fractionCheck(selector) {
  const info = await page.locator(selector).first().evaluate(el => {
    const frac = el.querySelector('.katex-html .mfrac')
    const bar = frac?.querySelector('.frac-line')
    const rows = frac?.querySelectorAll('.vlist > span')
    if (!bar || !rows) return null
    const boxes = [...rows].filter(row => !row.querySelector('.frac-line') && row.textContent?.trim()).map(row => row.lastElementChild.getBoundingClientRect())
    const line = bar.getBoundingClientRect()
    return { barWidth: line.width, barHeight: line.height, barY: line.top,
      above: boxes.some(box => box.bottom <= line.bottom + 2),
      below: boxes.some(box => box.top >= line.top - 2),
      centered: boxes.every(box => Math.abs((box.left + box.right) / 2 - (line.left + line.right) / 2) < 3) }
  })
  assert.ok(info?.barWidth > 0 && info.barHeight > 0 && info.above && info.below && info.centered, `${selector}: ${JSON.stringify(info)}`)
}

try {
  for (const width of [1366, 1920]) {
    await page.setViewportSize({ width, height: 768 })
    for (const route of ['/', '/curriculum', '/dashboard', '/teacher', '/lab']) {
      await page.goto(`http://localhost:5173/#${route}`)
      await page.locator('main').first().waitFor()
      await noOverflow(`${route} ${width}`)
    }
    await page.goto('http://localhost:5173/e2e/fixture.html')
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.locator('#prose').evaluate(el => getComputedStyle(el).direction), 'rtl')
    for (const [i, value] of ['20 m', '5 s', '5 m/s'].entries()) await quantityCheck(`#prose .measure:nth-of-type(${i + 1})`, value)
    for (const [i, value] of ['10.2 s', '81.4 m', '8 m/s', '25 °C'].entries()) await quantityCheck(`#values .measure:nth-of-type(${i + 1})`, value)
    for (const id of ['law', 'substitution', 'compound']) await fractionCheck(`#${id}`)
    await noOverflow(`fixture ${width}`)
    await page.screenshot({ path: `${dir}/math-fixture-${width}.png`, fullPage: true })

    await page.goto('http://localhost:5173/#/lesson/motion-and-rest')
    await page.evaluate(() => { localStorage.clear() })
    await page.reload()
    await page.getByRole('button', { name: /اكتشف المفهوم/ }).click()
    await page.locator('.cb-formula').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await fractionCheck('.cb-formula')
    const example = page.locator('.cb-callout').filter({ hasText: 'مثال محلول' })
    await fractionCheck('.cb-callout:has-text("مثال محلول")')
    await noOverflow(`discover ${width}`)
    await example.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${dir}/lesson-example-${width}.png` })
    await page.locator('.cb-formula').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${dir}/lesson-law-${width}.png` })

    await page.getByRole('button', { name: /المختبر التفاعلي/ }).click()
    await page.locator('.lab-readouts').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await quantityCheck('.lab-readouts .measure', '0 s')
    await noOverflow(`lab ${width}`)
    await page.getByRole('button', { name: /خطوة 1 s/ }).click()
    await page.getByRole('button', { name: /خطوة 1 s/ }).click()
    await quantityCheck('.lab-readouts .measure', '2 s')
    await quantityCheck('.lab-readouts .readout:nth-child(2) .measure', '16 m')
    await page.locator('.lab-readouts').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${dir}/lab-readouts-${width}.png` })
    await page.locator('.lab-graph').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${dir}/lab-graph-${width}.png` })

    await page.getByRole('button', { name: /افهم وتحقق/ }).click()
    await page.locator('.q-choice .measure').first().waitFor()
    await page.evaluate(() => document.fonts.ready)
    await quantityCheck('.q-choice .measure', '72 m/s')
    await noOverflow(`questions ${width}`)
    await page.locator('.q-choice .measure').first().scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${dir}/questions-${width}.png` })
    await page.locator('.q-card').last().getByRole('radio', { name: '5 m/s' }).check({ force: true })
    await fractionCheck('.q-feedback--right')
    await noOverflow(`feedback ${width}`)
    await page.screenshot({ path: `${dir}/feedback-${width}.png` })

    await page.getByRole('button', { name: /ملخص الدرس/ }).click()
    await fractionCheck('.stage-body')
    await noOverflow(`summary ${width}`)
    await page.locator('.stage-body').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `${dir}/summary-${width}.png` })
    console.log(`${width}px: fixture, law, substitution, example, lab, graph, questions, summary passed`)
  }
  assert.deepEqual(errors, [], 'browser page errors')
} finally { await browser.close() }
