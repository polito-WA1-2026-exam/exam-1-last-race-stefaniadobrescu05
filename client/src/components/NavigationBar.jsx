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
        <NavLink className="brand" to="/">
          <img className="brand-logo" src="/images/logo.png" alt="Last Race logo" />
          <span>LAST <span className="brand-mark">RACE</span></span>
        </NavLink>
        <div className="nav-main-links">
          <NavLink className="nav-link" to="/" end>Home</NavLink>
          <NavLink className="nav-link" to="/instructions">Rules</NavLink>
          {user ? (
            <>
              <NavLink className="nav-link" to="/game">Play Game</NavLink>
              <NavLink className="nav-link" to="/ranking">Ranking</NavLink>
            </>
          ) : (
            <NavLink className="nav-link login-link" to="/login">Log in</NavLink>
          )}
        </div>
        {user && (
          <div className="nav-user-actions">
              <span className="user-greeting">Hi, {user.username}</span>
              <button className="logout-button" onClick={handleLogout} type="button">Log out</button>
          </div>
        )}
      </nav>
    </header>
  )
}

export default NavigationBar
