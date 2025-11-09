// ==UserScript==
// @name         YouTube Real Playable URL Extractor
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Capture real YouTube video/audio URLs from network requests and show them in alert, console, and textarea popup
// @author       Afeef
// @match        https://www.youtube.com/watch*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let capturedUrls = new Set();

    // Override fetch to intercept YouTube videoplayback URLs
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);

        try {
            const url = args[0];
            if (typeof url === 'string' && url.includes('videoplayback')) {
                capturedUrls.add(url);
                showPopup(Array.from(capturedUrls));
            }
        } catch (e) {
            console.error('Error capturing URL', e);
        }

        return response;
    };

    // Override XMLHttpRequest to catch old XHRs
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        if (url.includes('videoplayback')) {
            capturedUrls.add(url);
            showPopup(Array.from(capturedUrls));
        }
        return originalOpen.call(this, method, url, ...rest);
    };

    function showPopup(urls) {
        if (urls.length === 0) return;

        // Remove existing popup if any
        let existing = document.getElementById('yt-url-popup');
        if (existing) existing.remove();

        let popup = document.createElement('textarea');
        popup.id = 'yt-url-popup';
        popup.style.position = 'fixed';
        popup.style.top = '20px';
        popup.style.left = '20px';
        popup.style.width = '90%';
        popup.style.height = '200px';
        popup.style.zIndex = 9999;
        popup.style.fontSize = '12px';
        popup.value = urls.join('\n');
        document.body.appendChild(popup);
        popup.select();

        // log and alert only once
        if (!popup.dataset.logged) {
            console.log("Playable URLs:\n" + urls.join("\n"));
            alert("Playable URLs:\n\n" + urls.join("\n\n"));
            popup.dataset.logged = "true";
        }
    }

})();
