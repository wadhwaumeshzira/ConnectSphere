# ConnectSphere

A fully functional, real-time video calling web application designed for small groups (up to 6 participants). It features seamless mesh WebRTC communication, real-time chat, and an elegant, accessible UI.

## Architecture Overview

ConnectSphere is built with a modern stack focusing on real-time performance:
- **Frontend**: React (Vite) styled with TailwindCSS for a deep-dark, custom UI. State is managed natively via React Context and Hooks.
- **Backend**: Node.js + Express handling RESTful auth (JWT) and room provisioning.
- **Real-time Signaling**: Socket.IO is used exclusively to relay WebRTC signals (`offer`, `answer`, `ice-candidate`) and presence/chat events.
- **Media**: **Mesh WebRTC**. We chose a mesh topology (native `RTCPeerConnection`) instead of an SFU because the v1 scope is capped at 6 participants. Mesh allows peers to stream directly to each other (P2P), drastically reducing server bandwidth and complexity.
- **NAT Traversal**: We use public STUN servers for standard NAT traversal, with support for a self-hosted `coturn` TURN relay to fall back on when direct connections are blocked by strict firewalls.
- **Database**: MongoDB tracks persistent data like User accounts and Room metadata.

## Setup & Running Locally

Everything is containerized for a smooth setup process.

1. Ensure you have Docker and Docker Compose installed.
2. Clone this repository.
3. Configure your environment:
   ```bash
   cp .env.example .env
   # Open .env and fill in secure JWT_SECRET and TURN_SECRET values
   ```
4. Start the stack:
   ```bash
   docker-compose up -d
   ```
   *Note: This will spin up the Frontend, Backend, MongoDB, and Coturn (TURN server) services.*

5. The app will be available at: **http://localhost:5173**

## Manual Test Checklist

- [ ] Create a new room as a logged-in user.
- [ ] Open an incognito window and join the room as a Guest (using just a display name).
- [ ] Verify both participants appear in the People tab.
- [ ] Toggle microphone and camera; verify the UI updates correctly for the other participant.
- [ ] Send a chat message and verify it appears instantly on the other side.
- [ ] Share screen and verify the video track is cleanly replaced on the remote side.
- [ ] Close one browser tab and verify the remaining participant's UI updates gracefully (participant leaves).

## Future Work (Beyond v1)

- **Selective Forwarding Unit (SFU)**: To scale beyond 6 participants, migrate from a Mesh topology to an SFU (like mediasoup or LiveKit) to centralize media routing.
- **Host Controls**: Give room creators the ability to mute or remove disruptive participants.
- **Private Chat**: Allow 1-on-1 direct messaging between participants during a call.
- **Hand Raises**: Let participants signal they want to speak without interrupting.
- **Call Recording**: Server-side recording capabilities.
- **Waiting Rooms**: Host approval before guests can enter the active call.
- **Breakout Rooms**: Ability to split the current room into smaller sub-rooms dynamically.
