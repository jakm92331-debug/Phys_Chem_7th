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

async function fontsReady() {
  // Force the KaTeX faces used by the visible expressions to load before capture.
  const loaded = await page.evaluate(async () => {
    const faces = await Promise.all([
      document.fonts.load('16px KaTeX_Main'),
      document.fonts.load('italic 16px KaTeX_Math'),
    ])
    await document.fonts.ready
    return faces.map(group => group.length > 0 && group.every(face => face.status === 'loaded'))
  })
  assert.deepEqual(loaded, [true, true], 'KaTeX fonts did not load')
}

async function arabicInlineCheck() {
  const info = await page.locator('#long-fraction').evaluate(p => {
    const math = p.querySelector('.math')
    const rect = math.getBoundingClientRect()
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
    const textRects = []
    let node
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('.math')) continue
      for (const match of node.textContent.matchAll(/\S+/gu)) {
        const range = document.createRange()
        range.setStart(node, match.index)
        range.setEnd(node, match.index + match[0].length)
        for (const box of range.getClientRects()) textRects.push({
          left: box.left, right: box.right, top: box.top, bottom: box.bottom,
        })
      }
    }
    const overlap = textRects.some(box =>
      Math.min(box.right, rect.right) - Math.max(box.left, rect.left) > 0.5 &&
      Math.min(box.bottom, rect.bottom) - Math.max(box.top, rect.top) > 0.5,
    )
    return {
      paragraphDirection: getComputedStyle(p).direction,
      mathDirection: getComputedStyle(math).direction,
      mathBidi: getComputedStyle(math).unicodeBidi,
      paragraphWidth: p.clientWidth, paragraphScroll: p.scrollWidth,
      lines: new Set(textRects.map(box => Math.round(box.top))).size,
      before: p.firstElementChild.textContent.trim().length,
      after: p.lastElementChild.textContent.trim().length,
      overlap,
    }
  })
  assert.equal(info.paragraphDirection, 'rtl')
  assert.equal(info.mathDirection, 'ltr')
  assert.equal(info.mathBidi, 'isolate')
  assert.ok(info.before > 0 && info.after > 0 && info.lines > 1, JSON.stringify(info))
  assert.equal(info.overlap, false, JSON.stringify(info))
  assert.ok(info.paragraphScroll <= info.paragraphWidth, JSON.stringify(info))
  await fractionCheck('#long-fraction')
  const operands = await page.locator('#long-fraction mfrac').evaluate(el =>
    [...el.children].map(child => child.textContent),
  )
  assert.deepEqual(operands, ['d', 't'])
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
      numeratorAbove: boxes.length === 2 && boxes[1].bottom <= line.bottom + 2,
      denominatorBelow: boxes.length === 2 && boxes[0].top >= line.top - 2,
      centered: boxes.every(box => Math.abs((box.left + box.right) / 2 - (line.left + line.right) / 2) < 3) }
  })
  assert.ok(info?.barWidth > 0 && info.barHeight > 0 && info.numeratorAbove && info.denominatorBelow && info.centered, `${selector}: ${JSON.stringify(info)}`)
}

try {
  for (const { width, height } of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize({ width, height })
    for (const route of ['/', '/curriculum', '/dashboard', '/teacher', '/lab']) {
      await page.goto(`http://localhost:5173/#${route}`)
      await page.locator('main').first().waitFor()
      await noOverflow(`${route} ${width}`)
    }
    await page.goto('http://localhost:5173/e2e/fixture.html')
    await fontsReady()
    assert.equal(await page.locator('#prose').evaluate(el => getComputedStyle(el).direction), 'rtl')
    for (const [i, value] of ['20 m', '5 s', '5 m/s'].entries()) await quantityCheck(`#prose .measure:nth-of-type(${i + 1})`, value)
    for (const [i, value] of ['10.2 s', '81.4 m', '8 m/s', '25 °C'].entries()) await quantityCheck(`#values .measure:nth-of-type(${i + 1})`, value)
    for (const id of ['inline-frac', 'law', 'substitution', 'compound']) await fractionCheck(`#${id}`)
    const simple = await page.locator('#inline-simple .math').evaluate(el => ({
      direction: getComputedStyle(el).direction,
      bidi: getComputedStyle(el).unicodeBidi,
      height: el.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(el.parentElement).lineHeight),
      annotation: el.querySelector('annotation').textContent,
    }))
    assert.equal(simple.direction, 'ltr')
    assert.equal(simple.bidi, 'isolate')
    assert.equal(simple.annotation, 'v=d+t')
    assert.ok(simple.height <= simple.lineHeight + 2, JSON.stringify(simple))
    await arabicInlineCheck()
    await noOverflow(`fixture ${width}`)
    await fontsReady()
    await page.screenshot({ path: `${dir}/math-fixture-${width}.png`, fullPage: true })
    await page.locator('#inline-standards').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await fontsReady()
    await page.screenshot({ path: `${dir}/inline-paragraph-${width}.png` })

    await page.goto('http://localhost:5173/#/lesson/motion-and-rest')
    await page.evaluate(() => { localStorage.clear() })
    await page.reload()
    await page.getByRole('button', { name: /اكتشف المفهوم/ }).click()
    await page.locator('.cb-formula').waitFor()
    await fontsReady()
    await fractionCheck('.cb-formula')
    const example = page.locator('.cb-callout').filter({ hasText: 'مثال محلول' })
    await fractionCheck('.cb-callout:has-text("مثال محلول")')
    await noOverflow(`discover ${width}`)
    await example.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await fontsReady()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${dir}/lesson-example-${width}.png` })
    await page.locator('.cb-formula').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await fontsReady()
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${dir}/lesson-law-${width}.png` })

    await page.getByRole('button', { name: /المختبر التفاعلي/ }).click()
    await page.locator('.lab-readouts').waitFor()
    await fontsReady()
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
    await fontsReady()
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
    console.log(`${width}×${height}: inline prose, law, substitution, example, lab, graph, questions, summary passed`)
  }
  assert.deepEqual(errors, [], 'browser page errors')
} finally { await browser.close() }
