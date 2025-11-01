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
    warningColor: '#ffaa00',
    useThemeColors: true,
    persistentGradient: true
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
 * Find which quote/markdown is actually unclosed by parsing from start to end
 */
function findUnclosedMarkdown(text) {
    const result = {
        hasUnclosed: false,
        unclosedChar: null,
        unclosedStartIndex: -1,
        unclosedText: ''
    };

    // Track state for each markdown character
    const markdownStates = {
        '"': { open: false, startIndex: -1 },
        '*': { open: false, startIndex: -1 },
        '_': { open: false, startIndex: -1 }
    };

    // Parse character by character
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (char === '"' || char === '*' || char === '_') {
            const state = markdownStates[char];
            
            if (!state.open) {
                // Opening markdown
                state.open = true;
                state.startIndex = i;
            } else {
                // Closing markdown
                state.open = false;
                state.startIndex = -1;
            }
        }
    }

    // Check which markdown is still open
    for (const [char, state] of Object.entries(markdownStates)) {
        if (state.open && state.startIndex !== -1) {
            result.hasUnclosed = true;
            result.unclosedChar = char;
            result.unclosedStartIndex = state.startIndex;
            result.unclosedText = text.substring(state.startIndex);
            break; // Return first unclosed markdown found
        }
    }

    return result;
}

/**
 * Apply gradient styling to markdown elements in the DOM
 */
function applyGradientToMessage(messageElement) {
    if (!extensionSettings.enabled) {
        return;
    }

    const messageContainer = messageElement.closest('.mes') || messageElement.parentElement;
    if (!messageContainer) return;

    const messageTextContainer = messageContainer.querySelector('.mes_text');
    if (!messageTextContainer) return;

    // Get the raw text content
    const rawText = messageTextContainer.textContent || '';

    // First, remove any existing gradient classes
    const existingGradients = messageElement.querySelectorAll('.gradient-fixed-markdown');
    existingGradients.forEach(element => {
        element.classList.remove('gradient-fixed-markdown');
        element.classList.remove('q', 'i', 'em', 'u', 'strong', 'b');
    });

    // Find what's actually unclosed
    const unclosedInfo = findUnclosedMarkdown(rawText);

    console.log('Gradient Markdown Fix: Unclosed analysis:', unclosedInfo);

    if (!unclosedInfo.hasUnclosed) {
        return; // Nothing to highlight
    }

    // Get the text that should be highlighted (everything from the unclosed markdown to the end)
    const textToHighlight = unclosedInfo.unclosedText.substring(1); // Remove the opening quote/markdown char itself

    console.log(`Gradient Markdown Fix: Text to highlight: "${textToHighlight}"`);

    // Find the element that contains this text
    const markdownElements = messageElement.querySelectorAll('i, em, u, strong, b, q, blockquote, code');
    let foundMatch = false;

    markdownElements.forEach(element => {
        const elementText = element.textContent || '';
        
        // Check if this element contains the text that should be highlighted
        // We need to check if this element's text is at the END of the message
        // and matches what comes after the unclosed markdown
        if (elementText.trim() && textToHighlight.includes(elementText.trim())) {
            // Additional check: make sure this is actually at the end
            const elementIndex = rawText.lastIndexOf(elementText);
            const textAfterElement = rawText.slice(elementIndex + elementText.length).trim();
            
            // If there's very little text after this element, it's likely the unclosed one
            if (textAfterElement.length < 20) {
                console.log(`Gradient Markdown Fix: Applying gradient to: "${elementText}"`);
                applyElementGradient(element, unclosedInfo.unclosedChar);
                foundMatch = true;
            }
        }
    });

    // If no markdown element was found, try to wrap the unclosed text manually
    if (!foundMatch) {
        console.log('Gradient Markdown Fix: No matching element found, wrapping manually');
        wrapUnclosedText(messageElement, unclosedInfo);
    }

    // Add CSS for the gradient styling
    if (!document.getElementById('gradient-markdown-fix-styles')) {
        addGradientStyles();
    }
}

/**
 * Apply gradient styling to a single element
 */
function applyElementGradient(element, markdownChar) {
    element.classList.add('gradient-fixed-markdown');
    
    // Add specific class based on markdown type
    if (markdownChar === '"') {
        element.classList.add('q');
    } else if (markdownChar === '*') {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'strong' || tagName === 'b') {
            element.classList.add('strong');
        } else if (tagName === 'i' || tagName === 'em') {
            element.classList.add('em');
        }
    } else if (markdownChar === '_') {
        element.classList.add('u');
    }
}

/**
 * Wrap unclosed text that isn't already in a markdown element
 */
function wrapUnclosedText(messageElement, unclosedInfo) {
    const paragraphs = messageElement.querySelectorAll('p');
    if (paragraphs.length === 0) return;

    const lastParagraph = paragraphs[paragraphs.length - 1];
    const paragraphText = lastParagraph.textContent || '';

    // Find where the unclosed text starts in the last paragraph
    const unclosedTextWithoutChar = unclosedInfo.unclosedText.substring(1);
    
    // Check if the paragraph contains the unclosed text
    if (!paragraphText.includes(unclosedTextWithoutChar)) {
        console.log('Gradient Markdown Fix: Last paragraph does not contain unclosed text');
        return;
    }

    // Find the last text node in the paragraph
    const walker = document.createTreeWalker(
        lastParagraph,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let lastTextNode = null;
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.trim()) {
            lastTextNode = node;
        }
    }

    if (!lastTextNode) return;

    const lastText = lastTextNode.textContent;
    
    // Check if this text node ends with part of the unclosed text
    if (unclosedTextWithoutChar.endsWith(lastText.trim()) || lastText.trim().endsWith(unclosedTextWithoutChar.trim())) {
        // Wrap this text node
        const span = document.createElement('span');
        span.className = 'gradient-fixed-markdown';
        
        if (unclosedInfo.unclosedChar === '"') {
            span.classList.add('q');
        }
        
        span.textContent = lastText;
        lastTextNode.parentNode.replaceChild(span, lastTextNode);
        
        console.log('Gradient Markdown Fix: Wrapped unclosed text node');
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
            background-image: linear-gradient(90deg, ${themeColors.quote}, ${warningColor}) !important;
            background-clip: text !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            color: transparent !important;
            background-color: transparent !important;
        }

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
    extensionSettings = getSettings();

    const themeColors = getThemeColors();
    console.log('Gradient Markdown Fix: Extension initialized');
    console.log('Gradient Markdown Fix: Works WITHOUT Auto-fix Markdown enabled');
    console.log('Gradient Markdown Fix: Theme colors loaded:', themeColors);

    addUIControls();
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
    const chatContainer = document.getElementById('chat');
    if (!chatContainer) {
        console.log('Chat container not found, will retry...');
        setTimeout(startMessageObservation, 1000);
        return;
    }

    applyGradientsToAllMessages();

    setInterval(() => {
        if (extensionSettings.enabled) {
            applyGradientsToAllMessages();
        }
    }, 2000);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList && (node.classList.contains('mes') || node.querySelector('.mes_text'))) {
                            const messageText = node.querySelector('.mes_text');
                            if (messageText) {
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
    if (typeof jQuery !== 'undefined') {
        jQuery(() => {
            const buttonHtml = `
                <div class="list-group-item flex-container flexGap5 interactable" title="Gradient Markdown Fix Settings" data-i18n="[title]Gradient Markdown Fix Settings" tabindex="0">
                    <i class="fa-solid fa-paint-brush"></i>
                    <span>Gradient Markdown Fix</span>
                </div>
            `;

            const $extensionsMenu = jQuery('#extensionsMenu');
            if ($extensionsMenu.length) {
                $extensionsMenu.append(buttonHtml);
                $extensionsMenu.find('.list-group-item:contains("Gradient Markdown Fix")').on('click', showSettingsPopup);
            }

            addSettingsToPanel();
        });
    } else {
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
                const styleElement = document.getElementById('gradient-markdown-fix-styles');
                if (styleElement) {
                    styleElement.remove();
                }
                addGradientStyles();

                if (typeof toastr !== 'undefined') {
                    toastr.success('Gradient Markdown Fix settings applied');
                }
            });

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
    const container = document.getElementById(`${SETTINGS_KEY}-container`);
    if (container) {
        container.querySelector('.inline-drawer-toggle').click();
    }
}

/**
 * Clean up the extension
 */
function cleanupExtension() {
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
