# Structured Response Format Specification

**Date:** 2024-12-21  
**Purpose:** Define the JSON format for Ollama structured responses

## Response Format

### Primary Format (Structured JSON)

```json
{
  "chunks": [
    {
      "text": "Hello! 😊 It's so lovely to meet you!",
      "emotion": "happy",
      "icon": "😊",
      "pause": 0.5,
      "emphasis": false
    },
    {
      "text": "Welcome! I'm excited to chat with you and help you with your English.",
      "emotion": "excited",
      "icon": "🎉",
      "pause": 0.3,
      "emphasis": false
    },
    {
      "text": "How are you doing today?",
      "emotion": "encouraging",
      "icon": "💬",
      "pause": 0.8,
      "emphasis": true
    }
  ],
  "metadata": {
    "totalChunks": 3,
    "estimatedDuration": 8.5,
    "tone": "friendly and encouraging",
    "language": "en"
  }
}
```

---

## Field Specifications

### Chunks Array

Each chunk object contains:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `text` | string | ✅ | The text content of the chunk (1-3 sentences, max 200 chars) | `"Hello! How are you?"` |
| `emotion` | string | ❌ | Emotion indicator | `"happy"`, `"encouraging"`, `"neutral"`, `"excited"`, `"calm"` |
| `icon` | string | ❌ | Emoji or icon identifier | `"😊"`, `"🎉"`, `"💬"`, `"✨"` |
| `pause` | number | ❌ | Pause duration after this chunk in seconds (0.0-2.0) | `0.5`, `1.0` |
| `emphasis` | boolean | ❌ | Whether this chunk should be emphasized | `true`, `false` |

### Metadata Object

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `totalChunks` | number | ✅ | Total number of chunks | `3` |
| `estimatedDuration` | number | ❌ | Estimated total duration in seconds | `8.5` |
| `tone` | string | ❌ | Overall tone of the response | `"friendly and encouraging"` |
| `language` | string | ❌ | Language code | `"en"` |

---

## Emotion Values

Valid emotion values:
- `"happy"` - Cheerful, positive
- `"encouraging"` - Supportive, motivating
- `"neutral"` - Neutral, balanced
- `"excited"` - Enthusiastic, energetic
- `"calm"` - Peaceful, relaxed

---

## Icon Guidelines

Icons should be:
- Relevant to the chunk content
- Appropriate for an English tutor context
- Emojis or Unicode characters
- Examples: `😊`, `🎉`, `💬`, `✨`, `👍`, `📚`, `🎯`

---

## Pause Duration Guidelines

- **Short pause (0.3-0.5s):** Between related sentences
- **Medium pause (0.5-1.0s):** Between different topics
- **Long pause (1.0-2.0s):** Before important questions or emphasis

---

## Chunk Size Guidelines

- **Minimum:** 1 sentence or meaningful phrase
- **Maximum:** 200 characters or 3 sentences
- **Optimal:** 1-2 sentences, 50-150 characters
- **Split long sentences:** If a single sentence exceeds 200 chars, split it

---

## System Prompt Template

```
You are a friendly English tutor. 
When responding, ALWAYS format your response as JSON with this EXACT structure:

{
  "chunks": [
    {
      "text": "Your sentence or phrase here",
      "emotion": "happy|encouraging|neutral|excited|calm",
      "icon": "😊",
      "pause": 0.5,
      "emphasis": false
    }
  ],
  "metadata": {
    "totalChunks": 1,
    "estimatedDuration": 3.0,
    "tone": "friendly",
    "language": "en"
  }
}

Rules:
1. Split your response into natural chunks (1-3 sentences each, max 200 chars)
2. Add appropriate emotions and icons to each chunk
3. Set pause duration between chunks (0.3-1.0 seconds)
4. Mark important chunks with emphasis: true
5. Return ONLY valid JSON, no other text before or after
6. Ensure all chunks are complete sentences or meaningful phrases
7. Keep chunks conversational and natural

Return your response as JSON only.
```

---

## Validation Rules

### Required Fields
- `chunks` array (must have at least 1 chunk)
- Each chunk must have `text` field
- `metadata.totalChunks` must match actual chunk count

### Optional Fields
- `emotion`, `icon`, `pause`, `emphasis` are optional
- If missing, defaults will be applied:
  - `emotion`: `"neutral"`
  - `icon`: `""` (no icon)
  - `pause`: `0.5` (default pause)
  - `emphasis`: `false`

### Validation Checks
1. JSON is valid and parseable
2. `chunks` is an array with at least 1 item
3. Each chunk has required `text` field
4. `text` is non-empty string
5. `text` length <= 200 characters
6. `pause` is between 0.0 and 2.0
7. `emotion` is one of valid values (if provided)
8. `metadata.totalChunks` matches `chunks.length`

---

## Fallback Behavior

If structured response parsing fails:
1. Log warning/error
2. Extract plain text from response
3. Use text splitting fallback
4. Apply default metadata:
   - `emotion`: `"neutral"`
   - `icon`: `""`
   - `pause`: `0.5`
   - `emphasis`: `false`

---

## Example Responses

### Example 1: Simple Greeting

```json
{
  "chunks": [
    {
      "text": "Hello! 😊 It's so lovely to meet you!",
      "emotion": "happy",
      "icon": "😊",
      "pause": 0.5,
      "emphasis": false
    },
    {
      "text": "Welcome! I'm excited to chat with you and help you with your English.",
      "emotion": "excited",
      "icon": "🎉",
      "pause": 0.8,
      "emphasis": true
    }
  ],
  "metadata": {
    "totalChunks": 2,
    "estimatedDuration": 5.0,
    "tone": "friendly and welcoming",
    "language": "en"
  }
}
```

### Example 2: Question with Emphasis

```json
{
  "chunks": [
    {
      "text": "How are you doing today?",
      "emotion": "encouraging",
      "icon": "💬",
      "pause": 1.0,
      "emphasis": true
    },
    {
      "text": "Don't worry about making mistakes – that's how we learn!",
      "emotion": "encouraging",
      "icon": "✨",
      "pause": 0.5,
      "emphasis": false
    }
  ],
  "metadata": {
    "totalChunks": 2,
    "estimatedDuration": 6.0,
    "tone": "encouraging and supportive",
    "language": "en"
  }
}
```

---

## Integration Notes

### Backend Processing

1. **Parse JSON** from Ollama response
2. **Validate structure** against schema
3. **Extract chunks** with metadata
4. **Apply defaults** for missing optional fields
5. **Process through TTS queue** with priority

### Frontend Display

1. **Render text** with icons/emojis
2. **Show emotion indicators** (optional)
3. **Respect pause durations** between chunks
4. **Emphasize** marked chunks (bold, larger, etc.)
5. **Play audio** sequentially with pauses

---

**Status:** Specification Complete - Ready for Implementation

