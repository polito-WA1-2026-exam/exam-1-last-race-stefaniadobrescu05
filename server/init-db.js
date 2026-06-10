import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import crypto from 'crypto';

const db = await open({
  filename: './last-race.db',
  driver: sqlite3.Database
});

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
}

async function createTables() {
  await db.exec(`
    DROP TABLE IF EXISTS game_steps;
    DROP TABLE IF EXISTS games;
    DROP TABLE IF EXISTS events;
    DROP TABLE IF EXISTS line_stations;
    DROP TABLE IF EXISTS stations;
    DROP TABLE IF EXISTS metro_lines;
    DROP TABLE IF EXISTS users;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL
    );

    CREATE TABLE metro_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    );

    CREATE TABLE stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE line_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      line_id INTEGER NOT NULL,
      station_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (line_id) REFERENCES metro_lines(id),
      FOREIGN KEY (station_id) REFERENCES stations(id)
    );

    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      effect INTEGER NOT NULL CHECK(effect >= -4 AND effect <= 4)
    );

    CREATE TABLE games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      start_station_id INTEGER NOT NULL,
      destination_station_id INTEGER NOT NULL,
      initial_coins INTEGER NOT NULL DEFAULT 20,
      final_score INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (start_station_id) REFERENCES stations(id),
      FOREIGN KEY (destination_station_id) REFERENCES stations(id)
    );

    CREATE TABLE game_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      from_station_id INTEGER NOT NULL,
      to_station_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      coins_after_step INTEGER NOT NULL,
      step_order INTEGER NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (from_station_id) REFERENCES stations(id),
      FOREIGN KEY (to_station_id) REFERENCES stations(id),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );
  `);
}

async function seedUsers() {
  const users = [
    { username: 'andrei', password: 'password' },
    { username: 'maria', password: 'password' },
    { username: 'alex', password: 'password' },
    { username: 'bianca', password: 'password' }
  ];

  for (const user of users) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(user.password, salt);

    await db.run(
      `INSERT INTO users (username, password_hash, salt)
       VALUES (?, ?, ?)`,
      [user.username, passwordHash, salt]
    );
  }
}

async function seedNetwork() {
  const lines = [
    { name: 'Red Line', color: 'red' },
    { name: 'Blue Line', color: 'blue' },
    { name: 'Green Line', color: 'green' },
    { name: 'Yellow Line', color: 'yellow' },
    { name: 'Purple Line', color: 'purple' }
  ];

  for (const line of lines) {
    await db.run(
      `INSERT INTO metro_lines (name, color)
       VALUES (?, ?)`,
      [line.name, line.color]
    );
  }

  const stations = [
    'Kingstone Cross',
    'Oxford Lane',
    'Covent Yard',
    'Victoria Gate',
    'Paddington Gardens',
    'Kensington Square',
    'Notting Hill Gate',
    'Camden Bridge',
    'Bakerford Street',
    'Earlstone Court',
    'Waterloo Quay',
    'Blackfriars Lane',
    'Marble Archway',
    'Liverpool Park',
    'Westminster Park'
  ];

  for (const station of stations) {
    await db.run(
      `INSERT INTO stations (name)
       VALUES (?)`,
      [station]
    );
  }

  const lineStations = {
    'Red Line': [
      'Kingstone Cross',
      'Oxford Lane',
      'Covent Yard',
      'Victoria Gate'
    ],
    'Blue Line': [
      'Paddington Gardens',
      'Kingstone Cross',
      'Kensington Square',
      'Notting Hill Gate'
    ],
    'Green Line': [
      'Camden Bridge',
      'Bakerford Street',
      'Earlstone Court',
      'Waterloo Quay'
    ],
    'Yellow Line': [
      'Blackfriars Lane',
      'Victoria Gate',
      'Marble Archway',
      'Waterloo Quay'
    ],
    'Purple Line': [
      'Liverpool Park',
      'Bakerford Street',
      'Westminster Park',
      'Kingstone Cross'
    ]
  };

  for (const [lineName, stationNames] of Object.entries(lineStations)) {
    const line = await db.get(
      `SELECT id FROM metro_lines WHERE name = ?`,
      [lineName]
    );

    for (let i = 0; i < stationNames.length; i++) {
      const station = await db.get(
        `SELECT id FROM stations WHERE name = ?`,
        [stationNames[i]]
      );

      await db.run(
        `INSERT INTO line_stations (line_id, station_id, position)
         VALUES (?, ?, ?)`,
        [line.id, station.id, i]
      );
    }
  }
}

async function seedEvents() {
  const events = [
    { description: 'Quiet journey', effect: 0 },
    { description: 'Stepped on chewing gum', effect: -2 },
    { description: 'Ticket inspection passed', effect: 2 },
    { description: 'Ticket inspection not passed', effect: -4 },
    { description: 'Lost time in the crowd', effect: -1 },
    { description: 'Found a coin on the seat', effect: 1 },
    { description: 'Unexpected delay', effect: -3 },
    { description: 'Short waiting time', effect: 2 },
    { description: 'Broken escalator', effect: -1 },
    { description: 'Helped a lost tourist', effect: 3 }
  ];

  for (const event of events) {
    await db.run(
      `INSERT INTO events (description, effect)
       VALUES (?, ?)`,
      [event.description, event.effect]
    );
  }
}

async function seedGames() {
  const andrei = await db.get(
    `SELECT id FROM users WHERE username = ?`,
    ['andrei']
  );

  const maria = await db.get(
    `SELECT id FROM users WHERE username = ?`,
    ['maria']
  );

  const alex = await db.get(
    `SELECT id FROM users WHERE username = ?`,
    ['alex']
  );

  const kingstoneCross = await db.get(
    `SELECT id FROM stations WHERE name = ?`,
    ['Kingstone Cross']
  );

  const waterlooQuay = await db.get(
    `SELECT id FROM stations WHERE name = ?`,
    ['Waterloo Quay']
  );

  const paddingtonGardens = await db.get(
    `SELECT id FROM stations WHERE name = ?`,
    ['Paddington Gardens']
  );

  const marbleArchway = await db.get(
    `SELECT id FROM stations WHERE name = ?`,
    ['Marble Archway']
  );

  const camdenBridge = await db.get(
    `SELECT id FROM stations WHERE name = ?`,
    ['Camden Bridge']
  );

  const victoriaGate = await db.get(
    `SELECT id FROM stations WHERE name = ?`,
    ['Victoria Gate']
  );

  await db.run(
    `INSERT INTO games 
      (user_id, start_station_id, destination_station_id, initial_coins, final_score, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      andrei.id,
      kingstoneCross.id,
      waterlooQuay.id,
      20,
      24,
      new Date().toISOString()
    ]
  );

  await db.run(
    `INSERT INTO games 
      (user_id, start_station_id, destination_station_id, initial_coins, final_score, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      maria.id,
      paddingtonGardens.id,
      marbleArchway.id,
      20,
      18,
      new Date().toISOString()
    ]
  );

  await db.run(
    `INSERT INTO games 
      (user_id, start_station_id, destination_station_id, initial_coins, final_score, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      alex.id,
      camdenBridge.id,
      victoriaGate.id,
      20,
      21,
      new Date().toISOString()
    ]
  );

  await db.run(
    `INSERT INTO games 
      (user_id, start_station_id, destination_station_id, initial_coins, final_score, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      andrei.id,
      paddingtonGardens.id,
      waterlooQuay.id,
      20,
      16,
      new Date().toISOString()
    ]
  );
}

await createTables();
await seedUsers();
await seedNetwork();
await seedEvents();
await seedGames();

console.log('Database created and seeded successfully.');

await db.close();