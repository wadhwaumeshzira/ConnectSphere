# Engineering standards — ConnectSphere

Follow these conventions for every change in this project, not just the first pass. Read this file at the start of every session before doing anything else.

## Stack
- Frontend: React (Vite)
- Backend: Node.js + Express
- Realtime: Socket.IO (signaling, presence, chat)
- Media: WebRTC, mesh topology (native `RTCPeerConnection`, no SFU)
- NAT traversal: coturn (STUN/TURN), self-hosted via Docker
- Database: MongoDB + Mongoose
- Auth: JWT (access + refresh tokens)
- Deployment: Docker + Docker Compose

## Non-negotiable practices
- All secrets and config via `.env`, never hardcoded. Keep `.env.example` in sync with every key actually used.
- Validate every Express route's input (zod or express-validator) before touching the DB.
- Hash passwords with bcrypt. Never log or store plaintext passwords or tokens.
- Lock CORS to known origins.
- Authenticate Socket.IO connections during the handshake (`io.use(...)`), not after the fact per-event.
- One consistent error response shape across REST and Socket.IO: `{ error: { code, message } }`.
- Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`).
- Keep `api-contract.md` and `schema.md` in sync with the actual code — update them in the same change that changes an endpoint, event, or model.

## Code organization
```
backend/src/
  routes/       REST endpoints only — no business logic here
  controllers/  business logic, called by routes
  models/       Mongoose schemas
  middleware/   auth, validation, error handling
  sockets/      Socket.IO event handlers, kept separate from REST controllers
  config/       env loading, db connection, turn credentials

frontend/src/
  components/   presentational, reusable
  pages/        route-level views
  hooks/        useWebRTC, useSocket, useAuth — all peer-connection logic lives in useWebRTC, not scattered across components
  context/      auth state, call state
  services/     REST API client wrappers
```

## Scope discipline
- v1 is capped at ~4-6 participants per room using mesh WebRTC. Do not start building an SFU.
- No recording, no breakout rooms, no waiting rooms in v1. List them under "Future work" in the README.
- Get the full flow working end-to-end before polishing UI or adding secondary features.

## Testing
- Minimum: a manual test checklist in the README (create room, join from a second browser/device, mute/unmute, camera toggle, screen share, chat, one participant disconnecting mid-call).
- Nice to have: unit tests for the auth routes.

## UI/UX
Read `ui-guidelines.md` before building any screen. Do not default to generic SaaS-template styling — this is a resume piece, the UI should look intentional.

## Development log — `procedure.md` (Hinglish)

Maintain a running file called `procedure.md` at the ConnectSphere project root. Update it after every meaningful chunk of work is finished — a feature, a module, a bug fix — not after every single line change. Write it in Hinglish (Hindi + English mila ke, Roman script), simple aur casual tone mein, taaki baad mein padhke khud samajh sake aur interview mein explain kar sake.

Har entry mein ye cheezein honi chahiye:
1. **Kya kiya** — kaunsa feature/module banaya ya change kiya
2. **Kaise kiya** — approach, steps, kaunsi library/tech use ki, important decisions kyu liye
3. **Problem kya aaya** — agar koi error/bug/blocker mila to uska exact description
4. **Solution kaise nikala** — debug kaise kiya, root cause kya tha, fix kya tha

Newest entry sabse upar rakho, purani entries kabhi mat delete/overwrite karo — ye poore build ka chronological log hai.

Example entry:
```
## [Date] Auth routes bana diye

**Kya kiya:** Register aur login API bana di, JWT token generate ho raha hai.

**Kaise kiya:** bcrypt se password hash kiya, jsonwebtoken se access + refresh token banaya, express-validator se input validate kiya.

**Problem:** login pe refresh token expire nahi ho raha tha, har baar same token aa raha tha.

**Solution:** JWT sign karte waqt expiresIn option galat jagah pass ho raha tha — usko sahi jagah move kiya, fir sahi se expire hone laga.
```

`procedure.md` ko `README.md` se alag rakho — README ek human ke liye hai jo project run karna chahta hai, `procedure.md` tumhara apna dev diary hai jo pura build process track karta hai.

## When something is ambiguous
State the assumption you're making in a code comment, `procedure.md`, or the README rather than silently picking one and moving on — the reasoning should be visible.
