import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import {
  createGame,
  getEvents,
  getNetwork,
  getRanking,
  getUserById,
  validateRoute,
  verifyUserCredentials
} from './db.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(session({
  // Use SESSION_SECRET from the environment when deploying the application.
  secret: process.env.SESSION_SECRET || 'last-race-development-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await verifyUserCredentials(username, password);
    return done(null, user || false);
  } catch (error) {
    return done(error);
  }
}));

// Store only the user id in the session cookie data.
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Rebuild req.user from the id stored in the session.
passport.deserializeUser(async (id, done) => {
  try {
    const user = await getUserById(id);
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

export function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ error: 'Not authenticated' });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', (error, user) => {
    if (error) {
      return next(error);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    return req.login(user, (loginError) => {
      if (loginError) {
        return next(loginError);
      }

      return res.status(201).json(user);
    });
  })(req, res, next);
});

app.get('/api/sessions/current', isLoggedIn, (req, res) => {
  res.json(req.user);
});

app.delete('/api/sessions/current', isLoggedIn, (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) {
      return next(logoutError);
    }

    return req.session.destroy((sessionError) => {
      if (sessionError) {
        return next(sessionError);
      }

      res.clearCookie('connect.sid');
      return res.status(204).end();
    });
  });
});

app.post('/api/games/start', isLoggedIn, async (req, res, next) => {
  try {
    const game = await createGame(req.user.id);

    if (!game) {
      return res.status(500).json({ error: 'Could not generate a valid game.' });
    }

    return res.status(201).json(game);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/games/:gameId/submit-route', isLoggedIn, async (req, res, next) => {
  try {
    const result = await validateRoute(
      req.params.gameId,
      req.user.id,
      req.body.selectedSegments
    );

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/network', async (req, res, next) => {
  try {
    const network = await getNetwork();
    res.json(network);
  } catch (error) {
    next(error);
  }
});

app.get('/api/events', async (req, res, next) => {
  try {
    const events = await getEvents();
    res.json(events);
  } catch (error) {
    next(error);
  }
});

app.get('/api/ranking', isLoggedIn, async (req, res, next) => {
  try {
    const ranking = await getRanking();
    return res.json(ranking);
  } catch (error) {
    return next(error);
  }
});

// Return JSON for unknown API routes as well.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Log implementation details only on the server.
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
