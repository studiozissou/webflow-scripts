/**
 * validate-wf-json.js
 *
 * Validates @webflow/XscpData JSON payloads.
 * Export: validateWfJson(jsonObj) → { valid: boolean, errors: string[] }
 */

const VALID_NODE_TYPES = new Set([
  // Layout & Structure
  'Block', 'Section', 'DivBlock', 'Grid', 'HFlex', 'VFlex',
  'QuickStack', 'Row', 'BlockContainer',
  // Typography
  'Heading', 'Paragraph', 'TextBlock', 'RichText', 'Blockquote',
  'List', 'ListItem',
  // Navigation & Interactive
  'Link', 'LinkBlock', 'TextLink', 'Button', 'NavbarWrapper',
  'DropdownWrapper', 'TabsWrapper', 'SliderWrapper', 'LightboxWrapper',
  'Pagination',
  // Media
  'Image', 'Video', 'YouTubeVideo', 'BackgroundVideoWrapper',
  'HtmlEmbed', 'MapWidget', 'Spline', 'Facebook', 'Twitter',
  // Forms
  'FormForm', 'FormTextInput', 'FormTextarea', 'FormSelect',
  'FormCheckboxInput', 'FormRadioInput', 'FormButton', 'FormBlockLabel',
  'FormFileUploadWrapper', 'FormReCaptcha',
  // E-commerce
  'CommerceCartWrapper', 'CommerceAddToCartWrapper',
  'CommerceCheckoutFormContainer', 'CommerceOrderConfirmationContainer',
  'CommercePayPalCheckoutButton', 'CommerceDownloadsWrapper',
  // CMS / Other
  'DynamoWrapper', 'DOM', 'SearchForm', 'CodeBlock',
]);

// CSS shorthand properties that Webflow doesn't support — match as whole words
const SHORTHAND_PROPERTIES = new Set([
  'margin', 'padding', 'border', 'border-top', 'border-right',
  'border-bottom', 'border-left', 'border-radius', 'background',
  'font', 'list-style', 'transition', 'animation', 'outline',
  'overflow', 'gap', 'grid-template', 'grid-area', 'flex',
  'flex-flow', 'place-items', 'place-content', 'place-self',
  'columns', 'column-rule', 'text-decoration', 'inset',
]);

/**
 * Check if a styleLess string contains shorthand CSS properties.
 * Returns array of found shorthands.
 */
function findShorthands(styleLess) {
  if (!styleLess || typeof styleLess !== 'string') return [];

  const found = [];
  // Split into declarations, then check each property name
  const declarations = styleLess.split(';').map((d) => d.trim()).filter(Boolean);

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = decl.substring(0, colonIdx).trim();
    if (SHORTHAND_PROPERTIES.has(prop)) {
      found.push(prop);
    }
  }
  return found;
}

/**
 * Validate a @webflow/XscpData JSON object.
 * @param {object} json - The parsed JSON object
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateWfJson(json) {
  const errors = [];

  // 1. Type check
  if (!json || json.type !== '@webflow/XscpData') {
    errors.push('Missing or invalid type — must be "@webflow/XscpData"');
  }

  // 2. Payload existence
  if (!json?.payload) {
    errors.push('Missing payload object');
    return { valid: false, errors };
  }

  const { payload } = json;

  // 3. Nodes array
  if (!Array.isArray(payload.nodes)) {
    errors.push('payload.nodes must be an array');
    return { valid: false, errors };
  }
  if (payload.nodes.length === 0) {
    errors.push('payload.nodes must not be empty');
  }

  // 4. Styles, assets, ix1 must be arrays
  if (!Array.isArray(payload.styles)) {
    errors.push('payload.styles must be an array');
  }
  if (!Array.isArray(payload.assets)) {
    errors.push('payload.assets must be an array');
  }
  if (!Array.isArray(payload.ix1)) {
    errors.push('payload.ix1 must be an array');
  }

  // 5. ix2 structure
  if (!payload.ix2 || typeof payload.ix2 !== 'object') {
    errors.push('payload.ix2 must be an object with interactions, events, actionLists');
  }

  // Build lookup maps
  const nodeIds = new Set();
  const styleIds = new Set();
  const allIds = new Set();

  // Collect all IDs and check for duplicates
  for (const node of payload.nodes) {
    if (node.text === true) continue; // Text nodes may not have _id in children lookup
    const id = node._id;
    if (!id) continue;
    if (allIds.has(id)) {
      errors.push(`Duplicate UUID: ${id}`);
    }
    allIds.add(id);
    nodeIds.add(id);
  }

  // Also add text node IDs
  for (const node of payload.nodes) {
    if (node.text === true && node._id) {
      if (allIds.has(node._id)) {
        errors.push(`Duplicate UUID: ${node._id}`);
      }
      allIds.add(node._id);
      nodeIds.add(node._id);
    }
  }

  if (Array.isArray(payload.styles)) {
    for (const style of payload.styles) {
      const id = style._id;
      if (!id) continue;
      if (allIds.has(id)) {
        errors.push(`Duplicate UUID: ${id}`);
      }
      allIds.add(id);
      styleIds.add(id);
    }
  }

  // 6. Validate each node
  for (const node of payload.nodes) {
    // Skip text nodes
    if (node.text === true) continue;

    // Check node type
    if (node.type && !VALID_NODE_TYPES.has(node.type)) {
      errors.push(`Unknown node type: "${node.type}"`);
    }

    // Check children references
    if (Array.isArray(node.children)) {
      for (const childId of node.children) {
        if (!nodeIds.has(childId)) {
          errors.push(`Orphan child reference: "${childId}" not found in nodes`);
        }
      }
    }

    // Check class references
    if (Array.isArray(node.classes)) {
      for (const classId of node.classes) {
        if (!styleIds.has(classId)) {
          errors.push(`Orphan class reference: "${classId}" not found in styles`);
        }
      }
    }
  }

  // 7. Check styleLess for shorthands
  if (Array.isArray(payload.styles)) {
    for (const style of payload.styles) {
      const shorthands = findShorthands(style.styleLess);
      if (shorthands.length > 0) {
        errors.push(
          `Style "${style.name}" contains shorthand CSS: ${shorthands.join(', ')}`
        );
      }

      // Check variants too
      if (style.variants && typeof style.variants === 'object') {
        for (const [breakpoint, variant] of Object.entries(style.variants)) {
          const variantShorthands = findShorthands(variant.styleLess);
          if (variantShorthands.length > 0) {
            errors.push(
              `Style "${style.name}" variant "${breakpoint}" contains shorthand CSS: ${variantShorthands.join(', ')}`
            );
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
