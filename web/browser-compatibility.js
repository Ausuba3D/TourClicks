(() => {
  'use strict';
  if (window.AndroidBridge) return;

  const applyBrowserFeatures = () => {
    document.body.classList.add('browser-web');

    if (!document.getElementById('tourClicksWebCompatibilityStyle')) {
      const style = document.createElement('style');
      style.id = 'tourClicksWebCompatibilityStyle';
      style.textContent = `
        .web-platform-banner{background:#0b252a;border:1px solid #28565c;border-left:5px solid #16b8b1;border-radius:12px;padding:12px 14px;margin:0 0 12px;box-shadow:0 8px 24px rgba(0,0,0,.24);color:#f2f8f8}
        .web-platform-banner h2{font-size:16px;margin:0 0 5px;color:#f2f8f8}.web-platform-banner p{margin:4px 0;font-size:13px;color:#a8c0c2;line-height:1.45}
        .web-platform-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        .platform-only-note{margin-top:10px;padding:10px 12px;border-radius:9px;background:#302713;border-left:4px solid #f2a91f;font-size:12px;color:#f6e2bb}
        .browser-web .android-only-control{opacity:.58;cursor:not-allowed}
        .web-install-help{font-size:12px;color:#91aaac;margin-top:7px}
        @media (display-mode:standalone){.web-platform-banner .install-instructions{display:none}.web-platform-banner{border-left-color:#29d3bd;background:#0c2925}}
      `;
      document.head.append(style);
    }

    const main = document.querySelector('main');
    if (main && !document.getElementById('webPlatformBanner')) {
      const banner = document.createElement('section');
      banner.id = 'webPlatformBanner';
      banner.className = 'web-platform-banner no-print';
      banner.innerHTML = `
        <h2>TourClicks Web</h2>
        <p>This browser version keeps records locally on this device and works offline after the first successful load.</p>
        <p><b>No automatic sync:</b> Android and web data are separate. Use TourClicks JSON backup export/import to move records.</p>
        <p class="install-instructions"><b>iPhone/iPad:</b> open this page in Safari, tap Share, then choose <b>Add to Home Screen</b>.</p>
        <p><b>Important:</b> export backups regularly. Browsers can remove website data under storage pressure or in private browsing.</p>
        <div class="web-platform-actions">
          <button class="btn small secondary" type="button" id="webInstallHelp">Installation help</button>
          <button class="btn small outline" type="button" id="requestPersistentStorage">Request durable storage</button>
        </div>
        <div class="web-install-help" id="webStorageStatus"></div>`;
      main.prepend(banner);

      document.getElementById('webInstallHelp')?.addEventListener('click', () => {
        alert('On iPhone or iPad: open TourClicks in Safari, tap Share, choose “Add to Home Screen,” then tap Add. Open TourClicks from the new Home Screen icon.');
      });
      document.getElementById('requestPersistentStorage')?.addEventListener('click', async () => {
        const status = document.getElementById('webStorageStatus');
        try {
          if (!navigator.storage?.persist) {
            status.textContent = 'This browser does not expose the durable-storage request. Regular JSON backups remain essential.';
            return;
          }
          const granted = await navigator.storage.persist();
          status.textContent = granted ? 'Durable storage was granted.' : 'Durable storage was not granted. Regular JSON backups remain essential.';
        } catch {
          status.textContent = 'The storage request could not be completed. Regular JSON backups remain essential.';
        }
      });
    }

    const subtitle = document.querySelector('.subtitle');
    if (subtitle) subtitle.textContent = 'Your tour. Your time. · Web · Local-first records';

    const timerPanel = document.getElementById('timerPanel');
    if (timerPanel && !timerPanel.querySelector('[data-web-timer-note]')) {
      const note = document.createElement('div');
      note.dataset.webTimerNote = 'true';
      note.className = 'platform-only-note no-print';
      note.innerHTML = '<b>Browser limitation:</b> timers use saved timestamps and catch up when the browser returns, but persistent Android timer notifications and notification action buttons are Android-only.';
      timerPanel.append(note);
      const tag = timerPanel.querySelector('.tag');
      if (tag) tag.textContent = 'Web foreground';
    }

    const ocrPanel = document.getElementById('ocrComparisonPanel');
    const runOcr = document.getElementById('runOcr');
    if (ocrPanel && runOcr) {
      runOcr.disabled = true;
      runOcr.classList.add('android-only-control');
      runOcr.textContent = 'Automatic OCR - Android only';
      runOcr.title = 'Web supports screenshot crop, manual text paste, extraction, comparison, and saved reviews. Automatic recognition is Android-only.';
      const status = document.getElementById('ocrStatus');
      if (status && status.textContent === 'No screenshot selected.') status.textContent = 'Web: crop a screenshot, then paste recognized text manually. Automatic OCR is Android-only.';
      if (!ocrPanel.querySelector('[data-web-ocr-note]')) {
        const note = document.createElement('div');
        note.dataset.webOcrNote = 'true';
        note.className = 'platform-only-note';
        note.innerHTML = '<b>Android-only feature:</b> automatic on-device OCR. Web keeps screenshot preparation, manual text paste, value extraction, comparison, and saved discrepancy records.';
        ocrPanel.append(note);
      }
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyBrowserFeatures, {once:true});
  else applyBrowserFeatures();
  setTimeout(applyBrowserFeatures, 600);

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    const install = document.getElementById('webInstallHelp');
    if (!install) return;
    install.textContent = 'Install TourClicks';
    install.onclick = async () => event.prompt();
  });
})();
