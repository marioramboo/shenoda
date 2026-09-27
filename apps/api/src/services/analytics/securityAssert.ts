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
  const jsonString = typeof data === 'string' ? data.toLowerCase() : JSON.stringify(data).toLowerCase();

  for (const term of BLACKLISTED_ANALYTICS_MODELS) {
    if (jsonString.includes(term.toLowerCase())) {
      const err: any = new Error(
        `CRITICAL SECURITY VIOLATION (NFR-3.4): Spiritual life data detected in analytics or export payload! Prohibited term: "${term}"`
      );
      err.code = 'ERR_SPIRITUAL_DATA_FIREWALL';
      err.status = 500;
      err.statusCode = 500;
      throw err;
    }
  }
}
