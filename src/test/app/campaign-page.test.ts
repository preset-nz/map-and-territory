import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE, readCampaignPage } from '@/app/scene/campaign-page';
import { CAMPAIGN_PATH, type FrameRow } from '@/app/scene/frame';

const source = (values?: Record<string, unknown>) => ({
  node: () => undefined,
  nodeAt: (p: string): FrameRow | undefined =>
    p === CAMPAIGN_PATH ? { id: 'c', type: 'campaign', values } : undefined,
});

describe('readCampaignPage', () => {
  it('gives A5 portrait with a 10 mm margin when the row carries nothing', () => {
    expect(readCampaignPage(source())).toEqual(DEFAULT_PAGE);
    expect(readCampaignPage({ node: () => undefined, nodeAt: () => undefined })).toEqual(
      DEFAULT_PAGE,
    );
  });
  it('reads the stored values', () => {
    expect(
      readCampaignPage(source({ pageSize: 'a4', pageOrientation: 'landscape', pageMargin: 6 })),
    ).toEqual({ size: 'a4', orientation: 'landscape', marginMm: 6 });
  });
  it('falls back on an unrecognised choice', () => {
    expect(readCampaignPage(source({ pageSize: 'a3' })).size).toBe('a5');
  });
});
