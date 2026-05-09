import type { Plugin } from 'unified';

export interface DocusaurusOptions {
  /** Import path for Tabs component. Default: '@theme/Tabs'. */
  tabsImport?: string;
  /** Import path for TabItem component. Default: '@theme/TabItem'. */
  tabItemImport?: string;
}

declare const remarkCodeRegionDocusaurus: Plugin<[DocusaurusOptions?]>;
export default remarkCodeRegionDocusaurus;
