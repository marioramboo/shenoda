export const BLACKLISTED_ANALYTICS_MODELS = [
  'spiritualLifeEntry',
  'SpiritualLifeEntry',
  'spiritualLifeEntries',
  'SpiritualLifeEntries',
  'spiritual_life_entries',
  'spiritual_life_entry',
  'sacrament',
  'confession',
  'communion',
  'qorban',
  'spiritual_journal',
];

/**
 * NFR-3.4 Absolute Exclusion of Spiritual Data:
 * Verifies that spiritual life records (اعتراف / تناول / أصوام / قراءات) can NEVER be leaked
 * or queried into executive analytics dashboards, charts, or export documents.
 */
export function assertNoSpiritualDataInPayload(data: any): void {
  if (!data) return;
  const lowerBlacklist = BLACKLISTED_ANALYTICS_MODELS.map((t) => t.toLowerCase());

  function inspectNode(node: any): void {
    if (!node) return;
    if (typeof node === 'string') {
      const lower = node.toLowerCase();
      for (const term of lowerBlacklist) {
        if (new RegExp(`\\b${term}\\b`, 'i').test(lower)) {
          throwFirewallError(term);
        }
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) inspectNode(item);
      return;
    }
    if (typeof node === 'object') {
      for (const [key, val] of Object.entries(node)) {
        const lowerKey = key.toLowerCase();
        for (const term of lowerBlacklist) {
          if (lowerKey.includes(term)) throwFirewallError(term);
        }
        inspectNode(val);
      }
    }
  }

  function throwFirewallError(term: string): never {
    const err: any = new Error(
      `CRITICAL SECURITY VIOLATION (NFR-3.4): Spiritual life data detected in analytics or export payload! Prohibited term: "${term}"`
    );
    err.code = 'ERR_SPIRITUAL_DATA_FIREWALL';
    err.status = 500;
    err.statusCode = 500;
    throw err;
  }

  inspectNode(data);
}
