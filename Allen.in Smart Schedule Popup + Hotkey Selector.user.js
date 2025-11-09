// ==UserScript==
// @name         Allen.in Smart Schedule Popup + Hotkey Selector (v5.0)
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Alt+Z = hotkeys; Alt+Shift+Z = smart daily schedule popup with live clock, polished layout, ongoing & break highlight (gradient), manual menu preserved, click-outside closes, auto-refresh every 10s
// @author       Afeef
// @match        https://allen.in/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ===================== HOTKEY SELECTOR =====================
    let hotkeyMode = false;
    let indicator;

    function createIndicator() {
        indicator = document.createElement('div');
        Object.assign(indicator.style, {
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            padding: '8px 14px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: '14px',
            borderRadius: '8px',
            zIndex: 999999,
        });
        indicator.textContent = 'Hotkeys OFF';
        document.body.appendChild(indicator);
    }

    function updateIndicator() {
        if (!indicator) createIndicator();
        indicator.style.background = hotkeyMode ? 'rgba(0,150,0,0.8)' : 'rgba(0,0,0,0.6)';
        indicator.textContent = hotkeyMode ? 'Hotkeys ON' : 'Hotkeys OFF';
    }

    function isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;
    }

    function triggerClick(el) {
        ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(ev =>
            el.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true, view: window }))
        );
    }

    function findSubmitButton() {
        const elements = document.querySelectorAll('button, input[type="button"], input[type="submit"], a');
        for (const el of elements) {
            const text = (el.textContent || el.value || '').trim().toLowerCase();
            if (text === 'submit' && isVisible(el)) return el;
        }
        const fallback = document.querySelector('button[class*="w-full"][class*="rounded-full"]');
        return (fallback && isVisible(fallback)) ? fallback : null;
    }

    function findDivByNumber(num) {
        const all = document.querySelectorAll('div[class*="flex"][class*="items-center"] span');
        for (const span of all) {
            const text = span.textContent.trim().toLowerCase();
            if (
                text === num.toLowerCase() ||
                text === num.padStart(2, '0').toLowerCase() ||
                (num === '1' && text === 'yes') ||
                (num === '2' && text === 'no')
            ) {
                let div = span.closest('div.relative') || span.closest('div.flex') || span.closest('div');
                if (div) return div;
            }
        }
        return null;
    }

    window.addEventListener('keydown', e => {
        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            hotkeyMode = !hotkeyMode;
            updateIndicator();
        }
    });

    window.addEventListener('keydown', e => {
        if (!hotkeyMode) return;
        if (['1', '2', '3', '4', '5'].includes(e.key)) {
            e.preventDefault();
            const div = findDivByNumber(e.key.padStart(2, '0'));
            if (div) {
                triggerClick(div);
                setTimeout(() => {
                    const submitBtn = findSubmitButton();
                    if (submitBtn) triggerClick(submitBtn);
                }, 0);
            }
        }
    });

    // ===================== SCHEDULE / POPUP =====================
    const schedules = {
        ncert: [
            ["Doubt Class", "05:00 PM", "05:45 PM"],
            ["First Class", "05:55 PM", "06:40 PM"],
            ["Second Class", "06:50 PM", "07:35 PM"],
            ["Third Class", "07:45 PM", "08:30 PM"],
        ],
        neetSat: [
            ["Optional Doubt Class", "04:10 PM", "04:50 PM"],
            ["Doubt Class", "05:00 PM", "05:45 PM"],
            ["First Class", "05:55 PM", "06:40 PM"],
            ["Second Class", "06:50 PM", "07:35 PM"],
            ["Third Class", "07:45 PM", "08:30 PM"],
        ],
        sunday: [
            ["First Class", "09:00 AM", "09:55 AM"],
            ["Second Class", "10:05 AM", "11:00 AM"],
            ["Third Class", "11:10 AM", "12:05 PM"],
            ["Fourth Class", "12:15 PM", "01:10 PM"],
            ["Optional Doubt Class", "01:40 PM", "02:25 PM"],
        ]
    };

    let popup = null;
    let scheduleType = 'auto';   // 'auto' or 'ncert' or 'neetSun' etc.
    let manualSelection = false; // true when user manually chooses a schedule

    // Convert "05:45 PM" → total minutes since midnight
    function timeToMinutes(str) {
        if (!str) return 0;
        const parts = str.trim().split(' ');
        if (parts.length < 2) return 0;
        const [time, meridian] = parts;
        let [h, m] = time.split(':').map(Number);
        const mer = meridian.toLowerCase();
        if (mer === 'pm' && h !== 12) h += 12;
        if (mer === 'am' && h === 12) h = 0;
        return h * 60 + m;
    }

    // Determine which schedule to show by day (auto-detect)
    function detectAutoSchedule() {
        const date = new Date();
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        if (["Monday", "Wednesday"].includes(dayName)) {
            return 'holiday';
        } else if (["Tuesday", "Thursday", "Friday"].includes(dayName)) {
            return 'ncert';
        } else if (dayName === 'Saturday') {
            return 'neetSat';
        } else if (dayName === 'Sunday') {
            return 'sunday';
        }
        return 'ncert';
    }

    // Analyze schedule: returns object with ongoingIndex or breakIndex
    // applyHighlights = boolean -> whether to consider highlighting/break (only true in auto)
    function analyzeSchedule(sch, applyHighlights = true) {
        if (!sch || !sch.length) return { type: 'none', index: -1, nextStart: null };
        if (!applyHighlights) return { type: 'none', index: -1, nextStart: null };

        const now = new Date();
        const current = now.getHours() * 60 + now.getMinutes();

        for (let i = 0; i < sch.length; i++) {
            const [, startStr, endStr] = sch[i];
            const s = timeToMinutes(startStr);
            const e = timeToMinutes(endStr);
            if (current >= s && current <= e) {
                return { type: 'ongoing', index: i, nextStart: null };
            }
            // if between this end and next start -> break
            if (i < sch.length - 1) {
                const nextStart = timeToMinutes(sch[i + 1][1]);
                if (current > e && current < nextStart) {
                    return { type: 'break', index: i, nextStart: nextStart };
                }
            }
        }
        return { type: 'none', index: -1, nextStart: null };
    }

    // determine if page is dark or light by background brightness
    function isDarkTheme() {
        try {
            const bg = window.getComputedStyle(document.body).backgroundColor || '';
            // parse rgb/rgba
            const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (m) {
                const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
                // luminance
                const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                return lum < 128;
            }
        } catch (e) { /* ignore */ }
        // fallback to prefers-color-scheme
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // create popup DOM once
    function createSchedulePopup() {
        if (popup) return;
        popup = document.createElement('div');
        popup.id = 'allenSchedulePopup';
        Object.assign(popup.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '18px 20px',
            borderRadius: '12px',
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: '14px',
            zIndex: 999999,
            width: '440px',
            maxWidth: '90%',
            boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
            backdropFilter: 'blur(6px)',
        });
        popup.innerHTML = generateScheduleHTML(scheduleType);
        document.body.appendChild(popup);

        // close on outside click (mousedown better for responsiveness)
        document.addEventListener('mousedown', onDocMouseDown);
    }

    function onDocMouseDown(e) {
        if (!popup) return;
        if (!popup.contains(e.target)) {
            // don't close if clicking the hotkey indicator or its children
            if (indicator && indicator.contains && indicator.contains(e.target)) return;
            // close popup
            popup.style.display = 'none';
            // hide menu if shown
            const menu = document.getElementById('scheduleMenu');
            if (menu) menu.style.display = 'none';
        }
    }

    // build HTML string; applyHighlightOnly when scheduleType === 'auto' AND not in manualSelection viewing other schedule
    function generateScheduleHTML(forceType) {
        // allow forcing scheduleType when called via menu
        if (forceType) scheduleType = forceType;

        // pick schedule array and title
        const date = new Date();
        const day = date.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' });
        const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let sch = [];
        let title = '';

        if (scheduleType === 'holiday') {
            title = 'Holiday 🎉';
        } else if (scheduleType === 'ncert' || scheduleType === 'ncert') {
            title = 'NCERT Allen Course Classes';
            sch = schedules.ncert;
        } else if (scheduleType === 'neetSat') {
            title = 'NEET Class Allen (Saturday)';
            sch = schedules.neetSat;
        } else if (scheduleType === 'sunday') {
            title = 'NEET Sunday Classes';
            sch = schedules.sunday;
        } else if (scheduleType === 'ncert') {
            title = 'NCERT Allen Course Classes';
            sch = schedules.ncert;
        }

        // decide whether to apply highlight/break detection
        // applyHighlights only when scheduleType === 'auto' (i.e., the day-detected value) and user hasn't manually selected another schedule
        const autoScheduleName = detectAutoSchedule();
        const currentlyAutoView = (!manualSelection && scheduleType === autoScheduleName) || (scheduleType === 'auto' && !manualSelection);
        // To simplify, interpret scheduleType === autoScheduleName as auto-mode
        const applyHighlights = (scheduleType === autoScheduleName) && !manualSelection;

        // If scheduleType was set to 'auto' string somewhere, convert it to detected schedule
        if (scheduleType === 'auto') {
            scheduleType = autoScheduleName;
            // sch/title updated
            if (scheduleType === 'holiday') title = 'Holiday 🎉';
            else if (scheduleType === 'ncert') { title = 'NCERT Allen Course Classes'; sch = schedules.ncert; }
            else if (scheduleType === 'neetSat') { title = 'NEET Class Allen (Saturday)'; sch = schedules.neetSat; }
            else if (scheduleType === 'sunday') { title = 'NEET Sunday Classes'; sch = schedules.sunday; }
        }

        const analysis = analyzeSchedule(sch, applyHighlights);
        const dark = isDarkTheme();

        // color scheme based on theme
        const bg = dark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)';
        const textColor = dark ? 'white' : '#111';
        const subtle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

        // table rows building
        if (!sch || !sch.length) {
            const emptyTable = `<p style="text-align:center;opacity:0.8;color:${textColor};">No classes today</p>`;
            return `
                <div style="display:flex;justify-content:center;align-items:center;margin-bottom:6px;position:relative;">
                    <div style="font-weight:600;font-size:16px;text-align:center;flex:1;color:${textColor};">${title}</div>
                </div>
                <div style="text-align:center;font-size:12px;opacity:0.7;color:${textColor};">${day} | <span id="allenClock">${time}</span></div>
                ${emptyTable}
            `;
        }

        // Build rows with optional break insertion
        const rows = [];
        for (let i = 0; i < sch.length; i++) {
            const [c, s, e] = sch[i];
            const isNow = (analysis.type === 'ongoing' && analysis.index === i);
            // only show highlight if applyHighlights true (auto mode)
            const highlightStyle = isNow ? 'background:linear-gradient(90deg,#004e92,#000428);color:#fff;font-weight:600;box-shadow:0 0 10px rgba(0,180,255,0.38);' : '';
            rows.push(`
                <tr style="${highlightStyle}">
                    <td style="padding:8px 10px;color:${textColor};">${c.includes('Optional') ? `<span style="color:#ffcc00">${c}</span>` : c}</td>
                    <td style="padding:8px 10px;text-align:right;opacity:0.95;color:${textColor};">${s} - ${e}</td>
                </tr>
            `);
            // insert break row if analysis.type === 'break' and index === i
            if (analysis.type === 'break' && analysis.index === i) {
                // compute minutes remaining until nextStart
                const nowMinutes = (new Date()).getHours() * 60 + (new Date()).getMinutes();
                const remainingMins = Math.max(0, Math.ceil((analysis.nextStart - nowMinutes)));
                const remText = remainingMins > 0 ? `${remainingMins} mins remaining` : 'Less than 1 min';
                // break row uses same gradient style (as requested)
                rows.push(`
                    <tr style="background:linear-gradient(90deg,#004e92,#000428);color:#fff;font-weight:600;box-shadow:0 0 10px rgba(0,180,255,0.38);">
                        <td colspan="2" style="padding:8px 10px;text-align:center;">Break — ${remText}</td>
                    </tr>
                `);
            }
        }

        // menu button remains; user can manually select schedules. We'll keep manualSelection flag true when user clicks a manual schedule, preventing auto from overriding.
        const header = `
            <div style="display:flex;justify-content:center;align-items:center;margin-bottom:6px;position:relative;">
                <div style="font-weight:600;font-size:16px;text-align:center;flex:1;color:${textColor};">${title}</div>
                <div style="position:absolute;right:0;">
                    ${scheduleType !== autoScheduleName ? `<div id="backBtn" style="cursor:pointer;color:#4cc2ff;font-size:13px;">← Back</div>` : ''}
                </div>
            </div>
        `;

        const menuBtn = `<div style="text-align:right;margin-top:8px;"><div id="menuToggle" style="cursor:pointer;font-size:20px;opacity:0.9;">☰</div></div>`;
        const menuOptions = `
            <div id="scheduleMenu" style="display:none;position:absolute;bottom:62px;right:18px;background:${dark ? '#111' : '#fff'};color:${dark ? '#fff' : '#111'};border:1px solid ${dark ? '#333' : '#ddd'};border-radius:8px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.2);">
                <button data-type="ncert" style="background:none;border:none;padding:10px 14px;width:200px;text-align:left;cursor:pointer;">NCERT Schedule</button>
                <button data-type="neetSat" style="background:none;border:none;padding:10px 14px;width:200px;text-align:left;cursor:pointer;">NEET (Saturday)</button>
                <button data-type="sunday" style="background:none;border:none;padding:10px 14px;width:200px;text-align:left;cursor:pointer;">Sunday Schedule</button>
            </div>
        `;

        // final html
        const html = `
            <style>
                #allenSchedulePopup table { width:100%; border-collapse:collapse; margin-top:8px; }
                #allenSchedulePopup td { border-radius:4px; }
            </style>
            ${header}
            <div style="text-align:center;font-size:12px;opacity:0.85;color:${textColor};">${day} | <span id="allenClock">${time}</span></div>
            <table>
                ${rows.join('')}
            </table>
            ${menuBtn}
            ${menuOptions}
        `;
        return html;
    }

    // Update popup innerHTML safely while preserving popup DOM element
    function refreshPopup() {
        if (!popup) return;
        // store menu display state and whether it's open
        const menu = document.getElementById('scheduleMenu');
        const menuOpen = menu && menu.style.display === 'block';

        popup.innerHTML = generateScheduleHTML(scheduleType);

        // restore menu state if needed
        const newMenu = document.getElementById('scheduleMenu');
        if (newMenu) newMenu.style.display = menuOpen ? 'block' : 'none';

        // reattach event handlers for menu and back button
        attachPopupListeners();
        // ensure popup visible
        popup.style.display = 'block';
    }

    // attach listeners for clicks inside popup (menu toggle, schedule buttons, back button)
    function attachPopupListeners() {
        if (!popup) return;

        // Menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.onclick = (ev) => {
                ev.stopPropagation();
                const menu = document.getElementById('scheduleMenu');
                if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            };
        }

        // Menu schedule buttons
        const menu = document.getElementById('scheduleMenu');
        if (menu) {
            const buttons = menu.querySelectorAll('[data-type]');
            buttons.forEach(btn => {
                btn.onclick = (ev) => {
                    ev.stopPropagation();
                    const type = btn.getAttribute('data-type');
                    // set scheduleType appropriately and mark manualSelection true
                    scheduleType = type;
                    manualSelection = true;
                    // close menu and refresh
                    menu.style.display = 'none';
                    refreshPopup();
                };
            });
        }

        // Back button (go back to auto)
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.onclick = (ev) => {
                ev.stopPropagation();
                manualSelection = false;
                scheduleType = detectAutoSchedule();
                refreshPopup();
            };
        }
    }

    // start live clock and periodic schedule refresh
    let clockInterval = null;
    let refreshInterval = null;

    function startUpdaters() {
        if (clockInterval) clearInterval(clockInterval);
        clockInterval = setInterval(() => {
            const clock = document.getElementById('allenClock');
            if (clock) {
                clock.textContent = new Date().toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
            }
        }, 1000);

        // refresh schedule every 10 seconds, but lightweight: only refresh popup when visible.
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            if (!popup) return;
            if (popup.style.display === 'none') return;
            // Only update content; do not overwrite manualSelection or scheduleType
            // If manualSelection true and viewing a non-auto schedule, highlights/breaks are suppressed via generateScheduleHTML
            refreshPopup();
        }, 10000); // 10s
    }

    function updateScheduleDisplay(forceType) {
        // if forceType === 'auto', we interpret as detect auto schedule
        if (forceType === 'auto' || !forceType) {
            scheduleType = detectAutoSchedule();
            manualSelection = false;
        } else {
            scheduleType = forceType;
            manualSelection = true;
        }
        if (!popup) createSchedulePopup();
        refreshPopup();
        popup.style.display = 'block';
        startUpdaters();
    }

    // Global key: Alt+Shift+Z toggles popup
    window.addEventListener('keydown', e => {
        if (e.altKey && e.shiftKey && !e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (!popup || popup.style.display === 'none') {
                updateScheduleDisplay('auto');
            } else {
                popup.style.display = 'none';
            }
        }
    });

    // When page loads, create indicator and initial small preparations
    (function init() {
        createIndicator();
        // create popup but keep hidden until toggled
        createSchedulePopup();
        popup.style.display = 'none';
        // attach listeners (menu/back)
        attachPopupListeners();
        startUpdaters();
    })();

    // Attach listeners for popup's inner elements each time it's created/refreshed
    function attachPopupListeners() {
        // already declared above, re-declare to ensure function hoisting not a problem
        if (!popup) return;

        // Menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.onclick = (ev) => {
                ev.stopPropagation();
                const menu = document.getElementById('scheduleMenu');
                if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            };
        }

        // Menu schedule buttons
        const menu = document.getElementById('scheduleMenu');
        if (menu) {
            const buttons = menu.querySelectorAll('[data-type]');
            buttons.forEach(btn => {
                btn.onclick = (ev) => {
                    ev.stopPropagation();
                    const type = btn.getAttribute('data-type');
                    scheduleType = type;
                    manualSelection = true;
                    menu.style.display = 'none';
                    refreshPopup();
                };
            });
        }

        // Back button
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.onclick = (ev) => {
                ev.stopPropagation();
                manualSelection = false;
                scheduleType = detectAutoSchedule();
                refreshPopup();
            };
        }
    }

    console.log("%c[Allen Smart Schedule Ready — v5.0 ✅]", "color:lightgreen;font-weight:bold;");
})();
