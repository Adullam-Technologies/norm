import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import {
  ZodObject,
  ZodPipe,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodTransform,
  type ZodType,
  z,
} from "zod";
import { notionRegistry, type NotionFieldMeta } from "./registry";
import {
  getTitle,
  getRichText,
  getNumber,
  getSelect,
  getCheckbox,
  getUrl,
  getEmail,
  getDate,
  getMultiSelect,
  getRelationIds,
  getRollupText,
  getRollupRelationIds,
  getPageIcon,
} from "./properties";
import type { RetrieveOptions } from "./types";

const EXTRACTOR_MAP: Record<
  string,
  (page: PageObjectResponse, property: string) => unknown
> = {
  title: getTitle,
  richText: getRichText,
  number: getNumber,
  select: getSelect,
  checkbox: getCheckbox,
  url: getUrl,
  email: getEmail,
  date: getDate,
  multiSelect: getMultiSelect,
  relationIds: getRelationIds,
  rollupText: getRollupText,
  rollupRelationIds: getRollupRelationIds,
  pageIcon: (page) => getPageIcon(page),
};

/**
 * Walk the Zod wrapper chain (Optional, Nullable, Default, Pipe, Transform)
 * to find the inner schema that carries registry metadata. Returns the first
 * schema that has metadata, or the innermost one if none found.
 */
export function getNotionMeta(
  fieldSchema: ZodType,
): NotionFieldMeta | undefined {
  let current: ZodType | undefined = fieldSchema;
  while (current) {
    const meta = notionRegistry.get(current);
    if (meta) return meta;
    current = unwrapOneLevel(current);
  }
  return undefined;
}

/** Unwrap exactly one Zod wrapper level. Returns undefined if no wrapper found. */
export function unwrapOneLevel(schema: ZodType): ZodType | undefined {
  if (schema instanceof ZodOptional) return schema.unwrap() as ZodType;
  if (schema instanceof ZodNullable) return schema.unwrap() as ZodType;
  if (schema instanceof ZodDefault) return schema.removeDefault() as ZodType;
  if (schema instanceof ZodPipe) return schema.in as ZodType;
  if (schema instanceof ZodTransform)
    return (schema as unknown as { in: ZodType }).in;
  return undefined;
}

function extractField(
  page: PageObjectResponse,
  key: string,
  meta: NotionFieldMeta,
): unknown {
  const extractor = meta.extractor;
  if (!extractor) return undefined;
  const property = meta.notionProperty ?? key;
  const fn = EXTRACTOR_MAP[extractor];
  if (!fn) return undefined;
  return fn(page, property);
}

export function getSchemaShape(schema: ZodType): Record<string, ZodType> {
  if (schema instanceof ZodObject) {
    return schema.shape as Record<string, ZodType>;
  }
  if (schema instanceof ZodPipe) {
    return getSchemaShape(schema.in as ZodType);
  }
  return {};
}

export interface RetrieveFnOptions {
  getPageMarkdown?: (pageId: string) => Promise<string>;
}

export async function retrieveFromPage<T extends ZodType>(
  page: PageObjectResponse,
  schema: T,
  options?: RetrieveOptions,
  fnOpts?: RetrieveFnOptions,
): Promise<z.infer<T>> {
  const shape = getSchemaShape(schema);
  const result: Record<string, unknown> = {};

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const meta = getNotionMeta(fieldSchema);

    // Special-case: id always comes from page.id
    if (meta?.extractor === "id" || key === "id") {
      result[key] = page.id;
      continue;
    }

    // Special-case: markdown content fetched separately
    if (meta?.extractor === "markdown") {
      continue;
    }

    if (!meta) {
      // No registry metadata — skip (plain Zod field like .transform())
      continue;
    }

    result[key] = extractField(page, key, meta);
  }

  if (options?.includeMarkdown && fnOpts?.getPageMarkdown) {
    result.markdownContent = await fnOpts.getPageMarkdown(page.id);
  }

  return schema.parse(result) as z.infer<T>;
}

export async function retrievePage<T extends ZodType>(
  pageId: string,
  schema: T,
  getPageById: (
    pageId: string,
    opts?: { filterProperties?: string[] },
  ) => Promise<PageObjectResponse | null>,
  getPageMarkdown: (pageId: string) => Promise<string>,
  options?: RetrieveOptions,
  propertyNames?: readonly string[],
): Promise<z.infer<T> | null> {
  const page = await getPageById(pageId, {
    filterProperties: propertyNames ? [...propertyNames] : undefined,
  });
  if (!page) return null;

  return retrieveFromPage(page, schema, options, { getPageMarkdown });
}
