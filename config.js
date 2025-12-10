// Default AI Configuration
// These values correspond to what would be in a .env file:
// OPENAI_API_URL=https://api.openai.com/v1/chat/completions
// OPENAI_API_VERSION=2024-02-15-preview
// OPENAI_MODEL_NAME=gpt-4-vision-preview
// OPENAI_DEPLOYMENT=your-deployment-name
// OPENAI_API_KEY=sk-your-api-key-here
// OPENAI_TIMEOUT=30

// Application Configuration Constants
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif'];
const IMAGES_PER_BATCH = 100;

const DEFAULT_CUSTOM_PROMPTS = getDefaultCustomPromptsArray();

const DEFAULT_CONFIG = {
    openaiUrl: 'https://your-resource.openai.azure.com',
    apiVersion: '2024-02-15-preview',
    modelName: 'gpt-4-vision-preview',
    deployment: 'your-deployment-name',
    apiKey: 'your-api-key-here',
    timeout: 30000, // in milliseconds
    customPrompt: PROMPTS.DEFAULT_METADATA
};

// Function to load default configuration
function loadDefaultConfig() {
    return DEFAULT_CONFIG;
}

// Function to populate configuration form with default values
function populateConfigFormWithDefaults() {
    const config = loadDefaultConfig();
    
    document.getElementById('openaiUrlInput').value = config.openaiUrl;
    document.getElementById('apiVersionInput').value = config.apiVersion;
    document.getElementById('modelNameInput').value = config.modelName;
    document.getElementById('deploymentInput').value = config.deployment;
    document.getElementById('apiKeyInput').value = config.apiKey;
    document.getElementById('timeoutInput').value = config.timeout / 1000; // convert to seconds
    
    // Populate custom prompt if field exists
    if (document.getElementById('customPromptInput')) {
        document.getElementById('customPromptInput').value = config.customPrompt;
    }
}

// Get application configuration constants
function getImageExtensions() {
    return IMAGE_EXTENSIONS;
}

function getImagesPerBatch() {
    return IMAGES_PER_BATCH;
}

function getDefaultCustomPrompts() {
    return DEFAULT_CUSTOM_PROMPTS;
}

// Auto-load defaults if no configuration exists in localStorage
function autoLoadDefaultsIfNeeded() {
    const savedConfig = localStorage.getItem('metadataApiConfig');
    if (!savedConfig) {
        // No saved configuration exists, use defaults
        const defaultConfig = loadDefaultConfig();
        
        // Set the API configuration
        if (typeof metadataAPI !== 'undefined') {
            metadataAPI.setConfig(defaultConfig);
        }
        
        // Save defaults to localStorage
        localStorage.setItem('metadataApiConfig', JSON.stringify(defaultConfig));
        
        console.log('Loaded default configuration values');
        return true;
    }
    return false;
}

// Expose functions globally for browser compatibility
window.DEFAULT_CONFIG = DEFAULT_CONFIG;
window.IMAGE_EXTENSIONS = IMAGE_EXTENSIONS;
window.IMAGES_PER_BATCH = IMAGES_PER_BATCH;
window.DEFAULT_CUSTOM_PROMPTS = DEFAULT_CUSTOM_PROMPTS;
window.loadDefaultConfig = loadDefaultConfig;
window.populateConfigFormWithDefaults = populateConfigFormWithDefaults;
window.autoLoadDefaultsIfNeeded = autoLoadDefaultsIfNeeded;
window.getImageExtensions = getImageExtensions;
window.getImagesPerBatch = getImagesPerBatch;
window.getDefaultCustomPrompts = getDefaultCustomPrompts; 