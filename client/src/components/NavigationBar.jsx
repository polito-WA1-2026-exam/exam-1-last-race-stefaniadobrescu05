import { NavLink, useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'

function NavigationBar() {
  const { user, logout } = useUser()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
      navigate('/')
    } catch {
      // Keep the current user visible if the logout request could not be completed.
    }
  }

  return (
    <header className="navigation">
      <nav className="navigation-inner" aria-label="Main navigation">
        <NavLink className="brand" to="/">LAST <span className="brand-mark">RACE</span></NavLink>
        <div className="nav-links">
          <NavLink className="nav-link" to="/instructions">Instructions</NavLink>
          {user ? (
            <>
              <NavLink className="nav-link" to="/game">Play Game</NavLink>
              <NavLink className="nav-link" to="/ranking">Ranking</NavLink>
              <span className="user-greeting">Hi, {user.username}</span>
              <button className="logout-button" onClick={handleLogout} type="button">Log out</button>
            </>
          ) : (
            <NavLink className="nav-link login-link" to="/login">Log in</NavLink>
          )}
        </div>
      </nav>
    </header>
  )
}

export default NavigationBar
