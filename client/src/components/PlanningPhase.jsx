import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CoinAmount from './CoinAmount'

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function PlanningPhase({ game, onRouteValid, onRouteInvalid, onStartNewGame }) {
  const [secondsLeft, setSecondsLeft] = useState(90)
  const [selectedSegments, setSelectedSegments] = useState([])
  const [submitMessage, setSubmitMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionStarted = useRef(false)
  const segments = Array.isArray(game?.segments) ? game.segments : []
  const isTimeOver = secondsLeft === 0

  useEffect(() => {
    if (isTimeOver) return undefined

    const intervalId = setInterval(() => {
      setSecondsLeft((currentSeconds) => Math.max(currentSeconds - 1, 0))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [isTimeOver])

  const stations = useMemo(() => {
    const uniqueStations = new Map()
    const gameSegments = Array.isArray(game?.segments) ? game.segments : []

    gameSegments.forEach((segment) => {
      if (segment?.from_station_id) {
        uniqueStations.set(segment.from_station_id, segment.from_station_name)
      }
      if (segment?.to_station_id) {
        uniqueStations.set(segment.to_station_id, segment.to_station_name)
      }
    })

    if (game?.startStation?.id) uniqueStations.set(game.startStation.id, game.startStation.name)
    if (game?.destinationStation?.id) uniqueStations.set(game.destinationStation.id, game.destinationStation.name)

    return [...uniqueStations.entries()].map(([id, name]) => ({ id, name }))
  }, [game])

  function getSegmentKey(segment, index) {
    return `${segment?.line_id}-${segment?.from_station_id}-${segment?.to_station_id}-${index}`
  }

  function selectSegment(segment, index, isReversed) {
    const segmentKey = getSegmentKey(segment, index)

    setSelectedSegments((currentSegments) => {
      const directedSegment = isReversed
        ? {
            ...segment,
            from_station_id: segment.to_station_id,
            from_station_name: segment.to_station_name,
            to_station_id: segment.from_station_id,
            to_station_name: segment.from_station_name,
          }
        : segment

      return [...currentSegments, {
        ...directedSegment,
        key: `${segmentKey}-${currentSegments.length}-${Date.now()}`,
      }]
    })
  }

  function undoLastSegment() {
    setSelectedSegments((currentSegments) => currentSegments.slice(0, -1))
  }

  function clearRoute() {
    setSelectedSegments([])
    setSubmitMessage('')
  }

  function reorderSegments(fromIndex, toIndex) {
    setSelectedSegments((currentSegments) => {
      if (fromIndex === toIndex) return currentSegments

      const reorderedSegments = [...currentSegments]
      const [movedSegment] = reorderedSegments.splice(fromIndex, 1)
      reorderedSegments.splice(toIndex, 0, movedSegment)
      return reorderedSegments
    })
  }

  const submitRoute = useCallback(async () => {
    if (submissionStarted.current) return

    submissionStarted.current = true
    setSubmitMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `http://localhost:3001/api/games/${game.gameId}/submit-route`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ selectedSegments }),
        },
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Route validation could not be completed.')
      }

      if (result.valid) {
        onRouteValid(result)
      } else {
        onRouteInvalid(result)
      }
    } catch (error) {
      submissionStarted.current = false
      setSubmitMessage(error.message || 'Route validation could not be completed.')
    } finally {
      setIsSubmitting(false)
    }
  }, [game.gameId, onRouteInvalid, onRouteValid, selectedSegments])

  useEffect(() => {
    if (!isTimeOver) return undefined

    const timeoutId = setTimeout(() => submitRoute(), 0)
    return () => clearTimeout(timeoutId)
  }, [isTimeOver, submitRoute])

  return (
    <section className="content-card game-setup-card planning-phase-card">
      <div className="planning-header">
        <div>
          <h1>Plan your race</h1>
          <p className="game-intro">Review the available stations and segments before time runs out.</p>
        </div>
        <div className="planning-status">
          <CoinAmount className="starting-coins">You start this race with 20 coins.</CoinAmount>
          <p className={`timer ${isTimeOver ? 'timer-ended' : ''}`} aria-live="polite">{formatTime(secondsLeft)}</p>
        </div>
      </div>

      <div className="journey-card">
        <div><span>Start station</span><strong>{game?.startStation?.name || 'Unknown station'}</strong></div>
        <div><span>Destination</span><strong>{game?.destinationStation?.name || 'Unknown station'}</strong></div>
      </div>

      {isTimeOver ? (
        <>
          <p className="planning-message" role="status">Time is over. Submitting your built route...</p>
          <section className="planning-section">
            <h2>Your route so far</h2>
            <SelectedRoute
              selectedSegments={selectedSegments}
              onReorder={reorderSegments}
              isReorderEnabled={!isTimeOver}
            />
          </section>
          {submitMessage && <p className="form-error" role="alert">{submitMessage}</p>}
          {!isSubmitting && submitMessage && <button className="primary-button planning-button" type="button" onClick={onStartNewGame}>Start new game</button>}
        </>
      ) : (
        <>
          <section className="planning-section">
            <h2>Stations</h2>
            <div className="station-only-list">
              {stations.map((station) => <span key={station.id}>{station.name || 'Unnamed station'}</span>)}
            </div>
          </section>
          <section className="planning-section">
            <h2>Your selected route</h2>
            <p className="planning-warning">Be careful: the game may let you select disconnected segments, start from the wrong station, end at the wrong station, or reuse a segment, but submitting such a route will make it invalid or incomplete and your score will be 0.</p>
            <SelectedRoute selectedSegments={selectedSegments} />
            <div className="route-actions">
              <button className="secondary-button" type="button" onClick={undoLastSegment} disabled={selectedSegments.length === 0}>Undo last segment</button>
              <button className="secondary-button" type="button" onClick={clearRoute} disabled={selectedSegments.length === 0}>Clear route</button>
              <button className="primary-button" type="button" onClick={submitRoute} disabled={isSubmitting}>{isSubmitting ? 'Checking route...' : 'Submit route'}</button>
            </div>
            {submitMessage && <p className="planning-message" role="status">{submitMessage}</p>}
          </section>
          <section className="planning-section">
            <h2>Available segments</h2>
            <ul className="segment-list">
              {segments.map((segment, index) => {
                const segmentKey = getSegmentKey(segment, index)

                return [
                  <li className="segment-card" key={`${segmentKey}-forward`}>
                    <button className="segment-button" type="button" onClick={() => selectSegment(segment, index, false)}>
                      <span>{segment?.from_station_name || 'Unknown'} - {segment?.to_station_name || 'Unknown'}</span>
                    </button>
                  </li>,
                  <li className="segment-card" key={`${segmentKey}-reverse`}>
                    <button className="segment-button" type="button" onClick={() => selectSegment(segment, index, true)}>
                      <span>{segment?.to_station_name || 'Unknown'} - {segment?.from_station_name || 'Unknown'}</span>
                    </button>
                  </li>,
                ]
              })}
            </ul>
          </section>
        </>
      )}
    </section>
  )
}

function SelectedRoute({ selectedSegments, onReorder, isReorderEnabled = false }) {
  const [draggedIndex, setDraggedIndex] = useState(null)

  if (selectedSegments.length === 0) {
    return <p className="empty-route">No segments selected yet.</p>
  }

  return (
    <ol className="selected-route-list">
      {selectedSegments.map((segment, index) => (
        <li
          className={isReorderEnabled ? 'draggable-route-item' : ''}
          draggable={isReorderEnabled}
          key={segment.key}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', String(index))
            setDraggedIndex(index)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            if (draggedIndex !== null && isReorderEnabled && onReorder) onReorder(draggedIndex, index)
            setDraggedIndex(null)
          }}
          onDragEnd={() => setDraggedIndex(null)}
          title={isReorderEnabled ? 'Drag to change the route order' : undefined}
        >
          {isReorderEnabled && <span className="drag-handle" aria-hidden="true">&#8942;&#8942;</span>}
          {index + 1}. {segment.from_station_name || 'Unknown'} - {segment.to_station_name || 'Unknown'}
        </li>
      ))}
    </ol>
  )
}

export default PlanningPhase
