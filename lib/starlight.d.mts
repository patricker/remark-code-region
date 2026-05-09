import type { Plugin } from 'unified';

export interface StarlightOptions {
  /** Import path for Tabs/TabItem components. Default: '@astrojs/starlight/components'. */
  importSource?: string;
}

declare const remarkCodeRegionStarlight: Plugin<[StarlightOptions?]>;
export default remarkCodeRegionStarlight;
