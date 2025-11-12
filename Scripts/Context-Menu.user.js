// ==UserScript==
// @name         Context Menu
// @namespace    http://tampermonkey.net/
// @version      0.12
// @description  Adds a styled context menu to analyze IPs (IPv4/IPv6), SHA256 hashes, or Elastic Log IDs.
// @             Highlight and right-click any IP, SHA256, or Elastic Log ID.
// @author       Jacob Lemanowicz
// @match        *://*/*
// @grant        GM_openInTab
// @grant        GM_addStyle
// @downloadURL  https://github.com/JLemanowicz/AgileBlue-Enhancement-Scripts/raw/refs/heads/main/Scripts/Context-Menu.user.js
// @updateURL    https://github.com/JLemanowicz/AgileBlue-Enhancement-Scripts/raw/refs/heads/main/Scripts/Context-Menu.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Add CSS styles for the context menu
    GM_addStyle(`
        #analyzer-menu {
            position: absolute;
            background-color: #011627;
            border: 1px solid #19AFD2;
            color: #19AFD2;
            border-radius: 4px;
            box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
            z-index: 10001;
            padding: 5px 0;
            display: none;
            font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 1.2rem;
        }
        .analyzer-menu-item {
            padding: 7.5px 15px;
            cursor: pointer;
            color: #19AFD2;
        }
        .analyzer-menu-item:hover {
            background-color: #022c43;
        }
    `);

    // Regular expressions for IPv4, IPv6, SHA256, and Elastic Log ID
    const ipv4Regex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
    const ipv6Regex = /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}(?::[0-9a-fA-F]{1,4}){0,6}\b/;
    const sha256Regex = /\b[0-9a-fA-F]{64}\b/;
    const elasticIdRegex = /\b[a-zA-Z0-9+/=_-]{20,50}\b/;

    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.id = 'analyzer-menu';
    const analyzeItem = document.createElement('div');
    analyzeItem.textContent = 'Analyze';
    analyzeItem.className = 'analyzer-menu-item';
    const idLookupItem = document.createElement('div');
    idLookupItem.textContent = 'ID Lookup';
    idLookupItem.className = 'analyzer-menu-item';
    contextMenu.appendChild(analyzeItem);
    contextMenu.appendChild(idLookupItem);
    document.body.appendChild(contextMenu);

    // Function to validate input
    function isValidInput(text) {
        return ipv4Regex.test(text) || ipv6Regex.test(text) || sha256Regex.test(text) || elasticIdRegex.test(text);
    }

    // Function to get selected text or target element's text content
    function getSelectedText(event) {
        let text = window.getSelection().toString().trim();
        if (!text) {
            const target = event.target;
            const cell = target.closest('.euiDataGridRowCell');
            if (cell) {
                const valueDiv = cell.querySelector('.kbnDocViewer__value');
                if (valueDiv) {
                    text = valueDiv.textContent.trim();
                    console.log(`Fallback text from cell: ${text}`);
                }
            }
        }
        return text;
    }

    // Function to open tabs after current
    function openTabsAfterCurrent(urls) {
        urls.forEach((url, index) => {
            setTimeout(() => {
                try {
                    const tab = GM_openInTab(url, { active: false, insert: true, setParent: true });
                    if (!tab) {
                        const newTab = window.open(url, '_blank');
                        if (newTab) {
                            newTab.blur();
                            console.log(`Fallback: Successfully opened tab with window.open: ${url}`);
                        } else {
                            alert('Popup blocked. Please allow popups and try again.');
                            console.error(`Fallback failed to open tab: ${url} (possible pop-up blocker)`);
                        }
                    } else {
                        console.log(`Successfully opened tab with GM_openInTab: ${url}`);
                    }
                } catch (error) {
                    alert('Error opening tab. Please check your browser settings.');
                    console.error(`Error opening tab: ${url}, ${error.message}`);
                }
            }, index * 200);
        });
    }

    // Function to open single tab
    function openSingleTab(url) {
        try {
            const newTab = window.open(url, '_blank');
            if (newTab) {
                newTab.blur();
                console.log(`Successfully opened single tab: ${url}`);
            } else {
                alert('Popup blocked. Please allow popups for this site and try again.');
                console.error(`Failed to open single tab: ${url} (possible pop-up blocker)`);
            }
        } catch (error) {
            alert('Error opening tab. Please check your browser settings.');
            console.error(`Error opening single tab: ${url}, ${error.message}`);
        }
    }

    // Function to analyze IPs or SHA256 hashes
    function analyzeInput(input) {
        console.log(`Analyzing input: ${input}, Browser: ${navigator.userAgent}`);
        const urls = [];
        if (ipv4Regex.test(input) || ipv6Regex.test(input)) {
            urls.push(
                `https://www.virustotal.com/gui/ip-address/${input}`,
                `https://www.abuseipdb.com/check/${input}`,
                `https://ipinfo.io/${input}`
            );
        } else if (sha256Regex.test(input)) {
            urls.push(`https://www.virustotal.com/gui/file/${input}`);
        }
        if (urls.length > 0) {
            console.log(`Preparing to open ${urls.length} tabs: ${urls.join(', ')}`);
            openTabsAfterCurrent(urls);
        } else {
            console.warn(`No valid URLs generated for input: ${input}`);
        }
    }

    // Function for Elastic ID lookup
    function idLookup(input) {
        console.log(`Performing ID Lookup for: ${input}`);
        const encodedId = encodeURIComponent(input);
        const url = `https://siem.agileblue.com/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now%2Fd,to:now%2Fd))&_a=(columns:!(),dataSource:(dataViewId:'9079f5b2-b472-46f0-ba7e-fe1f7fddf607',type:dataView),filters:!(),hideChart:!f,interval:auto,query:(language:kuery,query:'_id:${encodedId}'),sort:!(!('@timestamp',desc)))`;
        openSingleTab(url);
    }

    // Show/hide context menu
    function showContextMenu(x, y, input, event) {
        console.log(`Showing menu at (${x}, ${y}) for input: ${input}`);
        const flyout = event.target.closest('.euiFlyout');
        if (flyout) {
            flyout.appendChild(contextMenu);
            const flyoutRect = flyout.getBoundingClientRect();
            const scrollX = flyout.scrollLeft || 0;
            const scrollY = flyout.scrollTop || 0;
            contextMenu.style.left = `${x - flyoutRect.left + scrollX}px`;
            contextMenu.style.top = `${y - flyoutRect.top + scrollY}px`;
        } else {
            document.body.appendChild(contextMenu);
            contextMenu.style.left = `${x}px`;
            contextMenu.style.top = `${y}px`;
        }
        contextMenu.style.display = 'block';
        analyzeItem.style.display = (ipv4Regex.test(input) || ipv6Regex.test(input) || sha256Regex.test(input)) ? 'block' : 'none';
        idLookupItem.style.display = elasticIdRegex.test(input) ? 'block' : 'none';
        analyzeItem.onclick = () => {
            analyzeInput(input);
            contextMenu.style.display = 'none';
        };
        idLookupItem.onclick = () => {
            idLookup(input);
            contextMenu.style.display = 'none';
        };
    }

    // Hide context menu on click elsewhere
    document.addEventListener('click', () => {
        console.log('Hiding context menu');
        contextMenu.style.display = 'none';
    });

    // Handle right-click
    document.addEventListener('contextmenu', (e) => {
        const selectedText = getSelectedText(e);
        console.log(`Right-click detected, selected text: ${selectedText}`);
        if (isValidInput(selectedText)) {
            e.preventDefault();
            e.stopPropagation();
            if (contextMenu.style.display !== 'block') {
                showContextMenu(e.pageX, e.pageY, selectedText, e);
            }
        } else {
            console.warn(`Invalid input for context menu: ${selectedText}`);
        }
    }, { capture: true, passive: false });
})();
