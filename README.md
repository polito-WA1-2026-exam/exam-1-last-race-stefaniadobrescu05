# Exam #1: Last Race
## Student: s362700 Stefania-Maria Dobrescu

## React Client Application Routes

- Route `/`: Home page. It shows welcome information and, for logged-in users, links to play the game and view the ranking.
- Route `/login`: Login page. The user enters their credentials to access protected game features.
- Route `/instructions`: Rules page. It explains the game rules and route-validation requirements.
- Route `/game`: Protected game page. It contains the Setup, Planning, Execution, Result, and Failure phases; these are states inside this route, not separate URLs.
- Route `/ranking`: Protected ranking page. It displays each completed player’s best score.

## API Server

- GET `/api/health`
  - Response body: `{ "status": "ok" }`

- POST `/api/sessions`
  - Request body: `{ "username": "...", "password": "..." }`
  - Response body: the logged-in user `{ "id": ..., "username": "..." }`
  - Uses a session cookie.

- GET `/api/sessions/current`
  - Protected route.
  - Response body: the currently logged-in user.

- DELETE `/api/sessions/current`
  - Protected route.
  - Logs out the current user and destroys the session.

- GET `/api/network`
  - Response body: metro lines, stations, connections, and interchange stations.

- GET `/api/events`
  - Response body: all random events with `id`, `description`, and `effect`.

- POST `/api/games/start`
  - Protected route.
  - Creates a new game for the logged-in user.
  - Response body: `gameId`, `startStation`, `destinationStation`, and available `segments`.

- POST `/api/games/:gameId/submit-route`
  - Protected route.
  - Path parameter: `gameId` is the ID of the game being submitted.
  - Request body: `{ "selectedSegments": [...] }`
  - Response body:
    - valid route: validation result, `finalScore`, and `executionSteps`
    - invalid route: `valid: false`, `finalScore: 0`, and validation `reasons`

- GET `/api/ranking`
  - Protected route.
  - Response body: completed users’ best scores, ordered from highest to lowest.

## Database Tables

- Table `users`
  - Stores user accounts: `id`, `username`, `password_hash`, and `salt`.
- Table `metro_lines`
  - Stores the metro lines: `id`, `name`, and `color`.
- Table `stations`
  - Stores all metro stations: `id` and `name`.
- Table `line_stations`
  - Connects stations to metro lines and stores their order on each line: `line_id`, `station_id`, and `position`.
  - Connections are created in code from neighboring stations on the same line; there is no separate `connections` table.
- Table `events`
  - Stores random journey events: `id`, `description`, and `effect`.
- Table `games`
  - Stores each game: user, assigned start/destination stations, initial coins, final score, creation date, status, and completion date.
- Table `game_steps`
  - Stores the executed route steps for completed games: game, from/to stations, event, coins after the step, and step order.

## Main React Components

- `App` (in `App.jsx`): defines the main structure of the React application and the application routes.
- `LoginForm` (in `LoginForm.jsx`): displays the login form and handles user authentication.
- `UserContext` (in `UserContext.jsx`): stores the logged-in user and provides session, login, and logout functionality.
- `ProtectedRoute` (in `ProtectedRoute.jsx`): protects game pages so that only logged in users can access them.
- `Layout` (in `Layout.jsx`): provides the common page layout used in the application.
- `NavigationBar` (in `NavigationBar.jsx`): displays the navigation elements of the application.
- `PlanningPhase` (in `PlanningPhase.jsx`): allows the user to select metro connections and create a race route.
- `ExecutionPhase` (in `ExecutionPhase.jsx`): displays the result of the race after the user submits the route.
- `NetworkMap` (in `NetworkMap.jsx`): displays the metro map and the stations/connections used in the game.
- `CoinAmount` (in `CoinAmount.jsx`): displays the amount of coins gained or lost during the game.

## Screenshot

General ranking page:

![General ranking page](img/Screenshot%20leaderboard.png)

During a game:

![Game page](img/Screenshot%20game.png)

## Users Credentials

- username: `andrei`, password: `andreiyes`
- username: `stefania`, password: `password123`
- username: `alex`, password: `myPassword`
- username: `maria`, password: `Birthday29`

## Use of AI Tools

I used AI tools during the project for visual and design support. I used them to generate and improve images for the metro map, the logo, and some special interface symbols. I also used AI tools to help me choose station names, find better colors for the visual style of the game, and adjust some interface elements so that the final design was closer to my initial idea.

I also used AI tools for small design suggestions and for checking how some parts of the interface could be improved. I verified the output by testing the application, checking that the visuals matched the game idea, and adapting the generated results manually before using them in the project.
