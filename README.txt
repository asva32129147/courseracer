COURSE RACER — TERMINAL UI + SEPARATE ADMIN + edX API ADAPTER

Course: UT Austin Precalculus
Course key: course-v1:UTAustinX+UT.PreC.10.03x+3T2016

Included
- index.html / styles.css / app.js: green terminal-style racer dashboard, Firebase email/password login, leaderboard and progress-item display.
- admin.html / admin.js: separate UID-protected admin dashboard; set edX username/ID mappings and trigger syncs.
- api-server.js: server-side API adapter. The edX access token and Firebase service-account credentials remain on the server.
- firestore.rules: rules for user profiles and server-written progress.
- .env.example: environment variable template.

IMPORTANT LIMITATION
This is an integration scaffold, not proof that learning.edx.org exposes these APIs to this course. Open edX endpoints and fields vary by deployment, and the hosted edX service may reject some or all requests. The adapter reports API failures instead of inventing module completion or grades. The outline endpoint may return a course tree, but per-learner completion and grades may require additional host-specific APIs/permissions. Test with authorized access before treating the progress as official race scoring.

SECURITY
Do not ask racers to submit edX passwords and do not store them in Firebase. The adapter uses a server-side bearer token and is admin-only. If the hosted edX service does not issue an appropriate token or allow student-specific progress access, the next step is an approved OAuth/linking integration or a different authorized data source—not collecting passwords. Never commit .env, service-account JSON, or access tokens.

SETUP OVERVIEW
1. Enable Firebase Authentication > Email/Password and Firestore in project course-racer.
2. Keep the configured admin UID in app.js/admin.js/api-server.js/rules aligned with the real admin account UID.
3. Deploy the static files to GitHub Pages.
4. Deploy api-server.js to a trusted Node host with Node 20+, set variables from .env.example, and use HTTPS. Store service account JSON and edX token in the host's secret manager.
5. In admin.html, set window.COURSE_RACER_API_BASE to the HTTPS base URL of the deployed API service (no trailing slash). If the API is same-origin, leave it blank.
6. Publish firestore.rules in Firebase.
7. Sign in as admin, enter each racer's edX username/ID, and click SAVE MAPPINGS + SYNC ALL RACERS.
8. Inspect the admin system log and each progress item's state. A successful HTTP response does not guarantee the host provided all requested data; warnings are surfaced in the response and stored on the progress document.

CURRENT FUNCTIONAL SCOPE
- Firebase sign-up/login and sign-out.
- Separate admin page with server-side Firebase UID check for sync requests.
- Live progress document listener for the current racer.
- Leaderboard from synced percent-complete score.
- Best-effort outline/progress/grades API calls and a display for item type, done/not done/unknown, grade and due date when returned.

NOT YET GUARANTEED
- Automatic personal OAuth linking for each racer.
- Full module/video/assignment completion on learning.edx.org.
- Course deadlines, grade fields, or completion states if the host omits them.
- Atomic server-side race scoring, winner declaration, or anti-cheat protections beyond admin-only sync writes. Do not consider leaderboard points final until these are implemented and API access has been validated.
