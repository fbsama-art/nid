# Nid — build APK (Android Studio)

## Prérequis
- Node.js 20+
- Android Studio (SDK + un émulateur ou un téléphone)
- JDK 17 recommandé

## 1. Installer les dépendances
```bash
cd nid
npm install
```

## 2. Build web + projet Android
```bash
npm run build
npx cap add android
npx cap sync android
```
(`cap add android` une seule fois. Ensuite seulement `npx cap sync android`.)

## 3. Ouvrir Android Studio
```bash
npx cap open android
```

## 4. Générer l'APK
Dans Android Studio :
1. Attendre la fin de l'indexation Gradle
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. APK debug : `android/app/build/outputs/apk/debug/app-debug.apk`

Pour une APK signée : **Build → Generate Signed Bundle / APK…**

## 5. Installer sur le téléphone
- Transférer l'APK
- Autoriser les sources inconnues si demandé
- Ouvrir le fichier et installer

## Après une modification du code web
```bash
npm run build
npx cap sync android
```
Puis rebuild dans Android Studio.
