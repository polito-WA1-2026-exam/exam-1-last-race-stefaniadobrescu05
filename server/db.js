import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import crypto from 'crypto';

async function getDb() {
  const db = await open({
    filename: './last-race.db',
    driver: sqlite3.Database
  });

  await ensureGameCompletionColumns(db);
  return db;
}

// Keep existing databases compatible while new databases get these columns from init-db.js.
async function ensureGameCompletionColumns(db) {
  const columns = await db.all('PRAGMA table_info(games)');

  if (columns.length === 0) {
    return;
  }

  const columnNames = new Set(columns.map((column) => column.name));
  let addedStatusColumn = false;

  if (!columnNames.has('status')) {
    await db.exec("ALTER TABLE games ADD COLUMN status TEXT NOT NULL DEFAULT 'in_progress'");
    addedStatusColumn = true;
  }

  if (!columnNames.has('completed_at')) {
    await db.exec('ALTER TABLE games ADD COLUMN completed_at TEXT');
  }

  if (addedStatusColumn) {
    // The first four records are the optional demo games created by the old seed script.
    await db.run("UPDATE games SET status = 'demo' WHERE id BETWEEN 1 AND 4");
    // Real games already executed before this migration have persisted execution steps.
    await db.run(`
      UPDATE games
      SET status = 'completed', completed_at = created_at
      WHERE status = 'in_progress'
        AND EXISTS (SELECT 1 FROM game_steps WHERE game_steps.game_id = games.id)
    `);
  }
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
        MAX(games.final_score) AS bestScore
    FROM games
      JOIN users ON games.user_id = users.id
    WHERE games.status = 'completed'
      AND games.completed_at IS NOT NULL
    GROUP BY users.id, users.username
      ORDER BY bestScore DESC
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
        to_station_name: stationsOnLine[i + 1].station_name,
        // The pair is stored once, but it can be travelled in either direction.
        bidirectional: true
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

// Breadth-first search finds the fewest segments between two stations.
function getShortestDistance(startStationId, destinationStationId, connections) {
  const graph = new Map();

  for (const connection of connections) {
    const from = connection.from_station_id;
    const to = connection.to_station_id;

    if (!graph.has(from)) graph.set(from, []);
    if (!graph.has(to)) graph.set(to, []);
    graph.get(from).push(to);
    graph.get(to).push(from);
  }

  const queue = [{ stationId: startStationId, distance: 0 }];
  const visited = new Set([startStationId]);

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.stationId === destinationStationId) {
      return current.distance;
    }

    for (const neighbour of graph.get(current.stationId) || []) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        queue.push({ stationId: neighbour, distance: current.distance + 1 });
      }
    }
  }

  return null;
}

export async function createGame(userId) {
  const network = await getNetwork();
  const stations = Array.isArray(network.stations) ? network.stations : [];
  const connections = Array.isArray(network.connections) ? network.connections : [];
  const validPairs = [];

  for (const startStation of stations) {
    for (const destinationStation of stations) {
      if (startStation.id === destinationStation.id) continue;

      const distance = getShortestDistance(
        startStation.id,
        destinationStation.id,
        connections
      );

      if (distance !== null && distance >= 3) {
        validPairs.push({ startStation, destinationStation });
      }
    }
  }

  if (validPairs.length === 0) {
    return null;
  }

  const selectedPair = validPairs[Math.floor(Math.random() * validPairs.length)];
  const db = await getDb();

  // final_score is required by the existing schema; scoring will update it later.
  const result = await db.run(
    `INSERT INTO games
      (user_id, start_station_id, destination_station_id, initial_coins, final_score, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      selectedPair.startStation.id,
      selectedPair.destinationStation.id,
      20,
      20,
      new Date().toISOString(),
      'in_progress'
    ]
  );

  await db.close();

  return {
    gameId: result.lastID,
    startStation: selectedPair.startStation,
    destinationStation: selectedPair.destinationStation,
    segments: connections
  };
}

function invalidRoute(reasons) {
  const reasonList = Array.isArray(reasons) ? reasons : [reasons];

  return {
    valid: false,
    finalScore: 0,
    message: reasonList[0],
    reasons: reasonList
  };
}

async function saveFinalScore(gameId, finalScore) {
  const db = await getDb();
  await db.run(
    "UPDATE games SET final_score = ?, status = 'invalid', completed_at = NULL WHERE id = ?",
    [finalScore, gameId]
  );
  await db.close();
}

async function saveExecutionResult(gameId, finalScore, executionSteps) {
  const db = await getDb();

  await db.run(
    "UPDATE games SET final_score = ?, status = 'completed', completed_at = ? WHERE id = ?",
    [finalScore, new Date().toISOString(), gameId]
  );
  await db.run('DELETE FROM game_steps WHERE game_id = ?', [gameId]);

  for (const step of executionSteps) {
    await db.run(
      `INSERT INTO game_steps
        (game_id, from_station_id, to_station_id, event_id, coins_after_step, step_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        gameId,
        step.fromStationId,
        step.toStationId,
        step.eventId,
        step.coinsAfterStep,
        step.stepOrder
      ]
    );
  }

  await db.close();
}

export async function validateRoute(gameId, userId, selectedSegments) {
  const db = await getDb();
  const game = await db.get(
    `SELECT id, start_station_id, destination_station_id
     FROM games
     WHERE id = ? AND user_id = ?`,
    [gameId, userId]
  );
  await db.close();

  if (!game) {
    return invalidRoute('Game not found or not owned by the current user.');
  }

  async function invalidForGame(reasons) {
    await saveFinalScore(game.id, 0);
    return invalidRoute(reasons);
  }

  if (!Array.isArray(selectedSegments) || selectedSegments.length === 0) {
    return invalidForGame('Select at least one segment before submitting the route.');
  }

  const network = await getNetwork();
  const connections = network.connections;
  const stationNames = new Map(network.stations.map((station) => [station.id, station.name]));
  const lineNames = new Map(network.lines.map((line) => [line.id, line.name]));
  const interchangeIds = new Set(
    network.interchangeStations.map((station) => station.id)
  );
  const validatedSegments = [];
  const usedPhysicalSegments = new Set();
  const reasons = [];
  let hasDisconnectedSegments = false;

  for (let index = 0; index < selectedSegments.length; index += 1) {
    const selectedSegment = selectedSegments[index];
    const lineId = Number(selectedSegment?.line_id);
    const fromStationId = Number(selectedSegment?.from_station_id);
    const toStationId = Number(selectedSegment?.to_station_id);

    if (!Number.isInteger(lineId) || !Number.isInteger(fromStationId) || !Number.isInteger(toStationId)) {
      reasons.push(`Segment ${index + 1} has invalid station or line data.`);
      validatedSegments.push(null);
      continue;
    }

    // Match either direction against the one stored physical connection.
    const connection = connections.find((item) =>
      item.line_id === lineId &&
      ((item.from_station_id === fromStationId && item.to_station_id === toStationId) ||
        (item.from_station_id === toStationId && item.to_station_id === fromStationId))
    );

    if (!connection) {
      reasons.push(`Segment ${index + 1} does not exist in the metro network.`);
      validatedSegments.push(null);
      continue;
    }

    const physicalSegmentKey = `${lineId}-${Math.min(fromStationId, toStationId)}-${Math.max(fromStationId, toStationId)}`;

    if (usedPhysicalSegments.has(physicalSegmentKey)) {
      reasons.push('The same physical segment cannot be used more than once, even in reverse.');
    } else {
      usedPhysicalSegments.add(physicalSegmentKey);
    }

    validatedSegments.push({ lineId, fromStationId, toStationId });
  }

  const firstSegment = validatedSegments[0];
  const lastSegment = validatedSegments.at(-1);

  if (firstSegment && firstSegment.fromStationId !== game.start_station_id) {
    reasons.push('The route does not start from the assigned start station.');
  }

  for (let index = 1; index < validatedSegments.length; index += 1) {
    const previousSegment = validatedSegments[index - 1];
    const currentSegment = validatedSegments[index];

    if (!previousSegment || !currentSegment) {
      continue;
    }

    if (previousSegment.toStationId !== currentSegment.fromStationId) {
      hasDisconnectedSegments = true;
      continue;
    }

    if (
      previousSegment.lineId !== currentSegment.lineId &&
      !interchangeIds.has(previousSegment.toStationId)
    ) {
      reasons.push(`Segments ${index} and ${index + 1} change lines outside an interchange station.`);
    }
  }

  if (hasDisconnectedSegments) {
    reasons.push('The route has disconnected segments and does not form a continuous route.');
  }

  // Reaching the wrong end station is an incomplete route only when no other issue was found.
  if (reasons.length === 0 && (!lastSegment || lastSegment.toStationId !== game.destination_station_id)) {
    reasons.push('The route is incomplete because it does not end at the assigned destination station.');
  }

  if (reasons.length > 0) {
    return invalidForGame(reasons);
  }

  const events = await getEvents();

  if (events.length === 0) {
    throw new Error('No events are available for game execution.');
  }

  let coins = 20;
  const executionSteps = validatedSegments.map((segment, index) => {
    const event = events[Math.floor(Math.random() * events.length)];
    coins = Math.max(0, coins + event.effect);

    return {
      fromStationId: segment.fromStationId,
      toStationId: segment.toStationId,
      lineId: segment.lineId,
      eventId: event.id,
      eventDescription: event.description,
      effect: event.effect,
      coinsAfterStep: coins,
      stepOrder: index + 1
    };
  });

  const finalScore = Math.max(0, coins);
  await saveExecutionResult(game.id, finalScore, executionSteps);

  return {
    valid: true,
    finalScore,
    executionSteps: executionSteps.map((step) => ({
      from: stationNames.get(step.fromStationId),
      to: stationNames.get(step.toStationId),
      line: lineNames.get(step.lineId),
      eventDescription: step.eventDescription,
      effect: step.effect,
      coinsAfterStep: step.coinsAfterStep
    })),
    message: 'Route is valid. Execution phase will be implemented next.'
  };
}

// Only select fields that are safe to attach to req.user or send to the client.
export async function getUserById(id) {
  const db = await getDb();
  const user = await db.get(
    'SELECT id, username FROM users WHERE id = ?',
    [id]
  );

  await db.close();
  return user;
}

// Password hashes and salts stay inside this function and are never returned.
export async function verifyUserCredentials(username, password) {
  const db = await getDb();
  const user = await db.get(
    `SELECT id, username, password_hash, salt
     FROM users
     WHERE username = ?`,
    [username]
  );

  await db.close();

  if (!user) {
    return null;
  }

  const passwordHash = crypto
    .pbkdf2Sync(password, user.salt, 100000, 64, 'sha512')
    .toString('hex');

  const passwordsMatch = crypto.timingSafeEqual(
    Buffer.from(passwordHash, 'hex'),
    Buffer.from(user.password_hash, 'hex')
  );

  return passwordsMatch ? { id: user.id, username: user.username } : null;
}
