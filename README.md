# Nid

Application de gestion d'abonnements (téléphone, internet, électricité, etc.) :
- totaux mensuels et annuels
- rappels avant paiement
- données stockées localement sur l'appareil

**Stack :** React · Vite · Zustand · Capacitor (APK Android)

## Prérequis

- Node.js 20+
- Pour l'APK : [Android Studio](https://developer.android.com/studio)

## Démarrage (web)

```bash
npm install
npm run dev
```

## Build web

```bash
npm run build
```

## Build APK Android

```bash
npm install
npm run build
npx cap add android    # une seule fois
npx cap sync android
npx cap open android
```

Dans Android Studio : **Build → Build Bundle(s) / APK(s) → Build APK(s)**

APK debug typique :
`android/app/build/outputs/apk/debug/app-debug.apk`

Voir aussi [BUILD-ANDROID.md](./BUILD-ANDROID.md).
