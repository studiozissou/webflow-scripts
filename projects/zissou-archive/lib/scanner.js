const DEBUG = typeof process !== 'undefined' && process.env.DEBUG === '1';

/**
 * Build a Claude API message with photo image blocks and a text prompt.
 *
 * @param {Array<{url: string}>} photos - Array of photo objects with URL
 * @param {string} notes - Seller notes or context
 * @returns {object} Message object: { role, content }
 */
export function buildScanMessage(photos, notes) {
  const imageBlocks = photos.map((photo) => ({
    type: 'image',
    source: { type: 'url', url: photo.url },
  }));

  const textBlock = {
    type: 'text',
    text: `Notes: ${notes}\n\nReturn JSON matching the schema.`,
  };

  return {
    role: 'user',
    content: [...imageBlocks, textBlock],
  };
}

/**
 * Parse and validate a Claude Vision scan response.
 *
 * @param {object} response - Claude API response object
 * @returns {object} Parsed and validated scan data with needsInfo boolean
 */
export function parseScanResponse(response) {
  if (!response.content || response.content.length === 0) {
    throw new Error('Empty response: no content blocks returned');
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('No text block found in response');
  }

  let raw = textBlock.text.trim();

  // Strip markdown code fences
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*\n*/, '').replace(/\n*```\s*$/, '');
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse JSON from response: ${err.message}`);
  }

  // Validate title length
  if (data.title && data.title.length > 100) {
    throw new Error(`Title exceeds 100 character limit (got ${data.title.length})`);
  }

  // Validate full_text length
  if (data.full_text && data.full_text.length > 2000) {
    throw new Error(`full_text exceeds 2000 character limit (got ${data.full_text.length})`);
  }

  // Validate required nested objects
  if (!data.price || typeof data.price !== 'object') {
    throw new Error('Failed to parse response: missing required field "price"');
  }
  if (!data.parsed_fields || typeof data.parsed_fields !== 'object') {
    throw new Error('Failed to parse response: missing required field "parsed_fields"');
  }
  if (!Array.isArray(data.keywords)) {
    throw new Error('Failed to parse response: missing required field "keywords"');
  }

  // Add needsInfo flag
  data.needsInfo = Array.isArray(data.questions_for_seller) && data.questions_for_seller.length > 0;

  DEBUG && process.stdout.write(`[scanner] parsed scan: title="${data.title}" needsInfo=${data.needsInfo}\n`);

  return data;
}

/**
 * Map Claude scan response data to Notion property update payload.
 *
 * @param {object} data - Parsed scan response
 * @returns {object} Notion properties object
 */
export function mapToNotionProperties(data) {
  const today = new Date().toISOString().slice(0, 10);

  const photoObsText = Array.isArray(data.photo_observations)
    ? data.photo_observations
        .map((obs, i) => `Photo ${obs.photo_index ?? i}: ${obs.observations} (${obs.inferences}) [${obs.confidence}]`)
        .join('\n')
    : '';

  const questionsText = Array.isArray(data.questions_for_seller)
    ? data.questions_for_seller.join('\n')
    : '';

  const props = {
    'Item Name': {
      title: [{ text: { content: data.title } }],
    },
    'Title': {
      rich_text: [{ text: { content: data.title } }],
    },
    'Full Description': {
      rich_text: [{ text: { content: data.full_text } }],
    },
    'Suggested Price': {
      number: data.price.amount,
    },
    'Current Price': {
      number: data.price.amount,
    },
    'Floor Price': {
      number: data.price.floor_price,
    },
    'Price Justification': {
      rich_text: [{ text: { content: data.price.justification } }],
    },
    ...(data.price.price_audit ? { 'Price Audit': { rich_text: [{ text: { content: data.price.price_audit } }] } } : {}),
    'Original Retail': {
      number: data.price.original_retail,
    },
    'Retail Estimated': {
      checkbox: data.price.original_retail_estimated,
    },
    ...(data.price.purchase_price != null ? { 'Purchase Price': { number: data.price.purchase_price } } : {}),
    'Condition Rating': {
      number: data.parsed_fields.condition_rating,
    },
    'Condition': {
      select: { name: data.vinted_condition },
    },
    ...(data.brand ? { 'Brand': { select: { name: data.brand } } } : {}),
    ...(data.size ? { 'Size': { select: { name: data.size } } } : {}),
    ...(data.colour ? { 'Colour': { multi_select: [{ name: data.colour }] } } : {}),
    'Category': {
      select: { name: data.category },
    },
    'Keywords': {
      multi_select: data.keywords.map((k) => ({ name: k })),
    },
    'Photo Observations': {
      rich_text: [{ text: { content: photoObsText } }],
    },
    'Questions': {
      rich_text: [{ text: { content: questionsText } }],
    },
    'Scan Date': {
      date: { start: today },
    },
  };

  return props;
}
