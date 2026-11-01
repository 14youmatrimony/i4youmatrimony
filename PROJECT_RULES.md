# PROJECT RULES & ARCHITECTURE SPECIFICATION
**Project Name**: I 4 You Matrimonial Platform  
**Target Environment**: Web, Mobile (Capacitor Android & iOS), Admin Backend (Flask & FastAPI), Cloud Database (Supabase PostgreSQL)  
**Last Updated**: November 2026

---

## 1. Tech Stack Overview

### Frontend Architecture
- **Framework**: React 19 (`react` `^19.2.8`, `react-dom` `^19.2.8`)
- **Build Tool / Bundler**: Vite 8 (`vite` `^8.3.0`, `@vitejs/plugin-react` `^6.1.1`)
- **Styling**: Tailwind CSS v4 (`tailwindcss` `^4.3.3`, `@tailwindcss/vite` `^4.3.3`)
- **Iconography**: Lucide React (`lucide-react` `^1.47.0`)
- **Mobile Container**: Capacitor 6 (`@capacitor/core`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/push-notifications`, `@capacitor/cli` `^6.2.2`)
- **Linter**: Oxlint (`oxlint` `^1.81.0`)

### Backend Services & Edge Functions
- **Primary Admin Backend API**: Python 3.12+ with Flask 3.1.3 (`admin/app.py`), Gunicorn (`gunicorn` `>= 21.2.0`), Werkzeug, itsdangerous, and Jinja2 templates (`admin/templates/`).
- **High-Security Messaging Backend**: FastAPI (`admin/fastapi_app.py`, `fastapi` `>= 0.115.0`, `pydantic` `>= 2.0.0`, `pyjwt` `>= 2.8.0`) providing JWT-authorized messaging and matrimonial interest authorization.
- **Serverless Edge Functions (Deno / TypeScript)**:
  - `supabase/functions/call-handler/`: Dispatches high-priority Google FCM HTTP v1 notifications and Apple APNs VoIP pushes (PushKit) to wake background or terminated mobile devices for incoming calls.
  - `supabase/functions/send-email-notification/`: Transactional email alert delivery.
- **Hosting & Deployment**:
  - Web: Vercel (`vercel.json`) with Vite static build and admin routing rewrites.
  - Mobile: Native Android build via Capacitor/Gradle (`android/` project outputting `I-4-You-test.apk`) and iOS (`ios/`).

### Database & Cloud Persistence
- **Production Database**: Supabase PostgreSQL (Cloud) accessed via the `@supabase/supabase-js` SDK (`^2.117.2`) on the client and Python `psycopg2-binary` connection pooling on the backend.
- **Local Dev Database**: SQLite (`admin/admin.db`, `admin/matrimony.db`, `admin.db`) with automatic PostgreSQL fallback and synchronization tools in `admin/` (`migrate_to_postgres.py`, `sync_profiles_to_supabase.py`).
- **Core Database Tables**:
  - `profiles`: User demographic details, Vedic horoscope, verification status, partner preferences, photos.
  - `interests`: Matrimonial interest requests, acceptances, and mutual matches.
  - `conversations` & `messages`: End-to-end chat channels and threaded direct messages.
  - `call_requests`: Live calling sessions, caller/callee IDs, signaling status, and timestamps.
  - `user_device_tokens`: Multi-platform FCM and iOS VoIP tokens for push notifications.
  - `plans` & `offers`: Premium subscription tiers, validity limits, and promotional offers.

### Cloud Storage
- **Provider**: Supabase Storage (`supabase.storage`).
- **Primary Buckets**: `'avatars'` (profile pictures, gallery uploads, ID verification photos).
- **Service Layer**: `src/services/storageService.js` handles client-side image compression, base64 data conversion, secure upload, automatic profile table updates, and cache-busting URLs (`src/utils/cacheBuster.js`).

### Real-Time Calling Engine (WebRTC)
- **Protocol**: Pure Native WebRTC (Standard W3C `RTCPeerConnection`, `getUserMedia`, `unified-plan` SDP semantics).
- **ICE / STUN / TURN Infrastructure**:
  - Multi-region Google STUN servers (`stun:stun.l.google.com:19302`, etc.) and Cloudflare STUN (`stun:stun.cloudflare.com:3478`).
  - OpenRelay / Metered TURN relay servers (UDP/TCP ports 80, 443, 5349) with runtime environment variable overrides (`VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`).
- **Signaling Channel**: Supabase Realtime Broadcast Channels (`supabase.channel('call_signaling_*')`) for offer, answer, ICE candidates, and hangup exchange.
- **Hardware & Audio Routing**: Custom `AudioRoutingHelper` in `src/services/webrtcCallService.js` managing loudspeaker/earpiece selection (`setSinkId`) and keeping `AudioContext` active on mobile OS browsers.
- **External Calling SDK Status**: No third-party proprietary calling SDKs (e.g. Agora or LiveKit) are installed or imported. The calling engine is entirely implemented using native WebRTC with Supabase Realtime signaling and TURN relays.

---

## 2. Folder & File Architecture

```
C:\Project\I 4 You\
├── admin/                         # Python Backend, Admin API & Migration Scripts
│   ├── app.py                     # Flask Admin Application (~3,770+ lines)
│   ├── fastapi_app.py             # FastAPI Secured Messaging & Interests API
│   ├── database.py                # Database abstraction layer (SQLite / PostgreSQL)
│   ├── security.py                # AES-256 Fernet data encryption & password hashing
│   ├── fcm_service.py             # FCM push notification dispatcher for Python
│   ├── requirements.txt           # Python backend dependencies
│   ├── static/                    # Admin CSS & JS dashboard scripts (dashboard.js, api_mock.js)
│   └── templates/                 # Admin Jinja2 HTML templates (index.html, login.html)
│
├── android/                       # Capacitor Android Native Project & Gradle Wrapper
├── ios/                           # Capacitor iOS Native Project
│
├── public/                        # Static assets, Web App Manifest, Service Workers
│   ├── firebase-messaging-sw.js   # Background FCM service worker
│   └── sw.js                      # PWA caching service worker
│
├── src/                           # Frontend React Application Source
│   ├── App.jsx                    # Central State Orchestrator & Screen Router
│   ├── App.css                    # App component styles
│   ├── main.jsx                   # Vite React Root Render Entry
│   ├── index.css                  # Tailwind CSS v4 theme, fonts, and base variables
│   │
│   ├── assets/                    # Static brand logos, hero graphics, icons
│   │
│   ├── components/                # React UI Components
│   │   ├── calling/               # Real-Time Calling Modals & Controllers
│   │   │   ├── AudioCallModal.jsx
│   │   │   ├── VideoCallModal.jsx
│   │   │   ├── IncomingCallModal.jsx
│   │   │   └── PremiumUpgradePromptModal.jsx
│   │   │
│   │   ├── mobile/                # Mobile App Experience & Feature Screens
│   │   │   ├── DeviceFrameSimulator.jsx       # Desktop frame wrapper for mobile simulator
│   │   │   ├── MobileAccountScreen.jsx        # Account management & profile settings
│   │   │   ├── MobileAppModal.jsx             # Mobile modal container
│   │   │   ├── MobileAppShell.jsx             # Shell wrapper with bottom navigation & header
│   │   │   ├── MobileChatScreen.jsx           # Real-time chat screen
│   │   │   ├── MobileFilterBottomSheet.jsx    # Feed filtering bottom sheet
│   │   │   ├── MobileInterestsScreen.jsx      # Sent / Received / Mutual interests screen
│   │   │   ├── MobileMatchFeed.jsx            # Profile discovery card feed
│   │   │   ├── MobileNotificationsSheet.jsx   # In-app notifications panel
│   │   │   ├── MobileOffersAndPlansSheet.jsx  # Membership subscription plans sheet
│   │   │   ├── MobilePaymentModal.jsx         # Cashfree & UPI payment checkout
│   │   │   ├── MobilePhotoManagerSheet.jsx    # Photo upload & gallery management sheet
│   │   │   ├── MobileProfileDetailSheet.jsx   # Detailed candidate bio, horoscope, family info
│   │   │   ├── MobileSearchScreen.jsx         # Candidate search by ID, religion, city, age
│   │   │   ├── MobileStatusBar.jsx            # Simulated native mobile status bar
│   │   │   ├── MobileThemeSettingsSheet.jsx   # Theme switcher (Dark / Light / Accent)
│   │   │   ├── NotificationCard.jsx           # Individual notification item card
│   │   │   ├── PaymentInvoiceModal.jsx        # Payment receipt & invoice modal
│   │   │   ├── PhotoPrivacyShield.jsx         # Privacy protection shield overlay
│   │   │   └── WhatsAppStatusSystem.jsx       # Stories / status preview carousel
│   │   │
│   │   ├── website/               # Marketing & Public Landing Page Components
│   │   │   ├── WebsiteView.jsx                # Website landing view wrapper
│   │   │   ├── WebsiteNavbar.jsx              # Public navigation header
│   │   │   ├── WebsiteHero.jsx                # Hero section with registration CTA
│   │   │   ├── WebsiteAppShowcase.jsx         # App download and feature showcase
│   │   │   ├── WebsiteMatchShowcase.jsx       # Featured matchmaking showcase
│   │   │   ├── WebsiteStoriesReel.jsx         # Customer success stories reel
│   │   │   ├── WebsiteSuccessStories.jsx      # Testimonials section
│   │   │   ├── WebsitePricingSection.jsx      # Membership pricing overview
│   │   │   ├── WebsitePillarsOfTrust.jsx      # Trust badges and security pillars
│   │   │   └── WebsiteFooter.jsx              # Public landing page footer
│   │   │
│   │   ├── common/                # Shared Utility Components
│   │   │   ├── AppDownloadCard.jsx            # Direct APK download card
│   │   │   ├── DualRangeSlider.jsx            # Dual slider for age / height ranges
│   │   │   ├── ErrorBoundary.jsx              # React runtime error boundary
│   │   │   ├── PaymentLogos.jsx               # UPI / Cards / NetBanking badge graphics
│   │   │   ├── SafeAvatar.jsx                 # Fallback-protected avatar image
│   │   │   ├── SearchableSelect.jsx           # Searchable dropdown for locations/castes
│   │   │   ├── SplashScreen.jsx               # App launch splash animation
│   │   │   └── TermsAndConditionsModal.jsx    # Terms, privacy policy, and rules modal
│   │   │
│   │   ├── AadhaarVerificationScreen.jsx      # Government ID (Aadhaar) scan & verify
│   │   ├── EditProfileModal.jsx               # Profile information editor modal
│   │   ├── Footer.jsx                         # App footer
│   │   ├── GoogleSignInButton.jsx             # Google OAuth sign-in button
│   │   ├── LoginScreen.jsx                    # Mobile / Register ID / password login
│   │   ├── MatchFeed.jsx                      # Desktop match feed
│   │   ├── MobileVerificationScreen.jsx       # Phone number OTP verification
│   │   ├── Navbar.jsx                         # Main app top navbar
│   │   ├── ProfileModal.jsx                   # Desktop profile view modal
│   │   ├── RegisterPhoneVerification.jsx      # Registration phone step
│   │   ├── RegistrationWizard.jsx             # Multi-step profile registration wizard
│   │   ├── SelfieVerificationSection.jsx      # Liveness selfie photo verification
│   │   └── SendInterestModal.jsx              # Express interest submission modal
│   │
│   ├── config/                    # Global Configuration
│   │   └── appConfig.js           # Production vs Demo mode switch, API base URLs, support details
│   │
│   ├── context/                   # Global React State Contexts
│   │   ├── PhotoPrivacyContext.jsx # Photo privacy state & screenshot blocker toggle
│   │   └── ThemeContext.jsx       # App theme mode (light/dark/colors)
│   │
│   ├── data/                      # Static & Reference Datasets
│   │   ├── locationData.js        # Indian states, districts, and major cities
│   │   ├── mockProfiles.js        # Seed / demo candidates for development mode
│   │   ├── plansData.js           # Membership plans and features catalog
│   │   └── religionData.js        # Religions, castes, and Vedic star lists
│   │
│   ├── services/                  # Application Services & API Integrations
│   │   ├── api.js                 # Primary data queries, profiles CRUD, payments, Cashfree
│   │   ├── authService.js         # Authentication, session tokens, auto-login, logout
│   │   ├── emailNotificationService.js # Transactional email alerts via Supabase Edge Functions
│   │   ├── faceVerificationService.js  # Liveness & face similarity scoring
│   │   ├── fast2sms.js            # SMS OTP delivery service
│   │   ├── fcmNotificationService.js   # Push notification registration & token management
│   │   ├── firebase.js            # Firebase SDK client initialization
│   │   ├── googleAuth.js          # Google OAuth credential handler
│   │   ├── interestService.js     # Matrimonial interest requests, acceptances, blocks
│   │   ├── liveChatService.js     # Real-time chat messages via Supabase Realtime
│   │   ├── phoneAuth.js           # Phone authentication service
│   │   ├── profileSyncService.js  # Multi-device profile sync via BroadcastChannel & Realtime
│   │   ├── sandboxAadhaar.js      # Sandbox.co.in Aadhaar verification API
│   │   ├── storageService.js      # Supabase Storage bucket uploads and image caching
│   │   ├── supabase.js            # Supabase client singleton (`createClient`)
│   │   ├── surepassAadhaar.js     # Surepass.io Aadhaar verification API
│   │   └── webrtcCallService.js   # Native WebRTC 1-on-1 audio/video call service & signaling
│   │
│   └── utils/                     # Utility Functions & Helpers
│       ├── cacheBuster.js         # URL timestamp parameter appending
│       ├── conversationUtils.js   # Unread message computation and formatting
│       ├── genderMatch.js         # Vedic and gender matchmaking rules
│       ├── imageOptimizer.js      # Canvas-based client-side image compression
│       ├── livenessDetector.js    # Blink / face orientation detection helpers
│       └── security.js            # Frontend input validation and sanitization
│
├── supabase/                      # Supabase Database Schemas & Edge Functions
│   ├── SCHEMA_SETUP.sql           # Complete initial SQL schema setup
│   ├── functions/
│   │   ├── call-handler/index.ts  # WebRTC call wake-up push notification edge function
│   │   └── send-email-notification/index.ts # Transactional email edge function
│   └── migrations/                # Versioned SQL migrations (RLS, calls, tokens, interests)
│
├── admin.html                     # Standalone admin portal HTML
├── super-admin.html               # Standalone super-admin management console HTML
├── capacitor.config.json          # Capacitor mobile runtime configuration
├── package.json                   # NPM dependencies and scripts
├── vercel.json                    # Vercel deployment rewrites & security headers
└── vite.config.js                 # Vite bundler, proxy routes, and chunking config
```

### State Management Strategy
- **Master Orchestrator**: `src/App.jsx` serves as the primary reactive state container, managing `currentUser`, `activeTab`, view switching, active modals, and subscriptions to global events.
- **Context Providers**:
  - `PhotoPrivacyContext`: Handles photo blur, watermark shields, and screenshot protection across screens.
  - `ThemeContext`: Handles light/dark themes and styling tokens.
- **Real-Time Singleton Services**:
  - `webrtcCallService`: Coordinates peer connections, audio/video streams, call requests, and ring states.
  - `liveChatService`: Subscribes to real-time chat messages and updates local chat thread state.
  - `interestService`: Manages interest approvals and mutual connections in real-time.
  - `profileSyncService`: Uses browser `BroadcastChannel('i4u_profile_sync')` and Supabase Realtime to keep profile changes synchronized across open browser tabs, mobile webviews, and admin dashboards without page reloads.

---

## 3. Strict Coding & Editing Rules for AI (Mandatory for All Future Prompts)

Every AI assistant, agent, or developer working on this codebase **MUST STRICTLY ADHERE** to these mandatory rules without exception:

1. **NO UNREQUESTED MODIFICATIONS**:
   - **NEVER** modify, delete, rename, or reorganize any file, function, database schema, table, column, or UI styling that is not explicitly requested in the user's prompt.
   - Do not refactor unrelated code, change variable names, reformat untouched files, or remove existing comments/docstrings.

2. **NO PLACEHOLDERS OR LAZY TRUNCATION**:
   - **NEVER** use placeholders such as `// ... existing code ...`, `/* remaining code unchanged */`, `# ... rest of code`, or similar abbreviations when modifying files.
   - When modifying files, always supply complete, contiguous, unbroken, and fully syntactically valid code blocks so changes save permanently without breaking imports, closing brackets, or dependencies.

3. **ZERO ARCHITECTURAL DRIFT**:
   - **NEVER** alter the project architecture, introduce alternative state management libraries (e.g. Redux, Zustand, MobX) when React state/context is in place, or swap underlying frameworks without explicit written permission.
   - **NEVER** add, remove, or upgrade npm dependencies or Python packages unless explicitly instructed by the user.

4. **PRE-EDIT DECLARATION & ZERO REGRESSION**:
   - Before executing any code changes, **ALWAYS** consult this `PROJECT_RULES.md` document first.
   - Explicitly list which exact files and functions will be touched.
   - Ensure zero regressions on existing working features (e.g. WebRTC calls, chat messaging, photo privacy shields, Aadhaar verification, and payment flows).

5. **AUTOMATED BUILD, GIT & DEPLOYMENT RULE (From AGENTS.md)**:
   - Every enhancement, bug fix, or code change must be verified and pushed:
     1. Verify the build passes cleanly: `npm run build`.
     2. Stage all modifications: `git add -A`.
     3. Commit with a descriptive message: `git commit -m "<type>(<scope>): <summary>"`.
     4. Push immediately to GitHub: `git push origin main`.
     5. Confirm `git status` is clean and up to date with `origin/main`.

6. **LANGUAGE CONSISTENCY (From AGENTS.md)**:
   - **Zero Malayalam Text**: All user-facing UI labels, button tooltips, notifications, toasts, modals, system messages, and code comments must strictly use clean, professional English.
