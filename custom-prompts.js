/**
 * Custom Prompts Management Module
 * Handles all functionality related to managing custom prompts for metadata generation
 */

// Global state for custom prompts and brand prompt
let customPrompts = [];
let brandPrompt = '';

/**
 * Show the custom prompts management modal
 */
function showCustomPromptsModal() {
    const modal = document.getElementById('customPromptsModal');
    
    // Load current custom prompts
    loadCustomPrompts();
    
    // Render the custom prompts list
    renderCustomPromptsList();
    
    modal.style.display = 'block';
}

/**
 * Load custom prompts from localStorage into the global state
 */
function loadCustomPrompts() {
    try {
        const saved = localStorage.getItem('customPrompts');
        if (saved) {
            customPrompts = JSON.parse(saved);
        } else {
            // Initialize with defaults if none exist
            customPrompts = getStoredCustomPrompts();
        }
        console.log('📝 Loaded custom prompts:', customPrompts);
    } catch (error) {
        console.error('Error loading custom prompts:', error);
        // Fallback to defaults on error
        customPrompts = getDefaultCustomPrompts();
    }
}

/**
 * Load brand prompt from localStorage
 */
function loadBrandPrompt() {
    try {
        const saved = localStorage.getItem('brandPrompt');
        if (saved) {
            brandPrompt = saved;
            // Update the UI if the input exists
            const brandPromptInput = document.getElementById('brandPromptInput');
            if (brandPromptInput) {
                brandPromptInput.value = brandPrompt;
                // Trigger auto-expand after setting the value
                autoExpandBrandPrompt(brandPromptInput);
            }
        }
        console.log('🏷️ Loaded brand prompt:', brandPrompt);
    } catch (error) {
        console.error('Error loading brand prompt:', error);
        brandPrompt = '';
    }
}

/**
 * Auto-expand brand prompt textarea
 */
function autoExpandBrandPrompt(element) {
    if (element) {
        element.style.height = '48px'; // Reset to minimum height
        element.style.height = Math.min(element.scrollHeight, 200) + 'px'; // Expand but cap at max-height
    }
}

/**
 * Save brand prompt to localStorage
 */
function saveBrandPrompt() {
    try {
        const brandPromptInput = document.getElementById('brandPromptInput');
        if (brandPromptInput) {
            brandPrompt = brandPromptInput.value.trim();
            localStorage.setItem('brandPrompt', brandPrompt);
            console.log('💾 Brand prompt saved to localStorage');
            showNotification('✅ Brand prompt saved successfully!', 'success');
        }
    } catch (error) {
        console.error('Error saving brand prompt:', error);
        showNotification('❌ Failed to save brand prompt', 'error');
    }
}

/**
 * Clear brand prompt
 */
function clearBrandPrompt() {
    try {
        brandPrompt = '';
        localStorage.removeItem('brandPrompt');
        
        // Clear the UI
        const brandPromptInput = document.getElementById('brandPromptInput');
        if (brandPromptInput) {
            brandPromptInput.value = '';
        }
        
        console.log('🗑️ Brand prompt cleared');
        showNotification('✅ Brand prompt cleared successfully!', 'success');
    } catch (error) {
        console.error('Error clearing brand prompt:', error);
        showNotification('❌ Failed to clear brand prompt', 'error');
    }
}

/**
 * Get the current brand prompt
 */
function getBrandPrompt() {
    return brandPrompt;
}

/**
 * Save current custom prompts to localStorage and optionally export to file
 */
function saveCustomPrompts() {
    try {
        localStorage.setItem('customPrompts', JSON.stringify(customPrompts));
        console.log('💾 Custom prompts saved to localStorage');
        showNotification('Custom prompts saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving custom prompts:', error);
        showNotification('Failed to save custom prompts', 'error');
    }
}

/**
 * Export custom prompts and brand prompt to a .prompts file
 */
function exportPromptsToFile() {
    try {
        // Get current brand prompt from UI before exporting
        const brandPromptInput = document.getElementById('brandPromptInput');
        const currentBrandPrompt = brandPromptInput ? brandPromptInput.value.trim() : brandPrompt;
        
        const promptsData = {
            version: "1.0",
            exported: new Date().toISOString(),
            brandPrompt: currentBrandPrompt,
            prompts: customPrompts
        };
        
        const dataStr = JSON.stringify(promptsData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `custom-prompts-${new Date().toISOString().split('T')[0]}.prompts`;
        link.click();
        
        showNotification('✅ Custom prompts and brand prompt exported to .prompts file!');
        console.log('📁 Custom prompts and brand prompt exported to file');
    } catch (error) {
        console.error('Error exporting prompts to file:', error);
        showNotification('❌ Failed to export prompts to file', 'error');
    }
}

/**
 * Import custom prompts and brand prompt from a .prompts file
 */
function importPromptsFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Validate file format
            if (!importData.prompts || !Array.isArray(importData.prompts)) {
                showNotification('❌ Invalid .prompts file format', 'error');
                return;
            }
            
            // Import brand prompt if present
            if (importData.brandPrompt !== undefined) {
                brandPrompt = importData.brandPrompt || '';
                localStorage.setItem('brandPrompt', brandPrompt);
                
                // Update UI
                const brandPromptInput = document.getElementById('brandPromptInput');
                if (brandPromptInput) {
                    brandPromptInput.value = brandPrompt;
                }
                console.log('🏷️ Imported brand prompt:', brandPrompt);
            }
            
            // Add IDs to imported prompts if they don't have them
            const validPrompts = importData.prompts.map(prompt => ({
                id: prompt.id || generateId(),
                property: prompt.property || '',
                prompt: prompt.prompt || ''
            })).filter(p => p.property.trim() && p.prompt.trim());
            
            if (validPrompts.length === 0 && !importData.brandPrompt) {
                showNotification('❌ No valid prompts or brand prompt found in file', 'error');
                return;
            }
            
            // Replace current prompts
            customPrompts = validPrompts;
            
            // Save to localStorage
            saveCustomPrompts();
            
            // Update UI
            renderCustomPromptsList();
            
            // Refresh folder if one is selected
            if (typeof window.refreshCurrentFolder === 'function') {
                window.refreshCurrentFolder();
            }
            
            const importedItems = [];
            if (validPrompts.length > 0) importedItems.push(`${validPrompts.length} custom prompts`);
            if (importData.brandPrompt !== undefined) importedItems.push('brand prompt');
            
            showNotification(`✅ Successfully imported ${importedItems.join(' and ')}!`);
            console.log('📁 Custom prompts and brand prompt imported from file:', { validPrompts, brandPrompt });
            
        } catch (error) {
            console.error('Error importing prompts from file:', error);
            showNotification('❌ Error reading .prompts file: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

/**
 * Render the list of custom prompts in the modal table
 */
function renderCustomPromptsList() {
    const tbody = document.getElementById('customPromptsList');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    customPrompts.forEach((prompt, index) => {
        const row = document.createElement('tr');
        
        // Property name cell
        const propertyCell = document.createElement('td');
        const propertyInput = document.createElement('input');
        propertyInput.type = 'text';
        propertyInput.className = 'prompt-property-input';
        propertyInput.value = prompt.property || '';
        propertyInput.placeholder = 'e.g., title, description, tags';
        propertyInput.addEventListener('input', (e) => updateCustomPromptProperty(prompt.id, e.target.value));
        propertyCell.appendChild(propertyInput);
        
        // Prompt text cell
        const promptCell = document.createElement('td');
        const promptTextarea = document.createElement('textarea');
        promptTextarea.className = 'prompt-text-input';
        promptTextarea.value = prompt.prompt || '';
        promptTextarea.placeholder = 'Enter your custom prompt for this property...';
        promptTextarea.addEventListener('input', (e) => updateCustomPromptText(prompt.id, e.target.value));
        promptCell.appendChild(promptTextarea);
        
        // Action cell
        const actionCell = document.createElement('td');

        const enhanceBtn = document.createElement('button');
        enhanceBtn.className = 'enhance-prompt-btn';
        enhanceBtn.textContent = '✨ Enhance Prompt';
        enhanceBtn.addEventListener('click', (e) => enhancePromptWithAI(prompt.id, e.target));
        actionCell.appendChild(enhanceBtn);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-prompt-btn';
        removeBtn.textContent = '✖ Remove';
        removeBtn.addEventListener('click', () => removeCustomPrompt(prompt.id));
        actionCell.appendChild(removeBtn);

        row.appendChild(propertyCell);
        row.appendChild(promptCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });
}

/**
 * Enhance a prompt using AI
 * @param {string} id - The ID of the prompt to enhance
 */
async function enhancePromptWithAI(id, buttonElement) {
    const prompt = customPrompts.find(p => p.id === id);
    if (!prompt || !prompt.prompt.trim()) {
        showNotification('⚠️ Please enter a prompt before enhancing', 'error');
        return;
    }

    // Find the button and show loading state
    const enhanceBtn = buttonElement || event.target;
    const originalText = enhanceBtn.textContent;
    enhanceBtn.textContent = '⏳ Enhancing...';
    enhanceBtn.disabled = true;

    try {
        // Get the metadataAPI instance from the global scope
        if (typeof metadataAPI === 'undefined') {
            throw new Error('Metadata API not initialized');
        }

        // Call the AI to enhance the prompt
        const result = await metadataAPI.enhancePrompt(prompt.prompt);

        // Show a modal with the results (pass original prompt for comparison)
        showEnhancementResults(id, result, prompt.prompt);

    } catch (error) {
        console.error('Error enhancing prompt:', error);
        showNotification('❌ Failed to enhance prompt: ' + error.message, 'error');
    } finally {
        // Restore button state
        enhanceBtn.textContent = originalText;
        enhanceBtn.disabled = false;
    }
}

/**
 * Show enhancement results in a modal
 * @param {string} promptId - The ID of the prompt being enhanced
 * @param {Object} result - The enhancement result from AI
 * @param {string} originalPrompt - The original prompt text for comparison
 */
function showEnhancementResults(promptId, result, originalPrompt) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'enhancement-modal-overlay';

    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'enhancement-modal-content';

    // Determine score class
    const scoreClass = result.score >= 70 ? 'enhancement-score-high' :
                       result.score >= 40 ? 'enhancement-score-medium' :
                       'enhancement-score-low';

    // Build the modal HTML
    modal.innerHTML = `
        <h2>✨ Prompt Enhancement Results</h2>

        <div class="enhancement-score-box">
            <h3>📊 Quality Score</h3>
            <div class="enhancement-score-value ${scoreClass}">
                ${result.score}/100
            </div>
        </div>

        <div class="enhancement-improvements-box">
            <h3>🔧 Improvements Made</h3>
            <ul>
                ${result.improvements.map(imp => `<li>${imp}</li>`).join('')}
            </ul>
        </div>

        ${result.contextSuggestions && result.contextSuggestions.length > 0 ? `
        <div class="enhancement-questions-box">
            <h3>💡 Context Suggestions</h3>
            <ul>
                ${result.contextSuggestions.map(q => `<li>${q}</li>`).join('')}
            </ul>
            <p class="enhancement-questions-note">Consider these suggestions to further improve your prompt.</p>
        </div>
        ` : ''}

        <div class="enhancement-prompts-comparison">
            <div class="enhancement-prompt-box original">
                <h3>📝 Original Prompt</h3>
                <div class="enhancement-prompt-text">${originalPrompt}</div>
            </div>
            <div class="enhancement-prompt-box enhanced">
                <h3>✅ Enhanced Prompt</h3>
                <div class="enhancement-prompt-text">${result.enhancedPrompt}</div>
            </div>
        </div>

        <div class="enhancement-modal-buttons">
            <button id="cancelEnhancement" class="enhancement-cancel-btn">
                ❌ Cancel
            </button>
            <button id="applyEnhancement" class="enhancement-apply-btn">
                ✅ Apply Enhancement
            </button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add event listeners
    document.getElementById('cancelEnhancement').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    document.getElementById('applyEnhancement').addEventListener('click', () => {
        // Update the prompt with the enhanced version
        const prompt = customPrompts.find(p => p.id === promptId);
        if (prompt) {
            prompt.prompt = result.enhancedPrompt;
            renderCustomPromptsList();
            showNotification('✅ Enhanced prompt applied successfully!', 'success');
        }
        document.body.removeChild(overlay);
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}

/**
 * Add a new empty custom prompt
 */
function addCustomPrompt() {
    const newPrompt = {
        id: generateId(),
        property: '',
        prompt: ''
    };

    customPrompts.push(newPrompt);
    renderCustomPromptsList();

    console.log('➕ Added new custom prompt');
}

/**
 * Remove a custom prompt by ID
 * @param {string} id - The ID of the prompt to remove
 */
function removeCustomPrompt(id) {
    customPrompts = customPrompts.filter(p => p.id !== id);
    renderCustomPromptsList();
    console.log('🗑️ Removed custom prompt:', id);
}

/**
 * Update the property name of a custom prompt
 * @param {string} id - The ID of the prompt to update
 * @param {string} property - The new property name
 */
function updateCustomPromptProperty(id, property) {
    const prompt = customPrompts.find(p => p.id === id);
    if (prompt) {
        prompt.property = property;
    }
}

/**
 * Update the prompt text of a custom prompt
 * @param {string} id - The ID of the prompt to update
 * @param {string} text - The new prompt text
 */
function updateCustomPromptText(id, text) {
    const prompt = customPrompts.find(p => p.id === id);
    if (prompt) {
        prompt.prompt = text;
    }
}

/**
 * Reset custom prompts to default values
 */
function resetCustomPromptsToDefaults() {
    const defaultPrompts = getDefaultCustomPrompts();
    
    // Add IDs to the default prompts
    customPrompts = defaultPrompts.map(prompt => ({
        ...prompt,
        id: generateId()
    }));
    
    renderCustomPromptsList();
    
    // Refresh the current folder to show reset custom prompts
    if (typeof window.refreshCurrentFolder === 'function') {
        window.refreshCurrentFolder();
    }
    
    console.log('🔄 Reset custom prompts to defaults');
}

/**
 * Save custom prompts and close the modal
 */
function saveCustomPromptsAndClose() {
    // Filter out invalid prompts (empty property or prompt)
    const validPrompts = customPrompts.filter(p => p.property.trim() && p.prompt.trim());
    
    if (validPrompts.length !== customPrompts.length) {
        const invalid = customPrompts.length - validPrompts.length;
        console.warn(`⚠️ Skipping ${invalid} invalid prompt(s) with empty fields`);
    }
    
    customPrompts = validPrompts;
    saveCustomPrompts();
    
    // Close modal
    document.getElementById('customPromptsModal').style.display = 'none';
    
    // Refresh the current folder to show updated custom prompts
    if (typeof window.refreshCurrentFolder === 'function') {
        window.refreshCurrentFolder();
    }
    
    console.log('✅ Custom prompts saved and modal closed');
}

/**
 * Get stored custom prompts from localStorage, with fallback to defaults
 * @returns {Array} Array of custom prompt objects
 */
function getStoredCustomPrompts() {
    try {
        const stored = localStorage.getItem('customPrompts');
        if (stored) {
            return JSON.parse(stored);
        } else {
            // First time opening the app - set up default description-only custom prompt
            console.log('🆕 First time load - setting up default description field');
            const defaultPrompts = getDefaultCustomPrompts();
            
            // Save the default to localStorage so it persists
            localStorage.setItem('customPrompts', JSON.stringify(defaultPrompts));
            console.log('💾 Saved default description prompt to localStorage');
            
            return defaultPrompts;
        }
    } catch (error) {
        console.error('Error loading custom prompts:', error);
        // Fallback to description-only even on error
        return [
            {
                property: 'description',
                prompt: 'Generate a detailed description for this image.'
            }
        ];
    }
}

/**
 * Initialize custom prompts and brand prompt event handlers
 */
function initializeCustomPromptsHandlers() {
    // Get DOM elements for custom prompts
    const customPromptsBtn = document.getElementById('customPromptsBtn');
    const customPromptsModal = document.getElementById('customPromptsModal');
    const customPromptsClose = customPromptsModal ? customPromptsModal.querySelector('.close') : null;
    const addCustomPromptBtn = document.getElementById('addCustomPromptBtn');
    const saveCustomPromptsBtn = document.getElementById('saveCustomPromptsBtn');
    const resetCustomPromptsBtn = document.getElementById('resetCustomPromptsBtn');
    const cancelCustomPromptsBtn = document.getElementById('cancelCustomPromptsBtn');
    const exportPromptsBtn = document.getElementById('exportPromptsBtn');
    const importPromptsBtn = document.getElementById('importPromptsBtn');
    const importPromptsInput = document.getElementById('importPromptsInput');
    
    // Get DOM elements for brand prompt
    const saveBrandPromptBtn = document.getElementById('saveBrandPromptBtn');
    const clearBrandPromptBtn = document.getElementById('clearBrandPromptBtn');
    const brandPromptInput = document.getElementById('brandPromptInput');

    // Add event listeners
    if (customPromptsBtn) {
        customPromptsBtn.addEventListener('click', showCustomPromptsModal);
    }

    if (customPromptsClose) {
        customPromptsClose.addEventListener('click', () => {
            customPromptsModal.style.display = 'none';
        });
    }

    if (addCustomPromptBtn) {
        addCustomPromptBtn.addEventListener('click', addCustomPrompt);
    }

    if (saveCustomPromptsBtn) {
        saveCustomPromptsBtn.addEventListener('click', saveCustomPromptsAndClose);
    }

    if (resetCustomPromptsBtn) {
        resetCustomPromptsBtn.addEventListener('click', resetCustomPromptsToDefaults);
    }

    if (cancelCustomPromptsBtn) {
        cancelCustomPromptsBtn.addEventListener('click', () => {
            customPromptsModal.style.display = 'none';
        });
    }

    if (exportPromptsBtn) {
        exportPromptsBtn.addEventListener('click', exportPromptsToFile);
    }

    if (importPromptsBtn) {
        importPromptsBtn.addEventListener('click', () => {
            importPromptsInput.click();
        });
    }

    if (importPromptsInput) {
        importPromptsInput.addEventListener('change', importPromptsFromFile);
    }

    // Close modal when clicking outside
    if (customPromptsModal) {
        customPromptsModal.addEventListener('click', (e) => {
            if (e.target === customPromptsModal) {
                customPromptsModal.style.display = 'none';
            }
        });
    }

    // Brand prompt event listeners
    if (saveBrandPromptBtn) {
        saveBrandPromptBtn.addEventListener('click', saveBrandPrompt);
    }

    if (clearBrandPromptBtn) {
        clearBrandPromptBtn.addEventListener('click', clearBrandPrompt);
    }

    // Auto-save brand prompt on input change (debounced) and auto-expand
    if (brandPromptInput) {
        let brandPromptTimeout;
        
        // Initial auto-expand on page load (in case there's saved content)
        autoExpandBrandPrompt(brandPromptInput);
        
        brandPromptInput.addEventListener('input', () => {
            // Auto-expand the textarea
            autoExpandBrandPrompt(brandPromptInput);
            
            // Auto-save after typing stops
            clearTimeout(brandPromptTimeout);
            brandPromptTimeout = setTimeout(() => {
                brandPrompt = brandPromptInput.value.trim();
            }, 500); // Save after 500ms of no typing
        });
        
        // Also auto-expand on paste events
        brandPromptInput.addEventListener('paste', () => {
            setTimeout(() => autoExpandBrandPrompt(brandPromptInput), 0);
        });
    }

    console.log('🎯 Custom prompts and brand prompt event handlers initialized');
}

// Export functions for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showCustomPromptsModal,
        loadCustomPrompts,
        saveCustomPrompts,
        renderCustomPromptsList,
        addCustomPrompt,
        removeCustomPrompt,
        updateCustomPromptProperty,
        updateCustomPromptText,
        resetCustomPromptsToDefaults,
        saveCustomPromptsAndClose,
        getStoredCustomPrompts,
        initializeCustomPromptsHandlers,
        exportPromptsToFile,
        importPromptsFromFile,
        loadBrandPrompt,
        saveBrandPrompt,
        clearBrandPrompt,
        getBrandPrompt,
        autoExpandBrandPrompt
    };
}

// Expose functions globally for browser compatibility
window.showCustomPromptsModal = showCustomPromptsModal;
window.loadCustomPrompts = loadCustomPrompts;
window.saveCustomPrompts = saveCustomPrompts;
window.renderCustomPromptsList = renderCustomPromptsList;
window.addCustomPrompt = addCustomPrompt;
window.removeCustomPrompt = removeCustomPrompt;
window.updateCustomPromptProperty = updateCustomPromptProperty;
window.updateCustomPromptText = updateCustomPromptText;
window.resetCustomPromptsToDefaults = resetCustomPromptsToDefaults;
window.saveCustomPromptsAndClose = saveCustomPromptsAndClose;
window.getStoredCustomPrompts = getStoredCustomPrompts;
window.initializeCustomPromptsHandlers = initializeCustomPromptsHandlers;
window.exportPromptsToFile = exportPromptsToFile;
window.importPromptsFromFile = importPromptsFromFile;
window.loadBrandPrompt = loadBrandPrompt;
window.saveBrandPrompt = saveBrandPrompt;
window.clearBrandPrompt = clearBrandPrompt;
window.getBrandPrompt = getBrandPrompt;
window.autoExpandBrandPrompt = autoExpandBrandPrompt;
window.enhancePromptWithAI = enhancePromptWithAI;
window.showEnhancementResults = showEnhancementResults;