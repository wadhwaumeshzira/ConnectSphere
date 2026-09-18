# Project: ConnectSphere — a Google Meet-style video calling app

## Goal
Build a complete, working, resume-quality video calling web app for small groups (up to 4-6 participants per room). Prioritize a fully working end-to-end product over feature breadth. This is a learning + portfolio project for an SDE internship application, so favor clean, explainable architecture over cleverness.

## Tech stack
- Frontend: React (Vite)
- Backend: Node.js + Express
- Realtime signaling and chat: Socket.IO
- Media streaming: WebRTC, mesh topology (peers connect directly to each other)
- NAT traversal: coturn (STUN/TURN server), self-hosted
- Database: MongoDB + Mongoose
- Auth: JWT
- Deployment: Docker Compose (frontend, backend, mongo, coturn as separate services)

## Assumption (flag if you'd prefer otherwise)
Creating a room requires an account (JWT auth). Joining an existing room via its link/code does not require an account — a guest can type a display name and join. This mirrors how Meet actually works and keeps the auth surface small.

## v1 features
1. Register / log in with email + password (JWT access token, refresh token)
2. Create a meeting room as a logged-in user, get a shareable room code/link
3. Join a room via link or code, as a host or as a guest (guest just supplies a display name)
4. Live audio/video calling between all participants in a room (WebRTC mesh, cap enforced client-side at 6 participants)
5. Mute/unmute microphone, toggle camera on/off
6. Screen share (replace the video track, don't open a second connection)
7. In-call text chat via Socket.IO, visible to everyone in the room
8. Live participant list, updates as people join/leave
9. Graceful handling of disconnects (peer connection cleanup, participant list update, no orphaned Socket.IO listeners)

## Architecture
- Frontend talks to the backend two ways: REST for auth and room creation/lookup, Socket.IO for everything real-time (room presence, WebRTC signaling, chat).
- The backend never touches media. It relays SDP offers/answers and ICE candidates between peers over Socket.IO; the actual audio/video goes directly between browsers, falling back to a TURN relay (coturn) when a direct connection is blocked by NAT/firewall.
- MongoDB stores users, room metadata, and (optionally) persisted chat history per room.

## Suggested data models
```
User:    name, email, passwordHash, createdAt
Room:    roomCode, hostUserId, createdAt, isActive
Message: roomCode, senderName, text, timestamp
```

## Suggested Socket.IO events
```
Client -> Server: join-room, offer, answer, ice-candidate, chat-message, toggle-media, leave-room
Server -> Client: user-joined, user-left, offer, answer, ice-candidate, chat-message, room-participants
```

## Deployment
- `docker-compose.yml` with services: `frontend`, `backend`, `mongo`, `coturn`
- `.env.example` covering `JWT_SECRET`, `MONGO_URI`, TURN server credentials, and any client-facing config (e.g. `VITE_SOCKET_URL`)
- App should come up cleanly with a single `docker-compose up`

## Explicitly out of scope for v1
- SFU / group calls beyond ~6 people
- Call recording
- Breakout rooms, waiting rooms
- Native mobile app (responsive web only)

List these under a "Future work" section in the README rather than partially implementing them.

## Deliverables
- Working app, runnable via `docker-compose up`, with clear setup instructions
- README covering: setup, environment variables, architecture overview (why mesh WebRTC, why coturn, why JWT), manual test checklist, and future work
- Clean, incremental git history with conventional commit messages
