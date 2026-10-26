# Firebase Hosting deployment

This project uses Vite, which writes production files to `dist/`. Firebase Hosting serves that directory and rewrites app routes to its built `index.html`. Do not set the rewrite destination to `/main.jsx`; that source file is bundled by Vite and is not a deployable entry point.

Run the following from the project root to build the app and deploy it:

```sh
npm run deploy
```

The script runs `npm run build` before `firebase deploy --only hosting`. Make sure the Firebase CLI is installed and that you have selected or authenticated to the correct Firebase project.
