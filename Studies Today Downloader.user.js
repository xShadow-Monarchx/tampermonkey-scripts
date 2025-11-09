// ==UserScript==
// @name         StudiesToday Securefile Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Convert securefile divs to clickable download links on StudiesToday
// @author       Afeef
// @match        *://www.studiestoday.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Find all divs with class PDFFlip
    const pdfDivs = document.querySelectorAll('div.PDFFlip');

    pdfDivs.forEach(div => {
        const source = div.getAttribute('source');
        if (source && source.startsWith('/securefile/')) {
            const fullLink = 'https://www.studiestoday.com' + source;

            // Create a clickable link
            const link = document.createElement('a');
            link.href = fullLink;
            link.textContent = 'Download PDF';
            link.target = '_blank';
            link.style.display = 'block';
            link.style.marginTop = '5px';
            link.style.color = 'blue';
            link.style.fontWeight = 'bold';

            // Insert the link right after the div
            div.insertAdjacentElement('afterend', link);
        }
    });
})();
