# Google Play Launch Checklist

## Code & Build (done by Claude)
- [x] `app.json` — `versionCode: 1`, `googleServicesFile` path, permissions list
- [x] `eas.json` — production profile: AAB + `distribution: "store"`; submit track: `internal`
- [x] Onboarding screen with overlay permission request
- [x] Usage counter UI (50 scans/month with progress bar)

---

## Assets you need to create

### App icon
- **icon.png** — 1024×1024 px, no transparency (used for iOS + Play Store listing)
- **adaptive-icon.png** — 1024×1024 px foreground, transparent background (Android adaptive icon)
- Current files in `app/assets/` are Expo defaults — replace them before production build
- Tools: Figma, Adobe Express, or hire a designer
- Tip: dark navy (#0A0A0F) background, "AI" or chat bubble glyph in blue/white

### Feature graphic
- 1024×500 px PNG or JPEG — shown at top of Play Store listing
- Should visually represent the bubble + chat context

### Screenshots (minimum 2, recommended 4–8)
- Phone screenshots: 16:9 or 9:16, at least 320px on shortest side
- Capture on your Samsung S23 Ultra (1440×3088)
- Suggested screens:
  1. Home screen (usage counter + bubble toggle enabled)
  2. Bubble visible over WhatsApp
  3. Scanning overlay mid-scan
  4. Reply overlay with 3 options

---

## Privacy policy (REQUIRED by Google)
Google requires a privacy policy URL for any app that handles personal data.

### Quick option — GitHub Pages (free)
1. Create a new public GitHub repo named `ai-reply-assistant-privacy`
2. Add `index.md` with the privacy policy text below
3. Enable GitHub Pages (Settings → Pages → main branch)
4. URL will be: `https://yourusername.github.io/ai-reply-assistant-privacy`

### Privacy policy template
```
# Privacy Policy — AI Reply Assistant
Last updated: [date]

AI Reply Assistant uses your screen content solely to generate reply suggestions.
Screen content is processed in real time via our AI backend and immediately discarded.
We do not store, share, or sell any screen content or conversation data.

We collect: email address (for account creation), usage count (number of scans per month).
We do not collect: message content, contact names, phone numbers, or any other personal data.

Data is stored securely via Supabase. You may delete your account at any time.
Contact: [your email]
```

---

## Data Safety form (Play Console)
Fill this in when creating the store listing:

| Question | Answer |
|---|---|
| Does your app collect or share user data? | Yes |
| Data types collected | Email address (account info), approximate app activity (usage count) |
| Is data encrypted in transit? | Yes |
| Can users request data deletion? | Yes (delete account) |
| Screen/display content shared? | No (processed transiently, never stored) |

---

## Production build command
```bash
cd app
source ~/.nvm/nvm.sh && nvm use 20
eas build --platform android --profile production
```

### Before running the build, bump the version if this is not the first submission:
In `app/app.json`:
- Increment `"version"` for user-visible version (e.g., `"1.0.0"` → `"1.0.1"`)
- Increment `"versionCode"` for Play Store build number (e.g., `1` → `2`)

---

## Play Console setup steps
1. Go to https://play.google.com/console
2. Create app → "AI Reply Assistant" → App → Free → Not containing ads
3. Fill in Store Listing (use `play-store-listing.md`)
4. Upload AAB from EAS build
5. Set up Internal Testing track first — test on your device
6. Complete all policy declarations (ads, target audience, data safety)
7. Add privacy policy URL
8. Submit for review when ready for production

---

## EAS Submit (automated upload to Play Console)
After the production build completes:
```bash
# One-time: create a service account in Google Cloud Console
# Download the JSON key → save as app/google-play-service-account.json

eas submit --platform android --profile production
```
This uploads the AAB directly to the internal testing track.
