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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  string, (page: PageObjectResponse, property: string) => any
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
 * Unwrap Zod wrappers (Optional, Nullable, Default, Pipe, Transform) to find
 * the inner schema that carries the `_notion` brand and registry metadata.
 * Checks at each level — the metadata may be on any wrapper, not just the
 * innermost schema.
 */
function unwrapSchema(schema: ZodType): ZodType {
  if (schema instanceof ZodOptional) return unwrapSchema(schema.unwrap() as ZodType);
  if (schema instanceof ZodNullable) return unwrapSchema(schema.unwrap() as ZodType);
  if (schema instanceof ZodDefault) return unwrapSchema(schema.removeDefault() as ZodType);
  if (schema instanceof ZodPipe) return unwrapSchema(schema.in as ZodType);
  if (schema instanceof ZodTransform) return unwrapSchema((schema as unknown as { in: ZodType }).in);
  return schema;
}

/**
 * Find the brand on a schema or any of its wrappers.
 * Checks the schema itself first, then unwraps layer by layer.
 */
function getBrand(fieldSchema: ZodType): { extractor: string; property: string } | undefined {
  let current: ZodType | undefined = fieldSchema;
  while (current) {
    const brand = (current as unknown as { _notion?: { extractor: string; property: string } })._notion;
    if (brand) return brand;
    current = unwrapOneLevel(current);
  }
  return undefined;
}

/**
 * Find the registry metadata on a schema or any of its wrappers.
 * Checks the schema itself first, then unwraps layer by layer.
 */
function getFieldMeta(fieldSchema: ZodType): NotionFieldMeta | undefined {
  let current: ZodType | undefined = fieldSchema;
  while (current) {
    const meta = notionRegistry.get(current);
    if (meta) return meta;
    current = unwrapOneLevel(current);
  }
  return undefined;
}

/** Unwrap exactly one level. Returns undefined if no wrapper found. */
function unwrapOneLevel(schema: ZodType): ZodType | undefined {
  if (schema instanceof ZodOptional) return schema.unwrap() as ZodType;
  if (schema instanceof ZodNullable) return schema.unwrap() as ZodType;
  if (schema instanceof ZodDefault) return schema.removeDefault() as ZodType;
  if (schema instanceof ZodPipe) return schema.in as ZodType;
  if (schema instanceof ZodTransform) return (schema as unknown as { in: ZodType }).in;
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

function getSchemaShape(schema: ZodType): Record<string, ZodType> {
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
  const derivedPromises: Promise<void>[] = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const brand = getBrand(fieldSchema);
    const meta = getFieldMeta(fieldSchema);

    // Special-case: id always comes from page.id
    if (brand?.extractor === "id" || key === "id") {
      result[key] = page.id;
      continue;
    }

    // Special-case: markdownContent fetched separately
    if (brand?.extractor === "markdown") {
      continue;
    }

    // Derived field — call the resolver hook
    if (meta?.derived || brand?.extractor === "derived") {
      const derivedKey = meta?.derivedKey ?? brand?.property ?? key;
      derivedPromises.push(
        (async () => {
          const resolved = options?.derived
            ? await options.derived({ key: derivedKey, args: options.args, page })
            : undefined;
          result[key] = resolved;
        })(),
      );
      continue;
    }

    if (!meta) {
      // No registry metadata — skip
      continue;
    }

    result[key] = extractField(page, key, meta);
  }

  await Promise.all(derivedPromises);

  if (options?.includeMarkdown && fnOpts?.getPageMarkdown) {
    result.markdownContent = await fnOpts.getPageMarkdown(page.id);
  }

  return schema.parse(result) as z.infer<T>;
}

export async function retrievePage<T extends ZodType>(
  pageId: string,
  schema: T,
  getPageById: (pageId: string, opts?: { filterProperties?: string[] }) => Promise<PageObjectResponse | null>,
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

export { getSchemaShape, unwrapSchema };