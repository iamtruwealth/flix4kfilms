import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './ui/AppShell'
import { HomePage } from './pages/HomePage'
import { AdminSeoHead, SeoHead } from './seo/SeoHead'
import { SEO_ENTRIES } from './seo/seoContent'

const BookPage = lazy(() => import('./pages/BookPage').then((m) => ({ default: m.BookPage })))
const PortfolioPage = lazy(() =>
  import('./pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })),
)
const CategoryPage = lazy(() =>
  import('./pages/CategoryPage').then((m) => ({ default: m.CategoryPage })),
)
const VideosPage = lazy(() =>
  import('./pages/VideosPage').then((m) => ({ default: m.VideosPage })),
)
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
const LoginPage = lazy(() =>
  import('./admin/LoginPage').then((m) => ({ default: m.LoginPage })),
)

const AdminLayout = lazy(() =>
  import('./admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const ProtectedRoute = lazy(() =>
  import('./admin/ProtectedRoute').then((m) => ({ default: m.ProtectedRoute })),
)
const OverviewPage = lazy(() =>
  import('./admin/pages/OverviewPage').then((m) => ({ default: m.OverviewPage })),
)
const PhotosPage = lazy(() =>
  import('./admin/pages/PhotosPage').then((m) => ({ default: m.PhotosPage })),
)
const VideosAdminPage = lazy(() =>
  import('./admin/pages/VideosAdminPage').then((m) => ({ default: m.VideosAdminPage })),
)
const CategoriesPage = lazy(() =>
  import('./admin/pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
)
const SettingsPage = lazy(() =>
  import('./admin/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

function PublicShell() {
  const { pathname } = useLocation()
  const entry = SEO_ENTRIES[pathname] ?? SEO_ENTRIES['/']

  return (
    <>
      <SeoHead entry={entry} />
      <AppShell />
    </>
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<PublicShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<Lazy><BookPage /></Lazy>} />
          <Route path="/portfolio" element={<Lazy><PortfolioPage /></Lazy>} />
          <Route path="/portfolio/:category" element={<Lazy><CategoryPage /></Lazy>} />
          <Route path="/videos" element={<Lazy><VideosPage /></Lazy>} />
          <Route path="/about" element={<Lazy><AboutPage /></Lazy>} />
          <Route path="*" element={<Lazy><NotFoundPage /></Lazy>} />
        </Route>
        <Route path="/admin/login" element={<><AdminSeoHead /><Lazy><LoginPage /></Lazy></>} />
        <Route path="/admin/*" element={<><AdminSeoHead /><Lazy><ProtectedRoute /></Lazy></>}>
          <Route element={<Lazy><AdminLayout /></Lazy>}>
            <Route index element={<Lazy><OverviewPage /></Lazy>} />
            <Route path="photos" element={<Lazy><PhotosPage /></Lazy>} />
            <Route path="videos" element={<Lazy><VideosAdminPage /></Lazy>} />
            <Route path="categories" element={<Lazy><CategoriesPage /></Lazy>} />
            <Route path="settings" element={<Lazy><SettingsPage /></Lazy>} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
