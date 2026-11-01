import { HashRouter, Route, Routes } from 'react-router-dom'
import { ProgressProvider } from '@/state/progress'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/Home'
import { CurriculumPage } from '@/pages/Curriculum'
import { LessonPage } from '@/pages/LessonPage'
import { LabPage } from '@/pages/LabPage'
import { DashboardPage } from '@/pages/Dashboard'
import { ExamsPage } from '@/pages/ExamsPage'
import { ExamPage } from '@/pages/ExamPage'
import { TeacherPage } from '@/pages/TeacherPage'
import { NotFoundPage } from '@/pages/NotFound'

/**
 * HashRouter is a deliberate choice: the production build is fully static
 * and can be hosted anywhere (including GitHub Pages project sub-paths)
 * without server-side rewrite rules. Student progress lives client-side
 * in localStorage for this phase.
 */
export default function App() {
  return (
    <ProgressProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/curriculum" element={<CurriculumPage />} />
            <Route path="/lesson/:slug" element={<LessonPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/exams" element={<ExamsPage />} />
            <Route path="/exam/:id" element={<ExamPage />} />
            <Route path="/teacher" element={<TeacherPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </HashRouter>
    </ProgressProvider>
  )
}
