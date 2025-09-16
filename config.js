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

// Default custom prompts for first-time users
const DEFAULT_CUSTOM_PROMPTS = [
    {
        property: 'description',
        prompt: 'Generate a detailed description for this image. Focus on the main subject, setting, activity, key visual elements, and any visible text or numeric values. Provide 3-5 sentences that would help someone understand what this image contains.'
    }
];

const DEFAULT_CONFIG = {
    openaiUrl: 'https://your-resource.openai.azure.com',
    apiVersion: '2024-02-15-preview',
    modelName: 'gpt-4-vision-preview',
    deployment: 'your-deployment-name',
    apiKey: 'your-api-key-here',
    timeout: 30000, // in milliseconds
    customPrompt: `Enrich asset metadata for discoverability.

FACETS (use only when clearly visible):
1. Product/type/model/brand
2. Setting/activity/visuals
3. Mood/palette/style
4. People: age, gender, demography
5. Visible text or logos — NEVER make assumptions or name brands that are not absolutely clearly identifiable in the image or overlay/on-pack text
6. All numbers that appear Explicitely on image/overlay (e.g., "500 ml", "v25.3", "iPhone 6")

OUTPUT:
• TITLE (6–10 words) – concise, editorial; name brand only if unmistakable.
• DESCRIPTION (3–5 sentences) – main subject → setting/activity → key visuals; include visible numeric concepts.
• KEYWORDS (up to 12) – prioratize single keywords first; use multi-word only when required contextually (e.g., "soccer player").

RULES:
• All numeric values MUST be tagged with their complete unit or metric as a single keyword Only if Clearly seen in the image/text ("15 oz", "120 ml").
• The following keywords Must be Removed from the keywords list: "logo", "brand", "branding", "packaging" .

Return in pretty-print JSON format. Do not add Markdown or code block formatting. Use exactly these keys: 'Title' (string), 'Description' (string), and 'Keywords' (string containing a comma-separated list of tags`
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