import { z } from "zod";

export type ExtractorType =
  | "id"
  | "title"
  | "richText"
  | "number"
  | "select"
  | "checkbox"
  | "url"
  | "email"
  | "date"
  | "multiSelect"
  | "relationIds"
  | "rollupText"
  | "rollupRelationIds"
  | "pageIcon"
  | "markdown";

export interface NotionFieldMeta {
  notionProperty?: string;
  extractor?: ExtractorType;
  creatable?: boolean;
}

export const notionRegistry = z.registry<NotionFieldMeta>();
