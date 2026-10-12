COURSE RACER — TERMINAL UI + ADMIN + EDX API

This package restores the terminal-style racer UI, adds a separate admin.html dashboard, removes the old physics course, and configures the new course key:
course-v1:UTAustinX+UT.PreC.10.03x+3T2016

IMPORTANT: api-server.js is only an adapter. It requires an edX-issued server credential with permission to read learner progress. Do not put that credential in GitHub Pages. The exact third-party API permissions for learning.edx.org still need to be confirmed.

Files:
index.html, styles.css, app.js = racer site
admin.html, admin.js = admin site
api-server.js, package.json = server-side edX adapter
firestore.rules = Firebase security rules

Before deploying, set EDX_API_BASE, EDX_ACCESS_TOKEN, and FIREBASE_SERVICE_ACCOUNT_JSON on the server. Add edX identity mapping (edX username or ID) to each racer document as edxUsername or edxUserId. Change the API URL in admin.js to your deployed adapter URL if it is not served from the same origin.
