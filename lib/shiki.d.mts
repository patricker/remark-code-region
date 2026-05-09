import type { Plugin } from 'unified';

export interface ShikiOptions {
  /** Convert diff-step // [!code ++] to // [!code highlight] and remove // [!code --] lines. */
  diffStepStyle?: 'highlight';
}

declare const remarkCodeRegionShiki: Plugin<[ShikiOptions?]>;
export default remarkCodeRegionShiki;
