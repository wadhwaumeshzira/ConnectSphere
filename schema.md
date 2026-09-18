# Database schema — ConnectSphere

```mermaid
erDiagram
  USERS ||--o{ ROOMS : hosts
  ROOMS ||--o{ MESSAGES : contains
  USERS {
    ObjectId _id PK
    string name
    string email
    string passwordHash
    date createdAt
  }
  ROOMS {
    ObjectId _id PK
    string roomCode
    ObjectId hostUserId FK
    boolean isActive
    date createdAt
  }
  MESSAGES {
    ObjectId _id PK
    string roomCode FK
    string senderName
    string text
    date timestamp
  }
```

Notes:
- `roomCode` should be short, unique, and URL-safe (e.g. nanoid, 8 chars) — this is what goes in the shareable link.
- `MESSAGES.roomCode` is denormalized (not an ObjectId ref) so chat history survives even if a room is deleted.
- Guests (non-logged-in joiners) are never written to `USERS` — they only exist as Socket.IO connection state (`socketId`, `displayName`), not persisted.
