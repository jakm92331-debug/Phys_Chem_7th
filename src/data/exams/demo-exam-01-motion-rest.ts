import type { Exam } from '@/types/content'

/**
 * DEMONSTRATION EXAM — «الحركة والسكون» (الدرس الأول، صفحة 3).
 *
 * ⚠️ This is supplementary material prepared to demonstrate the exam system
 * (all question types, grading, review and progress saving). It follows the
 * same scientifically-correct grade-7 content as the demo lesson, but it has
 * NOT been verified against the official textbook and must never be
 * presented as a reproduction of it. When the textbook pages become
 * available, real lesson exams are registered alongside the lessons.
 */
export const demoExamLesson01: Exam = {
  id: 'exam-demo-lesson-01-motion-rest',
  entryId: 'lesson-01-motion-rest',
  kind: 'lesson',
  title: 'اختبار «الحركة والسكون» (نسخة توضيحية)',
  source: 'demo-supplementary',
  status: 'active',
  questions: [
    {
      id: 'ex1-mcq-1',
      type: { kind: 'mcq' },
      prompt:
        'راكب جالس في قطار يسير بسرعة ثابتة. أيّ وصف هو الأدقّ لحالة الراكب؟',
      choices: [
        'الراكب ساكن تماماً لأنه لا يمشي',
        'الراكب ساكن بالنسبة إلى القطار، ومتحرك بالنسبة إلى الأرض',
        'الراكب متحرك بالنسبة إلى القطار وساكن بالنسبة إلى الأرض',
        'لا يمكن وصف حالته إطلاقاً',
      ],
      correctIndex: 1,
      explanation:
        'موضع الراكب لا يتغيّر بالنسبة إلى القطار (ساكن)، لكنه يتغيّر باستمرار بالنسبة إلى الأرض (متحرك). الوصف يعتمد على المرجع.',
      difficulty: 'easy',
    },
    {
      id: 'ex1-tf-1',
      type: { kind: 'true-false' },
      prompt:
        'سيارة تقطع في كلّ ثانية المسافة نفسها تماماً على طريق مستقيم. حركتها تُعدّ حركة متسارعة.',
      correct: false,
      explanation:
        'خطأ. قطع مسافات متساوية في أزمنة متساوية يعني سرعة ثابتة — هذه هي الحركة المنتظمة، وليست حركة متسارعة.',
      difficulty: 'easy',
    },
    {
      id: 'ex1-calc-1',
      type: { kind: 'calculation' },
      prompt:
        'قطع درّاج مسافة $60\\ \\mathrm{m}$ في $12\\ \\mathrm{s}$ بسرعة ثابتة. احسب سرعته المتوسطة بوحدة $\\mathrm{m/s}$.',
      expectedValue: 5,
      tolerance: 0.01,
      expectedUnit: 'm/s',
      explanation:
        '$v = \\dfrac{d}{t} = \\dfrac{60\\ \\mathrm{m}}{12\\ \\mathrm{s}} = 5\\ \\mathrm{m/s}$.',
      difficulty: 'medium',
    },
    {
      id: 'ex1-open-1',
      type: { kind: 'open', category: 'understanding' },
      prompt:
        'تخيّل أنك داخل حافلة متحركة وفوق طاولة أمامك كتاب. اشرح كيف يمكن أن يكون الكتاب «ساكناً» بالنسبة إليك و«متحركاً» بالنسبة إلى شخص على الرصيف في الوقت نفسه.',
      modelAnswer:
        'الوصف يعتمد على المرجع: موضع الكتاب لا يتغيّر بالنسبة إلى الحافلة والراكب (ساكن بالنسبة إليهما)، لكن موضعه يتغيّر بالنسبة إلى الأرض والرصيف (متحرك بالنسبة إليهما).',
      rubric: 'يتحدث الإجابة عن «المرجع» وعن أن الحركة والسكون نسبيان.',
      explanation:
        'كلا الوصفين صحيح لأن كلّ مراقب يستخدم مرجعاً مختلفاً. من دون مرجع لا معنى للسؤال: هل يتحرك هذا الجسم؟',
      difficulty: 'easy',
    },
    {
      id: 'ex1-open-2',
      type: { kind: 'open', category: 'application' },
      prompt:
        'حافلة مدرسية تقطع $900\\ \\mathrm{m}$ في $60\\ \\mathrm{s}$ بسرعة ثابتة. صلِّ بين المسافة والزمن لتحسب سرعتها المتوسطة، ثم اذكر كيف تحوّلها إلى $\\mathrm{km/h}$.',
      modelAnswer:
        '$v = \\dfrac{d}{t} = \\dfrac{900\\ \\mathrm{m}}{60\\ \\mathrm{s}} = 15\\ \\mathrm{m/s}$، وللتحويل إلى $\\mathrm{km/h}$ نضرب في $3.6$: $15\\ \\mathrm{m/s} \\times 3.6 = 54\\ \\mathrm{km/h}$.',
      rubric: 'يحتوي على العلاقة $v = d/t$ وعلى التحويل $1\\ \\mathrm{m/s} = 3.6\\ \\mathrm{km/h}$.',
      explanation:
        'السرعة المتوسطة هي المسافة الكلية ÷ الزمن الكلي، ووحدة $\\mathrm{km/h}$ تساوي $3.6$ من $\\mathrm{m/s}$.',
      difficulty: 'medium',
    },
    {
      id: 'ex1-open-3',
      type: { kind: 'open', category: 'inference' },
      prompt:
        'صُوّرت كرة متحركة كلّ ثانية فكانت المسافات بين مواضعها المتتالية تزداد تدريجياً. ما الذي يمكنك استنتاجه عن سرعة الكرة؟',
      modelAnswer:
        'تزداد المسافة المقطوعة في كلّ ثانية عن السابقة، أي أن السرعة تتزايد مع الزمن: الكرة تتسارع وليست في حركة منتظمة.',
      rubric: 'يستنتاج أن السرعة تزداد (تتسارع) من تزايد المسافات بين المواضع.',
      explanation:
        'في كلّ ثانية تقطع الكرة مسافة أكبر من سابقتها، إذن سرعتها تزداد؛ أي أنها تتسارع ولا تتحرك حركة منتظمة.',
      difficulty: 'hard',
    },
  ],
}
