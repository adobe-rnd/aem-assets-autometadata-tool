/**
 * Metadata API Integration
 * Automatically generates title, description, and tags for images using AI services
 */

class MetadataAPI {
    constructor() {
        // Configuration - Update these URLs with your actual API endpoints
        this.config = {
            openaiUrl: 'https://your-openai-api-endpoint.com/analyze',
            llamaUrl: 'https://your-llama-api-endpoint.com/analyze',
            apiKey: '', // Set your API key here
            timeout: 30000, // 30 seconds timeout
            retryAttempts: 3
        };
    }

    /**
     * Set API configuration
     * @param {Object} config - Configuration object
     * @param {string} config.openaiUrl - AI API endpoint URL
     * @param {string} config.llamaUrl - Llama API endpoint URL
     * @param {string} config.apiKey - API key for authentication
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }

    /**
     * Generate metadata for an image using AI
     * @param {string} imageUrl - URL or base64 data of the image
     * @param {Object} imageInfo - Additional image information
     * @param {number} imageInfo.width - Image width in pixels
     * @param {number} imageInfo.height - Image height in pixels
     * @param {string} imageInfo.format - Image format (jpg, png, etc.)
     * @param {number} imageInfo.size - File size in bytes
     * @param {string} imageInfo.filename - Original filename
     * @param {string} property - Optional specific property to generate (e.g., 'title', 'description', 'keywords')
     * @returns {Promise<Object>} Promise resolving to metadata object
     */
    async generateAIMetadata(imageUrl, imageInfo, property = null) {
        return this.callAPI('openai', imageUrl, imageInfo, property);
    }

    /**
     * Generate metadata for a specific property using custom prompt
     * @param {string} imageUrl - URL or base64 data of the image
     * @param {Object} imageInfo - Additional image information
     * @param {string} property - Property name (e.g., 'title', 'description', 'keywords')
     * @param {string} customPrompt - Custom prompt for this property
     * @returns {Promise<Object>} Promise resolving to metadata object
     */
    async generateCustomPropertyMetadata(imageUrl, imageInfo, property, customPrompt) {
        return this.callAPI('openai', imageUrl, imageInfo, property, customPrompt);
    }

    /**
     * Generate metadata for an image using Llama
     * @param {string} imageUrl - URL or base64 data of the image
     * @param {Object} imageInfo - Additional image information
     * @returns {Promise<Object>} Promise resolving to metadata object
     */
    async generateLlamaMetadata(imageUrl, imageInfo) {
        return this.callAPI('llama', imageUrl, imageInfo);
    }

    /**
     * Generate metadata using both AI and Llama
     * @param {string} imageUrl - URL or base64 data of the image
     * @param {Object} imageInfo - Additional image information
     * @returns {Promise<Object>} Promise resolving to object with both metadata sets
     */
    async generateBothMetadata(imageUrl, imageInfo) {
        try {
            const [aiResult, llamaResult] = await Promise.allSettled([
                this.generateAIMetadata(imageUrl, imageInfo),
                this.generateLlamaMetadata(imageUrl, imageInfo)
            ]);

            return {
                ai: aiResult.status === 'fulfilled' ? aiResult.value : this.getErrorMetadata('AI API failed'),
                llama: llamaResult.status === 'fulfilled' ? llamaResult.value : this.getErrorMetadata('Llama API failed')
            };
        } catch (error) {
            console.error('Error generating metadata:', error);
            return {
                ai: this.getErrorMetadata('AI API failed'),
                llama: this.getErrorMetadata('Llama API failed')
            };
        }
    }

    /**
     * Internal method to call the API
     * @private
     */
    async callAPI(provider, imageUrl, imageInfo, property = null, customPrompt = null) {
        if (provider !== 'openai') {
            console.warn(`Provider ${provider} not supported with Azure AI`);
            return this.getDefaultMetadata();
        }

        // Build Azure AI URL: $OPEN_API_URL/openai/deployments/$OPENAI_DEPLOYMENT/chat/completions?api-version=$OPENAI_API_VERSION
        const baseUrl = this.config.openaiUrl || this.config.openApiUrl;
        const deployment = this.config.deployment;
        const apiVersion = this.config.apiVersion;
        
        if (!baseUrl || !deployment || !apiVersion || baseUrl.includes('your-')) {
            console.warn(`Azure AI configuration incomplete`);
            return this.getDefaultMetadata();
        }

        const url = `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
        const payload = this.buildAzureAIPayload(imageUrl, imageInfo, property, customPrompt);
        
        let lastError;
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                console.log(`Calling Azure AI API (attempt ${attempt}/${this.config.retryAttempts})`);
                
                // Log the equivalent curl command for verification
                this.logCurlCommand(url, payload);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : ''
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
                }

                const result = await response.json();
                return this.parseAzureAIResponse(result, property);

            } catch (error) {
                lastError = error;
                console.error(`Azure AI API attempt ${attempt} failed:`, error.message);
                
                if (attempt < this.config.retryAttempts) {
                    // Wait before retry (exponential backoff)
                    await this.wait(1000 * Math.pow(2, attempt - 1));
                }
            }
        }

        // All attempts failed
        console.error(`Azure AI API failed after ${this.config.retryAttempts} attempts:`, lastError.message);
        return this.getErrorMetadata(`Azure AI API failed: ${lastError.message}`);
    }

    /**
     * Build the Azure AI API payload
     * @private
     */
    buildAzureAIPayload(imageUrl, imageInfo, property = null, customPrompt = null) {
        // Use custom prompt for specific property, or fall back to default
        let prompt;
        
        if (customPrompt) {
            // Use the provided custom prompt
            prompt = customPrompt;
        } else if (property) {
            // Try to get property-specific prompt from stored custom prompts
            const storedPrompts = this.getStoredCustomPrompts();
            const propertyPrompt = storedPrompts.find(p => p.property === property);
            prompt = propertyPrompt ? propertyPrompt.prompt : this.getDefaultPromptForProperty(property);
        } else {
            // Use the general custom prompt or default prompt for asset metadata
            prompt = this.config.customPrompt || `Enrich asset metadata for discoverability.

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

Return in pretty-print JSON format. Do not add Markdown or code block formatting. Use exactly these keys: 'Title' (string), 'Description' (string), and 'Keywords' (string containing a comma-separated list of tags`;
        }

        // Prepend brand prompt if it exists
        const brandPrompt = this.getBrandPrompt();
        if (brandPrompt && brandPrompt.trim()) {
            // Ensure brand prompt ends with a newline if it doesn't already
            const formattedBrandPrompt = brandPrompt.trim().endsWith('\n') ? brandPrompt.trim() : brandPrompt.trim() + '\n';
            prompt = formattedBrandPrompt + '\n' + prompt;
            console.log('🏷️ Prepended brand prompt to custom prompt');
        }

        // Build messages with optional system prompt
        const messages = [];

        const systemPrompt = this.getSystemPrompt ? this.getSystemPrompt().trim() : '';
        console.log('🔍 DEBUG - System prompt length:', systemPrompt.length);
        console.log('🔍 DEBUG - System prompt first 200 chars:', systemPrompt.substring(0, 200));
        if (systemPrompt) {
            messages.push({
                role: "system",
                content: [
                    {
                        type: "text",
                        text: systemPrompt
                    }
                ]
            });
        } else {
            console.log('⚠️ DEBUG - No system prompt being sent!');
        }

        messages.push({
            role: "user",
            content: [
                {
                    type: "text",
                    text: prompt
                },
                {
                    type: "image_url",
                    image_url: {
                        url: imageUrl
                    }
                }
            ]
        });

        return {
            messages,
            max_tokens: 4096,
            temperature: 0.1,
            top_p: 1,
            model: this.config.modelName || "gpt-4-vision-preview",
            response_format: { type: "json_object" }  // Force JSON output from the API
        };
    }

    /**
     * Parse the Azure AI API response
     * @private
     */
    parseAzureAIResponse(response, property) {
        try {
            // Azure AI response format: response.choices[0].message.content
            const content = response.choices?.[0]?.message?.content;
            
            if (!content) {
                console.log('🔍 No content found in response, using full response body');
                console.log('📄 Full response object:', JSON.stringify(response, null, 2));
                
                // Try to extract any text content from the response
                const responseStr = JSON.stringify(response, null, 2);
                
                // Get the custom prompts to determine which fields to populate
                const customPrompts = this.getStoredCustomPrompts();
                const result = {
                    confidence: null,
                    processing_time: null,
                    provider: 'openai',
                    generated_at: new Date().toISOString()
                };
                
                const displayMessage = `📝 Raw Response: ${responseStr}`;
                
                if (property && typeof property === 'string') {
                    // Per-property: wrap raw response in the new object shape
                    result[property] = {
                        value: displayMessage,
                        confidence_score: null,
                        confidence_reason: null
                    };
                    return result;
                } else if (customPrompts.length > 0) {
                    // Populate all custom prompt fields with the raw response
                    customPrompts.forEach(promptConfig => {
                        result[promptConfig.property] = {
                            value: displayMessage,
                            confidence_score: null,
                            confidence_reason: null
                        };
                    });
                    console.log(`📋 Populated ${customPrompts.length} custom fields with raw response`);
                } else {
                    // Default field if no custom prompts (description only)
                    result.description = {
                        value: displayMessage,
                        confidence_score: null,
                        confidence_reason: null
                    };
                    console.log('📋 Populated default field (description) with raw response');
                }

                return result;
            }

            // Try to parse as JSON first, then fallback to plain text
            let metadata;
            try {
                // Clean the content in case there are markdown code blocks
                const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
                metadata = JSON.parse(cleanContent);

                // DEBUG: Log the parsed metadata
                console.log('🔍 DEBUG - Parsed JSON metadata:', JSON.stringify(metadata, null, 2));
                console.log('🔍 DEBUG - Requested property:', property);
                console.log('🔍 DEBUG - Type of parsed metadata:', typeof metadata);

                // Handle case where JSON.parse returns a string (e.g., AI returned "some text" as valid JSON string literal)
                if (typeof metadata === 'string') {
                    console.log('⚠️ DEBUG - AI returned a JSON string literal, not an object. Wrapping as plain text.');
                    const resultKey = property || 'description';
                    return {
                        [resultKey]: {
                            value: this.sanitizeString(metadata),
                            confidence_score: null,
                            confidence_reason: null
                        },
                        provider: 'openai',
                        generated_at: new Date().toISOString()
                    };
                }

                // If the parsed JSON matches the { <property>: <value>, confidence_score, confidence_reason } shape
                if (metadata && typeof metadata === 'object') {
                    const score = (typeof metadata.confidence_score === 'number' && metadata.confidence_score >= 0 && metadata.confidence_score <= 1)
                        ? metadata.confidence_score
                        : null;
                    const reason = (typeof metadata.confidence_reason === 'string' && metadata.confidence_reason.trim() !== '')
                        ? metadata.confidence_reason.trim()
                        : null;

                    // DEBUG: Log extracted score and reason
                    console.log('🔍 DEBUG - Extracted confidence_score:', score, '(raw:', metadata.confidence_score, ')');
                    console.log('🔍 DEBUG - Extracted confidence_reason:', reason);

                    // Determine the value key
                    let valueKey = null;
                    if (property && Object.prototype.hasOwnProperty.call(metadata, property)) {
                        valueKey = property;
                    } else {
                        const keys = Object.keys(metadata).filter(k => k !== 'confidence_score' && k !== 'confidence_reason' && k !== 'provider' && k !== 'generated_at');
                        console.log('🔍 DEBUG - Available value keys (excluding system keys):', keys);
                        if (keys.length === 1) {
                            valueKey = keys[0];
                        } else if (keys.length > 1) {
                            // Multiple keys - take the first one that's not a system field
                            console.log('⚠️ DEBUG - Multiple value keys found, using first one:', keys[0]);
                            valueKey = keys[0];
                        }
                    }

                    console.log('🔍 DEBUG - Selected valueKey:', valueKey);

                    if (valueKey) {
                        const valueRaw = metadata[valueKey];
                        const valueStr = typeof valueRaw === 'string' ? valueRaw : JSON.stringify(valueRaw);
                        // Use the originally requested property name if provided, otherwise use what AI returned
                        const resultKey = property || valueKey;
                        console.log('✅ DEBUG - Returning structured result for:', resultKey, 'with score:', score);
                        return {
                            [resultKey]: {
                                value: this.sanitizeString(valueStr || ''),
                                confidence_score: score,
                                confidence_reason: reason
                            },
                            provider: 'openai',
                            generated_at: new Date().toISOString()
                        };
                    } else {
                        console.log('⚠️ DEBUG - No valueKey found, falling through to legacy handler');
                    }
                }
                
                // Legacy shape: Title/Description/Keywords
                console.log('⚠️ DEBUG - Falling back to legacy Title/Description/Keywords handler');
                console.log('⚠️ DEBUG - This means no valueKey was found. Original metadata:', JSON.stringify(metadata, null, 2));
                return {
                    title: { value: this.sanitizeString(metadata.Title || metadata.title || ''), confidence_score: null, confidence_reason: null },
                    description: { value: this.sanitizeString(metadata.Description || metadata.description || ''), confidence_score: null, confidence_reason: null },
                    tags: { value: this.sanitizeString(metadata.Keywords || metadata.keywords || metadata.tags || ''), confidence_score: null, confidence_reason: null },
                    confidence: null,
                    processing_time: null,
                    provider: 'openai',
                    generated_at: new Date().toISOString()
                };

            } catch (parseError) {
                // If JSON parsing fails, put the raw response in all available fields
                console.log('📝 JSON parsing failed, using raw response content:', content.substring(0, 100) + '...');
                console.log('🔧 Full raw response:', content);

                // Get the custom prompts to determine which fields to populate
                const customPrompts = this.getStoredCustomPrompts();
                const result = {
                    confidence: null,
                    processing_time: null,
                    provider: 'openai',
                    generated_at: new Date().toISOString()
                };

                if (property && typeof property === 'string') {
                    result[property] = {
                        value: this.sanitizeString(content),
                        confidence_score: null,
                        confidence_reason: null
                    };
                    return result;
                } else if (customPrompts.length > 0) {
                    // Populate all custom prompt fields with the raw content
                    customPrompts.forEach(promptConfig => {
                        result[promptConfig.property] = {
                            value: this.sanitizeString(content),
                            confidence_score: null,
                            confidence_reason: null
                        };
                    });
                    console.log(`📋 Populated ${customPrompts.length} custom fields with raw content`);
                } else {
                    // Default field if no custom prompts (description only)
                    result.description = {
                        value: this.sanitizeString(content),
                        confidence_score: null,
                        confidence_reason: null
                    };
                    console.log('📋 Populated default field (description) with raw content');
                }

                return result;
            }

        } catch (error) {
            console.error('Error parsing Azure AI API response:', error);
            return this.getErrorMetadata(`Failed to parse Azure AI response: ${error.message}`);
        }
    }

    /**
     * Parse the API response (legacy method for compatibility)
     * @private
     */
    parseAPIResponse(response, provider, property) {
        if (provider === 'openai') {
            return this.parseAzureAIResponse(response, property);
        }
        
        try {
            // Handle different possible response formats
            const metadata = response.metadata || response.result || response;
            
            return {
                title: this.sanitizeString(metadata.title || ''),
                description: this.sanitizeString(metadata.description || ''),
                tags: this.sanitizeString(metadata.tags || ''),
                confidence: metadata.confidence || null,
                processing_time: metadata.processing_time || null,
                provider: provider,
                generated_at: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Error parsing ${provider} API response:`, error);
            return this.getErrorMetadata(`Failed to parse ${provider} response`);
        }
    }

    /**
     * Get stored custom prompts from localStorage
     * @private
     */
    getStoredCustomPrompts() {
        try {
            const stored = localStorage.getItem('customPrompts');
            if (stored) {
                return JSON.parse(stored);
            } else {
                // First time opening the app - return default description-only custom prompt
                return [
                    {
                        property: 'description',
                        prompt: 'Generate a detailed description for this image. Focus on the main subject, setting, activity, key visual elements, and any visible text or numeric values. Provide 3-5 sentences that would help someone understand what this image contains.'
                    }
                ];
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
     * Get brand prompt from localStorage
     * @private
     */
    getBrandPrompt() {
        try {
            const brandPrompt = localStorage.getItem('brandPrompt');
            return brandPrompt || '';
        } catch (error) {
            console.error('Error loading brand prompt:', error);
            return '';
        }
    }

    /**
     * Get system prompt from localStorage, falling back to default if not set
     * @private
     */
    getSystemPrompt() {
        try {
            const systemPrompt = localStorage.getItem('systemPrompt');
            if (systemPrompt !== null && systemPrompt !== undefined) {
                return systemPrompt;
            }
            // Fall back to default system prompt if nothing is stored
            return typeof getDefaultSystemPrompt === 'function' ? getDefaultSystemPrompt() : '';
        } catch (error) {
            console.error('Error loading system prompt:', error);
            return typeof getDefaultSystemPrompt === 'function' ? getDefaultSystemPrompt() : '';
        }
    }

    /**
     * Get default prompt for a specific property
     * @private
     */
    getDefaultPromptForProperty(property) {
        const defaultPrompts = {
            'title': 'Generate a concise, editorial title (6-10 words) for this image. Focus on the main subject and key visual elements. Only include brand names if they are unmistakably visible. Return only the title text, no additional formatting or explanation.',
            'description': 'Write a detailed description (3-5 sentences) of this image. Start with the main subject, then describe the setting/activity, and finally mention key visual elements. Include any visible numeric values with their units. Return only the description text, no additional formatting or explanation.',
            'keywords': 'Generate up to 12 relevant keywords for this image. Prioritize single keywords first, use multi-word phrases only when contextually necessary. Include visible numeric values with units. Exclude: logo, brand, branding, packaging. Return only the keywords as comma-separated text, no additional formatting or explanation.'
        };
        
        return defaultPrompts[property.toLowerCase()] || `Analyze this image and provide relevant ${property} information. Return only the ${property} text, no additional formatting or explanation.`;
    }

    /**
     * Log the equivalent curl command for debugging
     * @private
     */
    logCurlCommand(url, payload) {
        const headers = [
            `-H "Content-Type: application/json"`,
            this.config.apiKey ? `-H "Authorization: Bearer ${this.config.apiKey.substring(0, 8)}..."` : ''
        ].filter(h => h).join(' \\\n    ');

        const payloadJson = JSON.stringify(payload, null, 2);
        
        console.log(`%c🚀 Equivalent curl command:`, 'color: #4CAF50; font-weight: bold;');
        console.log(`curl -X POST "${url}" \\
    ${headers} \\
    -d '${payloadJson}'`);
        
        console.log(`%c📋 Configuration used:`, 'color: #2196F3; font-weight: bold;');
        console.log(`- Base URL: ${this.config.openaiUrl || this.config.openApiUrl}`);
        console.log(`- Deployment: ${this.config.deployment}`);
        console.log(`- API Version: ${this.config.apiVersion}`);
        console.log(`- Model: ${this.config.modelName}`);
        console.log(`- API Key: ${this.config.apiKey ? this.config.apiKey.substring(0, 8) + '...' : 'Not set'}`);
    }

    /**
     * Sanitize string input
     * @private
     */
    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str.trim().replace(/\s+/g, ' ');
    }

    /**
     * Get default metadata for testing
     * @private
     */
    getDefaultMetadata() {
        return {
            title: 'Sample Title',
            description: 'This is a sample description generated for testing purposes.',
            tags: 'sample, test, placeholder, demo',
            confidence: null,
            processing_time: null,
            provider: 'default',
            generated_at: new Date().toISOString()
        };
    }

    /**
     * Get error metadata
     * @private
     */
    getErrorMetadata(errorMessage) {
        console.log('🚨 API Error occurred, populating fields with error message:', errorMessage);

        // Get the custom prompts to determine which fields to populate
        const customPrompts = this.getStoredCustomPrompts();
        const result = {
            error: errorMessage,
            provider: 'error',
            generated_at: new Date().toISOString()
        };

        // Create a user-friendly error message
        const displayMessage = `❌ Error: ${errorMessage}`;

        if (customPrompts.length > 0) {
            // Populate all custom prompt fields with the error message
            customPrompts.forEach(promptConfig => {
                result[promptConfig.property] = {
                    value: displayMessage,
                    confidence_score: null,
                    confidence_reason: null
                };
            });
            console.log(`🔧 Populated ${customPrompts.length} custom fields with error message`);
        } else {
            // Default field if no custom prompts (description only)
            result.description = {
                value: displayMessage,
                confidence_score: null,
                confidence_reason: null
            };
            console.log('🔧 Populated default field (description) with error message');
        }

        return result;
    }

    /**
     * Wait utility function
     * @private
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test the API configuration
     */
    async testConfiguration() {
        console.log('Testing API configuration...');
        console.log('AI URL:', this.config.openaiUrl);
        console.log('Llama URL:', this.config.llamaUrl);
        console.log('API Key configured:', this.config.apiKey ? 'Yes' : 'No');
        
        // Test with a simple payload
        const testImageInfo = {
            width: 800,
            height: 600,
            format: 'jpg',
            size: 150000,
            filename: 'test.jpg'
        };
        
        try {
            const result = await this.generateBothMetadata('data:image/jpeg;base64,test', testImageInfo);
            console.log('Test result:', result);
            return result;
        } catch (error) {
            console.error('Configuration test failed:', error);
            return null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MetadataAPI;
}

// Global instance for browser usage
if (typeof window !== 'undefined') {
    window.MetadataAPI = MetadataAPI;
}

/**
 * Usage Examples:
 * 
 * // Initialize the API
 * const metadataAPI = new MetadataAPI();
 * 
 * // Configure your endpoints
 * metadataAPI.setConfig({
 *     openaiUrl: 'https://api.openai.com/v1/chat/completions',
 *     llamaUrl: 'https://your-llama-endpoint.com/analyze',
 *     apiKey: 'your-api-key-here'
 * });
 * 
 * // Generate metadata for an image
 * const imageInfo = {
 *     width: 1920,
 *     height: 1080,
 *     format: 'jpg',
 *     size: 245760,
 *     filename: 'sunset.jpg'
 * };
 * 
 * // Get metadata from both providers
 * metadataAPI.generateBothMetadata(imageDataUrl, imageInfo)
 *     .then(result => {
          *         console.log('AI:', result.ai);
 *         console.log('Llama:', result.llama);
 *     });
 * 
 * // Or get from individual providers
 * metadataAPI.generateAIMetadata(imageDataUrl, imageInfo)
 *     .then(metadata => {
 *         console.log('Title:', metadata.title);
 *         console.log('Description:', metadata.description);
 *         console.log('Tags:', metadata.tags);
 *     });
 */ 