# UI guidelines — ConnectSphere

Read this alongside AGENTS.md before building any screen. Goal: it should look like a real product, not a generated dashboard template.

## Avoid the generic tells
Don't default to: a warm cream background with a terracotta accent, a near-black background with one neon accent, identical rounded cards with the same soft drop-shadow on everything, gradient washes as decoration, ALL-CAPS tracked-out labels, or a "→" tacked onto every button. Pick one deliberate palette and layout for this product and commit to it instead of the generic AI-app look.

## Direction for this product
- Default to a **dark theme** as primary (video-calling apps live in dark UIs — video tiles pop against it, less eye strain on long calls). Still support a light theme toggle if time allows, but design dark-first, not as an afterthought.
- One accent color, used sparingly — for the active/primary action only (join call, mute toggle when active, live indicator). Don't scatter it across every icon.
- Real typographic hierarchy: one type family, clear weight/size scale between headings, body, and UI labels. No unnecessary eyebrow labels above things that don't need them.

## Screens to actually design (not just the call screen)
1. **Landing/auth** — register, login. Keep it minimal, this isn't the hero of the product.
2. **Lobby / pre-join screen** — camera preview, mic/camera toggle, display name input, "Join now" — this is the first real impression, worth deliberate design.
3. **In-call screen** — this is the core screen, see grid rules below.
4. **Empty states** — no one else has joined yet ("Waiting for others to join" with the room link visible and copyable, not a blank screen).
5. **Error/disconnect states** — camera/mic permission denied, connection lost and retrying, room not found. Each needs its own clear message and next action, not a generic toast.

## Video grid rules
- Tile layout adapts to participant count: 1 participant = full screen, 2 = split, 3-4 = 2x2 grid, 5-6 = compact grid. Don't just stack tiles in a single scrolling column.
- Each tile shows: video (or an avatar/initials placeholder when camera is off), display name, and a muted-mic icon when muted — always visible, not only on hover.
- The active speaker (if you implement audio-level detection) gets a subtle highlight — a border, not a jarring resize.
- Screen share takes over as the main tile, other participants shrink to a strip.

## Controls
- Bottom control bar, fixed, icon-only buttons with a text label on hover/focus (not always-visible text — keeps it clean but still accessible).
- Mute, camera toggle, screen share, chat toggle, participant list toggle, leave call — leave call visually distinct (different color) from the rest so it's never misclicked.
- State must be instantly readable at a glance: a muted mic icon looks different from an unmuted one, not just a color change (colorblind-safe — pair color with an icon/shape change).

## Motion
- One deliberate transition for joining/leaving a tile (fade or scale, not both), nothing more. No hover-animation on every single element — that's a generic tell, not polish.

## Accessibility and quality floor (non-negotiable, not optional polish)
- Visible keyboard focus states on every interactive element.
- Color is never the only signal (mute state, connection status, errors all need an icon or text alongside color).
- Responsive down to mobile width — the control bar and grid must not break below ~375px.
- Respect `prefers-reduced-motion`.

## Copy
- Write from the user's perspective, plain language: "Camera is off," not "Video stream disabled." Buttons say what they do: "Leave call," not "Submit" or "Exit."
- Error messages say what happened and what to do next: "Couldn't reach the meeting — check your connection and try again," not "Error 500."
