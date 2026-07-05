import { z } from "zod";

export type ExtractorType =
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
  | "pageIcon";

export interface NotionFieldMeta {
  notionProperty?: string;
  extractor?: ExtractorType;
  derived?: boolean;
  derivedKey?: string;
  creatable?: boolean;
}

export const notionRegistry = z.registry<NotionFieldMeta>();