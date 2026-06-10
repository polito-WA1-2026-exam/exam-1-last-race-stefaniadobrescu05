import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function getDb() {
  return open({
    filename: './last-race.db',
    driver: sqlite3.Database
  });
}

export async function getEvents() {
  const db = await getDb();

  const events = await db.all(`
    SELECT id, description, effect
    FROM events
    ORDER BY id
  `);

  await db.close();
  return events;
}

export async function getRanking() {
  const db = await getDb();

  const ranking = await db.all(`
    SELECT 
      users.username,
      MAX(games.final_score) AS best_score
    FROM games
    JOIN users ON games.user_id = users.id
    GROUP BY users.id, users.username
    ORDER BY best_score DESC
  `);

  await db.close();
  return ranking;
}

export async function getNetwork() {
  const db = await getDb();

  const lines = await db.all(`
    SELECT id, name, color
    FROM metro_lines
    ORDER BY id
  `);

  const stations = await db.all(`
    SELECT id, name
    FROM stations
    ORDER BY id
  `);

  const lineStations = await db.all(`
    SELECT 
      metro_lines.id AS line_id,
      metro_lines.name AS line_name,
      metro_lines.color AS line_color,
      stations.id AS station_id,
      stations.name AS station_name,
      line_stations.position
    FROM line_stations
    JOIN metro_lines ON line_stations.line_id = metro_lines.id
    JOIN stations ON line_stations.station_id = stations.id
    ORDER BY metro_lines.id, line_stations.position
  `);

  const connections = [];

  for (const line of lines) {
    const stationsOnLine = lineStations
      .filter(item => item.line_id === line.id)
      .sort((a, b) => a.position - b.position);

    for (let i = 0; i < stationsOnLine.length - 1; i++) {
      connections.push({
        line_id: line.id,
        line_name: line.name,
        from_station_id: stationsOnLine[i].station_id,
        from_station_name: stationsOnLine[i].station_name,
        to_station_id: stationsOnLine[i + 1].station_id,
        to_station_name: stationsOnLine[i + 1].station_name
      });
    }
  }

  const interchangeStations = await db.all(`
    SELECT 
      stations.id,
      stations.name,
      COUNT(line_stations.line_id) AS lines_count
    FROM stations
    JOIN line_stations ON stations.id = line_stations.station_id
    GROUP BY stations.id, stations.name
    HAVING COUNT(line_stations.line_id) > 1
    ORDER BY stations.name
  `);

  await db.close();

  return {
    lines,
    stations,
    connections,
    interchangeStations
  };
}