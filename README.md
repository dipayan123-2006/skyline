# Skyline (React + Express + MongoDB)

## Run locally (development)
1. Copy `.env.example` to `.env` and set `MONGODB_URI`.
2. `npm install` then `npm --prefix client install`
3. Terminal 1: `npm run dev` (API on http://localhost:3000)
4. Terminal 2: `npm --prefix client run dev` (React on http://localhost:5173)

## Run as one app (production)
`npm install && npm run build && npm start` then open http://localhost:3000

## Deploy on Render
Build command: `npm install && npm run build`  Start command: `npm start`
Env var: `MONGODB_URI`
