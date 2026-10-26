# Firebase Hosting deployment

This project uses Vite, which writes production files to `dist/`. Firebase Hosting is configured to serve that directory.

Run the following from the project root to build the app and deploy it:

```sh
npm run deploy
```

The script runs `npm run build` before `firebase deploy --only hosting`. Make sure the Firebase CLI is installed and that you have selected or authenticated to the correct Firebase project.
