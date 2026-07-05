import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { ZodObject, ZodPipe, type ZodType, z } from "zod";
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

function getFieldMeta(fieldSchema: ZodType): NotionFieldMeta | undefined {
  return notionRegistry.get(fieldSchema);
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
    const meta = getFieldMeta(fieldSchema);

    // Special-case: id always comes from page.id
    const brand = (fieldSchema as unknown as { _notion?: { extractor: string } })._notion;
    if (brand?.extractor === "id" || key === "id") {
      result[key] = page.id;
      continue;
    }

    // Special-case: markdownContent fetched separately
    if (brand?.extractor === "markdown") {
      continue;
    }

    // Derived field — call the resolver hook
    if (meta?.derived) {
      const derivedKey = meta.derivedKey ?? key;
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
      // No registry metadata — skip with a warning
      fnOpts?.getPageMarkdown; // no-op to satisfy lint
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

export { getSchemaShape };