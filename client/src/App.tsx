import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { GraphPage } from './pages/Graph'
import { Home } from './pages/Home'
import { Lexicon } from './pages/Lexicon'
import { Review } from './pages/Review'
import { Discover } from './pages/Discover'
import { WordPage } from './pages/WordDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/words" element={<Lexicon />} />
        <Route path="/words/:id" element={<WordPage />} />
        <Route path="/review" element={<Review />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/graph/:id" element={<GraphPage />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
