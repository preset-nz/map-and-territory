// The campaign's page: the paper the export prints every map onto (epic 07). Pure, so it is
// tested without a window. The kind's defaults live in the model crate; this mirrors them
// for a row that carries no value.
import { CAMPAIGN_PATH, type RowSource } from './frame';

export type PageSize = 'a5' | 'a4';
export type PageOrientation = 'portrait' | 'landscape';

export interface CampaignPage {
  size: PageSize;
  orientation: PageOrientation;
  /** Plain white border around the map, in mm. */
  marginMm: number;
}

export const DEFAULT_PAGE: CampaignPage = { size: 'a5', orientation: 'portrait', marginMm: 10 };

/** The campaign's page from the mirror; the defaults for anything missing or unrecognised. */
export function readCampaignPage(rows: RowSource): CampaignPage {
  const v = rows.nodeAt(CAMPAIGN_PATH)?.values ?? {};
  const margin = v.pageMargin;
  return {
    size: v.pageSize === 'a4' || v.pageSize === 'a5' ? v.pageSize : DEFAULT_PAGE.size,
    orientation:
      v.pageOrientation === 'landscape' || v.pageOrientation === 'portrait'
        ? v.pageOrientation
        : DEFAULT_PAGE.orientation,
    marginMm: typeof margin === 'number' ? margin : DEFAULT_PAGE.marginMm,
  };
}
