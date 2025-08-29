/**
 * Custom Prompts Management Module
 * Handles all functionality related to managing custom prompts for metadata generation
 */

// Global state for custom prompts
let customPrompts = [];

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
 * Export custom prompts to a .prompts file
 */
function exportPromptsToFile() {
    try {
        const promptsData = {
            version: "1.0",
            exported: new Date().toISOString(),
            prompts: customPrompts
        };
        
        const dataStr = JSON.stringify(promptsData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `custom-prompts-${new Date().toISOString().split('T')[0]}.prompts`;
        link.click();
        
        showNotification('✅ Custom prompts exported to .prompts file!');
        console.log('📁 Custom prompts exported to file');
    } catch (error) {
        console.error('Error exporting prompts to file:', error);
        showNotification('❌ Failed to export prompts to file', 'error');
    }
}

/**
 * Import custom prompts from a .prompts file
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
            
            // Add IDs to imported prompts if they don't have them
            const validPrompts = importData.prompts.map(prompt => ({
                id: prompt.id || generateId(),
                property: prompt.property || '',
                prompt: prompt.prompt || ''
            })).filter(p => p.property.trim() && p.prompt.trim());
            
            if (validPrompts.length === 0) {
                showNotification('❌ No valid prompts found in file', 'error');
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
            
            showNotification(`✅ Successfully imported ${validPrompts.length} custom prompts!`);
            console.log('📁 Custom prompts imported from file:', validPrompts);
            
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
 * Initialize custom prompts event handlers
 */
function initializeCustomPromptsHandlers() {
    // Get DOM elements
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

    console.log('🎯 Custom prompts event handlers initialized');
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
        importPromptsFromFile
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