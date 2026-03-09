/**
 * generate-json.js
 *
 * Generates @webflow/XscpData JSON from a text description using the Anthropic API.
 * Export: generateJson(description) → XscpData JSON object
 *
 * Usage (standalone):
 *   ANTHROPIC_API_KEY=sk-... node scripts/webflow/generate-json.js --description "hero with heading and CTA"
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWfJson } from './validate-wf-json.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, '../../.claude/skills/webflow-clipboard-prompt/SKILL.md');

let cachedSystemPrompt = null;

function getSystemPrompt() {
  if (cachedSystemPrompt) return cachedSystemPrompt;

  const raw = readFileSync(PROMPT_PATH, 'utf-8');
  // Strip YAML frontmatter
  const stripped = raw.replace(/^---[\s\S]*?---\s*/, '');
  // Extract the content after "## System Prompt"
  const promptIdx = stripped.indexOf('## System Prompt');
  cachedSystemPrompt = promptIdx !== -1
    ? stripped.substring(promptIdx + '## System Prompt'.length).trim()
    : stripped.trim();
  return cachedSystemPrompt;
}

/**
 * Generate @webflow/XscpData JSON from a text description.
 * @param {string} description - What to generate (e.g. "hero section with heading and CTA button")
 * @param {object} [options] - Options
 * @param {string} [options.model] - Model to use (default: claude-sonnet-4-6)
 * @param {number} [options.maxTokens] - Max tokens (default: 4096)
 * @returns {Promise<object>} Parsed XscpData JSON object
 */
export async function generateJson(description, options = {}) {
  const {
    model = 'claude-sonnet-4-6',
    maxTokens = 16384,
  } = options;

  const client = new Anthropic();
  const systemPrompt = getSystemPrompt();

  let lastError = null;
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate @webflow/XscpData JSON for: ${description}`,
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Extract JSON from response (handle possible code fences)
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      lastError = new Error(`JSON parse failed (attempt ${attempt + 1}): ${err.message}`);
      continue;
    }

    // Validate
    const validation = validateWfJson(parsed);
    if (!validation.valid) {
      lastError = new Error(
        `Validation failed (attempt ${attempt + 1}): ${validation.errors.join('; ')}`
      );
      continue;
    }

    return parsed;
  }

  throw lastError;
}

// CLI entry point
const isMain = process.argv[1] &&
  (process.argv[1].endsWith('generate-json.js') ||
   process.argv[1].endsWith('generate-json'));

if (isMain) {
  const descIdx = process.argv.indexOf('--description');
  if (descIdx === -1 || !process.argv[descIdx + 1]) {
    console.error('Usage: node generate-json.js --description "your description"');
    process.exit(1);
  }

  const description = process.argv[descIdx + 1];
  console.error(`Generating XscpData for: "${description}"...`);

  try {
    const result = await generateJson(description);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Generation failed:', err.message);
    process.exit(1);
  }
}
