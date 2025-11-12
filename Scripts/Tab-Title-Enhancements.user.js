// ==UserScript==
// @name         Tab Title Enhancements
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Custom tab titles for cases and alerts on AgileBlue portal
// @author       You
// @match        https://portal.agileblue.com/apps/case/*
// @match        https://portal.agileblue.com/apps/alert/*
// @grant        none
// @run-at       document-idle
// @downloadURL  https://github.com/JLemanowicz/AgileBlue-Enhancement-Scripts/raw/refs/heads/main/Scripts/Tab-Title-Enhancements.user.js
// @updateURL    https://github.com/JLemanowicz/AgileBlue-Enhancement-Scripts/raw/refs/heads/main/Scripts/Tab-Title-Enhancements.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Alerts Tab Titles
    (function () {
        if (!window.location.href.startsWith('https://portal.agileblue.com/apps/alert/')) {
            return;
        }
        const pathParts = window.location.pathname.split('/');
        const alertNumber = pathParts[pathParts.length - 1];
        if (alertNumber && !isNaN(alertNumber)) {
            setTimeout(() => {
                const clientElement = document.querySelector('p.h1.mb-24');
                const clientName = clientElement ? clientElement.textContent.trim() : 'Unknown Client';
                document.title = `Alert ${alertNumber} - ${clientName}`;
            }, 2000); // 2-second delay
        }
    })();

    // Cases Tab Titles
    (function () {
        if (!window.location.href.startsWith('https://portal.agileblue.com/apps/case/')) {
            return;
        }
        const pathParts = window.location.pathname.split('/');
        const caseNumber = pathParts[pathParts.length - 1];
        if (!caseNumber || isNaN(caseNumber)) {
            return;
        }

        // Function to set the case title
        function setCaseTitle() {
            const clientElement = document.querySelector(
                'p.MuiTypography-root.h1.mb-24.MuiTypography-body1.MuiTypography-colorTextSecondary'
            );
            if (clientElement) {
                const clientName = clientElement.textContent.trim() || 'Unknown Client';
                document.title = `Case ${caseNumber} - ${clientName}`;
                return true;
            }
            return false;
        }

        // Try immediately
        if (setCaseTitle()) {
            return;
        }

        // Retry mechanism.
        // Necessary when cases with thousands of alerts load.
        let attempts = 0;
        const maxAttempts = 80; // ~20 seconds (80 * 250ms)
        const retryInterval = setInterval(() => {
            attempts++;
            if (setCaseTitle()) {
                clearInterval(retryInterval);
            } else if (attempts >= maxAttempts) {
                document.title = `Case ${caseNumber} - Unknown Client`;
                clearInterval(retryInterval);
            }
        }, 250);

        // Fallback: Use MutationObserver for dynamically added content
        const observer = new MutationObserver(() => {
            if (setCaseTitle()) {
                observer.disconnect();
                clearInterval(retryInterval);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    })();
})();
