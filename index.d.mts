import type { Plugin } from 'unified';

export interface RegionMarker {
  start: RegExp;
  end: RegExp;
}

export interface TransmuteRule {
  match: RegExp;
  template: string;
  argMap?: Record<string, number>;
}

export interface Options {
  /** Base directory for resolving reference paths. Defaults to process.cwd(). */
  rootDir?: string;
  /** Allow references outside rootDir. Default: false. */
  allowOutsideRoot?: boolean;
  /** Region marker pairs. Defaults cover # and // comments. */
  regionMarkers?: RegionMarker[];
  /** Patterns to strip. false=disable, undefined=defaults, RegExp[]=custom. */
  strip?: RegExp[] | false;
  /** Transmute rules. false/undefined=disabled, array=use rules. */
  transmute?: TransmuteRule[] | false;
  /** Cleaning steps. false=disable, undefined=defaults, string[]=custom. */
  clean?: string[] | false;
  /** String inserted between concatenated regions. Default: '\n\n'. */
  regionSeparator?: string;
  /** Keep file= in meta after processing. Default: false. */
  preserveFileMeta?: boolean;
  /** Output format for diff blocks. Default: 'unified'. */
  diffFormat?: 'unified' | 'inline-annotations' | 'side-by-side';
  /** CSS class for tab group wrapper div. Default: 'code-tabs'. */
  tabGroupClass?: string;
}

declare const remarkCodeRegion: Plugin<[Options?]>;
export default remarkCodeRegion;

// Preset strip patterns (grouped by language)
export declare const PRESET_STRIP: {
  python: RegExp[];
  rust: RegExp[];
  java: RegExp[];
  js: RegExp[];
  cpp: RegExp[];
  go: RegExp[];
  markers: RegExp[];
};

// Preset transmute rules (grouped by language)
export declare const PRESET_TRANSMUTE: {
  python: TransmuteRule[];
  js: TransmuteRule[];
  rust: TransmuteRule[];
  java: TransmuteRule[];
  go: TransmuteRule[];
  cpp: TransmuteRule[];
};

// Preset clean step lists
export declare const PRESET_CLEAN: {
  default: string[];
  compat: string[];
};

// Preset region markers (grouped by syntax)
export declare const PRESET_MARKERS: {
  css: RegionMarker[];
  html: RegionMarker[];
  sql: RegionMarker[];
};

// Default values (unions of all presets)
export declare const DEFAULT_STRIP_PATTERNS: RegExp[];
export declare const DEFAULT_TRANSMUTE_RULES: TransmuteRule[];
export declare const DEFAULT_CLEAN: string[];
export declare const DEFAULT_REGION_MARKERS: RegionMarker[];

// Language → comment prefix map (70+ entries)
export declare const COMMENT_PREFIX: Record<string, string>;
