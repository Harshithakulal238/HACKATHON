import { lazy, Suspense } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import WelcomePage from '../App.jsx'
import CuratorLogin from '../pages/auth/CuratorLogin.jsx'
import CuratorRegister from '../pages/auth/CuratorRegister.jsx'
import CuratorDashboard from '../pages/curator/Dashboard.jsx'
import WorkerLogin from '../pages/auth/WorkerLogin.jsx'
import { useAuth } from '../context/useAuth.js'

const CuratorOverview = lazy(() => import('../pages/curator/CuratorOverview.jsx'))
const CuratorCollection = lazy(() => import('../pages/curator/CuratorCollection.jsx'))
const CuratorMapEditor = lazy(() => import('../pages/curator/CuratorMapEditor.jsx'))
const CuratorWorkers = lazy(() => import('../pages/curator/CuratorWorkers.jsx'))
const CuratorAnalytics = lazy(() => import('../pages/curator/CuratorAnalytics.jsx'))
const WorkerDashboard = lazy(() => import('../pages/worker/Dashboard.jsx'))
const TourDashboard = lazy(() => import('../pages/visitor/TourDashboard.jsx'))

function ProtectedRole({ role, children }) {
  const { user, isRestoring } = useAuth()

  if (isRestoring) {
    return (
      <main className="route-status" role="status">
        Checking your sign-in…
      </main>
    )
  }

  if (!user || user.role !== role) {
    if (user?.role === 'worker') {
      return <Navigate to="/worker/dashboard" replace />
    }
    if (user?.role === 'curator') {
      return <Navigate to="/curator/dashboard" replace />
    }
    return <Navigate to={role === 'worker' ? '/worker/login' : '/curator/login'} replace />
  }

  return children
}

function GuestOnly({ children }) {
  const { user, isRestoring } = useAuth()

  if (isRestoring) {
    return (
      <main className="route-status" role="status">
        Checking your sign-in…
      </main>
    )
  }

  if (user) {
    return <Navigate to={user.role === 'worker' ? '/worker/dashboard' : '/curator/dashboard'} replace />
  }

  return children
}

function NotFound() {
  return (
    <main className="route-status">
      <h1>Page not found</h1>
      <Link to="/">Return to Léviōsa</Link>
    </main>
  )
}

function AppRoutes() {
  return (
    <Suspense fallback={<main className="route-status" role="status">Loading Léviōsa…</main>}>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route
          path="/curator/login"
          element={
            <GuestOnly>
              <CuratorLogin />
            </GuestOnly>
          }
        />
        <Route
          path="/curator/register"
          element={
            <GuestOnly>
              <CuratorRegister />
            </GuestOnly>
          }
        />
        <Route
          path="/curator/dashboard"
          element={
            <ProtectedRole role="curator">
              <CuratorDashboard><CuratorOverview /></CuratorDashboard>
            </ProtectedRole>
          }
        />
        <Route
          path="/curator/collection"
          element={<ProtectedRole role="curator"><CuratorDashboard><CuratorCollection /></CuratorDashboard></ProtectedRole>}
        />
        <Route
          path="/curator/map"
          element={<ProtectedRole role="curator"><CuratorDashboard><CuratorMapEditor /></CuratorDashboard></ProtectedRole>}
        />
        <Route
          path="/curator/workers"
          element={<ProtectedRole role="curator"><CuratorDashboard><CuratorWorkers /></CuratorDashboard></ProtectedRole>}
        />
        <Route
          path="/curator/analytics"
          element={<ProtectedRole role="curator"><CuratorDashboard><CuratorAnalytics /></CuratorDashboard></ProtectedRole>}
        />
        <Route
          path="/worker/login"
          element={
            <GuestOnly>
              <WorkerLogin />
            </GuestOnly>
          }
        />
        <Route
          path="/worker/dashboard"
          element={<ProtectedRole role="worker"><WorkerDashboard /></ProtectedRole>}
        />
        <Route path="/visitor/tour" element={<TourDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
