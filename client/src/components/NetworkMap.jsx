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
      <div className="line-list">
        {lines.map((line) => {
          const stations = getStationsForLine(line, connections)
          const lineColors = {
            red: '#c96a6a',
            blue: '#5d97b8',
            yellow: '#d98518',
          }
          const lineColor = lineColors[line?.color] || line?.color || '#257b91'

          return (
            <article className="metro-line-card" key={line?.id || line?.name} style={{ '--line-color': lineColor }}>
              <h2>{line?.name || 'Unnamed line'}</h2>
              {stations.length > 0 ? <div className="station-row">
                {stations.map((station, index) => {
                  const isInterchange = interchangeIds.has(station.id)

                  return <span className="station-group" key={`${line.id}-${station.id}-${index}`}>
                    {isInterchange ? (
                      <img className="station-interchange-icon" src="/images/interchange-station.png" alt="Interchange station" />
                    ) : <span className="station-marker-space" aria-hidden="true" />}
                    <span className="station-name">{station.name || 'Unnamed station'}</span>
                    {index < stations.length - 1 && <span className="station-connector-dash" aria-hidden="true">-</span>}
                  </span>
                })}
              </div> : <p className="network-status">No connections are available for this line.</p>}
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default NetworkMap
