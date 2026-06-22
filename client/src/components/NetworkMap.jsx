function getStationsForLine(line, connections) {
  const stations = []
  const lineConnections = connections.filter((connection) => connection?.line_id === line?.id)

  for (const connection of lineConnections) {
    const stops = [
      { id: connection.from_station_id, name: connection.from_station_name },
      { id: connection.to_station_id, name: connection.to_station_name },
    ]

    stops.forEach((station) => {
      if (!stations.some((currentStation) => currentStation.id === station.id)) {
        stations.push(station)
      }
    })
  }

  return stations
}

function NetworkMap({ network }) {
  // These fallbacks keep an incomplete API response from breaking the game page.
  const lines = Array.isArray(network?.lines) ? network.lines : []
  const connections = Array.isArray(network?.connections) ? network.connections : []
  const interchanges = Array.isArray(network?.interchangeStations) ? network.interchangeStations : []
  const interchangeIds = new Set(interchanges.map((station) => station?.id))

  if (lines.length === 0) {
    return <p className="network-status">No metro lines are available yet.</p>
  }

  return (
    <div className="network-map" aria-label="Metro network">
      <div className="network-summary"><span>{lines.length} lines</span><span>{connections.length} connections</span><span>{interchanges.length} interchange stations</span></div>
      <div className="line-list">
        {lines.map((line) => {
          const stations = getStationsForLine(line, connections)
          const lineColor = line?.color || '#257b91'

          return (
            <article className="metro-line-card" key={line?.id || line?.name} style={{ '--line-color': lineColor }}>
              <h2>{line?.name || 'Unnamed line'}</h2>
              {stations.length > 0 ? <div className="station-row">
                {stations.map((station, index) => <span className="station-group" key={`${line.id}-${station.id}-${index}`}>
                  <span className={`station-dot ${interchangeIds.has(station.id) ? 'interchange-dot' : ''}`} title={interchangeIds.has(station.id) ? 'Interchange station' : undefined} />
                  <span className="station-name">{station.name || 'Unnamed station'}</span>
                  {index < stations.length - 1 && <span className="station-connector" aria-hidden="true" />}
                </span>)}
              </div> : <p className="network-status">No connections are available for this line.</p>}
            </article>
          )
        })}
      </div>
      {interchanges.length > 0 && <p className="interchange-note">Double circles mark interchange stations.</p>}
    </div>
  )
}

export default NetworkMap
