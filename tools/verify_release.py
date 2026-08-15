from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / 'app/build.gradle'
MANIFEST = ROOT / 'app/src/main/AndroidManifest.xml'
HTML = ROOT / 'app/src/main/assets/index.html'
ICON = ROOT / 'brand/tourclicks-icon.png'

for path in ROOT.rglob('*'):
    if not path.is_file() or '.git' in path.parts:
        continue
    lower = path.name.lower()
    if lower.endswith(('.jks', '.keystore', '.p12', '.pem', '.apk', '.aab')):
        raise SystemExit(f'Forbidden release/security artifact tracked: {path.relative_to(ROOT)}')

build = BUILD.read_text(encoding='utf-8')
for marker in [
    "namespace 'com.ausuba3d.tourclicks'",
    "applicationId 'com.ausuba3d.tourclicks'",
    'versionCode 1',
    "versionName '1.0.0'",
]:
    if marker not in build:
        raise SystemExit(f'Missing Android release marker: {marker}')

manifest = MANIFEST.read_text(encoding='utf-8')
if 'android:label="TourClicks"' not in manifest:
    raise SystemExit('Android application label is not TourClicks')
if 'com.ausuba3d.janustimebook' in manifest:
    raise SystemExit('Retired Java package remains in Android manifest')

html = HTML.read_text(encoding='utf-8')
for marker in [
    '<h1>TourClicks</h1>',
    'Your tour. Your time.',
    'icons/tourclicks-icon.png',
    'Compare with TourClicks',
    'Small clock variance',
    'Personal offset ET',
    'profileHourlyPayRate',
    'safePunchCommit',
    'TourClicks C5 Teal + Amber production theme',
    'TourClicks C5 dark surface audit and clock variance patch',
    'TourClicks OCR comparison visibility and Virtual Timecard totals patch',
    'TourClicks calendar contrast refinement',
    'TourClicks Timeline date selector contrast and direct date picker',
    'https://github.com/Ausuba3D/TourClicks',
    'https://buymeacoffee.com/Ausuba3D',
    'https://linktr.ee/ausuba3d',
]:
    if marker not in html:
        raise SystemExit(f'Missing final UI/release marker: {marker}')

for forbidden in [
    'https://github.com/Ausuba3D/Janus',
    'Janus Timebook Dev',
    'JANUS TIMEBOOK REPORT',
    'janus-timebook-report.csv',
    'janus-timebook-backup-${todayIso()}.json',
]:
    if forbidden in html:
        raise SystemExit(f'Retired user-facing Janus marker remains: {forbidden}')

for path in (ROOT / 'app/src/main/java').rglob('*.java'):
    text = path.read_text(encoding='utf-8')
    if 'package com.ausuba3d.janustimebook;' in text:
        raise SystemExit(f'Retired Java package remains: {path.relative_to(ROOT)}')
    for forbidden in ['Active Janus timers', 'Janus lunch timer', 'Janus tour timer', 'tap to open Janus']:
        if forbidden in text:
            raise SystemExit(f'Retired visible native branding remains in {path.relative_to(ROOT)}: {forbidden}')

raw = ICON.read_bytes()
if raw[:8] != b'\x89PNG\r\n\x1a\n' or raw[12:16] != b'IHDR':
    raise SystemExit('TourClicks icon is not a valid PNG')
width, height = struct.unpack('>II', raw[16:24])
if (width, height) != (192, 192):
    raise SystemExit(f'Unexpected TourClicks icon size: {width}x{height}')

print('TourClicks 1.0.0 public release source verification passed.')
print(f'Icon: {width}x{height}')
print('Package: com.ausuba3d.tourclicks')
