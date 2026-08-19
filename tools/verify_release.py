from pathlib import Path
import base64
import struct

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / 'app/build.gradle'
MANIFEST = ROOT / 'app/src/main/AndroidManifest.xml'
HTML = ROOT / 'app/src/main/assets/index.html'
PATCH_JS = ROOT / 'app/src/main/assets/tourclicks-1.0.3.js'
PATCH_CSS = ROOT / 'app/src/main/assets/tourclicks-1.0.3.css'
FORM_TEMPLATES = [ROOT / f'app/src/main/assets/ps3971-template-{i:02d}.b64' for i in range(1, 6)]
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
    'versionCode 4',
    "versionName '1.0.3'",
    'minifyEnabled true',
    'shrinkResources true',
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

for required in (PATCH_JS, PATCH_CSS, *FORM_TEMPLATES):
    if not required.is_file() or required.stat().st_size == 0:
        raise SystemExit(f'Missing TourClicks 1.0.3 asset: {required.relative_to(ROOT)}')

patch = PATCH_JS.read_text(encoding='utf-8')
for marker in [
    'Partial-day leave interval',
    'At-a-glance time composition',
    'tc-six-hour-marker',
    'PS Form 3971 preview',
    'PS3971_',
    'Total leave',
]:
    if marker not in patch:
        raise SystemExit(f'Missing TourClicks 1.0.3 feature marker: {marker}')

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

form_b64 = ''.join(path.read_text(encoding='ascii').strip() for path in FORM_TEMPLATES)
if len(form_b64) < 60000:
    raise SystemExit('PS Form 3971 template payload is unexpectedly small')
try:
    form_raw = base64.b64decode(form_b64, validate=True)
except Exception as exc:
    raise SystemExit(f'PS Form 3971 template payload is not valid base64: {exc}')
if len(form_raw) < 45000 or form_raw[:4] != b'RIFF' or form_raw[8:12] != b'WEBP':
    raise SystemExit('PS Form 3971 template is not the expected WebP payload')

print('TourClicks 1.0.3 public release source verification passed.')
print(f'Icon: {width}x{height}')
print(f'3971 template: {len(form_raw)} decoded bytes across {len(FORM_TEMPLATES)} chunks')
print('Package: com.ausuba3d.tourclicks')
