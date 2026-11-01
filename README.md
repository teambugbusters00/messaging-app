# Messaging App

A cross-platform messaging platform, starting with a web MVP. The first milestone focuses on a clean chat experience and a real-time messaging foundation.

## Current status

- [x] Initial monorepo structure
- [x] Responsive chat UI
- [x] Socket.IO real-time transport
- [x] Basic room-based messaging prototype
- [ ] Persistent message storage
- [ ] Authentication and user identity
- [ ] Direct and group conversations
- [ ] Media uploads and notifications
- [ ] E2E encryption (using an established protocol)

> **Prototype note:** Messages are currently held in server memory and are lost when the server restarts. Do not use this prototype for private or production conversations.

## Stack

- Client: React, Vite, Socket.IO Client
- Server: Node.js, Express, Socket.IO
- Next planned infrastructure: PostgreSQL, Redis, object storage

## Requirements

- Node.js 20+

## Run locally

From the repository root:

```bash
npm install
npm run install:all
npm run dev
```

- Web client: http://localhost:5173
- API health: http://localhost:4000/health

Set `VITE_SERVER_URL` in `client/.env` if the API runs somewhere other than `http://localhost:4000`.

## Project layout

```
client/    React web client
server/    Express + Socket.IO API
```

## Engineering principles

1. Keep transport, domain logic, and persistence separate.
2. Validate and authorize every message operation on the server.
3. Treat delivery acknowledgements as distinct from read receipts.
4. Design encryption and key lifecycle before claiming E2E security.
5. Add persistence and multi-instance coordination before production scaling.
