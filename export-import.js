/**
 * Export/Import Functionality Module
 * Handles exporting metadata to JSON/CSV and importing from JSON files
 */

/**
 * Export all metadata as JSON file
 */
function exportAsJson() {
    // Normalize to ensure all fields use { value, confidence_score, confidence_reason }
    const normalized = {};
    Object.entries(imageMetadata).forEach(([key, data]) => {
        const copy = { ...data };
        if (copy.version1 && typeof copy.version1 === 'object') {
            const v1 = {};
            Object.entries(copy.version1).forEach(([prop, val]) => {
                if (val && typeof val === 'object' && ('value' in val || 'confidence_score' in val)) {
                    v1[prop] = {
                        value: val.value !== undefined ? val.value : '',
                        confidence_score: val.confidence_score !== undefined ? val.confidence_score : null,
                        confidence_reason: val.confidence_reason !== undefined ? val.confidence_reason : null
                    };
                } else {
                    v1[prop] = { value: val !== undefined && val !== null ? val : '', confidence_score: null, confidence_reason: null };
                }
            });
            copy.version1 = v1;
        }
        normalized[key] = copy;
    });

    const exportData = {
        exportDate: new Date().toISOString(),
        totalImages: Object.keys(normalized).length,
        metadata: normalized
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `ai-metadata-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    // Show success message
    showNotification('✅ AI metadata exported successfully as JSON!');
}

/**
 * Export all metadata as CSV file with dynamic columns based on custom prompts
 */
function exportAsCsv() {
    // Get all unique properties from custom prompts and existing metadata
    const customPrompts = getStoredCustomPrompts();
    const allProperties = new Set();
    
    // Add properties from custom prompts
    customPrompts.forEach(prompt => allProperties.add(prompt.property));
    
    // Add properties from existing metadata
    Object.values(imageMetadata).forEach(item => {
        if (item.version1) {
            Object.keys(item.version1).forEach(prop => allProperties.add(prop));
        }
    });
    
    // If no custom properties, use description only (matches app default)
    if (allProperties.size === 0) {
        allProperties.add('description');
    }
    
    // Create dynamic headers (value + confidence + reason)
    const headers = ['Index', 'Filename'];
    Array.from(allProperties).forEach(prop => {
        const label = prop.charAt(0).toUpperCase() + prop.slice(1);
        headers.push(`AI - ${label}`);
        headers.push(`AI - ${label} Confidence`);
        headers.push(`AI - ${label} Reason`);
    });

    const csvData = [headers];

    Object.entries(imageMetadata).forEach(([id, data], index) => {
        const row = [
            index + 1,
            data.filename || ''
        ];

        // Add dynamic property values
        Array.from(allProperties).forEach(prop => {
            const entry = data.version1?.[prop];
            let valueStr = '';
            let confStr = '';
            let reasonStr = '';
            if (entry && typeof entry === 'object' && ('value' in entry)) {
                valueStr = entry.value || '';
                if (typeof entry.confidence_score === 'number' && entry.confidence_score >= 0 && entry.confidence_score <= 1) {
                    confStr = String(entry.confidence_score);
                }
                if (entry.confidence_reason && typeof entry.confidence_reason === 'string') {
                    reasonStr = entry.confidence_reason;
                }
            } else if (entry !== undefined && entry !== null) {
                valueStr = String(entry);
            }
            row.push(valueStr);
            row.push(confStr);
            row.push(reasonStr);
        });

        csvData.push(row);
    });
    
    const csvContent = csvData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `ai-metadata-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    // Show success message
    showNotification('✅ AI metadata exported successfully as CSV!');
}

/**
 * Import metadata from JSON file
 * @param {Event} event - File input change event
 */
function importFromJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            if (importData.metadata) {
                // Merge imported metadata with existing
                Object.assign(imageMetadata, importData.metadata);
                
                // Update all visible input fields
                updateMetadataInputs();
                
                showNotification(`✅ Successfully imported metadata for ${Object.keys(importData.metadata).length} images!`);
            } else {
                showNotification('❌ Invalid JSON format. Expected metadata object.', 'error');
            }
        } catch (error) {
            showNotification('❌ Error reading JSON file: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

/**
 * Update all visible metadata inputs with imported or updated data
 */
function updateMetadataInputs() {
    // Update all visible metadata inputs with imported data
    const thumbnailItems = document.querySelectorAll('.thumbnail-item');
    thumbnailItems.forEach(item => {
        const indexElement = item.querySelector('.thumbnail-index');
        if (!indexElement) return;
        
        const imageId = indexElement.textContent.replace('#', '');
        const matchingMetadataKey = Object.keys(imageMetadata).find(key => 
            key.includes(`img_${imageId}_`)
        );
        
        if (matchingMetadataKey && imageMetadata[matchingMetadataKey]) {
            const metadata = imageMetadata[matchingMetadataKey];
            const columns = item.querySelectorAll('.metadata-column');
            
            // Update AI column with dynamic fields based on custom prompts
            if (columns[0] && metadata.version1) {
                const customPrompts = getStoredCustomPrompts();
                
                // Update each field based on data-property attribute
                columns[0].querySelectorAll('.metadata-input').forEach(input => {
                    const property = input.getAttribute('data-property');
                    if (!property) return;
                    const field = input.closest('.metadata-field');
                    const pill = field ? field.querySelector('.confidence-pill') : null;
                    const entry = metadata.version1[property];
                    if (entry !== undefined) {
                        if (entry && typeof entry === 'object' && ('value' in entry)) {
                            input.value = entry.value || '';
                            const score = ('confidence_score' in entry) ? entry.confidence_score : null;
                            const reason = ('confidence_reason' in entry) ? entry.confidence_reason : null;
                            if (typeof window.applyConfidencePill === 'function') {
                                window.applyConfidencePill(pill, score, reason);
                            } else if (pill) {
                                // Minimal fallback: hide when no score
                                pill.classList.toggle('confidence-pill--hidden', !(typeof score === 'number' && score >= 0 && score <= 1));
                                if (typeof score === 'number') pill.textContent = Math.round(score * 100) + '%';
                            }
                        } else {
                            input.value = entry || '';
                            if (pill) pill.classList.add('confidence-pill--hidden');
                        }
                    }
                });
            }
        }
    });
}

/**
 * Create a download link and trigger download for any data
 * @param {string} content - Content to download
 * @param {string} filename - Name of the file
 * @param {string} mimeType - MIME type of the file
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
    const dataBlob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    link.click();
    
    // Clean up the object URL
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/**
 * Generate a timestamped filename for exports
 * @param {string} prefix - Filename prefix
 * @param {string} extension - File extension (with dot)
 * @returns {string} Timestamped filename
 */
function generateTimestampedFilename(prefix, extension) {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${prefix}-${timestamp}${extension}`;
}

/**
 * Validate imported JSON data structure
 * @param {Object} data - Imported data to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateImportData(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    if (!data.metadata || typeof data.metadata !== 'object') {
        return false;
    }
    
    // Check if metadata entries have expected structure
    const sampleEntries = Object.values(data.metadata).slice(0, 3);
    for (const entry of sampleEntries) {
        if (!entry || typeof entry !== 'object') {
            return false;
        }
        // Basic structure validation - should have version1 for AI data
        if (!entry.version1 || typeof entry.version1 !== 'object') {
            console.warn('Entry missing version1 (AI) data:', entry);
        }
    }
    
    return true;
}

/**
 * Initialize export/import event handlers
 */
function initializeExportImportHandlers() {
    // Export buttons
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    
    // Import file input
    const importJsonInput = document.getElementById('importJsonInput');
    
    // Add event listeners
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', exportAsJson);
    }
    
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportAsCsv);
    }
    
    if (importJsonInput) {
        importJsonInput.addEventListener('change', importFromJson);
    }
    
    console.log('📁 Export/Import event handlers initialized');
}

// Export functions for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exportAsJson,
        exportAsCsv,
        importFromJson,
        updateMetadataInputs,
        downloadFile,
        generateTimestampedFilename,
        validateImportData,
        initializeExportImportHandlers
    };
}

// Expose functions globally for browser compatibility
window.exportAsJson = exportAsJson;
window.exportAsCsv = exportAsCsv;
window.importFromJson = importFromJson;
window.updateMetadataInputs = updateMetadataInputs;
window.downloadFile = downloadFile;
window.generateTimestampedFilename = generateTimestampedFilename;
window.validateImportData = validateImportData;
window.initializeExportImportHandlers = initializeExportImportHandlers; 