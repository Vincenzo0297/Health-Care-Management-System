# Firebase deployment

This project uses Vite, which writes production files to `dist/`. Firebase Hosting serves that directory and rewrites app routes to its built `index.html`. Do not set the rewrite destination to `/main.jsx`; that source file is bundled by Vite and is not a deployable entry point.

Firestore rules are defined in `firestore.rules` and Storage rules in `storage.rules`; both are deployed with Hosting. Signed-in users can read cases and update cases that are Open or In Progress; case creation remains tied to the creator's UID. User profile documents are only accessible by their owner. Signed-in users can view case documents, and upload PDF or PNG/JPG files up to 10 MB.

Run the following from the project root to build the app and deploy Hosting and Firestore rules:

```sh
npm run deploy
```

The script runs `npm run build` before `firebase deploy --only hosting,firestore:rules,storage`. Make sure the Firebase CLI is installed, Cloud Storage is enabled for the Firebase project, and you have selected or authenticated to the correct project. Deploying these rules allows every signed-in account to read case data and attached documents, including patient and claim details.
