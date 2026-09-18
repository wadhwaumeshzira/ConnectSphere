# ConnectSphere - Full Project Walkthrough (Interview Guide)

This is a comprehensive, standalone guide for the ConnectSphere project. Is document ka main goal hai aapko project ke har aspect—architecture, bugs, decisions, aur future scaling—ke baare mein deep knowledge dena taaki aap kisi bhi interview mein ise confidently explain kar sakein.

---

## 1. Project Overview

**ConnectSphere** ek Google Meet-style video calling web application hai jo small groups (4-6 participants) ke liye banaya gaya hai. 
**Problem it solves:** Ye ek frictionless, secure, aur lightweight P2P (Peer-to-Peer) video conferencing solution deta hai jisme participants bina account banaye (as a guest) meeting link ke through seedha video call mein join kar sakte hain. Heavy servers ki zaroorat nahi padti kyunki media directly browsers ke beech flow hota hai.

---

## 2. Step-by-Step Development Approach

Humne is project ko ek logical, incremental tarike se build kiya:

1. **Scaffolding & Setup:** Sabse pehle frontend (React/Vite) aur backend (Express) ka folder structure banaya. Codebase clean rakhne ke liye Prettier aur TailwindCSS configure kiya.
2. **Auth & Database:** MongoDB setup kiya. User aur Room ke schemas banaye. bcrypt se password hashing aur JWT se secure register/login API banayi.
3. **Room Creation API:** Ek REST API likhi jisse authenticated users unique 8-character meeting codes generate kar sakein, aur guests un codes ko join karne se pehle validate kar sakein.
4. **Socket.IO Signaling:** Real-time presence ke liye Socket.IO setup kiya. Custom auth middleware banaya jo JWT users aur guest names dono ko ek sath handle kar sake. `user-joined` aur `user-left` events banaye.
5. **WebRTC Connection (The Core):** P2P media ke liye `useWebRTC` hook banaya. Jab naya banda aata hai, existing users SDP `offer`, `answer`, aur `ice-candidate` ko Socket.IO ke through relay karte hain. Ye mesh topology hai (everyone connects to everyone).
6. **In-call Features:** In-app chat, participant list, aur camera/mic toggle features add kiye. Mute hone pe state ko reliable rakhne ke liye custom `toggle-media` socket event banaya.
7. **Screen Share:** `navigator.mediaDevices.getDisplayMedia` use karke user ki screen capture ki aur chalte hue WebRTC peer connections mein `replaceTrack()` call karke camera stream ko screen stream se swap kiya (bina connection tode).
8. **Deployment & Polish:** Docker-compose se pura stack containerize kiya. Fir frontend ko Vercel par aur backend ko Render par live kiya, aur mobile networks bypass karne ke liye TURN servers lagaye.

---

## 3. Technology Choices (Kyu ye, Kyu nahi wo?)

- **React kyu? (Angular/Vue kyu nahi):** 
  React ka hook ecosystem (`useSocket`, `useWebRTC`) complex real-time states ko manage karne ke liye best tha. Vue chhota aur fast hai, par React mein third-party packages aur enterprise adoption zyada hai jo interview portfolio ke liye better choice hai.
- **Express kyu? (NestJS/Fastify kyu nahi):** 
  Express simple, lightweight, aur unopinionated hai. Humari app mein mostly Socket.IO ka heavy lifting tha aur REST endpoints kam the. Aise mein NestJS ka massive boilerplate overkill hota. Agar large enterprise app hoti jisme bohot saare modules aur strict DI (Dependency Injection) chahiye hota, toh NestJS better tha.
- **Socket.IO kyu? (Raw WebSockets kyu nahi):** 
  Socket.IO humein out-of-the-box auto-reconnection, polling fallbacks, aur "Rooms" ka feature deta hai (jo broadcasting ke liye zaroori hai). Raw WebSockets use karne par ye saari reliability scratch se likhni padti.
- **WebRTC Mesh kyu? (SFU/LiveKit kyu nahi):** 
  Is stage pe v1 mein hume 4-6 users support karne the. Mesh topology (P2P) mein humari server bandwidth cost zero hai kyunki video browsers ke beech ghoom rahi hai. SFU (Selective Forwarding Unit) tab chahiye jab 10+ users ho, warna mesh mein client ka network choke ho jayega sabko alag stream bhejte hue.
- **MongoDB kyu? (PostgreSQL/MySQL kyu nahi):** 
  Data model kaafi simple tha (Users, Rooms). MongoDB ka flexible, schema-less nature fast iterations allow karta hai. Agar app mein complex transactional queries hoti (jaise billing, payment history, strict relational joins), toh Postgres definitely better choice hoti.
- **JWT kyu? (Session-based Auth kyu nahi):** 
  Frontend (Vercel) aur backend (Render) alag domains pe host hone the. JWT stateless hota hai, jisse CORS aur scaling easy ho jati hai (backend ko memory mein session nahi rakhna padta). Agar strict instant-logout ya banking jaisi security chahiye hoti, toh HttpOnly session cookies better hote.
- **TURN server kyu? (Sirf STUN se kaam kyu nahi chala):** 
  STUN sirf public IP batata hai, jo home Wi-Fi pe direct connection lagwa deta hai. Lekin mobile networks (Jio/Airtel) aur college networks "Symmetric NAT" use karte hain, jo P2P block kar dete hain. TURN server ek cloud relay ka kaam karta hai, taaki agar strict firewall ho, toh video packets turn server ke through pass ho jayein.
- **Docker kyu? (Direct hosting kyu nahi):** 
  "It works on my machine" wali problem avoid karne ke liye. Docker se frontend, backend, mongo, sab ek single isolated container environment mein run karte hain, jo local aur production mein consistency deta hai.

---

## 4. Challenges Faced and How We Solved Them

**1. The Mobile Black Screen Bug (Symmetric NAT Traversal)**
- **Problem:** Jab laptop se laptop call hoti thi toh sab badhiya chal raha tha, par jab kisi dost ne apne Jio/Airtel mobile data se join kiya toh use black screen aayi aur koi awaaz nahi aayi.
- **Root Cause:** Mobile ISPs Carrier-Grade NAT (Symmetric NAT) use karte hain. Ye strict firewalls STUN server ke through banaye gaye direct P2P connections (hole punching) ko silently drop kar dete hain.
- **Solution:** Maine code mein public **TURN servers** (OpenRelay) inject kiye. Ab agar STUN fail hota hai, toh WebRTC automatically TURN server ko as a fallback middleman use karta hai aur media seamlessly flow ho jata hai.

**2. The Invisible Video Tile (CSS Grid Overflow)**
- **Problem:** Jab dusra banda room mein aata tha, toh grid usko dikhata hi nahi tha (tile gayab thi), halanki uska naam sidebar mein tha.
- **Root Cause:** Main video grid ke columns calculate karne ke liye `remoteStreams.length` use kar raha tha. Kyunki WebRTC stream connect hone mein 1-2 second lagte hain, grid layout ne socha sirf 1 user hai aur pehle user ko 100% height de di. Jab dusri video aayi, CSS grid ne implicit row banayi jo screen ke bahar (bottom) overflow hoke chhup gayi.
- **Solution:** Maine layout count logic ko actual `participants.length` se tie kiya. Isse UI ko pehle se pata chal jata hai ki 2 log hain, aur wo grid ko 50/50 instantly split kar deta hai (connecting avatar dikhate hue).

**3. Screen Share Crash on Muted Mic**
- **Problem:** Agar user ka mic muted tha aur usne "Share Screen" button dabaya, toh poori app crash ho gayi.
- **Root Cause:** Screen share start karte waqt humara code naye stream se purane audio track ko mix karne ki koshish kar raha tha (`getAudioTracks()[0]`), par jab mic off tha toh audio track `undefined` tha, jisse error throw ho gaya.
- **Solution:** Maine nullish coalescing aur defensive checks (`prev?.getAudioTracks()[0]`) lagaye taaki track missing hone pe app safely video-only screen share handle kar sake.

**4. Vercel SPA 404 Routing Error**
- **Problem:** Jab Vercel pe app live hui, main page chal raha tha, par jab main `/login` pe direct gaya ya refresh kiya, toh Vercel ne "404 Not Found" de diya.
- **Root Cause:** React ek Single Page Application (SPA) hai. Vercel ke server ko laga ki `/login` naam ki koi actual `.html` file dhundhni hai, jabki saara traffic `index.html` ko jana chahiye tha.
- **Solution:** Maine Vercel ko SPA routing sikhane ke liye `vercel.json` rewrite file banayi. Lekin Windows PowerShell ne usko UTF-16 mein save kar diya jisse Vercel crash hua. Fir maine ek Node script chala ke exactly UTF-8 encoding mein rewrite rule push kiya, jiske baad refresh smoothly chala.

---

## 5. What We'd Do Differently at Scale (100+ Users)

Agar ConnectSphere ko large scale enterprise ya classes ke liye banana ho:
1. **SFU Architecture:** Mesh network ko replace karke ek Selective Forwarding Unit (jaise mediasoup ya LiveKit server) lagayenge. Isse user ko sirf ek hi video feed upload karni padegi, server baaki logo ko distribute karega, jisse CPU/Bandwidth choke nahi hoga.
2. **Redis for Horizontal Scaling:** Agar traffic badhne pe Node.js ke 5 server lagane pade, toh Socket.IO akela kaam nahi karega. Humein "Redis Adapter" lagana padega taaki ek server ka user dusre server ke user ke saath room share kar sake.
3. **Database Caching:** Redis cache add karenge taaki `GET /api/rooms/:id` jaisi baari-baari hit hone wali API queries instantly resolve ho jayein.
4. **Recording Infrastructure:** Cloud recording support ke liye ek headless browser (Puppeteer) worker cluster banayenge jo room mein silently as a guest join karega aur stream ko record karke AWS S3 mein dump karega.

---

## 6. Expected Interview Questions and Answers

### Project-Specific & Architecture
**Q1: ConnectSphere ka architecture kaisa hai? Media backend ke through jata hai ya direct?**
*Answer:* Backend sirf ek signaling server ka kaam karta hai (Socket.IO ke through SDP offers aur ICE candidates exchange karne ke liye). Actual audio aur video media strictly Peer-to-Peer (WebRTC) flow hota hai browsers ke beech, except jab NAT block kare, tab media cloud TURN relay ke through pass hota hai.

**Q2: Tumne Socket.IO use kiya WebRTC ke sath. WebRTC toh khud peer connection banata hai, fir Socket.IO ki kya zaroorat?**
*Answer:* WebRTC padosi (peer) se connect zaroor karta hai, par use ye nahi pata ki us peer ka address kya hai. Connection start karne ke liye jo pehla handshake (SDP offer/answer) aur network routing info (ICE candidates) bhejna hota hai, uske liye humein ek real-time middleman chahiye hota hai. Yahi kaam Socket.IO signaling ke through karta hai.

**Q3: App mein guests aur logged-in users ko ek hi Socket server pe kaise handle kiya?**
*Answer:* Maine `io.use` middleware banaya. Jab client connect karta hai, middleware pehle dekhta hai ki `token` (JWT) aaya hai ya nahi. Agar token hai, toh use verify karke userId nikalta hai. Agar nahi, toh wo dekhta hai ki client ne `guestName` bheja hai kya. Guest hone pe main us socket object pe `socket.isGuest = true` mark kar deta hu.

### WebRTC & Networking Fundamentals
**Q4: STUN aur TURN server mein kya difference hai?**
*Answer:* STUN server bas aapke router se pooch kar aapko aapka "Public IP" batata hai, aur fir connections direct P2P set ho jate hain. Lekin agar router strict firewall (Symmetric NAT) use kar raha hai toh P2P fail ho jata hai. Aise case mein TURN server aata hai, jo ek cloud relay hai—dono peers apna media TURN server ko bhejte hain aur wo aage forward karta hai. TURN expensive hota hai, STUN cheap.

**Q5: "Symmetric NAT" kya hota hai aur WebRTC ko kaise break karta hai?**
*Answer:* Standard NAT ek public IP:port open karta hai jo kisi ko bhi connect karne deta hai (STUN yahan chal jata hai). Symmetric NAT har destination ke liye ek naya, alag port open karta hai. Iska matlab STUN server ko jo port dikha, wo dusre peer ke liye valid nahi hoga, isliye connection establish nahi ho pata bina TURN server ke.

**Q6: SDP aur ICE candidates kya hote hain simple terms mein?**
*Answer:* SDP (Session Description Protocol) tumhare browser ka resume hai—ye batata hai ki "mere paas video hai, audio hai, aur main ye codecs support karta hu." ICE Candidates (Interactive Connectivity Establishment) tumhara address book hai—ye batata hai ki "tum mujhe network pe is IP aur port pe reach out kar sakte ho." Dono milke connection banate hain.

### System Design & Scaling
**Q7: Agar 50 log ek hi room mein join karein toh kya app chalegi?**
*Answer:* Nahi, app crash ya lag karne lagegi. Kyunki ye ek Mesh topology hai, 50 logo ke room mein har ek user ko 49 alag connections banake 49 baar apna video upload karna padega, jo kisi bhi normal PC aur internet ko choke kar dega. Isliye maine room size limit 6 pe rakhi hai. 50 logo ke liye SFU architecture zaroori hai.

**Q8: Agar kal tumhari app viral ho jaye aur traffic 10x badh jaye, database mein sabse pehle kya phatega?**
*Answer:* Abhi rooms table DB mein hai, aur har naya user join karte waqt room validate karne ke liye DB query hoti hai. Heavy traffic pe ye bottleneck banega. Isko solve karne ke liye active rooms ka data Redis mein cache karna padega.

**Q9: Tumne bola inactive rooms ko handle karna tha. Database ko garbage data se kaise bachaya?**
*Answer:* Maine lazy deletion mechanism lagaya. Backend ke memory mein timers rakhe. Jaise hi koi room khali hota hai (0 participants), ek 10-minute ka timer chalu ho jata hai. Agar un 10 minutes mein koi wapas na aaye, toh server us room ko MongoDB se permanently delete kar deta hai. Agar koi aa jaye toh timer cancel (clearTimeout) ho jata hai.

### Security
**Q10: JWT mein refresh token kya hota hai aur kyun use kiya?**
*Answer:* Access token ki life short hoti hai (e.g. 15 mins) taaki agar wo chori ho jaye toh damage kam ho. Lekin baar-baar user se login na karwana pade, isliye Refresh token (long life, e.g. 7 days) HTTP-only cookie ya secure storage mein rakha jata hai, jisse naya access token generate hota rahe silently background mein.

**Q11: JWT secure kaise hai agar koi usko decode kar sake?**
*Answer:* JWT ke payload ko koi bhi base64 se decode karke padh sakta hai, isliye usme sensitive info (passwords) nahi rakhte. Iski security iski "Signature" mein hoti hai. Server ise apne ek secret key se sign karta hai. Agar koi hacker payload change karega, toh signature invalid ho jayega aur server reject kar dega.

### Debugging & Behavioral
**Q12: Is project ko banate waqt sabse bada blocker kya tha aur kaise clear kiya?**
*Answer:* Sabse bada blocker Mobile NAT traversal tha. Locally sab badhiya chala, par jab live deploy kiya toh ek device pe black screen aayi. Debugging ke baad samajh aaya ki mobile data carrier-grade NAT use karta hai. Maine network theory deeply padhi, STUN vs TURN samjha, aur fir manually open-source TURN servers inject karke problem fix ki. Isne mujhe network troubleshooting mein bohot confidence diya.

---

## 7. Summary / Key Learnings

1. **WebRTC Under The Hood:** P2P connection kaise bante hain, SDP handshakes kaise relay hote hain, aur STUN/TURN servers network firewalls ko kaise penetrate karte hain, iska deep practical hands-on experience mila.
2. **Real-time State Management:** React (useState/useEffect) aur Socket.IO ke beech race conditions (jaise grid size miss-calculate hona) ko handle karna seekha.
3. **Infrastructure Awareness:** Ek modern web app deploy karna sirf code upload karna nahi hota. CORS errors, Vercel SPA routing rewrites, aur environment variables setup ki real-world complexities theek ki.
4. **Performance vs Cost Tradeoffs:** Mesh topology kyun easy aur free hai, par scalable nahi hai, aur enterprise SFU mein kya costs aati hain, iska clear architectural roadmap samjha.
5. **Modern UI/UX Implementation:** Tailwind CSS aur lucide icons use karke minimal, dark-themed, resume-worthy UI design karna seekha.
