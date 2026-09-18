## [2026-09-18] Vercel SPA Routing aur WebRTC NAT Traversal (Mobile Support)

**Kya kiya:** Frontend Vercel pe aur Backend Render pe deploy hone ke baad jo routing issues (404) aur video rendering ke mobile network bugs (black screen) the, unko theek kiya. 

**Kaise kiya:** 
- Vercel SPA 404 issue: Vite apps single page hoti hain, isliye refresh pe 404 aata hai. Main ne `vercel.json` banaya rules define karne ke liye, par Windows PowerShell ne galti se usko UTF-16 encoding mein save kar diya jisse Vercel build crash hua. Fir Node script use karke pure UTF-8 mein config rewrite kiya, tab jake routing thik hui!
- Render CORS / Environment: Frontend URL mein `/login` path laga tha Render pe jo CORS tod raha tha, aur Vercel pe `/api` missing tha. Dono theek karwaye.
- Mobile Grid fix: Kisi kisi case mein video connect hone se pehle CSS Grid ek implicit invisible row bana raha tha jisse connecting video screen ke bottom ke baahar overflow hoke chhup jati thi. Usko `participants.length` se update karke CSS Grid ko 100% stable banaya.
- NAT Traversal (Symmetric NAT): Mobile data (Jio/Airtel) wale users WebRTC peer-to-peer connect nahi kar paa rahe the (black screen). Main ne `useWebRTC.js` mein OpenRelay ke free TURN servers inject kiye, jisse strict firewalls aur carrier-grade NATs bypass hoke cloud relay ke through connection establish ho jaata hai.

**Problem kya aaya:** 1. Vercel ne UTF-16 file error maar di. 2. CSS grid logic galat hone se 2nd banda screen ke bahar render ho raha tha. 3. Mobile network pe STUN P2P connections block ho rahe the.

**Solution kaise nikala:** 1. Node se UTF-8 file force ki. 2. Grid count logic correctly bind kiya. 3. Code mein hi public TURN servers add kiye taaki STUN block hone pe TURN fallback kare.

## [2026-09-18] Auto-Delete Empty Rooms (DB Optimization)

**Kya kiya:** Agar koi meeting room khali (0 participants) ho jata hai, toh 10 minutes wait karne ke baad usko MongoDB se auto-delete kar diya taaki faltu DB na bhare.

**Kaise kiya:** `roomHandler.js` mein `emptyRoomTimers` ka ek naya `Map` banaya. Jab aakhri banda leave karta hai (`participants.size === 0`), toh ek 10-minute ka `setTimeout` chalu hota hai jo `Room.deleteOne` call karta hai. Agar un 10 minutes ke andar koi wapas join karta hai, toh `clearTimeout` se wo deletion ruk jata hai.

**Problem:** Puraane unused meeting IDs database mein jama hote ja rahe the, jo resource waste tha.
**Solution:** In-memory timers ka use karke lazy deletion laga di.

## [2026-09-18] Branding Update

**Kya kiya:** Site ka title `ConnectSphere` kiya aur naya SVG favicon (globe/network icon) lagaya.

**Kaise kiya:** `index.html` mein `<title>` tag update kiya aur `public/favicon.svg` ko nayi SVG path design se replace kar diya.

**Problem:** Default Vite template lag raha tha.
**Solution:** Custom branding lagayi for a more professional look.

## [2026-09-18] WebRTC Bug Fixes (Video Toggle & Screen Share)

**Kya kiya:** Video toggle karne pe blank aane ka issue fix kiya, aur screen share flow ko robust banaya (with auto-unmute and un-mirroring).

**Kaise kiya:**
- `Room.jsx` mein `VideoTile` component ke `useEffect` dependency array mein `isVideoMuted` add kiya, taaki jab video element DOM mein wapas mount ho, toh `srcObject` dubara lag jaye.
- `handleToggleScreenShare` function banaya jo screen share start hote hi automatically `cameraOn` state ko true kar deta hai (aur doosro ko `toggle-media` event bhejta hai) taaki screen hidden na reh jaye.
- Local video tile mein `isScreenSharing` flag pass kiya aur uske basis pe CSS `scale-x-[-1]` hataya taaki screen share ka text ulta (mirrored) na dikhe.

**Problem kya aaya:** 1. Jab koi apna camera off karke on karta tha, unka video feed gayab ho jata tha kyuki element unmount hoke remount hota tha par stream re-attach nahi hota tha. 2. Agar koi camera off karke screen share karta, toh screen feed hide hi rehti thi dono sides pe.

**Solution kaise nikala:** 1. React lifecycle (useEffect dependencies) ko sahi track karke stream ko reconnect karwaya. 2. Screen share activate hone pe explicitly camera UI state ko `true` mark karke remote sync trigger kiya.

## [2026-09-18] Admin Badge aur Video Pinning

**Kya kiya:** Participants list mein host ke naam ke aage `(Admin)` badge add kiya aur kisi bhi video pe click karke usko "Pin" karne ka layout banaya (jaise Google Meet mein hota hai).

**Kaise kiya:**
- `roomHandler.js` mein join karte time check lagaya `room.hostUserId.toString() === socket.userId.toString()` aur participant object mein `isHost: true` flag add kiya.
- `Room.jsx` UI mein Admin badge render kiya.
- Video pinning ke liye `pinnedSocketId` state banayi. Jab koi pin hota hai, toh usko flex container ka zyadatar hissa de diya (main focus), aur baaki unpinned videos ko side (ya bottom, screen size ke hisaab se) chote grid mein shift kar diya.

**Problem kya aaya:** Jab koi pinned user leave karta hai, toh video layout empty spot dikhata agar unpin na karein.

**Solution kaise nikala:** `remoteStreams.find` ke time check lagaya ki agar pinned user exit kar gaya hai (`!rs`), toh `setTimeout` se state automatically `setPinnedSocketId(null)` kar di taaki standard grid wapas aa jaye.

## [2026-09-18] Host Controls, Private Chat aur Hand Raises

**Kya kiya:** Advanced features implement kiye — Room host kisi ko bhi force mute ya kick kar sakta hai, participants aapas mein private message bhej sakte hain, aur hand raise karke visually ping kar sakte hain.

**Kaise kiya:**
- Backend (`roomHandler.js`) mein naye socket events banaye: `force-mute`, `remove-user`, `private-message`, aur `hand-raise`.
- `force-mute` aur `remove-user` ke liye backend mein strict check lagaya ki event bhejne wala user sach mein room ka `hostUserId` match karta hai ya nahi.
- Frontend mein `useSocket.js` hook update kiya naye events handle karne ke liye aur state (`raisedHands`) maintain karne ke liye.
- `Room.jsx` UI update kiya: 
  - Chat feed mein inline `isPrivate` messages dikhaye aur target ko choose karne ka UI lagaya.
  - Participants tab mein hover karne pe context menu banaya (Message, Mute, Remove).
  - Video tiles pe animate hota hua Hand icon overlay lagaya agar user ka hand raised hai.

**Problem kya aaya:** Private messages ko UI mein integrate karna thoda tricky tha bina alag se tabs banaye, kyuki main chat feed clutter ho sakti thi.

**Solution kaise nikala:** `isPrivate` flag ke sath array mein hi store kiya aur unko alag highlight (indigo background aur "Private" badge) diya. Reply context track karne ke liye `privateRecipient` state banayi.

## [2026-09-18] Bug Fixes aur UI Polish (Sidebar + Copy Link)

**Kya kiya:** Screen share ka critical bug fix kiya jisme agar user without audio join karta hai to app crash ho jaati thi. Active Call UI mein Room code header add kiya aur Sidebar toggle (chat open/close) banaya. Tailwind v4 upgrade error fix kiya.

**Kaise kiya:**
- `useWebRTC.js` mein `MediaStream` constructor mein undefinded track handle karne ke liye check lagaya (`const audioTrack = prev?.getAudioTracks()[0];`).
- `Room.jsx` mein active call area mein header add karke `roomCode` aur `Copy Link` (navigator.clipboard) button diya.
- Chat/People Sidebar ko toggle karne ke liye `isSidebarOpen` state banayi aur footer control bar mein ek naya toggle button add kiya.
- Docker mein Vite 6 + Tailwind v4 ki wajah se `.dockerignore` set karke fresh rebuild mara, aur `index.css` ko `@theme` variables pe migrate kiya.

**Problem kya aaya:** 
1. Screen share completely break ho gaya tha agar join karte time user ka mic muted ho ya available na ho, kyuki `MediaStream` constructor ko `undefined` pass ho raha tha.
2. Tailwind v4 mein postcss plugin fail ho raha tha Vite build ke time docker mein.

**Solution kaise nikala:** 
1. `prev?.getAudioTracks()[0]` check kiya aur appropriately new array banaya.
2. Tailwind v4 ki nayi `@theme` CSS API manually implement karke `postcss.config.js` update kiya, phir `docker-compose down -v` use kiya cached anonymous volumes ko clear karne ke liye.

## [2026-09-18] WebRTC Mesh aur Screen Share

**Kya kiya:** Live audio/video calling ke liye WebRTC mesh topology set ki, aur screen sharing feature implement kiya.

**Kaise kiya:**
- Backend mein `offer`, `answer`, aur `ice-candidate` relays banaye `roomHandler.js` mein.
- Frontend mein ek solid `useWebRTC.js` hook banaya. Jaise hi naya user join karta hai, existing users peer connection banake `offer` bhejte hain.
- Media tracks ko handle kiya (mute/unmute sync via socket events `toggle-media`).
- Screen share ke liye `navigator.mediaDevices.getDisplayMedia` use kiya aur chalte hue WebRTC peer connections mein `replaceTrack()` se video track swap kiya, bina connection tode!
- `Room.jsx` UI ko update kiya taaki ek dynamic video grid dikhe jo participants badhne pe layout adjust karta hai.

**Problem kya aaya:** Mute icon state reliable nahi thi jab hum sirf WebRTC track ki `muted` property dekhte the (kabhi kabhi delay aata tha ya mute proper sync nahi hota).

**Solution kaise nikala:** `toggle-media` custom socket event banaya. Jab koi apna mic/camera toggle karta hai, wo socket pe sabko bata deta hai. Isse local UI instantly aur reliably update hota hai.

## [2026-09-18] Socket.IO Presence aur Chat

**Kya kiya:** Real-time presence (participant join/leave) aur chat lagaya Socket.IO use karke.

**Kaise kiya:**
- Backend mein `socket.io` server setup kiya jo handshake pe JWT ya `guestName` validate karta hai.
- `roomHandler.js` mein in-memory Map se participants track kiye. `room-participants`, `user-joined`, `user-left`, `chat-message` events emit kiye.
- Frontend mein `useSocket.js` hook banaya jo lifecycle aur messaging handle karta hai.
- `Room.jsx` mein active call UI banaya jisme sidebar mein Chat aur People tabs hain.

**Problem kya aaya:** Handshake auth mein JWT wale user aur guest ko ek hi middleware se pass karna tricky tha.

**Solution kaise nikala:** `io.use` middleware banaya jo pehle token dhundhta hai, agar nahi mile to `guestName` ko allow karta hai aur usko `socket.isGuest` mark kar deta hai. Is tarah dono smoothly join kar pate hain.

## [2026-09-18] Room API aur Dashboard/Lobby UI

**Kya kiya:** Backend pe Room create aur validate karne ki API banayi. Frontend pe Dashboard (to create/join) aur Lobby screen banayi.

**Kaise kiya:** 
- `crypto.randomBytes(4).toString('hex')` use karke unique 8-char room code generate kiya.
- `Dashboard.jsx` mein layout banaya jisme "New meeting" (protected by auth) aur "Join" by code ka option hai.
- `Room.jsx` banaya jo initially Lobby UI render karta hai. Ye mount hone pe `/api/rooms/:roomCode` call karta hai valid check karne ke liye.
- Lobby mein mic aur camera toggles ka UI banaya (actual WebRTC streams baad mein lagayenge) aur guest join support ke liye displayName input banaya.

**Problem kya aaya:** Guest users (jo logged in nahi hain) room join kar sakte hain ya nahi, ye rule align karna tha.

**Solution kaise nikala:** `api-contract.md` ke hisaab se `GET /api/rooms/:roomCode` ko public rakha (no `requireAuth`) taaki guest user pehle room validate kar sake aur fir `displayName` deke join kar sake.

## [2026-09-18] Frontend Auth UI aur Context

**Kya kiya:** React mein Login aur Register pages banaye, Tailwind CSS configure kiya, aur AuthContext setup kiya.

**Kaise kiya:** 
- Tailwind CSS setup kiya dark theme ke sath (`background: #0c0c0e`, indigo accent) taaki unique aur graceful look aaye as per `ui-guidelines.md`.
- `lucide-react` icons use kiye.
- API requests ke liye `axios` wrapper banaya jo automatically `localStorage` se token attach karta hai.
- `react-router-dom` se routing setup ki (`/login`, `/register`, aur private `/`).

**Problem kya aaya:** Vite default styles aur App.css Tailwind ke sath clash kar rahe the.

**Solution kaise nikala:** `App.css` delete kar diya aur `main.jsx` clean kar diya. Global styles `index.css` mein Tailwind layers ke through handle kiye.

## [2026-09-18] Auth routes bana diye

**Kya kiya:** Register, login, aur refresh API bana di, User mongoose schema set up kiya.

**Kaise kiya:** 
- `bcrypt` se password hash kiya
- `jsonwebtoken` se access + refresh token banaya
- `express-validator` se route input ko validate kiya (taaki DB hit hone se pehle checking ho)
- Error handler middleware add kiya ek consistent shape ke liye: `{ error: { code, message } }`.

**Problem kya aaya:** Docker ke andar `.env` variables pass karna padega kyuki by default backend ka `dotenv` bahar ka file nahi dekhega easily (ya path issue hoga).

**Solution kaise nikala:** `docker-compose.yml` mein hi host ka environment map kar diya aur local run ke liye `dotenv.config({ path: '../.env' })` set kiya.

## [2026-09-18] Project scaffolding aur setup

**Kya kiya:** Frontend (Vite + React) aur Backend (Express) ka folder structure set up kiya. Docker compose aur env variables configure kiye.

**Kaise kiya:** 
- `npm create vite` se frontend banaya.
- `npm init -y` se backend setup kiya.
- `docker-compose.yml` mein 4 services (frontend, backend, mongo, coturn) configure ki.
- `.env` aur `.env.example` banaye.
- Prettier aur ESLint ke configs dono side setup kiye.

**Problem kya aaya:** Koi problem nahi, starting scratch se ki thi.

**Solution kaise nikala:** N/A.
