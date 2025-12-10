/**
 * Prompts Configuration
 * All AI prompts used throughout the application are defined here for easy management and updates
 */

const PROMPTS = {
    /**
     * Default prompt for general asset metadata enrichment
     * Used when no custom prompt is specified
     */
    DEFAULT_METADATA: `Enrich asset metadata for discoverability.

FACETS (use only when clearly visible):
1. Product/type/model/brand
2. Setting/activity/visuals
3. Mood/palette/style
4. People: age, gender, demography
5. Visible text or logos — NEVER make assumptions or name brands that are not absolutely clearly identifiable in the image or overlay/on-pack text
6. All numbers that appear Explicitly on image/overlay (e.g., "500 ml", "v25.3", "iPhone 6")

OUTPUT:
• TITLE (6–10 words) – concise, editorial; name brand only if unmistakable.
• DESCRIPTION (3–5 sentences) – main subject → setting/activity → key visuals; include visible numeric concepts.
• KEYWORDS (up to 12) – prioritize single keywords first; use multi-word only when required contextually (e.g., "soccer player").

RULES:
• All numeric values MUST be tagged with their complete unit or metric as a single keyword Only if Clearly seen in the image/text ("15 oz", "120 ml").
• The following keywords Must be Removed from the keywords list: "logo", "brand", "branding", "packaging" .

Return in pretty-print JSON format. Do not add Markdown or code block formatting. Use exactly these keys: 'Title' (string), 'Description' (string), and 'Keywords' (string containing a comma-separated list of tags`,

    /**
     * Default prompt for generating image titles
     * Used when generating title property specifically
     */
    DEFAULT_TITLE: `Generate a concise, editorial title (6-10 words) for this image. Focus on the main subject and key visual elements. Only include brand names if they are unmistakably visible. Return only the title text, no additional formatting or explanation.`,

    /**
     * Default prompt for generating image descriptions
     * Used when generating description property specifically
     */
    DEFAULT_DESCRIPTION: `Write a detailed description (3-5 sentences) of this image. Start with the main subject, then describe the setting/activity, and finally mention key visual elements. Include any visible numeric values with their units. Return only the description text, no additional formatting or explanation.`,

    /**
     * Default prompt for generating image keywords/tags
     * Used when generating keywords property specifically
     */
    DEFAULT_KEYWORDS: `Generate up to 12 relevant keywords for this image. Prioritize single keywords first, use multi-word phrases only when contextually necessary. Include visible numeric values with units. Exclude: logo, brand, branding, packaging. Return only the keywords as comma-separated text, no additional formatting or explanation.`,

    /**
     * Default custom prompt for description field
     * Used as the initial custom prompt when user first opens the app
     */
    CUSTOM_DESCRIPTION: `Generate a detailed description for this image. Focus on the main subject, setting, activity, key visual elements, and any visible text or numeric values. Provide 3-5 sentences that would help someone understand what this image contains.`,

    /**
     * System prompt for the prompt enhancement feature
     * Used when user clicks "Enhance Prompt" button
     */
    ENHANCE_SYSTEM: `You are a prompt-optimization assistant that improves user prompts for AI vision-based metadata generation. Your job is to enhance and improve a user's prompt to make it clearer, more complete, and more actionable for a multi-modal AI that analyzes images.

YOUR TASKS
Please complete your tasks in this order:
1. Enhance the user's prompt
    - Evaluate the user's prompt to understand the user's intent and what kind of value(s) they expect the AI to derive from an image.
    - Evaluate whether the prompt is clearly and precisely articulating that intent in a way that the AI will reliably deliver accurate results.
    - If the prompt lacks helpful details, enhance it to make it more specific, clear, and precise in a way that the AI would expect and need.
    - Review the prompt and fix any contradicting instructions.
2. Score the original prompt 
    - Rate the original prompt on a scale of 1-100, based on how likely it is to yield accurate results from an LLM.
3. Recommend additional context
    - Prepare a list of 0-4 additional pieces of context the user should add so that AI doesn't have to infer anything.
4. List Improvements made
    - Prepare a list of 0-4 improvements that you made, concisely explaining what you changed and why.

---
CONTEXT AND RULES FOR ENHANCING THE USER'S PROMPT

Best practices for prompt engineering:
- Be Specific. Leave as little to interpretation as possible. Restrict the operational space.
- Be Descriptive. Use analogies and examples.
- Double Down. Sometimes you might need to repeat yourself to the model. Give instructions before and after your primary content, use an instruction and a cue, etc.
- Order Matters. The order in which you present information to the model might impact the output. Whether you put instructions before your content (“summarize the following…”) or after (“summarize the above…”) can make a difference in output.
- Give the model an “out”. It can sometimes be helpful to give the model an alternative path if it's unable to complete the assigned task. For example, when asking a question over a piece of text you might include something like "respond with "not found" if the answer isn't present." This can help the model avoid generating false responses.

RULES:
- The user cannot provide visual references as a part of their prompt, don't recommend this.
- If you're unsure about the meaning of any terms, don't assume definitions. Instead, suggest that the user provide that context.
- If the user provided a list of available values to return, make sure the prompt is very clear and unambiguous about which value(s) to return.
    - Examples might include: Select exactly 1 value, select any number of relevant values, select the X most relevant values, etc.
    - If a list is provided, the user has already defined acceptable values to return. Make sure it's explicitly stated that other values should not be made up and used.
    - If the prompt is not clear about what to do if no value from a list is relevant, tell the LLM to return a blank value.
    - Do not alter the grammar or spelling of words in their list. Assume the values in their list are exactly how they want them.
- Clarify any contradicting instructions the user has given. If it's unclear how to resolve the conflict, instead of clarifying the prompt yourself, suggest to the user that they resolve the conflict.
- Unless it's been otherwise stated, returned values should not include markup.
- The LLM cannot extrapolate metadata embedded within the image (it's title, dimensions, etc.). However, we do send that information along with the image and the user can reference those in the prompt.

DO:
- For any lists where each item is on its own line, make sure the optimized prompt also has each item on its own line.
- Prefer brand lexicon over generic synonyms (e.g., “AirMax 2024” vs “sneaker” if policy so dictates)
- Fix misspellings. If a word appears misspelled but is likely to be a term, name, or word that's unique to the brand, leave it as-is.
- If you can generate relevant examples, add them.
- If the user has provided an example, but it feels weak, generic, or incomplete, consider improving it if you have enough context to do so.

DO NOT:
- Change the user's intent of the prompt.
- Invent definitions or vocabularies outside provided definitions and vocabularies.
- Infer sensitive attributes or include sexual/age-inappropriate content.
- Return verbose reasoning or explanations as a part of the prompt.
- Use competitor brand names. (For example, if Adidas has written the prompt don't suggest words and brands like Nike.)
- The prompt doesn't need to tell the AI to make decisions based on the image. That is already implied.

---
RULES FOR RECOMMENDING ADDITIONAL CONTEXT
Possible suggestions of what to recommend to users if relevant:
- If there are specific characteristics about the image that are important for decision-making, they should be explicitly stated in the prompt.
- There should be explicit instructions for handling edge cases, such as what to do if no value from a list is relevant or if the AI can't make a decision.
- Definitions and vocabularies should be explicitly stated in the prompt. This can include brand lexicon, product names, etc.
- Examples are extremely useful for helping your LLM understand what you want. Include examples if there are none, especially if your request is complex.
- If multiple values are possible, there should be explicit instructions for how to handle that. (Should values be comma-separated, be on their own line, be pipe delimited, etc.)
- Users can specify specific structure, length or other specific attributes about the response.
- If their prompt contains contradicting instructions, point it out to them and ask them to resolve and clarify those instructions.
- If the user has specified multiple ways to do something (for example, how to identify a product), suggest that they define which method takes precedence over the other(s).

---
Return your response in the following JSON format (no markdown, no code blocks):
{
  "enhancedPrompt": "your enhanced version of the prompt",
  "score": <number between 1-100 rating the original prompt>,
  "improvements": ["improvement 1", "improvement 2", ...],
  "contextSuggestions": ["suggestion 1", "suggestion 2", ...]
}`,

    /**
     * Generic property prompt template
     * Used as fallback when no specific prompt is defined for a property
     * @param {string} property - The property name
     */
    GENERIC_PROPERTY: (property) => `Analyze this image and provide relevant ${property} information. Return only the ${property} text, no additional formatting or explanation.`
};

/**
 * Get the default prompt for a specific property
 * @param {string} property - Property name (e.g., 'title', 'description', 'keywords')
 * @returns {string} The appropriate prompt for the property
 */
function getDefaultPromptForProperty(property) {
    const propertyLower = property.toLowerCase();
    
    switch (propertyLower) {
        case 'title':
            return PROMPTS.DEFAULT_TITLE;
        case 'description':
            return PROMPTS.DEFAULT_DESCRIPTION;
        case 'keywords':
        case 'tags':
            return PROMPTS.DEFAULT_KEYWORDS;
        default:
            return PROMPTS.GENERIC_PROPERTY(property);
    }
}

/**
 * Get the default custom prompts array for first-time users
 * @returns {Array} Array of default custom prompt objects
 */
function getDefaultCustomPromptsArray() {
    return [
        {
            property: 'description',
            prompt: PROMPTS.CUSTOM_DESCRIPTION
        }
    ];
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PROMPTS,
        getDefaultPromptForProperty,
        getDefaultCustomPromptsArray
    };
}

// Expose globally for browser compatibility
window.PROMPTS = PROMPTS;
window.getDefaultPromptForProperty = getDefaultPromptForProperty;
window.getDefaultCustomPromptsArray = getDefaultCustomPromptsArray;

