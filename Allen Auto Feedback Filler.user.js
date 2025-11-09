// ==UserScript==
// @name         Allen Auto Feedback Filler (Final Dynamic Fix)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Auto-selects emoji, waits dynamically, fills feedback, and submits on allen.in with Alt+Shift+E
// @author       Afeef
// @match        *://*.allen.in/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const log = (msg) => console.log("💬 [AllenAuto]:", msg);

    // helper: click element if found
    function clickIfFound(el, label) {
        if (el) {
            el.click();
            log(`✅ Clicked: ${label}`);
            return true;
        }
        log(`⚠️ Not found: ${label}`);
        return false;
    }

    // helper: wait for element containing text
    function waitForText(text, callback, timeout = 8000) {
        const observer = new MutationObserver(() => {
            const el = [...document.querySelectorAll("span")].find(e =>
                e.textContent.includes(text)
            );
            if (el) {
                observer.disconnect();
                callback(el);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), timeout);
    }

    function autoFeedback() {
        log("🚀 Starting feedback auto-fill...");

        // Step 1: click emoji
        const emojiImgURL = "https://res.cloudinary.com/dpzpn3dkw/image/upload/w_100,f_auto,q_20/v1743578420/e89yaobdvjhyocon6wqs.webp";
        const emojiButton = document.querySelector(`button img[src="${emojiImgURL}"]`);
        if (!emojiButton) return log("❌ Emoji not found");
        emojiButton.closest("button").click();
        log("✅ Emoji rating selected");

        // Step 2: wait for "Class was interesting"
        waitForText("Class was interesting", (span1) => {
            clickIfFound(span1, "Class was interesting, thanks to teacher");

            // Also click “All the concepts were clearly understood”
            const span2 = [...document.querySelectorAll("span")].find(e =>
                e.textContent.includes("All the concepts were clearly understood")
            );
            clickIfFound(span2, "All the concepts were clearly understood");

            // Step 3: click Next/Continue button
            setTimeout(() => {
                const continueBtn = [...document.querySelectorAll('button[data-testid="dls-button"]')]
                    .find(btn => {
                        const txt = btn.textContent.trim().toLowerCase();
                        return txt.includes("next") || txt.includes("continue");
                    });
                clickIfFound(continueBtn, "Next / Continue");

                // Step 4: wait for "Did not face any technical issues"
                waitForText("Did not face any technical issues", (span3) => {
                    clickIfFound(span3, "Did not face any technical issues");

                    // Step 5: click Submit button
                    setTimeout(() => {
                        const submitBtn = [...document.querySelectorAll('button[data-testid="dls-button"]')]
                            .find(btn => btn.textContent.trim().toLowerCase().includes("submit"));
                        clickIfFound(submitBtn, "Submit");
                    }, 700);
                });
            }, 700);
        });
    }

    // Hotkey → Alt + Shift + E
    document.addEventListener("keydown", (e) => {
        if (e.altKey && e.shiftKey && e.code === "KeyE") {
            e.preventDefault();
            autoFeedback();
        }
    });

    log("⚡ Script loaded! Press Alt + Shift + E to auto-fill feedback.");
})();
