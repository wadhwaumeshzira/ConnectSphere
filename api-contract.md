# API contract — ConnectSphere

Error shape (used everywhere, REST and Socket.IO): `{ "error": { "code": "STRING_CODE", "message": "human readable" } }`

## REST endpoints

### POST /api/auth/register
Body: `{ name, email, password }`
201: `{ user: { id, name, email }, accessToken, refreshToken }`

### POST /api/auth/login
Body: `{ email, password }`
200: `{ user: { id, name, email }, accessToken, refreshToken }`
401 on bad credentials.

### POST /api/auth/refresh
Body: `{ refreshToken }`
200: `{ accessToken }`

### POST /api/rooms (auth required)
Body: `{}`
201: `{ roomCode, hostUserId, createdAt }`

### GET /api/rooms/:roomCode
200: `{ roomCode, isActive, hostUserId }`
404 if room doesn't exist or is inactive.

## Socket.IO events

Handshake must include the JWT (logged-in user) or a guest display name; server verifies before allowing `join-room`.

### Client → Server
- `join-room` — `{ roomCode, displayName }`
- `offer` — `{ roomCode, toSocketId, sdp }`
- `answer` — `{ roomCode, toSocketId, sdp }`
- `ice-candidate` — `{ roomCode, toSocketId, candidate }`
- `chat-message` — `{ roomCode, text }`
- `toggle-media` — `{ roomCode, kind: "audio" | "video", enabled }`
- `leave-room` — `{ roomCode }`

### Server → Client(s)
- `room-participants` — `{ participants: [{ socketId, displayName }] }`
- `user-joined` — `{ socketId, displayName }`
- `user-left` — `{ socketId }`
- `offer` / `answer` / `ice-candidate` — relayed payload, same shape as sent, plus `fromSocketId`
- `chat-message` — `{ senderName, text, timestamp }`
