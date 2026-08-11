import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './ui/AppShell'
import { HomePage } from './pages/HomePage'
import { BookPage } from './pages/BookPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { CategoryPage } from './pages/CategoryPage'
import { VideosPage } from './pages/VideosPage'
import { AboutPage } from './pages/AboutPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AdminLayout } from './admin/AdminLayout'
import { ProtectedRoute } from './admin/ProtectedRoute'
import { LoginPage } from './admin/LoginPage'
import { OverviewPage } from './admin/pages/OverviewPage'
import { PhotosPage } from './admin/pages/PhotosPage'
import { VideosAdminPage } from './admin/pages/VideosAdminPage'
import { CategoriesPage } from './admin/pages/CategoriesPage'
import { SettingsPage } from './admin/pages/SettingsPage'

/**
 * App — routing shell.
 *
 * HashRouter keeps deep links working on static hosts (GitHub Pages) with
 * zero rewrite configuration; URLs are `#/portfolio/weddings`. A future
 * phase can switch to BrowserRouter + basename once a rewrite rule exists.
 */
function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/portfolio/:category" element={<CategoryPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="photos" element={<PhotosPage />} />
            <Route path="videos" element={<VideosAdminPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
