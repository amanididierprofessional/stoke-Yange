# Native mobile build (offline-first)

Stoke Yange's normal website build remains configured by `vite.config.ts`. The native app uses `vite.native.config.ts` to generate a client-side SPA shell and Capacitor packages that shell into the app. The native configuration deliberately does not set `server.url`: the app UI must load from assets bundled inside the Android/iOS application, not from the hosted website.

## Android local build

Requirements: Node.js 22, Android Studio / Android SDK, and Java 21.

```sh
npm install
npm run build:native
npx cap add android   # only the first time, if android/ does not exist
npx cap sync android
npx cap open android
```

Build an installable debug APK from Android Studio, or run:

```sh
cd android
./gradlew assembleDebug
```

The GitHub Actions workflow `.github/workflows/android-offline-build.yml` also builds a debug APK artifact for testing. On pushes to `main`, it publishes the APK as a direct-download asset at `https://github.com/amanididierprofessional/stoke-Yange/releases/download/android-latest/stoke-yange.apk`. This is a beta/debug-signed APK until a stable production signing key is configured; do not promise seamless in-place upgrades between different debug builds.

## Online sync configuration

The app can open and use its local Dexie database without a network connection. To enable Supabase cloud sync in a GitHub Actions build, configure the repository Actions secret `VITE_SUPABASE_ANON_KEY` with the project's public anon/publishable key. Do not put a Supabase service-role key in a mobile app. If the secret is absent, the APK is useful for offline UI testing but cloud sync is not configured.

## Important release checks

- Install and launch once; then enable airplane mode and force-close/reopen the app.
- Confirm product, stock, sale, debt, history, and settings screens work offline.
- Reconnect and confirm pending data syncs without duplicate sales.
- Test on physical Android devices before preparing a signed release.
- Camera access uses the native Capacitor Camera plugin on Android; the PWA keeps its browser camera flow.
- Local-only reset clears this device and signs out locally; cloud data intentionally remains and can be restored at next sign-in. Full reset now requires a successful online cloud deletion and reports errors instead of claiming success.
- For a public production launch, configure a stable Android signing keystore in GitHub Actions secrets and build/sign a release APK. The debug APK download is suitable for beta testing, not a long-term update channel.
- For iOS, use macOS/Xcode and the Apple signing/App Store workflow.
- Never publish the debug APK as a production release. Release builds need signing, privacy disclosures, store assets, and a tested backup/restore flow.
