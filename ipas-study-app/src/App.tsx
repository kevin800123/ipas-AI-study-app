import { Routes, Route, useLocation } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { HomePage } from './features/HomePage'
import { SubjectPage } from './features/SubjectPage'
import { SummaryPage } from './features/SummaryPage'
import { QuizPage } from './features/QuizPage'
import { ResultPage } from './features/ResultPage'
import { WrongBookPage } from './features/WrongBookPage'
import { ExamInfoPage } from './features/ExamInfoPage'
import { StrategyPage } from './features/StrategyPage'
import { useViewMode } from './store/viewMode'

export default function App() {
  const web = useViewMode() === 'web'
  const onSummary = useLocation().pathname.includes('/summary/')
  const maxW = onSummary ? 'max-w-6xl' : web ? 'max-w-5xl' : 'max-w-2xl'
  return (
    <div className={web ? 'min-h-screen' : 'min-h-screen md:flex'} data-view={web ? 'web' : 'app'}>
      <NavBar />
      <main className={`flex-1 mx-auto p-4 ${maxW} ${web ? 'pb-10' : 'pb-20 md:pb-4'}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/subject/:subjectId" element={<SubjectPage />} />
          <Route path="/subject/:subjectId/summary/:chapterId" element={<SummaryPage />} />
          <Route path="/subject/:subjectId/quiz/:mode" element={<QuizPage />} />
          <Route path="/subject/:subjectId/result" element={<ResultPage />} />
          <Route path="/wrong" element={<WrongBookPage />} />
          <Route path="/strategy" element={<StrategyPage />} />
          <Route path="/info" element={<ExamInfoPage />} />
        </Routes>
      </main>
    </div>
  )
}
