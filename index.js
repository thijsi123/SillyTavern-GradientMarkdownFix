/**
 * Gradient Markdown Fix for SillyTavern
 * Shows gradient coloring on unclosed markdown to indicate what would be auto-fixed
 * Works WITHOUT the built-in Auto-fix Markdown enabled
 */

// Extension constants
const EXTENSION_NAME = 'Gradient Markdown Fix';
const EXTENSION_ID = 'SillyTavern-GradientMarkdownFix';
const SETTINGS_KEY = 'gradientMarkdownFix';

// Default settings
const defaultSettings = {
    enabled: true,
    warningColor: '#ffaa00', // Yellow/orange for warning
    useThemeColors: true,
    persistentGradient: true // Keep the gradient permanently, no animation
};

// Global state
let extensionSettings = { ...defaultSettings };

/**
 * Get extension settings from localStorage
 */
function getSettings() {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            return { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error('Failed to load gradient markdown fix settings:', error);
    }
    return { ...defaultSettings };
}

/**
 * Get theme colors from SillyTavern settings
 */
function getThemeColors() {
    try {
        // Try to get settings from localStorage
        const settings = localStorage.getItem('settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            if (parsed.power_user) {
                return {
                    quote: parsed.power_user.quote_text_color || 'rgba(225, 138, 36, 1)',
                    main: parsed.power_user.main_text_color || 'rgba(220, 220, 210, 1)',
                    italics: parsed.power_user.italics_text_color || 'rgba(145, 145, 145, 1)',
                    underline: parsed.power_user.underline_text_color || 'rgba(188, 231, 207, 1)'
                };
            }
        }
    } catch (error) {
        console.error('Failed to load theme colors:', error);
    }

    // Fallback to default colors
    return {
        quote: 'rgba(225, 138, 36, 1)',
        main: 'rgba(220, 220, 210, 1)',
        italics: 'rgba(145, 145, 145, 1)',
        underline: 'rgba(188, 231, 207, 1)'
    };
}

/**
 * Save extension settings to localStorage
 */
function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(extensionSettings));
    } catch (error) {
        console.error('Failed to save gradient markdown fix settings:', error);
    }
}

/**
 * Simulate the fixMarkdown function to detect what would be fixed
 */
function simulateFixMarkdown(text) {
    const lines = text.split('\n');
    const fixedLines = [];

    for (const line of lines) {
        const charsToCheck = ['*', '"'];
        let fixedLine = line;

        for (const char of charsToCheck) {
            // Count occurrences of the character
            const count = (line.match(new RegExp(`\\${char}`, 'g')) || []).length;

            // If odd number, markdown is unclosed
            if (count % 2 === 1) {
                // This line has unclosed markdown
                fixedLines.push(line + char); // Show what would be added
                continue;
            }
        }

        if (fixedLine === line) {
            fixedLines.push(line); // No changes needed
        }
    }

    return fixedLines.join('\n');
}

/**
 * Apply gradient styling to markdown elements in the DOM
 */
function applyGradientToMessage(messageElement) {
    if (!extensionSettings.enabled) {
        return;
    }

    // Get the parent message element to find the raw text
    const messageContainer = messageElement.closest('.mes') || messageElement.parentElement;
    if (!messageContainer) return;

    // Find the message text container to get raw text
    const messageTextContainer = messageContainer.querySelector('.mes_text');
    if (!messageTextContainer) return;

    // Get the raw text content before markdown processing
    const rawText = messageTextContainer.textContent || '';

    // Debug: Check quote count in raw text
    const quoteCount = (rawText.match(/"/g) || []).length;
    console.log(`Gradient Markdown Fix: Quote count in raw text: ${quoteCount}, is odd: ${quoteCount % 2 === 1}`);

    // First, remove any existing gradient classes from this message
    const existingGradients = messageElement.querySelectorAll('.gradient-fixed-markdown');
    existingGradients.forEach(element => {
        element.classList.remove('gradient-fixed-markdown');
        element.classList.remove('q', 'i', 'em', 'u', 'strong', 'b');
    });

    // Track if we've applied any gradient
    let hasAppliedGradient = false;

    // Find all markdown elements
    const markdownElements = messageElement.querySelectorAll('i, em, u, strong, b, q, blockquote, code');

    console.log(`Gradient Markdown Fix: Found ${markdownElements.length} markdown elements`);
    console.log(`Raw text: "${rawText}"`);

    markdownElements.forEach(element => {
        const elementText = element.textContent || '';
        console.log(`Checking element: "${elementText}"`);

        // Check if this element represents unclosed markdown that would be fixed
        const hasUnclosedMarkdown = detectUnclosedMarkdown(rawText, elementText);

        if (hasUnclosedMarkdown) {
            console.log(`Gradient Markdown Fix: Applying gradient to unclosed markdown: "${elementText}"`);
            applyElementGradient(element);
            hasAppliedGradient = true;
        }
    });

    // Special case: If we have unclosed markdown but no matching element was found,
    // we need to find the text that should be marked as unclosed
    if (hasUnclosedMarkdownPattern(rawText) && !hasAppliedGradient) {
        console.log('Gradient Markdown Fix: Unclosed markdown detected but no matching element found');
        console.log('Gradient Markdown Fix: Looking for unclosed text at the end...');

        // Find the last text node that contains unclosed markdown
        findAndStyleUnclosedText(messageElement, rawText);
    }

    // Add CSS for the gradient styling if not already added
    if (!document.getElementById('gradient-markdown-fix-styles')) {
        addGradientStyles();
    }
}

/**
 * Detect if markdown element represents unclosed markdown that would be auto-fixed
 */
function detectUnclosedMarkdown(rawText, elementText) {
    const cleanElementText = elementText.trim();
    console.log(`  detectUnclosedMarkdown: element="${cleanElementText}"`);

    // Only check elements that have markdown formatting
    if (!/[\*_"]/.test(cleanElementText)) {
        console.log(`  - No markdown formatting found`);
        return false;
    }

    // Check if this element is the last markdown element in the message
    const isLastElement = isLastMarkdownElement(rawText, cleanElementText);
    console.log(`  - Is last element: ${isLastElement}`);

    if (!isLastElement) {
        return false; // Only highlight the last markdown element
    }

    // Check if the raw text has unclosed markdown patterns
    const hasUnclosedPattern = hasUnclosedMarkdownPattern(rawText);
    console.log(`  - Has unclosed pattern: ${hasUnclosedPattern}`);

    return hasUnclosedPattern;
}

/**
 * Check if this element is the last markdown element in the message
 */
function isLastMarkdownElement(rawText, elementText) {
    // Get the position of this element's text in the raw text
    const elementIndex = rawText.lastIndexOf(elementText);

    if (elementIndex === -1) {
        console.log(`    - Element text not found in raw text`);
        return false; // Couldn't find the element text in raw text
    }

    // Check if this element appears near the end of the message
    const textAfterElement = rawText.slice(elementIndex + elementText.length);
    const isNearEnd = textAfterElement.trim().length < 100; // Less than 100 chars after
    console.log(`    - Text after element: "${textAfterElement}" (${textAfterElement.trim().length} chars), is near end: ${isNearEnd}`);

    return isNearEnd;
}

/**
 * Check if the raw text has unclosed markdown patterns
 */
function hasUnclosedMarkdownPattern(text) {
    // Check for unclosed markdown in the entire text
    const charsToCheck = ['*', '"'];

    for (const char of charsToCheck) {
        // Count occurrences of the character in the entire text
        const count = (text.match(new RegExp(`\\${char}`, 'g')) || []).length;

        // If odd number, markdown is unclosed
        if (count % 2 === 1) {
            console.log(`Gradient Markdown Fix: Found unclosed markdown for character '${char}' (count: ${count})`);
            return true;
        }
    }

    return false;
}

/**
 * Apply gradient styling to a single element
 */
function applyElementGradient(element) {
    // Add classes for CSS styling - let CSS handle the gradient
    element.classList.add('gradient-fixed-markdown');
    element.classList.add(element.tagName.toLowerCase());
}

/**
 * Find and style unclosed text that isn't wrapped in markdown elements
 */
function findAndStyleUnclosedText(messageElement, rawText) {
    // Find the last paragraph or text container
    const paragraphs = messageElement.querySelectorAll('p');
    if (paragraphs.length === 0) return;

    const lastParagraph = paragraphs[paragraphs.length - 1];
    const paragraphHTML = lastParagraph.innerHTML;

    console.log(`Gradient Markdown Fix: Last paragraph HTML: ${paragraphHTML}`);

    // Look for text that contains unclosed quotes at the end
    const textContent = lastParagraph.textContent || '';
    const quoteCount = (textContent.match(/"/g) || []).length;

    if (quoteCount % 2 === 1) {
        console.log(`Gradient Markdown Fix: Unclosed quote detected in paragraph, count: ${quoteCount}`);

        // Find the last quote in the paragraph
        const lastQuoteIndex = textContent.lastIndexOf('"');
        if (lastQuoteIndex !== -1) {
            // Get the text after the last quote
            const textAfterLastQuote = textContent.slice(lastQuoteIndex);
            console.log(`Gradient Markdown Fix: Text after last quote: "${textAfterLastQuote}"`);

            // Wrap the unclosed quote text in a span with quote class
            const newHTML = paragraphHTML.replace(
                textAfterLastQuote,
                `<span class="gradient-fixed-markdown q">${textAfterLastQuote}</span>`
            );

            lastParagraph.innerHTML = newHTML;
            console.log('Gradient Markdown Fix: Applied gradient to unclosed quote text');
        }
    }
}

/**
 * Add CSS styles for gradient styling
 */
function addGradientStyles() {
    const styleId = 'gradient-markdown-fix-styles';
    if (document.getElementById(styleId)) {
        return;
    }

    const themeColors = getThemeColors();
    const warningColor = extensionSettings.warningColor;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .gradient-fixed-markdown {
            /* Apply gradient only to text, not background */
            background-image: linear-gradient(90deg, ${themeColors.quote}, ${warningColor}) !important;
            background-clip: text !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            color: transparent !important;

            /* Ensure no background color bleeds through */
            background-color: transparent !important;
        }

        /* Special styles for different markdown types */
        .gradient-fixed-markdown.q {
            background-image: linear-gradient(90deg, ${themeColors.quote}, ${warningColor}) !important;
        }

        .gradient-fixed-markdown.i,
        .gradient-fixed-markdown.em {
            background-image: linear-gradient(90deg, ${themeColors.italics}, ${warningColor}) !important;
        }

        .gradient-fixed-markdown.u {
            background-image: linear-gradient(90deg, ${themeColors.underline}, ${warningColor}) !important;
        }

        .gradient-fixed-markdown.strong,
        .gradient-fixed-markdown.b {
            background-image: linear-gradient(90deg, ${themeColors.main}, ${warningColor}) !important;
        }
    `;

    document.head.appendChild(style);
}

/**
 * Initialize the extension
 */
function initExtension() {
    // Load settings
    extensionSettings = getSettings();

    // Debug: Show theme colors
    const themeColors = getThemeColors();
    console.log('Gradient Markdown Fix: Extension initialized');
    console.log('Gradient Markdown Fix: Works WITHOUT Auto-fix Markdown enabled');
    console.log('Gradient Markdown Fix: Shows gradients on unclosed markdown that would be fixed');
    console.log('Gradient Markdown Fix: Theme colors loaded:', themeColors);
    console.log('Gradient Markdown Fix: Warning color:', extensionSettings.warningColor);

    // Add UI controls
    addUIControls();

    // Start observing for new messages
    startMessageObservation();

    console.log('Gradient Markdown Fix extension initialized');
}

/**
 * Apply gradients to all existing messages
 */
function applyGradientsToAllMessages() {
    if (!extensionSettings.enabled) {
        return;
    }

    const messageElements = document.querySelectorAll('.mes_text');
    console.log(`Gradient Markdown Fix: Applying gradients to ${messageElements.length} existing messages`);

    messageElements.forEach(messageText => {
        applyGradientToMessage(messageText);
    });
}

/**
 * Start observing for new messages to apply gradients
 */
function startMessageObservation() {
    // Watch for new messages being added to the chat
    const chatContainer = document.getElementById('chat');
    if (!chatContainer) {
        console.log('Chat container not found, will retry...');
        setTimeout(startMessageObservation, 1000);
        return;
    }

    // Apply gradients to existing messages first
    applyGradientsToAllMessages();

    // Set up periodic refresh to catch any altered messages
    setInterval(() => {
        if (extensionSettings.enabled) {
            applyGradientsToAllMessages();
        }
    }, 2000); // Refresh every 2 seconds

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if this is a message element
                        if (node.classList && (node.classList.contains('mes') || node.querySelector('.mes_text'))) {
                            // Apply gradients to this message
                            const messageText = node.querySelector('.mes_text');
                            if (messageText) {
                                // Small delay to ensure markdown is fully rendered
                                setTimeout(() => {
                                    applyGradientToMessage(messageText);
                                }, 100);
                            }
                        }
                    }
                });
            }
        });
    });

    observer.observe(chatContainer, {
        childList: true,
        subtree: true
    });

    console.log('Started observing chat messages for gradient application');
}


/**
 * Add UI controls to the extensions menu
 */
function addUIControls() {
    // Wait for DOM to be ready
    if (typeof jQuery !== 'undefined') {
        jQuery(() => {
            // Add button to extensions menu
            const buttonHtml = `
                <div class="list-group-item flex-container flexGap5 interactable" title="Gradient Markdown Fix Settings" data-i18n="[title]Gradient Markdown Fix Settings" tabindex="0">
                    <i class="fa-solid fa-paint-brush"></i>
                    <span>Gradient Markdown Fix</span>
                </div>
            `;

            const $extensionsMenu = jQuery('#extensionsMenu');
            if ($extensionsMenu.length) {
                $extensionsMenu.append(buttonHtml);

                // Add click handler
                $extensionsMenu.find('.list-group-item:contains("Gradient Markdown Fix")').on('click', showSettingsPopup);
            }

            // Add settings to extensions settings panel
            addSettingsToPanel();
        });
    } else {
        // Fallback if jQuery is not available
        document.addEventListener('DOMContentLoaded', () => {
            addSettingsToPanel();
        });
    }
}

/**
 * Add settings to the extensions settings panel
 */
function addSettingsToPanel() {
    if (typeof jQuery !== 'undefined') {
        jQuery(() => {
            const settingsContainer = jQuery('#extensions_settings2');
            if (!settingsContainer.length) {
                return;
            }

            // Check if settings already added
            if (settingsContainer.find(`#${SETTINGS_KEY}-container`).length) {
                return;
            }

            const settingsHtml = `
                <div id="${SETTINGS_KEY}-container" class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>${EXTENSION_NAME}</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <label class="checkbox_label">
                            <input type="checkbox" id="${SETTINGS_KEY}-enabled" ${extensionSettings.enabled ? 'checked' : ''} />
                            <span>Enable Gradient Markdown Fix</span>
                        </label>

                        <div class="flex-container flexGap5" style="margin-top: 10px;">
                            <label for="${SETTINGS_KEY}-warning-color">Warning Color:</label>
                            <input type="color" id="${SETTINGS_KEY}-warning-color" value="${extensionSettings.warningColor}" />
                        </div>

                        <label class="checkbox_label" style="margin-top: 10px;">
                            <input type="checkbox" id="${SETTINGS_KEY}-persistent" ${extensionSettings.persistentGradient ? 'checked' : ''} />
                            <span>Persistent Gradient (no animation)</span>
                        </label>

                        <button id="${SETTINGS_KEY}-apply" class="menu_button" style="margin-top: 15px;">Apply Settings</button>
                    </div>
                </div>
            `;

            settingsContainer.append(settingsHtml);

            // Add event handlers
            jQuery(`#${SETTINGS_KEY}-enabled`).on('change', function() {
                extensionSettings.enabled = this.checked;
                saveSettings();
            });

            jQuery(`#${SETTINGS_KEY}-warning-color`).on('input', function() {
                extensionSettings.warningColor = this.value;
            });

            jQuery(`#${SETTINGS_KEY}-persistent`).on('change', function() {
                extensionSettings.persistentGradient = this.checked;
            });

            jQuery(`#${SETTINGS_KEY}-apply`).on('click', function() {
                saveSettings();
                // Update gradient styles
                const styleElement = document.getElementById('gradient-markdown-fix-styles');
                if (styleElement) {
                    styleElement.remove();
                }
                addGradientStyles();

                if (typeof toastr !== 'undefined') {
                    toastr.success('Gradient Markdown Fix settings applied');
                }
            });

            // Initialize drawer toggle
            jQuery(`#${SETTINGS_KEY}-container .inline-drawer-toggle`).on('click', function() {
                jQuery(this).toggleClass('open');
                jQuery(this).find('.inline-drawer-icon').toggleClass('down up');
                jQuery(this).next('.inline-drawer-content').toggleClass('open');
            });
        });
    }
}

/**
 * Show settings popup
 */
function showSettingsPopup() {
    // For now, just toggle the settings panel
    const container = document.getElementById(`${SETTINGS_KEY}-container`);
    if (container) {
        container.querySelector('.inline-drawer-toggle').click();
    }
}

/**
 * Clean up the extension
 */
function cleanupExtension() {
    // Remove styles
    const styleElement = document.getElementById('gradient-markdown-fix-styles');
    if (styleElement) {
        styleElement.remove();
    }

    console.log('Gradient Markdown Fix extension cleaned up');
}

// Initialize when DOM is ready
if (typeof jQuery !== 'undefined') {
    jQuery(() => {
        initExtension();
    });
} else {
    document.addEventListener('DOMContentLoaded', initExtension);
}

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EXTENSION_NAME,
        EXTENSION_ID,
        initExtension,
        cleanupExtension,
        getSettings,
        saveSettings
    };
}