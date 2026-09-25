# Course Racer

A small, free-to-host course competition site with Firebase authentication + Firestore and GitHub Pages.

## What it does

- 3+ racers with email/password accounts
- Live leaderboard
- Screenshot evidence for each unit/final
- Admin approval queue: inspect screenshot -> Approve/Reject
- Automatic scoring, speed bonuses, and deadline deductions
- **Declare winner** button for the admin
- Declaring a winner locks that course so no later submission or approval can change the result
- Course selector so one deployment can host multiple races

## Free setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Add a Web app and copy its Firebase config into `app.js`.
3. Enable Authentication -> Sign-in method -> Email/Password and Google.
8. If deploying on GitHub Pages, add your GitHub Pages domain under Authentication -> Settings -> Authorized domains.
4. Create Firestore Database.
5. Create your admin account through the site, then copy that account's Firebase Auth UID into `ADMIN_UID` in `app.js` and into `firestore.rules`.
6. Publish the rules in `firestore.rules`.
7. Put the contents of this folder in a GitHub repository and enable GitHub Pages from the `main` branch, root folder.

## Adding another course

Edit the `COURSES` object near the top of `app.js` and add another course object with a unique ID. Example:

```js
mycourse: {
  id: "mycourse",
  name: "My Course",
  shortName: "MYCOURSE",
  points: {
    unit: 4,
    finalMax: 10,
    moduleFirst: 2,
    moduleSecond: 1,
    overallFirst: 4,
    overallSecond: 2,
    checkpointPenalty: 1,
    deadlinePenalty: 3
  },
  modules: [
    {
      name: "Module 1",
      units: ["Unit 1", "Unit 2"],
      deadline: "2026-12-01T18:00:00-08:00",
      checkpoints: [
        { name: "Checkpoint 1", at: "2026-11-25T23:59:59-08:00", required: ["Unit 1"] }
      ]
    }
  ]
}
```

Then add `mycourse` to `COURSES`. It will automatically appear in the course selector. Claims are separated by `courseId`, so racers can participate in multiple courses without mixing scores.

## Declaring a winner

The admin selects the course, waits until the leaderboard is final, and clicks **Declare winner**. The current #1 racer is recorded with their score and timestamp. The course is then locked at the database-rule level, preventing new claims and preventing approval changes.

## Existing PUP01x data

This version adds a required `courseId` field to claims. If you already used the earlier Course Racer build and have claims in Firestore, those old claims do not have `courseId`. Either finish the current race using the new build from a clean database, or add `courseId: "pup01x"` to the old claim documents before switching.
