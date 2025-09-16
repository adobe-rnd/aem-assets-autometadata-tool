/**
 * Utility Functions Module
 * Contains standalone helper functions used throughout the application
 */

/**
 * Format bytes to human readable file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "1.5 MB")
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Show a notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - Type of notification ('success' or 'error')
 */
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 3000);
}

/**
 * Wait for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the specified time
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique ID
 * @returns {string} Unique identifier string
 */
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Scroll element into view smoothly
 * @param {HTMLElement} element - Element to scroll to
 * @param {string} behavior - Scroll behavior ('smooth' or 'auto')
 */
function scrollToElement(element, behavior = 'smooth') {
    if (element) {
        element.scrollIntoView({ behavior, block: 'center' });
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy text: ', err);
        return false;
    }
}

/**
 * Check if a file is a valid image based on its extension
 * @param {string} filename - Name of the file
 * @returns {boolean} True if file is an image
 */
function isValidImage(filename) {
    if (!filename || typeof filename !== 'string') return false;
    const extension = filename.split('.').pop().toLowerCase();
    return IMAGE_EXTENSIONS.includes(extension);
}

/**
 * Concatenate imageInfo properties with customPrompt in property_name=value format
 * @param {Object} imageInfo - Image information object
 * @param {number} imageInfo.width - Image width in pixels
 * @param {number} imageInfo.height - Image height in pixels
 * @param {string} imageInfo.format - Image format (jpg, png, etc.)
 * @param {number} imageInfo.size - File size in bytes
 * @param {string} imageInfo.filename - Original filename
 * @param {string} customPrompt - Custom prompt to concatenate with
 * @returns {string} Concatenated string with imageInfo properties and customPrompt
 */
function concatenateImageInfoWithPrompt(imageInfo, customPrompt) {
    if (!imageInfo || typeof imageInfo !== 'object') {
        return customPrompt || '';
    }
    
    if (!customPrompt || typeof customPrompt !== 'string') {
        customPrompt = '';
    }
    
    // Build property=value pairs from imageInfo
    const propertyPairs = [];
    
    // Iterate through all properties in imageInfo
    for (const [key, value] of Object.entries(imageInfo)) {
        if (value !== null && value !== undefined) {
            propertyPairs.push(`- ${key}: ${value}`);
        }
    }
    
    // Join the property pairs
    const imageInfoString = propertyPairs.join('\n');
    
    // Concatenate with custom prompt
    if (imageInfoString && customPrompt) {
        return `Using the following image file information: 
        ${imageInfoString} 
        Do not format or describe the results. Provide the details as plain text. Unless the custom prompt specifies otherwise.
        Now, please proceed with the following custom prompt: ${customPrompt}`;
    } else if (imageInfoString) {
        return imageInfoString;
    } else {
        return customPrompt;
    }
}

// Export functions for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatFileSize,
        showNotification,
        wait,
        generateId,
        debounce,
        scrollToElement,
        copyToClipboard,
        isValidImage,
        concatenateImageInfoWithPrompt
    };
}

// Expose functions globally for browser compatibility
window.formatFileSize = formatFileSize;
window.showNotification = showNotification;
window.wait = wait;
window.generateId = generateId;
window.debounce = debounce;
window.scrollToElement = scrollToElement;
window.copyToClipboard = copyToClipboard;
window.isValidImage = isValidImage;
window.concatenateImageInfoWithPrompt = concatenateImageInfoWithPrompt; 