# AiBatCustomPrmpt

This repository contains custom prompts for AI Bat.

The GH pages url is https://adobe-rnd.github.io/aem-assets-autometadata-tool/

## Getting Started

1. Clone this repository
2. Enter the config (get from a peer on the project)
3. Add your custom properties and prompts
4. Test and iterate

## Confidence Score and Data Shape

The UI shows a confidence pill next to each metadata property. Values and scores are stored in the following shape:

```
{ "<property>": { "value": "...", "confidence_score": 0.0..1.0 } }
```

Parsing behavior:
- If the model returns a JSON object shaped like `{ <property>: <value>, confidence_score: <0..1> }`, that is used directly.
- If the model returns legacy JSON (e.g., Title/Description/Keywords), values are wrapped as `{ value, confidence_score: null }`.
- If the model returns plain text (not JSON), the text is wrapped as `{ <property>: { value: text, confidence_score: null } }` for per-property calls (or mapped to defaults).

Exports:
- JSON export normalizes all properties to `{ value, confidence_score }`.
- CSV export includes two columns per property: value and confidence (raw score 0..1).

UI:
- Confidence pills display percentage (e.g., 82%) and use color tiers for low/medium/high.

## System Prompt

You can now set a global System Prompt that is included in every Azure OpenAI request as a `role: system` message.

How to use:
1. Open the app and click `🧩 System Prompt` (next to `⚙️ Configure LLM API`).
2. Enter your system-level guidance (e.g., tone, safety, formatting rules) and click Save.
3. The value is stored in `localStorage` and automatically applied to all requests.

Notes:
- Clearing the System Prompt removes it from subsequent requests.
- The existing Brand Prompt continues to prepend to the user prompt text. Both can be used together.
- If the System Prompt is empty, behavior is unchanged from before (no system message).

## Contributing

Please follow the contribution guidelines when adding new prompts. 

