// Thin stdio MCP server exposing Business Profile reads, previews and the single gbp_apply write tool.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createTokenProvider, isMainModule, redact } from './auth.js';
import { createChanges } from './changes.js';
import {
  getLocationView,
  getPerformance,
  listAccounts,
  listAllLocations,
  listPosts,
  listReviews,
  resolveLocation,
} from './client.js';

export const REQUIRED_ENV = ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN'];

const DEFAULT_READS = {
  getLocationView,
  getPerformance,
  listAccounts,
  listAllLocations,
  listPosts,
  listReviews,
  resolveLocation,
};

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: true };
const LOCATION = {
  type: 'string',
  description: 'Location as locations/<id>, from gbp_list_locations.',
};
const objectSchema = (properties = {}, required = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

export const TOOLS = [
  {
    name: 'gbp_list_accounts',
    description: 'List the Business Profile accounts this sign-in can manage.',
    inputSchema: objectSchema(),
    annotations: READ_ONLY,
    run: ({ ctx, reads }) => reads.listAccounts(ctx),
  },
  {
    name: 'gbp_list_locations',
    description: 'List locations across all accounts, with title, website and IDs.',
    inputSchema: objectSchema(),
    annotations: READ_ONLY,
    run: ({ ctx, reads }) => reads.listAllLocations(ctx),
  },
  {
    name: 'gbp_get_location',
    description:
      'Read hours, special hours, description, categories, website and phone, showing the merchant version, the live Google version and the pending flag.',
    inputSchema: objectSchema({ location: LOCATION }, ['location']),
    annotations: READ_ONLY,
    run: ({ ctx, reads }, { location }) => reads.getLocationView(ctx, location),
  },
  {
    name: 'gbp_list_reviews',
    description: 'List reviews with rating, text, reply and reply state.',
    inputSchema: objectSchema({ location: LOCATION }, ['location']),
    annotations: READ_ONLY,
    run: async ({ ctx, reads }, { location }) => {
      const { v4Name } = await reads.resolveLocation(ctx, location);
      return reads.listReviews(ctx, v4Name);
    },
  },
  {
    name: 'gbp_list_posts',
    description: 'List recent posts.',
    inputSchema: objectSchema({ location: LOCATION }, ['location']),
    annotations: READ_ONLY,
    run: async ({ ctx, reads }, { location }) => {
      const { v4Name } = await reads.resolveLocation(ctx, location);
      return reads.listPosts(ctx, v4Name);
    },
  },
  {
    name: 'gbp_get_performance',
    description:
      'Read daily calls, website clicks, directions and impressions for a date range.',
    inputSchema: objectSchema(
      {
        location: LOCATION,
        startDate: { type: 'string', description: 'First day, YYYY-MM-DD.' },
        endDate: { type: 'string', description: 'Last day, YYYY-MM-DD.' },
      },
      ['location', 'startDate', 'endDate'],
    ),
    annotations: READ_ONLY,
    run: ({ ctx, reads }, { location, startDate, endDate }) =>
      reads.getPerformance(ctx, location, { startDate, endDate }),
  },
  {
    name: 'gbp_preview_location_edit',
    description:
      "Preview an edit to regular hours, special hours, description, website, phone or categories. Runs Google's validateOnly check and changes nothing. Returns a before/after diff, previewId and confirmText for gbp_apply.",
    inputSchema: objectSchema(
      {
        location: LOCATION,
        edits: {
          type: 'object',
          description: 'One or more fields to change.',
          properties: {
            regularHours: { type: 'object' },
            specialHours: { type: 'object' },
            description: { type: 'string' },
            websiteUri: { type: 'string' },
            phoneNumbers: {
              type: 'object',
              description: 'primaryPhone and/or additionalPhones; the other is kept.',
            },
            categories: {
              type: 'object',
              description:
                'primaryCategory and/or additionalCategories; the other is kept.',
            },
          },
          additionalProperties: false,
        },
      },
      ['location', 'edits'],
    ),
    annotations: READ_ONLY,
    run: ({ changes }, args) => changes.previewLocationEdit(args),
  },
  {
    name: 'gbp_preview_review_reply',
    description:
      'Preview a new or changed review reply. Changes nothing. Returns a before/after diff, previewId and confirmText for gbp_apply.',
    inputSchema: objectSchema(
      {
        location: LOCATION,
        reviewId: { type: 'string' },
        comment: { type: 'string', description: 'The reply text.' },
      },
      ['location', 'reviewId', 'comment'],
    ),
    annotations: READ_ONLY,
    run: ({ changes }, args) => changes.previewReviewReply(args),
  },
  {
    name: 'gbp_preview_post',
    description:
      'Preview a standard update post, with an optional button and image URL. Changes nothing. Returns the post, previewId and confirmText for gbp_apply.',
    inputSchema: objectSchema(
      {
        location: LOCATION,
        summary: { type: 'string', description: 'Post text, up to 1500 characters.' },
        languageCode: {
          type: 'string',
          description: 'Language of the post, such as en or nl.',
        },
        button: {
          type: 'object',
          description:
            'actionType (BOOK, ORDER, SHOP, LEARN_MORE, SIGN_UP or CALL) and url.',
          properties: { actionType: { type: 'string' }, url: { type: 'string' } },
          required: ['actionType'],
          additionalProperties: false,
        },
        imageUrl: { type: 'string', description: 'Public image address.' },
      },
      ['location', 'summary', 'languageCode'],
    ),
    annotations: READ_ONLY,
    run: ({ changes }, args) => changes.previewPost(args),
  },
  {
    name: 'gbp_apply',
    description:
      'Change a live Google Business Profile by sending one previewed write, once. Refuses a preview that is unknown, used, older than 30 minutes or stale, or a confirmText that does not match. Reports live, pending, mismatch, unverified, refused or error.',
    inputSchema: objectSchema(
      {
        previewId: { type: 'string', description: 'From the preview tool.' },
        confirmText: {
          type: 'string',
          description:
            'Exact confirmText from the preview: what is changing, on which location.',
        },
      },
      ['previewId', 'confirmText'],
    ),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
    run: ({ changes }, args) => changes.apply(args),
  },
];

function argumentProblem(schema, args) {
  for (const key of schema.required) {
    if (args[key] === undefined) return `Missing argument: ${key}`;
  }
  for (const [key, value] of Object.entries(args)) {
    const property = schema.properties[key];
    if (!property) return `Unexpected argument: ${key}`;
    const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    const typeMatches =
      property.type === 'object' ? isObject : typeof value === property.type;
    if (!typeMatches) return `Argument ${key} must be a ${property.type}`;
  }
  return null;
}

const isFailure = (result) =>
  result?.valid === false || result?.status === 'refused' || result?.status === 'error';

export function createServer({ ctx, reads = DEFAULT_READS, changes, secrets = [] }) {
  const server = new Server(
    { name: 'gbp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );
  const text = (value) => ({
    type: 'text',
    text: redact(
      typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      secrets,
    ),
  });
  const failure = (message) => ({ isError: true, content: [text(message)] });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(({ name, description, inputSchema, annotations }) => ({
      name,
      description,
      inputSchema,
      annotations,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    const tool = TOOLS.find(({ name }) => name === params.name);
    if (!tool) return failure(`Unknown tool: ${params.name}`);
    const args = params.arguments ?? {};
    const problem = argumentProblem(tool.inputSchema, args);
    if (problem) return failure(problem);
    try {
      const result = await tool.run({ ctx, reads, changes }, args);
      return { ...(isFailure(result) ? { isError: true } : {}), content: [text(result)] };
    } catch (err) {
      return failure(err.message);
    }
  });

  return server;
}

async function main() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    process.stderr.write(`Missing environment variable: ${missing.join(', ')}\n`);
    process.exitCode = 1;
    return;
  }
  const secrets = REQUIRED_ENV.map((name) => process.env[name]);
  const ctx = {
    fetch: globalThis.fetch,
    getToken: createTokenProvider({
      clientId: process.env.GBP_CLIENT_ID,
      clientSecret: process.env.GBP_CLIENT_SECRET,
      refreshToken: process.env.GBP_REFRESH_TOKEN,
    }),
  };
  const changes = createChanges({ ctx, secrets });
  const server = createServer({ ctx, changes, secrets });
  await server.connect(new StdioServerTransport());
}

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    process.stderr.write(
      `${redact(
        err.message,
        REQUIRED_ENV.map((name) => process.env[name]),
      )}\n`,
    );
    process.exitCode = 1;
  });
}
