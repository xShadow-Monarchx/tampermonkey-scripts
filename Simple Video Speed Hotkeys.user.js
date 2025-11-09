// ==UserScript==
// @name         Simple Video Speed Hotkeys (Alt + [ / ])
// @namespace    https://example.com/
// @version      1.1
// @description  Change playback speed with Alt+[ and Alt+] using document.querySelector('video')
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    const STEP = 0.25;
    const MIN = 0.25;
    const MAX = 6.0;

    document.addEventListener('keydown', e => {
        // ignore typing or modifier combinations
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
        if (!e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;

        const vid = document.querySelector('video');
        if (!vid) return;

        if (e.key === ']') {
            e.preventDefault();
            vid.playbackRate = Math.min(MAX, +(vid.playbackRate + STEP).toFixed(2));
        } else if (e.key === '[') {
            e.preventDefault();
            vid.playbackRate = Math.max(MIN, +(vid.playbackRate - STEP).toFixed(2));
        }
    });
})();
