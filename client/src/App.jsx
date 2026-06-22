import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { UserProvider } from './contexts/UserContext'
import Layout from './components/Layout'
import LoginForm from './components/LoginForm'
import NetworkMap from './components/NetworkMap'
import ExecutionPhase from './components/ExecutionPhase'
import CoinAmount from './components/CoinAmount'
import PlanningPhase from './components/PlanningPhase'
import ProtectedRoute from './components/ProtectedRoute'
import { useUser } from './contexts/UserContext'
import './App.css'

function HomePage() {
  const { user } = useUser()

  return (
    <>
      <section className="hero-card">
        <p className="eyebrow">Home</p>
        <h1>Make every stop count.</h1>
        <p className="hero-copy">Last Race is a friendly metro adventure where every connection can change your journey.</p>
        <p className="home-network-note">Explore the city metro network, choose your path, and make it to your destination with the most coins.</p>
        {user && <div className="home-actions">
          <Link className="primary-button home-action" to="/game">Play game</Link>
          <Link className="secondary-button home-action" to="/ranking">View ranking</Link>
        </div>}
      </section>
    </>
  )
}

function InstructionsPage() {
  return <section className="content-card instructions-card"><p className="eyebrow">How to play</p><h1>Race across the metro.</h1><ol className="instructions-list"><li>Start with the coins assigned at the beginning of the race.</li><li>Choose a connected station to continue your journey.</li><li>After each move, an event can add or remove coins.</li><li>Reach your destination with the best score you can.</li><li>Compare your best result with other players in the ranking.</li></ol></section>
}

function GamePage() {
  const [phase, setPhase] = useState('setup')
  const [network, setNetwork] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [game, setGame] = useState(null)
  const [isStarting, setIsStarting] = useState(false)
  const [executionResult, setExecutionResult] = useState(null)
  const [failureResult, setFailureResult] = useState(null)

  useEffect(() => {
    let isCurrent = true

    async function loadNetwork() {
      try {
        const response = await fetch('http://localhost:3001/api/network')
        if (!response.ok) throw new Error('The network could not be loaded.')

        const data = await response.json()
        if (!data || typeof data !== 'object') throw new Error('The network data is not valid.')

        if (isCurrent) setNetwork(data)
      } catch (loadError) {
        if (isCurrent) setError(loadError.message || 'The network could not be loaded.')
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadNetwork()
    return () => { isCurrent = false }
  }, [])

  async function startPlanning() {
    setError('')
    setIsStarting(true)

    try {
      const response = await fetch('http://localhost:3001/api/games/start', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'The game could not be started.')
      }

      setGame(data)
      setPhase('planning')
    } catch (startError) {
      setError(startError.message || 'The game could not be started.')
    } finally {
      setIsStarting(false)
    }
  }

  function resetGame() {
    setGame(null)
    setExecutionResult(null)
    setFailureResult(null)
    setError('')
    setIsStarting(false)
    setPhase('setup')
  }

  if (phase === 'planning' && game) {
    return <PlanningPhase game={game} onRouteValid={(result) => {
      setExecutionResult(result)
      setPhase('execution')
    }} onRouteInvalid={(result) => {
      setFailureResult(result)
      setPhase('failure')
    }} onStartNewGame={resetGame} />
  }

  if (phase === 'execution' && executionResult) {
    return <ExecutionPhase executionResult={executionResult} onComplete={() => setPhase('result')} />
  }

  if (phase === 'result' && executionResult) {
    return (
      <section className="content-card placeholder-card">
        <p className="eyebrow">Race complete</p>
        <h1>Final score</h1>
        <CoinAmount className="result-coins">{executionResult.finalScore} coins</CoinAmount>
        <button className="primary-button" type="button" onClick={resetGame}>Start new game</button>
      </section>
    )
  }

  if (phase === 'failure' && failureResult) {
    return (
      <section className="content-card placeholder-card failure-card">
        <p className="eyebrow">Route not completed</p>
        <h1>Selected route is invalid.</h1>
        <CoinAmount className="result-coins">0 coins</CoinAmount>
        <p className="failure-reason">{failureResult.message || 'The selected route could not be validated.'}</p>
        <button className="primary-button" type="button" onClick={resetGame}>Start new game</button>
      </section>
    )
  }

  return (
    <section className="content-card game-setup-card">
      <h1>Get to know the network</h1>
      {!isLoading && !error && <div className="network-summary">
        <span>{Array.isArray(network?.stations) ? network.stations.length : 0} stations</span>
        <span>{Array.isArray(network?.lines) ? network.lines.length : 0} lines</span>
        <span>{Array.isArray(network?.interchangeStations) ? network.interchangeStations.length : 0} interchange stations</span>
      </div>}
      {!isLoading && !error && <p className="interchange-note">Double circles mark interchange stations.</p>}
      <img
        className="network-map-image"
        src="/images/network-map.png"
        alt="Last Race metro network map"
      />
      {isLoading && <p className="network-status">Loading the network...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!isLoading && !error && <>
        <h2 className="legend-title">Legend</h2>
        <div className="network-legend">
          <div className="legend-item">
            <img src="/images/interchange-station.png" alt="Interchange station double circle" />
            <span>Interchange station</span>
          </div>
          <div className="legend-item">
            <span className="legend-dash" aria-hidden="true">-</span>
            <span>Connection available in both directions</span>
          </div>
        </div>
        <NetworkMap network={network} />
      </>}
      <button className="primary-button planning-button" type="button" onClick={startPlanning} disabled={isLoading || isStarting}>
        {isStarting ? 'Starting...' : 'Start planning'}
      </button>
    </section>
  )
}

function RankingPage() {
  const [ranking, setRanking] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true

    async function loadRanking() {
      try {
        const response = await fetch('http://localhost:3001/api/ranking', {
          credentials: 'include',
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'The ranking could not be loaded.')
        }

        if (isCurrent) {
          setRanking(Array.isArray(data) ? data : [])
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(loadError.message || 'The ranking could not be loaded.')
        }
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadRanking()
    return () => { isCurrent = false }
  }, [])

  return (
    <section className="content-card ranking-card">
      <p className="eyebrow">Leaderboard</p>
      <h1>Best scores</h1>
      {isLoading && <p className="network-status">Loading the ranking...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!isLoading && !error && ranking.length === 0 && <p className="network-status">No completed games are available yet.</p>}
      {!isLoading && !error && ranking.length > 0 && (
        <div className="ranking-table-wrapper">
          <table className="ranking-table">
            <thead><tr><th>Position</th><th>Username</th><th>Best score</th></tr></thead>
            <tbody>
              {ranking.map((player, index) => (
                <tr key={player.username}>
                  <td>{index + 1}</td>
                  <td>{player.username}</td>
                  <td><CoinAmount>{player.bestScore}</CoinAmount></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function LoginPage() {
  return <section className="login-page"><LoginForm /></section>
}

function App() {
  return (
    <UserProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/instructions" element={<InstructionsPage />} />
          <Route path="/game" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
          <Route path="/ranking" element={<ProtectedRoute><RankingPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </UserProvider>
  )
}

export default App
