# MicroGrow

MicroGrow is a competition-ready MERN project that simulates a micro-investment and round-up savings experience for educational use only.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + bcrypt

## Current status

This repository currently includes:

- a Vite React frontend scaffold in `client/`
- an Express backend foundation in `server/` with a health route and centralized error handling

## Local development

1. Install dependencies:
   - `npm install`
   - or `npm run install:all`
2. Start the backend:
   - `npm --prefix server run dev`
3. Start the frontend:
   - `npm --prefix client run dev`

## Notes

- This project is a simulation and does not connect to real banks or execute real trades.
- Keep secrets in environment files such as `server/.env` and never commit real credentials.
