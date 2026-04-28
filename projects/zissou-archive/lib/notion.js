import { Client } from '@notionhq/client';
import { NOTION_INVENTORY_DB, NOTION_DROP_LOG_DB } from '../config.js';
import { buildDropLogEntry } from './price-drops.js';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const notionHelper = {
  /**
   * Get the authenticated bot/user.
   */
  async getMe() {
    return notion.users.me({});
  },

  /**
   * Retrieve database metadata.
   */
  async getDatabase(id) {
    return notion.databases.retrieve({ database_id: id });
  },

  /**
   * Query pages in a database filtered by Status property.
   */
  async queryByStatus(dbId, status) {
    const results = [];
    let cursor;
    do {
      const response = await notion.databases.query({
        database_id: dbId,
        filter: {
          property: 'Status',
          select: { equals: status },
        },
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      results.push(...response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);
    return results;
  },

  /**
   * Query pages that have Draft status OR no status set (scannable items).
   */
  async queryScannable(dbId) {
    const results = [];
    let cursor;
    do {
      const response = await notion.databases.query({
        database_id: dbId,
        filter: {
          or: [
            { property: 'Status', select: { equals: 'Draft' } },
            { property: 'Status', select: { is_empty: true } },
          ],
        },
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      results.push(...response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);
    return results;
  },

  /**
   * Retrieve a single page.
   */
  async getPage(pageId) {
    return notion.pages.retrieve({ page_id: pageId });
  },

  /**
   * Create a new inventory item in the inventory database.
   */
  async createInventoryItem({ title, status, notes }) {
    const properties = {
      'Item Name': {
        title: [{ text: { content: title } }],
      },
      'Status': {
        select: { name: status },
      },
    };

    if (notes) {
      properties['Notes'] = {
        rich_text: [{ text: { content: notes } }],
      };
    }

    return notion.pages.create({
      parent: { database_id: NOTION_INVENTORY_DB },
      properties,
    });
  },

  /**
   * Update arbitrary properties on a page.
   */
  async updateProperties(pageId, properties) {
    return notion.pages.update({
      page_id: pageId,
      properties,
    });
  },

  /**
   * Update just the Status property on a page.
   */
  async updateStatus(pageId, status) {
    return this.updateProperties(pageId, {
      'Status': { select: { name: status } },
    });
  },

  /**
   * Create a drop log entry in the drop log database.
   */
  async createDropLogEntry(params) {
    const entry = buildDropLogEntry(params);

    return notion.pages.create({
      parent: { database_id: NOTION_DROP_LOG_DB },
      properties: {
        'Name': {
          title: [{ text: { content: entry.title } }],
        },
        ...entry.properties,
      },
    });
  },

  /**
   * Extract a number property value from a Notion page.
   */
  extractNumber(page, propertyName) {
    const prop = page.properties[propertyName];
    if (!prop || prop.type !== 'number') return null;
    return prop.number;
  },

  /**
   * Extract the Status property name from a Notion page.
   */
  extractStatus(page) {
    const prop = page.properties['Status'];
    if (!prop || prop.type !== 'select') return null;
    return prop.select?.name ?? null;
  },

  /**
   * Extract file URLs from the "Files & media" property.
   */
  extractFiles(page) {
    const prop = page.properties['Photos'];
    if (!prop || prop.type !== 'files') return [];
    return prop.files.map((f) => ({
      url: f.type === 'external' ? f.external.url : f.file.url,
      name: f.name,
    }));
  },

  /**
   * Archive (soft delete) a page.
   */
  async archivePage(pageId) {
    return notion.pages.update({
      page_id: pageId,
      archived: true,
    });
  },
};

export default notionHelper;
