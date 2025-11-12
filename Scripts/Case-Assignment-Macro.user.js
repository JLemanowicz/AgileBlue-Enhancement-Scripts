// ==UserScript==
// @name         Case Assignment Macro
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Assign a case to yourself with a button click, hidden if already assigned to you.
// @author       Jacob Lemanowicz
// @match        https://portal.agileblue.com/apps/case/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Function to find user name with retry
    function findUserName(callback) {
        console.log('Starting user name search at', new Date().toISOString());
        let attempts = 0;
        const maxAttempts = 20; // ~10 seconds
        const checkInterval = setInterval(() => {
            attempts++;
            console.log(`Checking for user name element, attempt ${attempts} at`, new Date().toISOString());
            const userNameElement = document.querySelector('p.username');
            if (userNameElement) {
                console.log('User name element found');
                clearInterval(checkInterval);
                callback(userNameElement);
            } else if (attempts >= maxAttempts) {
                console.error('Max attempts reached, user name element not found. Selector used: p.username');
                clearInterval(checkInterval);
                alert('Error: User name element not found after 10 seconds.');
            }
        }, 500);
    }

    // Process user name and continue script
    findUserName((userNameElement) => {
        const fullName = userNameElement.textContent.trim();
        console.log('Found full name:', fullName);

        const nameParts = fullName.split(' ');
        console.log('Name parts:', nameParts);
        if (nameParts.length < 2) {
            console.error('Unable to parse user name. Expected at least two parts, got:', nameParts);
            return;
        }
        const abbreviatedName = `${nameParts[0][0]}. ${nameParts[1]}`;
        console.log('Constructed abbreviated name:', abbreviatedName);

        // Function to assign the case
        function assignCase() {
            console.log('Starting case assignment for', abbreviatedName, 'at', new Date().toISOString());

            // Step 1: Click "Add Narrative" button
            const addNarrativeBtn = document.querySelector('button.MuiButton-outlinedSecondary');
            if (!addNarrativeBtn) {
                console.error('Add Narrative button not found. Selector used: button.MuiButton-outlinedSecondary');
                alert('Error: Add Narrative button not found.');
                return;
            }
            addNarrativeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            console.log('Add Narrative button clicked');

            // Step 2: Wait for form elements to load
            let attempts = 0;
            const maxAttempts = 20; // ~10 seconds
            const formCheckInterval = setInterval(() => {
                attempts++;
                console.log(`Checking form elements, attempt ${attempts} at`, new Date().toISOString());

                // Step 3: Find form elements
                const textBox = document.querySelector('textarea[name="Notes"]');
                const statusLabel = document.querySelector('label[for="Status"]');
                const dropdown = statusLabel?.closest('div.MuiFormControl-root')?.querySelector('div.MuiSelect-select[role="button"][aria-haspopup="listbox"]');
                const submitButton = document.querySelector('button[aria-label="Save"]');

                console.log('Form elements status:', {
                    textBox: !!textBox,
                    statusLabel: !!statusLabel,
                    dropdown: !!dropdown,
                    submitButton: !!submitButton
                });

                if (textBox && dropdown && submitButton) {
                    // Clear interval once elements are found
                    clearInterval(formCheckInterval);

                    // Step 4: Fill text box and update React state
                    try {
                        const setValue = (element, value) => {
                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                            const inputEvent = new Event('input', { bubbles: true });
                            const changeEvent = new Event('change', { bubbles: true });
                            nativeInputValueSetter.call(element, value);
                            element.dispatchEvent(inputEvent);
                            element.dispatchEvent(changeEvent);
                            element.dispatchEvent(new Event('focus', { bubbles: true }));
                            element.dispatchEvent(new Event('blur', { bubbles: true }));
                        };
                        setValue(textBox, 'Assigned and beginning investigation.');
                        console.log('Text box filled with "Assigned and beginning investigation"');
                    } catch (error) {
                        console.error('Error setting text box value:', error);
                        alert('Error: Failed to set Notes field.');
                        return;
                    }

                    // Step 5: Open dropdown and select "Investigating"
                    dropdown.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                    dropdown.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    console.log('Dropdown opened');

                    // Wait for menu to appear
                    setTimeout(() => {
                        const investigatingOption = document.querySelector('li.MuiMenuItem-root[data-value="Investigating"]');
                        if (investigatingOption) {
                            investigatingOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                            console.log('Dropdown set to Investigating');
                        } else {
                            console.error('Investigating option not found. Selector used: li.MuiMenuItem-root[data-value="Investigating"]');
                            alert('Error: Investigating option not found in dropdown.');
                            return;
                        }

                        // Step 6: Click submit button
                        setTimeout(() => {
                            submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                            console.log('Save Narrative button clicked');
                        }, 500); // Small delay to ensure form state updates
                    }, 1000); // Delay for menu to render
                } else if (attempts >= maxAttempts) {
                    console.error('Max attempts reached, form elements not found:', {
                        textBox: !!textBox,
                        dropdown: !!dropdown,
                        submitButton: !!submitButton
                    });
                    clearInterval(formCheckInterval);
                    alert('Error: Form elements (text box, dropdown, or submit button) not found after 10 seconds.');
                }
            }, 500);
        }

        // Add a floating button to the page
        console.log('Adding floating button at', new Date().toISOString());
        GM_addStyle(`
            #assignCaseButton {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
                padding: 7.5px 15px;
                background-color: #011627;
                border: 1px solid #19AFD2;
                color: #19AFD2;
                border-radius: 4px;
                cursor: pointer;
                font-size: 1.6rem;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            #assignCaseButton:hover {
                background-color: #022c43;
                color: #19AFD2;
            }
            #assignCaseButton.hidden {
                display: none;
            }
            #assignCaseButton svg {
                width: 16px;
                height: 16px;
                fill: #19AFD2;
            }
        `);

        const button = document.createElement('button');
        button.id = 'assignCaseButton';
        button.innerHTML = `
            <svg class="MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path>
            </svg>
            Assign Case to Me
        `;
        button.addEventListener('click', assignCase);
        document.body.appendChild(button);
        console.log('Button appended to document body');

        // Function to check assignment and toggle button visibility
        function toggleButtonVisibility() {
            console.log('Checking button visibility at', new Date().toISOString());
            const assignmentInput = document.querySelector('input.MuiFilledInput-input');
            console.log('Assignment input found:', !!assignmentInput, 'Value:', assignmentInput?.value);
            const isAssignedToMe = assignmentInput && assignmentInput.value === abbreviatedName;
            console.log('Is case assigned to user?', isAssignedToMe, 'Expected name:', abbreviatedName);
            if (isAssignedToMe) {
                button.classList.add('hidden');
                console.log(`Case assigned to ${abbreviatedName}, hiding button`);
            } else {
                button.classList.remove('hidden');
                console.log(`Case not assigned to ${abbreviatedName}, showing button`);
            }
        }

        // Run initially
        console.log('Running initial button visibility check');
        toggleButtonVisibility();

        // Monitor for dynamic changes (e.g., single-page app navigation)
        const observer = new MutationObserver(() => {
            console.log('DOM change detected, checking button visibility at', new Date().toISOString());
            toggleButtonVisibility();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
        console.log('Mutation observer set up');

        // Re-check on navigation (for single-page apps)
        window.addEventListener('popstate', () => {
            console.log('Navigation detected, checking button visibility at', new Date().toISOString());
            toggleButtonVisibility();
        });
        console.log('Popstate event listener added');
    });
})();