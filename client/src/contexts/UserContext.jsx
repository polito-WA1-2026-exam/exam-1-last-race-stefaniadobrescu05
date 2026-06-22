import { createContext, useContext, useEffect, useState } from 'react'

const UserContext = createContext()
const API_URL = 'http://localhost:3001/api'

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkCurrentSession() {
      try {
        const response = await fetch(`${API_URL}/sessions/current`, {
          credentials: 'include',
        })

        if (response.ok) {
          setUser(await response.json())
        }
      } catch {
        // The app can still be used anonymously when the server is unavailable.
      } finally {
        setIsLoading(false)
      }
    }

    checkCurrentSession()
  }, [])

  async function login(username, password) {
    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    setUser(data)
  }

  async function logout() {
    const response = await fetch(`${API_URL}/sessions/current`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Logout failed')
    }

    setUser(null)
  }

  return (
    <UserContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

// This hook belongs with the provider so components use one shared context.
// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  return useContext(UserContext)
}
