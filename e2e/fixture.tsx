import React from 'react'
import { createRoot } from 'react-dom/client'
import { BlockMath, Measure, RichText, Tex } from '../src/components/math/Math'
import '../src/styles/tokens.css'
import '../src/styles/base.css'

createRoot(document.getElementById('root')!).render(
  <main style={{ maxWidth: 900, margin: '4rem auto', padding: '2rem', lineHeight: 2.5 }}>
    <h1>فحص اتجاه الرياضيات والكميات</h1>
    <p id="prose"><RichText text="قطع الجسم مسافة 20 m في زمن 5 s، وكانت السرعة المتوسطة 5 m/s. في فقرة عربية طويلة نحافظ على الاتجاه الصحيح للنص حول القانون $v=\frac{d}{t}$ وبعده نستكمل الشرح العربي دون تداخل." /></p>
    <p id="values"><Measure value={10.2} unit="s" />، <Measure value={81.4} unit="m" />، <Measure value={8} unit="m/s" />، <Measure value={25} unit="°C" /></p>
    <p id="law">القانون: <Tex tex="v=\frac{d}{t}" /></p>
    <div id="substitution"><BlockMath tex="v=\frac{20\ \mathrm{m}}{5\ \mathrm{s}}=4\ \mathrm{m/s}" /></div>
    <div id="compound"><BlockMath tex="\frac{a+b}{c+d}" /></div>
  </main>,
)
