/**
 * Prompt Analyzer Module
 * Analyzes, scores, and enhances custom prompts using meta-prompting
 */

// Track the current prompt being analyzed (for applying enhanced prompt)
let currentAnalyzingPromptId = null;
// Track the type of analysis being performed ('custom' or 'brand')
let currentAnalysisType = 'custom';

/**
 * Meta-prompt for analyzing user prompts
 * This is sent to the LLM to evaluate and improve the user's custom prompt
 */
const META_PROMPT = `You are an expert prompt engineer specializing in LLM prompts for image metadata extraction. Your task is to analyze, score, and improve a user's CUSTOM PROMPT that will be used to extract specific attributes from images in Adobe Experience Manager.

═══════════════════════════════════════════════════════════════════════════════
BRAND CONTEXT (FOR AWARENESS ONLY - DO NOT ANALYZE)
═══════════════════════════════════════════════════════════════════════════════
The following brand prompt is PREPENDED to the custom prompt when sent to the LLM.
Be aware of this context but do NOT analyze or enhance it - only analyze the CUSTOM PROMPT below.

{brand_prompt_context}

═══════════════════════════════════════════════════════════════════════════════
CONTEXT
═══════════════════════════════════════════════════════════════════════════════
The user's custom prompt (combined with the brand prompt above) will be sent to GPT-4o along with an image. The response will be used as asset metadata. Common use cases include:
- Product categorization (e.g., "electronics", "clothing", "food")
- Brand/logo detection
- Sentiment or mood classification
- Color extraction
- Custom business-specific attributes

NOTE: The system prompt (not visible here) handles output format (JSON). The custom prompt should focus on WHAT to extract and the rules/constraints, NOT on output format.

═══════════════════════════════════════════════════════════════════════════════
EVALUATION CRITERIA (Score each 0-100)
═══════════════════════════════════════════════════════════════════════════════

1. TASK CLARITY (Weight: 20%)
   - Is it crystal clear what value/attribute the LLM should extract?
   - Is the task specific and unambiguous?
   - Would someone unfamiliar with the domain understand what to do?

   RED FLAGS: Vague verbs like "analyze", "describe", "identify" without specifics

2. VALID VALUES (Weight: 20%)
   - If categorical, are all valid/allowed values explicitly listed?
   - Are value constraints clear (e.g., "choose ONE from this list")?
   - Is it clear what type of value is expected (single word, phrase, etc.)?

   RED FLAGS: No enumeration of allowed values, unclear if single or multiple values expected

3. EMPTY/NULL HANDLING (Weight: 20%)
   - Does it specify what to return when the attribute is not found?
   - Does it specify what to return when the attribute doesn't apply?
   - Does it use concrete language ("return empty string", "return null") vs vague ("leave blank")?

   RED FLAGS: No mention of edge cases, ambiguous instructions for missing values

4. NEGATIVE CONSTRAINTS (Weight: 15%)
   - Does it explicitly forbid unwanted behaviors?
   - Does it say "NO explanations", "NO guessing", "NO commentary"?
   - Does it forbid hallucinating or making assumptions?

   RED FLAGS: Only says what TO do, never what NOT to do

5. EXAMPLES PROVIDED (Weight: 15%)
   - Does it include at least one example of expected output?
   - Does it show edge cases (empty response, uncertain cases)?
   - Are examples realistic and helpful?

   RED FLAGS: No examples at all

6. STRUCTURE & READABILITY (Weight: 10%)
   - Is the prompt organized into clear sections?
   - Is it scannable (not a wall of text)?
   - Is the length appropriate (not too short, not excessively long)?
   - Are critical rules emphasized or repeated?

   RED FLAGS: Wall of text, no structure, critical rules buried or mentioned only once

═══════════════════════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════════════════════

Analyze the CUSTOM PROMPT below (considering the brand context above) and provide:

1. SCORE BREAKDOWN
   - Score each criterion (0-100)
   - Calculate weighted total score
   - Provide letter grade (A: 90+, B: 80-89, C: 70-79, D: 60-69, F: <60)

2. ISSUES IDENTIFIED
   - List specific problems found
   - Categorize by severity: CRITICAL, HIGH, MEDIUM, LOW
   - Explain WHY each is a problem
   - Do NOT flag issues that the brand prompt already addresses
   - DO flag if the custom prompt conflicts with or duplicates the brand prompt

3. ENHANCED PROMPT
   - Rewrite the CUSTOM PROMPT only (not the brand prompt)
   - Preserve the user's intent completely
   - Add missing elements (format spec, examples, constraints)
   - Structure with clear sections: TASK, RULES, OUTPUT FORMAT, EXAMPLES, REMINDER
   - Consider how it will work together with the brand prompt
   - FORMAT WITH LINE BREAKS: Use \\n for newlines to create readable structure:
     * Put each section header (TASK:, RULES:, OUTPUT FORMAT:, etc.) on its own line
     * Put each numbered rule on its own line
     * Add blank lines between major sections
     * Example: "TASK: Extract color.\\n\\nRULES:\\n1. Return only one color.\\n2. Use lowercase.\\n\\nOUTPUT FORMAT:\\n..."

4. CHANGES MADE
   - List each improvement made
   - Explain the reasoning

═══════════════════════════════════════════════════════════════════════════════
CUSTOM PROMPT TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

{user_prompt}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return your analysis as JSON with this exact structure:

{
  "score": {
    "total": <0-100>,
    "grade": "<A/B/C/D/F>",
    "breakdown": {
      "task_clarity": <0-100>,
      "valid_values": <0-100>,
      "empty_null_handling": <0-100>,
      "negative_constraints": <0-100>,
      "examples_provided": <0-100>,
      "structure_readability": <0-100>
    }
  },
  "issues": [
    {
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
      "category": "<criterion name>",
      "problem": "<what's wrong>",
      "impact": "<why it matters>",
      "fix": "<specific suggestion>"
    }
  ],
  "enhanced_prompt": "<the improved prompt>",
  "changes_made": [
    {
      "change": "<what was changed>",
      "reason": "<why>"
    }
  ],
  "summary": "<2-3 sentence overall assessment>"
}

CRITICAL REMINDER: Return ONLY valid JSON. No markdown code blocks. No explanations outside the JSON structure.`;

/**
 * Meta-prompt for analyzing BRAND prompts specifically
 * Brand prompts provide context that gets prepended to all task-specific prompts
 */
const BRAND_META_PROMPT = `You are an expert prompt engineer specializing in brand context prompts for LLM-based metadata extraction systems. Your task is to analyze, score, and improve a user's BRAND PROMPT.

═══════════════════════════════════════════════════════════════════════════════
CONTEXT
═══════════════════════════════════════════════════════════════════════════════
A brand prompt is a PREFIX that gets prepended to every task-specific prompt before being sent to the LLM. It provides consistent brand context across all metadata generation tasks.

Good brand prompts:
- Establish brand identity, voice, and tone
- Are concise (since they're repeated with every request)
- Provide useful context without being prescriptive about tasks
- Don't include task-specific instructions (those belong in custom prompts)

Bad brand prompts:
- Are too long or verbose
- Include specific task instructions
- Conflict with or override task-specific prompts
- Are vague or don't add meaningful context

═══════════════════════════════════════════════════════════════════════════════
EVALUATION CRITERIA (Score each 0-100)
═══════════════════════════════════════════════════════════════════════════════

1. BRAND CLARITY (Weight: 25%)
   - Does it clearly communicate brand identity?
   - Is the brand voice/tone well-defined?
   - Are brand values or guidelines clear?

   RED FLAGS: Vague brand description, no clear identity, generic statements

2. CONCISENESS (Weight: 25%)
   - Is it appropriately brief for a prefix?
   - Does every sentence add value?
   - Could it be shorter without losing meaning?

   RED FLAGS: Wall of text, repetitive statements, unnecessary filler

3. SCOPE APPROPRIATENESS (Weight: 20%)
   - Does it stick to brand context only?
   - Does it avoid task-specific instructions?
   - Will it work well with various downstream prompts?

   RED FLAGS: Contains task instructions, specifies output formats, overrides task behavior

4. CONTEXTUAL VALUE (Weight: 20%)
   - Does it provide useful context for metadata generation?
   - Will it help the LLM make better decisions?
   - Is the information actionable?

   RED FLAGS: Irrelevant information, doesn't help with image analysis, too abstract

5. STRUCTURE & READABILITY (Weight: 10%)
   - Is it well-organized?
   - Is it easy to parse quickly?
   - Is formatting appropriate?

   RED FLAGS: Poorly organized, hard to read, inconsistent formatting

═══════════════════════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════════════════════

Analyze the following brand prompt and provide:

1. SCORE BREAKDOWN
   - Score each criterion (0-100)
   - Calculate weighted total score
   - Provide letter grade (A: 90+, B: 80-89, C: 70-79, D: 60-69, F: <60)

2. ISSUES IDENTIFIED
   - List specific problems found
   - Categorize by severity: CRITICAL, HIGH, MEDIUM, LOW
   - Explain WHY each is a problem for a brand prompt specifically

3. ENHANCED PROMPT
   - Rewrite the brand prompt following best practices
   - Keep it concise but comprehensive
   - Preserve the user's brand intent completely
   - Focus on brand context, not task instructions
   - FORMAT WITH LINE BREAKS: Use \\n for newlines to create readable structure:
     * Separate distinct brand aspects onto their own lines
     * Example: "You are a marketing assistant for Acme Corp.\\n\\nBrand values: Innovation, Quality, Trust.\\nTone: Professional yet approachable."

4. CHANGES MADE
   - List each improvement made
   - Explain the reasoning

═══════════════════════════════════════════════════════════════════════════════
BRAND PROMPT TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

{brand_prompt}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return your analysis as JSON with this exact structure:

{
  "score": {
    "total": <0-100>,
    "grade": "<A/B/C/D/F>",
    "breakdown": {
      "brand_clarity": <0-100>,
      "conciseness": <0-100>,
      "scope_appropriateness": <0-100>,
      "contextual_value": <0-100>,
      "structure_readability": <0-100>
    }
  },
  "issues": [
    {
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
      "category": "<criterion name>",
      "problem": "<what's wrong>",
      "impact": "<why it matters for a brand prompt>",
      "fix": "<specific suggestion>"
    }
  ],
  "enhanced_prompt": "<the improved brand prompt>",
  "changes_made": [
    {
      "change": "<what was changed>",
      "reason": "<why>"
    }
  ],
  "summary": "<2-3 sentence overall assessment of the brand prompt>"
}

CRITICAL REMINDER: Return ONLY valid JSON. No markdown code blocks. No explanations outside the JSON structure.`;

/**
 * Get API configuration from localStorage (same source as main app)
 * @returns {Object|null} - API configuration or null if not configured
 */
function getApiConfig() {
    try {
        const savedConfig = localStorage.getItem('metadataApiConfig');
        if (savedConfig) {
            return JSON.parse(savedConfig);
        }
    } catch (error) {
        console.error('Error loading API configuration:', error);
    }
    return null;
}

/**
 * Analyze a user's custom prompt using the meta-prompt
 * @param {string} userPrompt - The user's custom prompt to analyze
 * @returns {Promise<Object>} - Analysis result with score, issues, enhanced_prompt, etc.
 */
async function analyzePrompt(userPrompt) {
    // Get the API configuration from localStorage
    const config = getApiConfig();

    if (!config || !config.openaiUrl || !config.deployment || !config.apiVersion) {
        throw new Error('API not configured. Please configure the API settings first.');
    }

    // Get brand prompt context (for awareness, not analysis)
    const brandPromptContext = localStorage.getItem('brandPrompt') || '';
    const brandContextText = brandPromptContext.trim()
        ? brandPromptContext
        : '(No brand prompt configured - the custom prompt will be used alone)';

    // Build the full prompt by inserting brand context and user's prompt
    const fullPrompt = META_PROMPT
        .replace('{brand_prompt_context}', brandContextText)
        .replace('{user_prompt}', userPrompt);

    // Build the API payload
    const payload = buildAnalyzerPayload(fullPrompt, config);

    // Make the API call
    const url = `${config.openaiUrl}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': config.apiKey
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Parse and return the response
    return parseAnalyzerResponse(data);
}

/**
 * Analyze a brand prompt using the brand-specific meta-prompt
 * @param {string} brandPromptText - The brand prompt to analyze
 * @returns {Promise<Object>} - Analysis result with score, issues, enhanced_prompt, etc.
 */
async function analyzeBrandPrompt(brandPromptText) {
    // Get the API configuration from localStorage
    const config = getApiConfig();

    if (!config || !config.openaiUrl || !config.deployment || !config.apiVersion) {
        throw new Error('API not configured. Please configure the API settings first.');
    }

    // Build the full prompt by inserting the brand prompt
    const fullPrompt = BRAND_META_PROMPT.replace('{brand_prompt}', brandPromptText);

    // Build the API payload
    const payload = buildAnalyzerPayload(fullPrompt, config);

    // Make the API call
    const url = `${config.openaiUrl}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': config.apiKey
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Parse and return the response
    return parseAnalyzerResponse(data);
}

/**
 * Build the API payload for the analyzer
 * @param {string} prompt - The full meta-prompt with user prompt inserted
 * @param {Object} config - API configuration
 * @returns {Object} - API payload
 */
function buildAnalyzerPayload(prompt, config) {
    return {
        messages: [
            {
                role: "system",
                content: "You are an expert prompt engineer. Analyze the provided prompt and return ONLY valid JSON. No markdown, no code blocks, no explanations outside the JSON structure."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        max_tokens: 4000,
        temperature: 0.3  // Low temperature for consistent, analytical responses
    };
}

/**
 * Balance braces in JSON by removing extra closing braces
 * This handles cases where LLM outputs spurious } characters
 * @param {string} jsonStr - The JSON string with potentially unbalanced braces
 * @returns {string} - JSON string with balanced braces
 */
function balanceBraces(jsonStr) {
    // Parse character by character, tracking brace depth
    let result = '';
    let braceDepth = 0;
    let bracketDepth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];

        if (escapeNext) {
            result += char;
            escapeNext = false;
            continue;
        }

        if (char === '\\' && inString) {
            result += char;
            escapeNext = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            result += char;
            continue;
        }

        if (inString) {
            result += char;
            continue;
        }

        // Not in string, handle braces
        if (char === '{') {
            braceDepth++;
            result += char;
        } else if (char === '}') {
            if (braceDepth > 0) {
                braceDepth--;
                result += char;
            }
            // Skip extra closing braces
        } else if (char === '[') {
            bracketDepth++;
            result += char;
        } else if (char === ']') {
            if (bracketDepth > 0) {
                bracketDepth--;
                result += char;
            }
            // Skip extra closing brackets
        } else {
            result += char;
        }
    }

    // Add any missing closing braces/brackets
    while (braceDepth > 0) {
        result += '}';
        braceDepth--;
    }
    while (bracketDepth > 0) {
        result += ']';
        bracketDepth--;
    }

    return result;
}

/**
 * Attempt to repair common JSON issues from LLM output
 * @param {string} jsonStr - The potentially malformed JSON string
 * @returns {string} - Repaired JSON string
 */
function repairJson(jsonStr) {
    let repaired = jsonStr;

    // Fix missing commas between properties (e.g., "value"\n  "key" -> "value",\n  "key")
    // This regex finds a closing quote/bracket/brace followed by whitespace and an opening quote
    repaired = repaired.replace(/("|\]|\})\s*\n(\s*)"(?!:)/g, '$1,\n$2"');

    // Fix missing commas after } or ] followed by "key":
    repaired = repaired.replace(/(\}|\])\s*\n(\s*)"([^"]+)":/g, '$1,\n$2"$3":');

    // Fix trailing commas before } or ]
    repaired = repaired.replace(/,(\s*[\}\]])/g, '$1');

    // Fix spurious closing brace after string value followed by comma and key
    // Pattern: "value"\n  },\n  "key": -> "value",\n  "key":
    repaired = repaired.replace(/"(\s*)\},\s*\n(\s*)"([^"]+)":/g, '"$1,\n$2"$3":');

    // Fix spurious closing brace after string value followed by newline and key
    // Pattern: "value"\n  }\n  "key": -> "value",\n  "key":
    repaired = repaired.replace(/"(\s*)\}\s*\n(\s*)"([^"]+)":/g, '"$1,\n$2"$3":');

    return repaired;
}

/**
 * Parse the API response and extract the analysis
 * @param {Object} response - Raw API response
 * @returns {Object} - Parsed analysis result
 */
function parseAnalyzerResponse(response) {
    try {
        const content = response.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('Empty response from API');
        }

        console.log('Raw API response content:', content);

        // Try to extract JSON from the response
        let jsonStr = content.trim();

        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        // Try to find JSON object boundaries if there's extra content
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }

        // Try to parse, and if it fails, attempt repair
        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (parseError) {
            console.debug('Initial parse failed, attempting JSON repair...');
            let repairedJson = repairJson(jsonStr);

            // Try parsing after first repair
            try {
                parsed = JSON.parse(repairedJson);
            } catch (secondError) {
                console.debug('First repair failed, trying brace balancing...');
                // Try to balance braces by removing extra closing braces
                repairedJson = balanceBraces(repairedJson);
                console.debug('Brace-balanced JSON:', repairedJson);
                parsed = JSON.parse(repairedJson);
            }
        }

        // If enhanced_prompt is an object with its own enhanced_prompt key, extract it
        if (parsed.enhanced_prompt && typeof parsed.enhanced_prompt === 'object') {
            if (parsed.enhanced_prompt.enhanced_prompt) {
                parsed.enhanced_prompt = parsed.enhanced_prompt.enhanced_prompt;
            } else {
                // Convert object to string representation
                parsed.enhanced_prompt = JSON.stringify(parsed.enhanced_prompt, null, 2);
            }
        }

        // Validate required fields
        if (!parsed.score || typeof parsed.score.total !== 'number') {
            throw new Error('Invalid response structure: missing score');
        }
        if (!parsed.enhanced_prompt) {
            throw new Error('Invalid response structure: missing enhanced_prompt');
        }

        console.log('Parsed analysis result:', parsed);
        return parsed;
    } catch (error) {
        console.error('Error parsing analyzer response:', error);
        console.error('Content that failed to parse:', response.choices?.[0]?.message?.content);
        throw new Error(`Failed to parse analysis: ${error.message}`);
    }
}


/**
 * Show the prompt analyzer modal and run analysis
 * @param {string} promptId - ID of the prompt being analyzed
 * @param {string} promptText - The prompt text to analyze
 */
async function showPromptAnalyzerModal(promptId, promptText) {
    currentAnalyzingPromptId = promptId;
    currentAnalysisType = 'custom';

    const modal = document.getElementById('promptAnalyzerModal');
    const modalTitle = document.getElementById('analyzerModalTitle');
    const originalPromptLabel = document.getElementById('analyzerOriginalPromptLabel');
    const originalPromptEl = document.getElementById('analyzerOriginalPrompt');
    const loadingEl = document.getElementById('analyzerLoading');
    const resultsEl = document.getElementById('analyzerResults');
    const applyBtn = document.getElementById('applyEnhancedPromptBtn');
    const errorEl = document.getElementById('analyzerError');

    // Find the analyze button and show loading state
    const analyzeBtn = document.querySelector(`[data-prompt-id="${promptId}"]`);
    let originalBtnText = '';
    if (analyzeBtn) {
        originalBtnText = analyzeBtn.textContent;
        analyzeBtn.textContent = '⏳ Analyzing...';
        analyzeBtn.disabled = true;
    }

    // Update modal title and labels for custom prompt analysis
    if (modalTitle) modalTitle.textContent = '🔍 Custom Prompt Analyzer';
    if (originalPromptLabel) originalPromptLabel.textContent = 'Your Custom Prompt:';

    // Reset modal state
    originalPromptEl.textContent = promptText;
    loadingEl.style.display = 'block';
    resultsEl.style.display = 'none';
    applyBtn.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';

    // Show modal
    modal.style.display = 'block';

    try {
        // Run the analysis
        const result = await analyzePrompt(promptText);

        // Populate the results
        populateAnalyzerResults(result);

        // Show results, hide loading
        loadingEl.style.display = 'none';
        resultsEl.style.display = 'block';
        applyBtn.style.display = 'inline-block';

        // Store the formatted enhanced prompt for applying later
        applyBtn.dataset.enhancedPrompt = formatEnhancedPrompt(result.enhanced_prompt);

    } catch (error) {
        console.error('Prompt analysis failed:', error);
        loadingEl.style.display = 'none';

        // Show error in modal
        if (errorEl) {
            errorEl.textContent = `❌ Analysis failed: ${error.message}`;
            errorEl.style.display = 'block';
        } else {
            // Fallback: show in results area
            resultsEl.innerHTML = `<div class="analyzer-error">❌ Analysis failed: ${error.message}</div>`;
            resultsEl.style.display = 'block';
        }
    } finally {
        // Restore button state
        if (analyzeBtn) {
            analyzeBtn.textContent = originalBtnText || '🔍 Analyze';
            analyzeBtn.disabled = false;
        }
    }
}

/**
 * Show the brand prompt analyzer modal and run analysis
 * @param {string} brandPromptText - The brand prompt text to analyze
 */
async function showBrandAnalyzerModal(brandPromptText) {
    currentAnalyzingPromptId = null; // Not a custom prompt
    currentAnalysisType = 'brand';

    const modal = document.getElementById('promptAnalyzerModal');
    const modalTitle = document.getElementById('analyzerModalTitle');
    const originalPromptLabel = document.getElementById('analyzerOriginalPromptLabel');
    const originalPromptEl = document.getElementById('analyzerOriginalPrompt');
    const loadingEl = document.getElementById('analyzerLoading');
    const resultsEl = document.getElementById('analyzerResults');
    const applyBtn = document.getElementById('applyEnhancedPromptBtn');
    const errorEl = document.getElementById('analyzerError');

    // Find the analyze brand button and show loading state
    const analyzeBtn = document.getElementById('analyzeBrandPromptBtn');
    let originalBtnText = '';
    if (analyzeBtn) {
        originalBtnText = analyzeBtn.textContent;
        analyzeBtn.textContent = '⏳ Analyzing...';
        analyzeBtn.disabled = true;
    }

    // Update modal title and labels for brand analysis
    if (modalTitle) modalTitle.textContent = '🏷️ Brand Prompt Analyzer';
    if (originalPromptLabel) originalPromptLabel.textContent = 'Your Brand Prompt:';

    // Reset modal state
    originalPromptEl.textContent = brandPromptText;
    loadingEl.style.display = 'block';
    resultsEl.style.display = 'none';
    applyBtn.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';

    // Show modal
    modal.style.display = 'block';

    try {
        // Run the brand analysis
        const result = await analyzeBrandPrompt(brandPromptText);

        // Populate the results
        populateAnalyzerResults(result);

        // Show results, hide loading
        loadingEl.style.display = 'none';
        resultsEl.style.display = 'block';
        applyBtn.style.display = 'inline-block';

        // Store the formatted enhanced prompt for applying later
        applyBtn.dataset.enhancedPrompt = formatEnhancedPrompt(result.enhanced_prompt);

    } catch (error) {
        console.error('Brand prompt analysis failed:', error);
        loadingEl.style.display = 'none';

        // Show error in modal
        if (errorEl) {
            errorEl.textContent = `❌ Analysis failed: ${error.message}`;
            errorEl.style.display = 'block';
        } else {
            // Fallback: show in results area
            resultsEl.innerHTML = `<div class="analyzer-error">❌ Analysis failed: ${error.message}</div>`;
            resultsEl.style.display = 'block';
        }
    } finally {
        // Restore button state
        if (analyzeBtn) {
            analyzeBtn.textContent = originalBtnText || '🔍 Analyze';
            analyzeBtn.disabled = false;
        }
    }
}

/**
 * Populate the analyzer modal with results
 * @param {Object} result - The analysis result
 */
function populateAnalyzerResults(result) {
    // Score circle (compact)
    const scoreCircle = document.getElementById('analyzerScoreCircle');
    const scoreValue = document.getElementById('analyzerScoreValue');

    const score = result.score.total;

    scoreValue.textContent = score;

    // Remove old score classes and add new one based on score value
    scoreCircle.className = 'score-circle-small';
    if (score >= 80) {
        scoreCircle.classList.add('score-high');
    } else if (score >= 60) {
        scoreCircle.classList.add('score-medium');
    } else {
        scoreCircle.classList.add('score-low');
    }

    // Score breakdown as compact chips
    const breakdownEl = document.getElementById('analyzerBreakdown');
    const breakdown = result.score.breakdown;

    // Short labels for chips (works for both custom and brand prompts)
    const criteriaLabels = {
        // Custom prompt criteria
        task_clarity: 'Task',
        valid_values: 'Values',
        empty_null_handling: 'Null Handling',
        negative_constraints: 'Constraints',
        examples_provided: 'Examples',
        structure_readability: 'Structure',
        // Brand prompt criteria
        brand_clarity: 'Clarity',
        conciseness: 'Conciseness',
        scope_appropriateness: 'Scope',
        contextual_value: 'Context'
    };

    breakdownEl.innerHTML = '';
    for (const [key, value] of Object.entries(breakdown)) {
        const label = criteriaLabels[key] || key;
        const { chipClass, icon } = getChipStatus(value);
        breakdownEl.innerHTML += `
            <span class="breakdown-chip ${chipClass}" title="${label}: ${value}/100">
                <span class="chip-icon">${icon}</span>
                ${label}
            </span>
        `;
    }

    // Issues list
    const issuesEl = document.getElementById('analyzerIssues');
    const issuesCountEl = document.getElementById('issuesCount');
    const issuesToggle = document.getElementById('issuesToggle');

    issuesEl.innerHTML = '';

    if (result.issues && result.issues.length > 0) {
        issuesCountEl.textContent = `(${result.issues.length})`;
        result.issues.forEach(issue => {
            const severityClass = `issue-${issue.severity.toLowerCase()}`;
            const severityIcon = getSeverityIcon(issue.severity);
            issuesEl.innerHTML += `
                <div class="issue-item ${severityClass}">
                    <div class="issue-severity">${severityIcon} ${issue.severity}</div>
                    <div class="issue-problem">${issue.problem}</div>
                    <div class="issue-impact"><strong>Impact:</strong> ${issue.impact}</div>
                    <div class="issue-fix"><strong>Fix:</strong> ${issue.fix}</div>
                </div>
            `;
        });
        // Start collapsed
        issuesEl.classList.add('collapsed');
        issuesToggle.classList.remove('expanded');
    } else {
        issuesCountEl.textContent = '(0)';
        issuesEl.innerHTML = '<p class="no-issues">✅ No significant issues found!</p>';
        // Show "no issues" message expanded
        issuesEl.classList.remove('collapsed');
        issuesToggle.classList.add('expanded');
    }

    // Enhanced prompt (with formatting)
    const enhancedEl = document.getElementById('analyzerEnhancedPrompt');
    const formattedPrompt = formatEnhancedPrompt(result.enhanced_prompt);
    enhancedEl.textContent = formattedPrompt;

    // Summary
    const summaryEl = document.getElementById('analyzerSummary');
    summaryEl.textContent = result.summary;
}

/**
 * Format the enhanced prompt for better readability
 * Adds line breaks at logical points if the LLM didn't include them
 * @param {string} prompt - The enhanced prompt text
 * @returns {string} - Formatted prompt with proper line breaks
 */
function formatEnhancedPrompt(prompt) {
    if (!prompt) return '';

    let formatted = prompt;

    // First, normalize any existing \n literals to actual newlines
    formatted = formatted.replace(/\\n/g, '\n');

    // If the prompt already has multiple newlines, assume it's already formatted
    const newlineCount = (formatted.match(/\n/g) || []).length;
    if (newlineCount >= 3) {
        // Already has good formatting, just clean up extra spaces
        return formatted.replace(/\n{3,}/g, '\n\n').trim();
    }

    // Add line breaks before section headers (all caps followed by colon)
    formatted = formatted.replace(/\s*(TASK|RULES|OUTPUT FORMAT|OUTPUT|EXAMPLES|EXAMPLE|REMINDER|IMPORTANT|NOTE|CONSTRAINTS|FORMAT|INSTRUCTIONS|GUIDELINES|CONTEXT|OBJECTIVE|GOAL|REQUIREMENTS|CRITERIA|DEFINITION|DEFINITIONS):/gi, '\n\n$1:');

    // Add line breaks before numbered items (1., 2., etc.)
    formatted = formatted.replace(/\s+(\d+\.)\s/g, '\n$1 ');

    // Add line breaks before bullet points (-, •, *)
    formatted = formatted.replace(/\s+([-•*])\s/g, '\n$1 ');

    // Add line breaks before "Example:" or "Example 1:" patterns
    formatted = formatted.replace(/\s+(Example\s*\d*:)/gi, '\n\n$1');

    // Add line breaks before "Input:" and "Output:" in examples
    formatted = formatted.replace(/\s+(Input:|Output:)/gi, '\n$1');

    // Clean up: remove leading newlines and excessive newlines
    formatted = formatted.replace(/^\n+/, '');
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    return formatted.trim();
}

/**
 * Get chip status (good/medium/bad) based on score
 * @param {number} score - Score 0-100
 * @returns {Object} - { chipClass, icon }
 */
function getChipStatus(score) {
    if (score >= 80) {
        return { chipClass: 'chip-good', icon: '✓' };
    } else if (score >= 60) {
        return { chipClass: 'chip-medium', icon: '–' };
    } else {
        return { chipClass: 'chip-bad', icon: '✗' };
    }
}


/**
 * Get color based on score value
 * @param {number} score - Score 0-100
 * @returns {string} - CSS color
 */
function getScoreColor(score) {
    if (score >= 80) return '#28a745';  // Green
    if (score >= 60) return '#ffc107';  // Yellow
    if (score >= 40) return '#fd7e14';  // Orange
    return '#dc3545';  // Red
}

/**
 * Get icon based on severity
 * @param {string} severity - CRITICAL, HIGH, MEDIUM, LOW
 * @returns {string} - Emoji icon
 */
function getSeverityIcon(severity) {
    switch (severity.toUpperCase()) {
        case 'CRITICAL': return '🔴';
        case 'HIGH': return '🟠';
        case 'MEDIUM': return '🟡';
        case 'LOW': return '🔵';
        default: return '⚪';
    }
}

/**
 * Apply the enhanced prompt to the original prompt field
 * Routes to appropriate handler based on analysis type
 */
function applyEnhancedPrompt() {
    if (currentAnalysisType === 'brand') {
        applyEnhancedBrandPrompt();
    } else {
        applyEnhancedCustomPrompt();
    }
}

/**
 * Apply the enhanced custom prompt to the original prompt field
 */
function applyEnhancedCustomPrompt() {
    const applyBtn = document.getElementById('applyEnhancedPromptBtn');
    const enhancedPrompt = applyBtn.dataset.enhancedPrompt;

    if (!enhancedPrompt || !currentAnalyzingPromptId) {
        showNotification('❌ No enhanced prompt to apply', 'error');
        return;
    }

    // Use the setPromptTextById function from custom-prompts.js to update both array and UI
    if (typeof window.setPromptTextById === 'function') {
        window.setPromptTextById(currentAnalyzingPromptId, enhancedPrompt);
    } else {
        // Fallback: directly update the textarea
        const textarea = document.querySelector(`textarea[data-prompt-id="${currentAnalyzingPromptId}"]`);
        if (textarea) {
            textarea.value = enhancedPrompt;
        }
    }

    // Close the modal
    closeAnalyzerModal();

    // Show success notification
    showNotification('✨ Enhanced prompt applied successfully!', 'success');

    console.log('✨ Applied enhanced prompt to:', currentAnalyzingPromptId);
}

/**
 * Apply the enhanced brand prompt with confirmation dialog
 */
function applyEnhancedBrandPrompt() {
    const applyBtn = document.getElementById('applyEnhancedPromptBtn');
    const enhancedPrompt = applyBtn.dataset.enhancedPrompt;

    if (!enhancedPrompt) {
        showNotification('❌ No enhanced brand prompt to apply', 'error');
        return;
    }

    // Show confirmation dialog since brand prompt affects all custom prompts
    const confirmed = confirm(
        '⚠️ Apply Enhanced Brand Prompt?\n\n' +
        'The brand prompt is prepended to ALL custom prompts. ' +
        'This change will affect all metadata generation.\n\n' +
        'Do you want to continue?'
    );

    if (!confirmed) {
        return;
    }

    // Update the brand prompt textarea in the UI
    const brandTextarea = document.getElementById('brandPromptInput');
    if (brandTextarea) {
        brandTextarea.value = enhancedPrompt;
        // Trigger auto-expand if available
        if (typeof window.autoExpandBrandPrompt === 'function') {
            window.autoExpandBrandPrompt(brandTextarea);
        }
    }

    // Save to localStorage
    localStorage.setItem('brandPrompt', enhancedPrompt);

    // Close the modal
    closeAnalyzerModal();

    // Show success notification
    showNotification('✨ Enhanced brand prompt applied and saved!', 'success');

    console.log('✨ Applied enhanced brand prompt');
}

/**
 * Close the analyzer modal
 */
function closeAnalyzerModal() {
    const modal = document.getElementById('promptAnalyzerModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentAnalyzingPromptId = null;
    currentAnalysisType = 'custom'; // Reset to default
}

/**
 * Initialize analyzer modal event handlers
 */
function initializeAnalyzerHandlers() {
    // Close button
    const closeBtn = document.getElementById('analyzerModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAnalyzerModal);
    }

    // Close button (bottom)
    const closeAnalyzerBtn = document.getElementById('closeAnalyzerBtn');
    if (closeAnalyzerBtn) {
        closeAnalyzerBtn.addEventListener('click', closeAnalyzerModal);
    }

    // Apply enhanced prompt button
    const applyBtn = document.getElementById('applyEnhancedPromptBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', applyEnhancedPrompt);
    }

    // Close on outside click
    const modal = document.getElementById('promptAnalyzerModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAnalyzerModal();
            }
        });
    }

    // Issues toggle (collapsible)
    const issuesToggle = document.getElementById('issuesToggle');
    if (issuesToggle) {
        issuesToggle.addEventListener('click', () => {
            const issuesList = document.getElementById('analyzerIssues');
            if (issuesList) {
                issuesList.classList.toggle('collapsed');
                issuesToggle.classList.toggle('expanded');
            }
        });
    }
}

// Initialize handlers when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnalyzerHandlers);
} else {
    initializeAnalyzerHandlers();
}

// Export for CommonJS (Node.js) if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzePrompt,
        analyzeBrandPrompt,
        showPromptAnalyzerModal,
        showBrandAnalyzerModal,
        applyEnhancedPrompt,
        closeAnalyzerModal,
        initializeAnalyzerHandlers,
        META_PROMPT,
        BRAND_META_PROMPT
    };
}

// Expose functions globally for browser compatibility
window.analyzePrompt = analyzePrompt;
window.analyzeBrandPrompt = analyzeBrandPrompt;
window.showPromptAnalyzerModal = showPromptAnalyzerModal;
window.showBrandAnalyzerModal = showBrandAnalyzerModal;
window.applyEnhancedPrompt = applyEnhancedPrompt;
window.closeAnalyzerModal = closeAnalyzerModal;
window.initializeAnalyzerHandlers = initializeAnalyzerHandlers;
