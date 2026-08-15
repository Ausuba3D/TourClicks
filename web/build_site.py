from __future__ import annotations

import hashlib
import json
import shutil
import struct
from pathlib import Path

SOURCE = Path('app/src/main/assets/index.html')
COMPAT = Path('web/browser-compatibility.js')
ICON = Path('brand/tourclicks-icon.png')
OUTPUT = Path('_site')

for required in (SOURCE, COMPAT, ICON):
    if not required.is_file():
        raise SystemExit(f'Missing required web-build input: {required}')

html = SOURCE.read_text(encoding='utf-8')
for marker in ['Screenshot OCR and comparison', 'Live timers', 'Upcoming USPS holidays', 'TourClicks']:
    if marker not in html:
        raise SystemExit(f'Generated application is missing required marker: {marker}')

theme = '<meta content="#061418" name="theme-color"/>'
if 'rel="manifest"' not in html:
    old_theme = '<meta content="#282a5a" name="theme-color"/>'
    if theme not in html and old_theme in html:
        html = html.replace(old_theme, theme, 1)
    if theme not in html:
        raise SystemExit('Could not locate theme-color insertion point')
    insertion = theme + '''
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<meta name="apple-mobile-web-app-title" content="TourClicks"/>
<meta name="mobile-web-app-capable" content="yes"/>
<link rel="manifest" href="manifest.webmanifest"/>
<link rel="apple-touch-icon" href="icons/tourclicks-icon.png"/>'''
    html = html.replace(theme, insertion, 1)

html = html.replace(
    '<body><script>if(window.AndroidBridge)document.body.classList.add("android-app");</script>',
    '<body><script>if(window.AndroidBridge)document.body.classList.add("android-app");else document.body.classList.add("browser-web");</script>',
    1,
)
if 'browser-compatibility.js' not in html:
    html = html.replace('</body>', '<script src="browser-compatibility.js"></script>\n</body>', 1)

if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
(OUTPUT / 'icons').mkdir(parents=True)
(OUTPUT / 'index.html').write_text(html, encoding='utf-8')
shutil.copy2(COMPAT, OUTPUT / 'browser-compatibility.js')
shutil.copy2(ICON, OUTPUT / 'icons' / 'tourclicks-icon.png')

raw_icon = ICON.read_bytes()
if raw_icon[:8] != b'\x89PNG\r\n\x1a\n' or raw_icon[12:16] != b'IHDR':
    raise SystemExit('TourClicks icon is not a valid PNG')
width, height = struct.unpack('>II', raw_icon[16:24])

manifest = {
    'name': 'TourClicks',
    'short_name': 'TourClicks',
    'description': 'Local-first USPS time, leave, documentation, and payroll comparison records.',
    'id': './',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'background_color': '#061418',
    'theme_color': '#061418',
    'orientation': 'portrait-primary',
    'icons': [{
        'src': 'icons/tourclicks-icon.png',
        'sizes': f'{width}x{height}',
        'type': 'image/png',
        'purpose': 'any maskable',
    }],
}
(OUTPUT / 'manifest.webmanifest').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

source_sha = hashlib.sha256(html.encode('utf-8')).hexdigest()
cache_name = f'tourclicks-web-{source_sha[:12]}'
service_worker = f'''const CACHE_NAME = {json.dumps(cache_name)};
const APP_SHELL = ['./', './index.html', './browser-compatibility.js', './manifest.webmanifest', './icons/tourclicks-icon.png', './build-info.json'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {{
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {{
    event.respondWith(fetch(event.request).then(response => {{ caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone())); return response; }}).catch(() => caches.match('./index.html')));
    return;
  }}
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {{
    if (response.ok && new URL(event.request.url).origin === self.location.origin) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  }})));
}});
'''
(OUTPUT / 'sw.js').write_text(service_worker, encoding='utf-8')

build_info = {
    'web_version': '1.0.0',
    'application_sha256': source_sha,
    'application_bytes': len(html.encode('utf-8')),
    'icon_dimensions': f'{width}x{height}',
    'android_only': [
        'Automatic bundled ML Kit OCR',
        'Persistent Android timer notification',
        'Timer actions from Android notification',
        'Android Gallery and Downloads integrations',
        'Android hardware Back integration',
    ],
}
(OUTPUT / 'build-info.json').write_text(json.dumps(build_info, indent=2) + '\n', encoding='utf-8')
print(json.dumps(build_info, indent=2))
