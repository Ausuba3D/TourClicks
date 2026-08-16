# TourClicks

<p align="center">
  <img src="brand/tourclicks-logo.png" alt="TourClicks - Your tour. Your time." width="720">
</p>

TourClicks is a local-first Android and browser application for personal USPS time, leave, FMLA, documentation, payroll review, and clock-ring comparison.

It is an independent Ausuba3D project. TourClicks is not affiliated with or endorsed by the United States Postal Service or any labor union.

## Release

Current releases:

- Android APK: [TourClicks 1.0.2 - Android APK](https://github.com/Ausuba3D/TourClicks/releases/tag/v1.0.2-android)
- Web / PWA package: [TourClicks 1.0.0 - Web / PWA](https://github.com/Ausuba3D/TourClicks/releases/tag/v1.0.0-web)
- Android package: `com.ausuba3d.tourclicks`

Android 1.0.2 retains the 1.0.1 system-inset compatibility fix and improves system-bar contrast: the status area uses the TourClicks dark background with light status icons, while the bottom navigation area remains light with dark controls.

## Highlights

- BT, OL, IL, and ET recordkeeping with direct time entry
- Early/late start variance and personal makeup-time calculations
- USPS hundredths conversion tools
- Calendar with pay periods, paydays, holidays, NS days, leave, and record indicators
- Timeline notes, photos, documents, and documentation records
- Leave and FMLA tracking
- Reports and daily/pay-period summaries
- Screenshot OCR comparison on Android
- Small clock-variance classification for phone-vs-USPS clock differences
- Local JSON backup export/import
- Installable offline-capable browser PWA
- C5 teal-and-amber interface

## Tutorials and user guides

New users should begin with the setup guide before entering daily records.

- [Setup and First Use Guide (PDF)](docs/tutorials/TourClicks-Setup-and-First-Use-Guide.pdf) - configure the weekly schedule, pay-period anchor and dates, starting leave balances, FMLA cases, a first test record, and backups
- [Daily Use Guide (PDF)](docs/tutorials/TourClicks-Daily-Use-Guide.pdf) - use Today, BT, OL, IL, ET, Timeline, Calendar, Calculator, leave and FMLA, reports, OCR comparison, and backups
- [Tutorial folder and editable Word versions](docs/tutorials/)
- [Open the hosted TourClicks app](https://ausuba3d.github.io/TourClicks/)

## Privacy and data

TourClicks is local-first. Records are stored on the device/browser where they are created. Android and web do not automatically synchronize.

Export backups regularly, especially before uninstalling an alpha/development build or moving records between Android and web.

## Moving from Janus alpha builds

TourClicks 1.0 uses a new public-release application identity and signing key. Existing Janus alpha installations should export a JSON backup, install TourClicks, import the backup, and keep the old alpha app only until the imported records have been verified.

## Web app

The verified Web/PWA package is available from the Web release above. The hosted browser version is deployed with GitHub Pages from the verified web build workflow.

Browser limitations are documented in `web/ANDROID-ONLY-FEATURES.md`.

## Build

Requirements: Java 17, Android SDK 36 / Build Tools 36, Gradle 8.11.1, Node.js, and Python 3.

The public repository does not contain private release signing material. The permanent release key is stored separately in private backup infrastructure.

## Support

- Email: Ausuba3D@gmail.com
- Buy Me a Coffee: https://buymeacoffee.com/Ausuba3D
- GitHub: https://github.com/Ausuba3D/TourClicks
- Linktree: https://linktr.ee/ausuba3d

## Security

Do not commit keystores, private keys, employee records, screenshots containing personal information, or exported TourClicks backups. See `SECURITY.md`.

## Source license

Copyright 2026 Ausuba3D. All rights reserved. See `LICENSE`.
