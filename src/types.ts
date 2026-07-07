import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import type { ExtractorType } from "./registry";

export type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
export type { ExtractorType, NotionFieldMeta } from "./registry";

export interface NormConfig {
  /**
   * The @notionhq/client Client instance, or a factory that returns one.
   * A factory enables lazy-loading: the Client is created on the first
   * Notion API call rather than at construction time.
   */
  client:
    | import("@notionhq/client").Client
    | (() =>
        | import("@notionhq/client").Client
        | Promise<import("@notionhq/client").Client>);
  /** Called for recoverable warnings (e.g. missing extractor for a field). */
  onWarn?: (msg: string, ctx: Record<string, unknown>) => void;
  /** Called when a Notion API call throws. Host should log/capture. */
  onError?: (err: Error, ctx: Record<string, unknown>) => void;
}

export interface RetrieveOptions {
  includeMarkdown?: boolean;
}

export interface QueryOpts extends RetrieveOptions {
  filter?: Record<string, unknown>;
  sorts?: Array<Record<string, unknown>>;
}

export interface QueryDatabaseResult {
  results: PageObjectResponse[];
}

export interface CreatePageInput {
  parent: Record<string, unknown>;
  properties: Record<string, unknown>;
  markdown?: string;
}

export interface GetPageByIdOptions {
  filterProperties?: string[];
}

export interface NormAttachment {
  fileUploadId: string;
  filename?: string;
  blockType: string;
}

/**
 * Simplified input value per extractor type for `Model.create`.
 * Users supply these; the library translates to Notion's verbose format.
 */
export type SimplifiedInput<E extends ExtractorType> = E extends
  | "title"
  | "richText"
  | "email"
  ? string
  : E extends "number" | "url"
    ? string | number | null
    : E extends "checkbox"
      ? boolean
      : E extends "date"
        ? Date | string | null
        : E extends "select"
          ? string
          : E extends "multiSelect" | "relationIds"
            ? string[]
            : never;

/** Extractors that can be used when creating a page. */
export type CreatableExtractor =
  | "title"
  | "richText"
  | "number"
  | "select"
  | "checkbox"
  | "url"
  | "email"
  | "date"
  | "multiSelect"
  | "relationIds";

export const CREATABLE_EXTRACTORS: ReadonlySet<CreatableExtractor> = new Set([
  "title",
  "richText",
  "number",
  "select",
  "checkbox",
  "url",
  "email",
  "date",
  "multiSelect",
  "relationIds",
]);
