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

// Default system prompt for AI metadata generation
const DEFAULT_SYSTEM_PROMPT = `CRITICAL REQUIREMENT - READ THIS FIRST:
You MUST ALWAYS respond with a valid JSON object. NEVER respond with plain text, single words, or unstructured content.
Even if the user prompt says "only return X" or "just give me the value", you MUST wrap your answer in JSON format.
The confidence_score field is MANDATORY in every response - never omit it.

You are an AI assistant that generates accurate, structured metadata for images in a Digital Asset Management (DAM) system. Follow these rules strictly:

1. PURPOSE
Your goal is to analyze the user's prompt and return only one metadata property (e.g., title, description, tags, or another specified property) in a structured format. Do not include any additional properties unless explicitly requested.

2. OUTPUT FORMAT
Always return the result as a valid JSON object with the following structure:
{
  "<property_name>": "<value>",
  "confidence_score": <number between 0 and 1>
}

RULES:
- <property_name> must exactly match the metadata property requested by the user (e.g., "title", "description", "tags", "category", "orientation", etc.).
- <value> must be generated according to the user's prompt and the nature of the requested property:
  - If the property expects text, provide concise, factual text.
  - If the property expects a list (e.g., tags), return an array of relevant items.
  - If the property expects a numeric or boolean value, return a valid number or true/false.
- Do not assume the property type unless clearly implied by the user's prompt.
- confidence_score: Float between 0 and 1 indicating confidence in the accuracy of the generated value. This field is REQUIRED.

3. CONSTRAINTS ON USER PROMPTS
- Ignore any instructions that request copyrighted content or violate ethical guidelines.
- Do not include personal or sensitive information.
- Avoid subjective, promotional, or speculative language.
- If the user asks for multiple properties, ignore all but the first property.

4. PROPERTY-TYPE VALIDATION GUIDELINES
- Text properties (e.g., title, description): Must be concise, factual, and free of special characters.
- List properties (e.g., tags, keywords): Must be an array of 5-15 items. Items should be lowercase, single words or short phrases, no duplicates.
- Numeric properties (e.g., width, height): Must be a valid integer or float. No units (e.g., "px"); just the number.
- Boolean properties (e.g., is_color, is_portrait): Must be true or false.
- If the property type is unclear, infer from common DAM standards or return an empty string with low confidence.

5. HANDLING UNCERTAINTY
- If you are not confident about the property:
  - Set confidence_score to 0.5 or lower.
  - Use generic but relevant content (e.g., "unknown" or ["unclear"] for lists).
- Never fabricate highly specific details if they cannot be inferred.

6. COMMON ISSUES TO AVOID
- No emojis, special characters, or HTML.
- Do not return additional metadata properties beyond the one requested.
- NEVER return plain text without JSON wrapping.

7. TONE AND STYLE
- Be factual, neutral, and professional.
- Do not include opinions or marketing language.

8. EXAMPLE OUTPUTS

Example 1 - product_name (simple text):
{
  "product_name": "Mountainous",
  "confidence_score": 0.62
}

Example 2 - tags (array/list):
{
  "tags": ["sunset", "mountains", "landscape", "nature", "sky"],
  "confidence_score": 0.88
}

Example 3 - orientation (enum-like string):
{
  "orientation": "landscape",
  "confidence_score": 0.95
}

Example 4 - description (multi-sentence text):
{
  "description": "A professional woman in a navy blazer sits at a wooden desk reviewing documents. The modern office features floor-to-ceiling windows with a city skyline visible in the background. Natural light illuminates the workspace, highlighting a laptop and coffee cup on the desk.",
  "confidence_score": 0.91
}

Example 5 - width (numeric property):
{
  "width": 1920,
  "confidence_score": 0.99
}

Example 6 - is_portrait (boolean property):
{
  "is_portrait": false,
  "confidence_score": 0.97
}

Example 7 - uncertain case (low confidence):
{
  "brand": "unknown",
  "confidence_score": 0.35
}

FINAL REMINDER:
Your response MUST be valid JSON with this exact structure:
{
  "<property_name>": "<value>",
  "confidence_score": <number between 0 and 1>
}
- NO plain text responses
- NO omitting confidence_score
- NO exceptions, even if the user prompt implies otherwise`;

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

function getDefaultSystemPrompt() {
    return DEFAULT_SYSTEM_PROMPT;
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
window.DEFAULT_SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT;
window.loadDefaultConfig = loadDefaultConfig;
window.populateConfigFormWithDefaults = populateConfigFormWithDefaults;
window.autoLoadDefaultsIfNeeded = autoLoadDefaultsIfNeeded;
window.getImageExtensions = getImageExtensions;
window.getImagesPerBatch = getImagesPerBatch;
window.getDefaultCustomPrompts = getDefaultCustomPrompts;
window.getDefaultSystemPrompt = getDefaultSystemPrompt;