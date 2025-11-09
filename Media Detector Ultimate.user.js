// ==UserScript==
// @name         Media Detector Ultimate (Regex + Extension + Performance Observer)
// @namespace    AfeefMediaFusion
// @version      3.6
// @description  Dual media detectors (regex + extension) with performance observer to catch all media, Nami-style glowing UI, subtabs, copy (URL then referrer), drag, and smart URL shortening
// @author       Afeef
// @match        *://*/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // ----------------------
    // Configuration
    // ----------------------
    const mediaRegex = /\.(mp4|webm|mkv|flv|mov|avi|ogg|mp3|aac|flac|wav|opus|m4a|m3u8|ts|vtt|srt)(\?|$)/i;
    const extensions = ["m3u8","ts","m4s","mp4","webm","mkv","flv","mov","avi","ogg","mp3","aac","flac","wav","opus","m4a","vtt","srt"];

    // maps for dedup
    const regexDetected = {};
    const extDetected = {};
    const regexSections = {};
    const extSections = {};

    // ----------------------
    // UI Setup
    // ----------------------
    const panel = document.createElement('div');
    Object.assign(panel.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '480px',
        maxHeight: '70vh',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(10,10,14,0.96), rgba(18,18,22,0.96))',
        color: '#BFFFEA',
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '13px',
        borderRadius: '12px',
        zIndex: 9999999,
        border: '1px solid rgba(0,255,204,0.25)',
        boxShadow: '0 8px 30px rgba(0,255,204,0.08)',
        display: 'block'
    });

    const header = document.createElement('div');
    header.innerHTML = `🎬 <strong>Media Detector Ultimate</strong> <span id="md_close" style="float:right;cursor:pointer;color:#ff9999;">✖</span>`;
    Object.assign(header.style, {
        fontWeight: '700',
        color: '#9fffe0',
        textAlign: 'center',
        padding: '8px 10px',
        borderBottom: '1px solid rgba(0,255,204,0.06)',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.08), transparent)',
        cursor: 'move',
        userSelect: 'none',
        position: 'relative'
    });

    // Tabs header
    const mainTabs = document.createElement('div');
    Object.assign(mainTabs.style, {
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid rgba(0,255,204,0.04)',
        background: 'rgba(0,0,0,0.03)'
    });

    const contentWrapper = document.createElement('div');
    Object.assign(contentWrapper.style, {
        maxHeight: 'calc(70vh - 110px)',
        overflowY: 'auto',
        padding: '8px'
    });

    // Regex content
    const regexContent = document.createElement('div');
    const regexTabs = document.createElement('div');
    const regexBody = document.createElement('div');
    regexBody.textContent = "No media detected yet.";
    Object.assign(regexTabs.style, { display:'flex', flexWrap:'wrap', gap:'4px', borderBottom:'1px solid rgba(0,255,204,0.02)', paddingBottom:'6px' });
    regexContent.appendChild(regexTabs);
    regexContent.appendChild(regexBody);

    // Extension content
    const extContent = document.createElement('div');
    const extTabs = document.createElement('div');
    const extBody = document.createElement('div');
    extBody.textContent = "No media detected yet.";
    Object.assign(extTabs.style, { display:'flex', flexWrap:'wrap', gap:'4px', borderBottom:'1px solid rgba(0,255,204,0.02)', paddingBottom:'6px' });
    extContent.appendChild(extTabs);
    extContent.appendChild(extBody);

    // Tabs switch
    const regexTab = document.createElement('div');
    const extTab = document.createElement('div');
    regexTab.textContent = "Regex Scan";
    extTab.textContent = "Extension Scan";
    [regexTab, extTab].forEach(tab => {
        Object.assign(tab.style, {
            flex: '1',
            textAlign: 'center',
            padding: '8px 6px',
            cursor: 'pointer',
            userSelect: 'none',
            color: '#A6FFF0'
        });
        tab.addEventListener('click', () => {
            [regexTab, extTab].forEach(t => t.style.background = 'transparent');
            [regexContent, extContent].forEach(c => c.style.display = 'none');
            tab.style.background = 'linear-gradient(90deg, rgba(0,255,204,0.06), rgba(0,255,204,0.02))';
            if (tab === regexTab) regexContent.style.display = 'block';
            else extContent.style.display = 'block';
        });
    });
    mainTabs.appendChild(regexTab);
    mainTabs.appendChild(extTab);
    regexTab.click();

    contentWrapper.appendChild(regexContent);
    contentWrapper.appendChild(extContent);

    // Assemble panel
    panel.appendChild(header);
    panel.appendChild(mainTabs);
    panel.appendChild(contentWrapper);
    document.body.appendChild(panel);

    // Toggle icon when closed
    const toggleIcon = document.createElement('div');
    toggleIcon.textContent = '🧭';
    Object.assign(toggleIcon.style, {
        position: 'fixed',
        top: '12px',
        right: '12px',
        fontSize: '20px',
        cursor: 'pointer',
        color: '#00ffcc',
        zIndex: 9999998,
        display: 'none',
        textShadow: '0 0 10px rgba(0,255,204,0.2)'
    });
    document.body.appendChild(toggleIcon);

    document.getElementById('md_close').addEventListener('click', () => {
        panel.style.display = 'none';
        toggleIcon.style.display = 'block';
    });
    toggleIcon.addEventListener('click', () => {
        toggleIcon.style.display = 'none';
        panel.style.display = 'block';
    });

    // ----------------------
    // Dragging
    // ----------------------
    (function makeDraggable() {
        let dragging = false, offsetX = 0, offsetY = 0;
        header.addEventListener('mousedown', e => {
            if ((e.target && e.target.id === 'md_close')) return;
            dragging = true;
            const rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            document.body.style.userSelect = 'none';
        });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            const newLeft = Math.min(Math.max(0, e.clientX - offsetX), window.innerWidth - panel.offsetWidth);
            const newTop = Math.min(Math.max(0, e.clientY - offsetY), window.innerHeight - panel.offsetHeight);
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
            panel.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => {
            dragging = false;
            document.body.style.userSelect = '';
        });
    })();

    // ----------------------
    // Helpers
    // ----------------------
    const shortenUrl = (url, visible = 64) => {
        if (!url) return '';
        if (url.length <= visible) return url;
        const half = Math.floor((visible - 3) / 2);
        return url.slice(0, half) + "..." + url.slice(-half);
    };

    function ensureSubTab(type, parentTabs, parentBody, map, sectionMap) {
        if (sectionMap[type]) return sectionMap[type];
        if (Object.keys(sectionMap).length === 0) parentBody.textContent = '';
        const tab = document.createElement('div');
        tab.textContent = type.toUpperCase();
        Object.assign(tab.style, {
            padding: '6px 8px',
            cursor: 'pointer',
            userSelect: 'none',
            marginRight: '6px',
            borderRadius: '6px',
            background: 'transparent',
            color: '#cffff6',
            fontSize: '12px'
        });
        const body = document.createElement('div');
        body.style.display = 'none';
        body.style.padding = '6px 0 10px 0';
        parentTabs.appendChild(tab);
        parentBody.appendChild(body);
        tab.addEventListener('click', () => {
            [...parentTabs.children].forEach(t => t.style.background = 'transparent');
            [...parentBody.children].forEach(b => b.style.display = 'none');
            tab.style.background = 'linear-gradient(90deg, rgba(0,255,204,0.06), rgba(0,255,204,0.02))';
            body.style.display = 'block';
        });
        sectionMap[type] = { tab, body };
        if (Object.keys(sectionMap).length === 1) tab.click();
        return sectionMap[type];
    }

    // copy helper (GM_setClipboard preferred)
    async function copyText(text) {
        try {
            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(String(text));
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(String(text));
            } else {
                // fallback: create temporary textarea
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
            }
        } catch (e) {
            console.warn('[MediaDetector] copy failed', e);
        }
    }

    // ----------------------
    // Card creation (enhanced)
    // ----------------------
    function addURL(map, sectionMap, parentTabs, parentBody, url, type) {
        if (!map[type]) map[type] = new Set();
        if (map[type].has(url)) return;
        map[type].add(url);

        const { body } = ensureSubTab(type, parentTabs, parentBody, map, sectionMap);
        const shortUrl = shortenUrl(url, 80);

        const referrer = document.referrer || "(none)";
        const origin = location.origin || "(unknown)";

        const card = document.createElement('div');
        Object.assign(card.style, {
            background: 'linear-gradient(180deg, rgba(0,255,204,0.04), rgba(0,255,204,0.02))',
            margin: '8px 0',
            padding: '8px',
            borderRadius: '8px',
            wordBreak: 'break-all',
            position: 'relative',
            border: '1px solid rgba(0,255,204,0.06)'
        });

        // top line: link + toggle arrow (arrow at right)
        const topLine = document.createElement('div');
        Object.assign(topLine.style, { display: 'flex', alignItems: 'center', gap: '8px' });

        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.style.color = '#9fffe0';
        link.style.textDecoration = 'none';
        link.style.flex = '1';
        link.textContent = shortUrl;

        const toggle = document.createElement('span');
        toggle.textContent = '▼';
        toggle.title = 'Show details';
        Object.assign(toggle.style, { cursor: 'pointer', color: '#9fffe0', fontSize: '14px', marginLeft: '8px' });

        topLine.appendChild(link);
        topLine.appendChild(toggle);

        // details block (hidden by default)
        const details = document.createElement('div');
        details.style.display = 'none';
        details.style.marginTop = '8px';
        details.style.fontSize = '12px';
        details.style.color = '#dfffee';
        details.innerHTML = `
            <div style="margin-bottom:6px;"><strong>Referrer:</strong> <span style="color:#cfefee">${escapeHtml(referrer)}</span></div>
            <div><strong>Origin:</strong> <span style="color:#cfefee">${escapeHtml(origin)}</span></div>
        `;

        // copy button area
        const copyWrap = document.createElement('div');
        Object.assign(copyWrap.style, { marginTop: '8px' });
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copy';
        Object.assign(copyBtn.style, {
            background: 'rgba(0,77,64,0.9)',
            color: '#e6fff6',
            border: 'none',
            padding: '6px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px'
        });

        copyWrap.appendChild(copyBtn);

        // append to card
        card.appendChild(topLine);
        card.appendChild(details);
        card.appendChild(copyWrap);
        body.appendChild(card);
        // auto-scroll parent to bottom
        parentBody.scrollTop = parentBody.scrollHeight;

        // toggle behavior
        let expanded = false;
        toggle.addEventListener('click', () => {
            expanded = !expanded;
            details.style.display = expanded ? 'block' : 'none';
            toggle.textContent = expanded ? '▲' : '▼';
            toggle.title = expanded ? 'Hide details' : 'Show details';
        });

        // copy behavior: first copy URL, then copy Referrer (two separate copies)
        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const origText = copyBtn.textContent;
try {
    copyBtn.disabled = true;

    copyBtn.textContent = '⏳ Copying URL...';
    await copyText(url);
    copyBtn.textContent = '✅ URL copied';
    await sleep(600);

    copyBtn.textContent = '⏳ Copying Referrer...';
    await copyText(referrer);
    copyBtn.textContent = '✅ Referrer copied';
    await sleep(600);

    const origin = window.location.origin;
    copyBtn.textContent = '⏳ Copying Origin...';
    await copyText(origin);
    copyBtn.textContent = '✅ Origin copied';
    await sleep(600);

} catch (err) {
    console.warn('[MediaDetector] copy error', err);
    copyBtn.textContent = '⚠️ Copy failed';
    await sleep(900);
} finally {
    copyBtn.textContent = '📋 Copy';
    copyBtn.disabled = false;
}

        });
    }

    // small helper
    function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

    // escape HTML to show raw referrer/origin safely
    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
    }

    // ----------------------
    // Detection logic
    // ----------------------
    function handleRegex(url) {
        try {
            if (typeof url === 'string' && mediaRegex.test(url)) {
                const extMatch = url.match(mediaRegex);
                const ext = extMatch ? extMatch[1].toLowerCase() : 'unknown';
                addURL(regexDetected, regexSections, regexTabs, regexBody, url, ext);
            }
        } catch (e) { /* ignore */ }
    }

    function handleExtension(url) {
        try {
            if (!url) return;
            const u = new URL(url, location.href);
            const ext = (u.pathname.split('.').pop() || '').toLowerCase();
            if (extensions.includes(ext)) addURL(extDetected, extSections, extTabs, extBody, url, ext);
        } catch (e) { /* ignore */ }
    }

    // ----------------------
    // Hook XHR & fetch
    // ----------------------
    // XHR
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        try { handleRegex(url); handleExtension(url); } catch (e) {}
        return origOpen.apply(this, [method, url, ...rest]);
    };

    // fetch
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await origFetch.apply(this, args);
        try {
            let url = args[0];
            if (url && typeof url !== 'string' && url.url) url = url.url;
            handleRegex(url);
            handleExtension(url);
        } catch (e) {}
        return response;
    };

    // Performance Observer: catches resource entries including media created by the browser
    try {
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (['xmlhttprequest', 'fetch', 'resource', 'media'].includes(entry.initiatorType || '')) {
                    // entry.name is the resource URL
                    try { handleRegex(entry.name); handleExtension(entry.name); } catch (e) {}
                }
            }
        }).observe({ type: 'resource', buffered: true });
    } catch (e) {
        // PerformanceObserver may not allow 'resource' in some browsers; ignore safely
        // console.warn('PerformanceObserver not available for resource', e);
    }

    // keep panel visible
    panel.style.display = 'block';

})();
