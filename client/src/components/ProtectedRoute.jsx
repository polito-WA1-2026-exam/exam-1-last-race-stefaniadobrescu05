import { Navigate, useLocation } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'

function ProtectedRoute({ children }) {
  const { user, isLoading } = useUser()
  const location = useLocation()

  if (isLoading) {
    return <div className="page-loader">Checking your ticket…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute
