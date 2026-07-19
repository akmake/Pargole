# PergoCalc — Mobile (Capacitor)

אפליקציית המובייל של PergoCalc. זו **אותה אפליקציית ה-web בדיוק** (`../client`) עטופה ב-[Capacitor](https://capacitorjs.com/)
כדי לרוץ כאפליקציית Android/iOS נייטיב אמיתית שאפשר להתקין ולהעלות לחנויות.

> התיקייה הזו עצמאית ואינה נוגעת ב-`../client`. כל הלוגיקה (מנוע החישוב, התמחור,
> תצוגת ה-3D, ה-bin-packing, ייצוא PDF/CSV/SVG) זהה למקור.

## מה שונה מגרסת ה-web (המינימום ההכרחי בלבד)

| שינוי | קובץ | סיבה |
|-------|------|------|
| `HashRouter` במקום `BrowserRouter` | `src/main.jsx` | אין שרת ב-WebView לפענוח נתיבים עמוקים |
| `base: './'` | `vite.config.js` | טעינת נכסים מהסכימה המקומית של Capacitor |
| שמירה/שיתוף קבצים נייטיבי | `src/utils/platformExport.js` | הורדת blob לא מציגה קובץ ב-WebView — משתמשים ב-Filesystem+Share |

בדפדפן ההתנהגות נשארת **זהה למקור** (הורדת קובץ / Web Share) — הקוד מזהה אוטומטית אם הוא רץ נייטיב.

## דרישות מקדימות

- **Node.js** (מותקן)
- **Android Studio** + **Android SDK** (מותקן) — ל-Android
- **JDK 21** — מגיע מובנה עם Android Studio (`.../Android Studio/jbr`)
- ל-**iOS** צריך **macOS + Xcode** (לא ניתן לבנות מ-Windows)

## בנייה מהירה ל-Android APK

```bash
cd mobile
npm install

# 1) בונים את ה-web bundle
npm run build            # → dist/

# 2) יוצרים את פרויקט האנדרואיד הנייטיב (פעם אחת)
npx cap add android

# 3) מסנכרנים את ה-dist לתוך הפרויקט הנייטיב
npx cap sync android

# 4) בונים APK (מ-Windows — קובעים JDK+SDK ואז gradlew)
cd android
./gradlew assembleDebug
```

ה-APK ייווצר ב:
```
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### הגדרת JDK ו-SDK ל-Gradle (Windows, PowerShell)

אם `java`/SDK לא ב-PATH, הצבע עליהם מ-Android Studio לפני `gradlew`:

```powershell
$env:JAVA_HOME  = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

או פשוט לפתוח את הפרויקט ב-Android Studio ולבנות משם:

```bash
npx cap open android      # Build > Build APK(s)
```

## התקנה על מכשיר

```bash
# מכשיר מחובר ב-USB עם USB-debugging פעיל:
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## פקודות עזר (מוגדרות ב-package.json)

| פקודה | פעולה |
|-------|-------|
| `npm run mobile:build` | `vite build` + `cap sync` |
| `npm run cap:open:android` | פתיחת הפרויקט ב-Android Studio |
| `npm run cap:run:android` | בנייה + הרצה על מכשיר/אמולטור |

## גרסת production (APK/AAB חתום)

ל-Google Play צריך build חתום (`assembleRelease` / `bundleRelease`) עם keystore.
הכי נוח דרך Android Studio: **Build > Generate Signed Bundle / APK**.
