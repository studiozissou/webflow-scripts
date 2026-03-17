---
name: nano-banana
description: >
  Nano Banana (Google Gemini) image generation skill — model IDs, API patterns,
  prompt engineering rules, and integration guidance for design workflows.
  Activates when generating concept images, mood boards, or design assets.
triggers:
  - image generation
  - nano banana
  - concept image
  - mood board generation
  - design asset generation
tags:
  - design
  - ai
  - image-generation
---

<objective>
Generate design concept images, mood boards, hero treatments, textures, and
placeholder assets using Google's Nano Banana (Gemini image generation) API.
Used within `/design-review` and `/design-iterate` to visualise proposed
visual directions.
</objective>

<models>

## Available models

| Model ID | Codename | Best for | Max resolution | Speed |
|----------|----------|----------|----------------|-------|
| `gemini-3.1-flash-image-preview` | Nano Banana 2 | High-volume concepts, fast iteration | 1024x1024 | Fast |
| `gemini-3-pro-image-preview` | Nano Banana Pro | 4K output, thinking mode, search-grounded | 4096x4096 | Slower |
| `gemini-2.5-flash-image` | Nano Banana (original) | Budget-friendly, simple prompts | 1024x1024 | Fast |

**Default:** Use `gemini-3.1-flash-image-preview` for design iteration (speed matters).
Use `gemini-3-pro-image-preview` only when the user explicitly needs 4K or highest fidelity.

</models>

<api_patterns>

## Node.js — `@google/genai` SDK

```js
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

async function generateConceptImage(prompt, outputPath) {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: [{ parts: [{ text: prompt }] }],
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, 'base64');
      fs.writeFileSync(outputPath, buffer);
      return outputPath;
    }
  }
  return null;
}
```

## REST API (cURL / fetch)

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent
Header: x-goog-api-key: YOUR_API_KEY
Content-Type: application/json

{
  "contents": [{
    "parts": [{ "text": "PROMPT_HERE" }]
  }]
}
```

Response `candidates[0].content.parts[]` contains:
- `text` parts (description of what was generated)
- `inlineData` parts with `mimeType` and base64 `data`

## Python

```python
from google import genai
from google.genai.types import GenerateImagesConfig

client = genai.Client()

# Via Imagen (dedicated image model)
image = client.models.generate_images(
    model='imagen-4.0-generate-001',
    prompt='PROMPT_HERE',
    config=GenerateImagesConfig(image_size='2K'),
)
image.generated_images[0].image.save('output.png')

# Via Gemini (native image generation — Nano Banana)
response = client.models.generate_content(
    model='gemini-3.1-flash-image-preview',
    contents='PROMPT_HERE',
)
# Parse inlineData from response parts
```

</api_patterns>

<prompt_engineering>

## Prompt structure for design workflows

Always build prompts from the Design Context Block. Follow this template:

```
[STYLE] [SUBJECT] [COMPOSITION] [COLOUR] [MOOD] [TECHNICAL]
```

### Example prompts by use case

**Mood board concept:**
> "Editorial photography style. Abstract composition suggesting [brand theme].
> Colour palette: [hex values from tokens]. High contrast, sharp focus,
> [art direction keywords]. Shot on medium format film. 3:2 aspect ratio."

**Hero image concept:**
> "Wide cinematic hero image for a [industry] website. [Art direction: e.g.
> bold editorial, high contrast]. Dominant colours: [hex from tokens].
> Typography-safe composition with clear negative space on [left/right] for
> headline overlay. 16:9 aspect ratio, 2K resolution."

**Texture / pattern:**
> "Seamless abstract texture. [Style keywords: e.g. organic grain, digital
> noise, geometric pattern]. Colour range: [hex values]. Suitable as a
> subtle website background at 15% opacity. Tileable, 1024x1024."

**Design variation exploration:**
> "Three variations of a [section type] layout concept for a [industry]
> website. Style: [art direction]. Show different approaches to [specific
> element: hero, grid, cards]. Wireframe-level detail with colour accents
> in [hex values]."

### Rules

1. **Always inject art direction context** — tone, colour palette, style keywords from the Design Context Block
2. **Reference colour tokens by hex value** — pull from `figma-tokens.json` or the Design Context Block's colour intent
3. **Specify aspect ratio** — match the target layout (16:9 for heroes, 1:1 for cards, 3:2 for editorial)
4. **Specify resolution** — "1024x1024" for Flash, "4K" or "4096x4096" for Pro
5. **Include composition guidance** — "negative space for text overlay", "centred subject", "rule of thirds"
6. **SynthID awareness** — all Nano Banana images contain invisible SynthID watermarks. This is expected and does not affect visual quality.
7. **No text in images** — AI-generated text is unreliable. Always specify "no text, no typography, no lettering" if the image should be text-free.

</prompt_engineering>

<design_workflow_integration>

## Use cases in design commands

### `/design-review` — concept visualisation
When the art director's critique suggests a different visual direction, generate
1-3 concept images that visualise the suggestion. Output the images alongside
the critique so the user can see what the proposed direction looks like.

### `/design-iterate` — iterative asset generation
During the review-fix-review loop, generate updated concept images after each
iteration to show how the visual direction is evolving. Replace previous
concepts with new ones that reflect applied changes.

### Asset placement
Generated images are saved to:
- `.claude/research/concepts/<slug>-concept-<n>.png` — for review concepts
- `projects/<client>/assets/generated/` — for assets accepted into the build

### Fallback
If `GOOGLE_AI_API_KEY` is not set in the environment:
- Log: "Nano Banana not configured — set GOOGLE_AI_API_KEY to enable AI image generation"
- Skip all image generation steps
- Continue with text-only critique (the review workflow works without images)

</design_workflow_integration>

<rate_limits>

## Rate limits and pricing

| Model | Free tier | Paid tier | Cost per image |
|-------|-----------|-----------|----------------|
| Nano Banana 2 (Flash) | 500 images/day | Higher limits | ~$0.02 |
| Nano Banana Pro | Limited | Higher limits | ~$0.04 |
| Imagen 4 | No free tier | Pay-per-use | $0.02–$0.06 |

For design iteration workflows, expect 5-15 images per session. Stay well
within free tier limits for most use cases.

</rate_limits>
