import type { z, ZodType, ZodRawShape } from "zod";
import { ZodObject } from "zod";
import type { NormClient } from "./client";
import type { RetrieveOptions, QueryOpts } from "./types";
import { getNotionMeta } from "./retriever";
import { id as makeIdBuilder } from "./builders";

export interface NormModel<T, CreateProps, Args> {
  /** Marker for `n.getType` — holds the output type at the type level. */
  readonly _normType: T;
  /** The underlying Zod schema. Rarely needed directly; prefer `.parse()`/`.retrieve()`. */
  readonly schema: ZodType<T>;
  /** Notion property names declared in the schema (excludes id/markdown/icon). */
  readonly propertyNames: readonly string[];
  parse(data: unknown): T;
  retrieve(pageId: string, opts?: RetrieveOptions<Args>): Promise<T | null>;
  parsePage(page: PageObjectResponse, opts?: RetrieveOptions<Args>): Promise<T>;
  create(input: {
    parent: Record<string, unknown>;
    properties: CreateProps;
    markdown?: string;
  }): Promise<string | null>;
  query(databaseId: string, opts?: QueryOpts<Args>): Promise<T[]>;
}

import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

// ─── translate simplified input → Notion verbose property format ─────────────

function translateProperty(
  extractor: string,
  value: unknown,
): unknown {
  switch (extractor) {
    case "title":
      return { title: [{ text: { content: String(value) } }] };
    case "richText":
      return { rich_text: [{ text: { content: String(value) } }] };
    case "number":
      return { number: value === null ? null : Number(value) };
    case "checkbox":
      return { checkbox: Boolean(value) };
    case "url":
      return { url: value === null ? null : String(value) };
    case "email":
      return { email: String(value) };
    case "date": {
      if (value === null) return { date: null };
      const dateStr = value instanceof Date ? value.toISOString() : String(value);
      return { date: { start: dateStr } };
    }
    case "select":
      return { select: value === null ? null : { name: String(value) } };
    case "multiSelect": {
      const names = Array.isArray(value) ? value : [];
      return { multi_select: names.map((name) => ({ name: String(name) })) };
    }
    case "relationIds": {
      const ids = Array.isArray(value) ? value : [];
      return { relation: ids.map((id) => ({ id: String(id) })) };
    }
    default:
      return undefined;
  }
}

// ─── norm.object implementation ──────────────────────────────────────────────

export function defineObject<TShape extends ZodRawShape, TArgs = void>(
  client: NormClient,
  shape: TShape,
  opts?: {
    transform?: (data: z.infer<ZodObject<TShape>>) => unknown;
  },
): NormModel<unknown, unknown, TArgs> {
  // Auto-inject id: n.id() if not present
  const finalShape: ZodRawShape = "id" in shape ? shape : { id: makeIdField(), ...shape };

  const baseSchema = new ZodObject({ shape: finalShape } as never) as unknown as ZodObject<TShape>;
  const schema = opts?.transform
    ? baseSchema.transform(opts.transform as never) as ZodType
    : baseSchema as ZodType;

  // Collect property names for filter_properties
  const propertyNames = collectPropertyNames(finalShape);

  const self: NormModel<unknown, unknown, unknown> = {
    _normType: undefined as unknown,
    schema: schema as ZodType<unknown>,
    propertyNames,
    parse(data: unknown) {
      return (schema as ZodType<unknown>).parse(data);
    },
    async retrieve(pageId, retrieveOpts) {
      return client.retrievePage(pageId, schema as ZodType<unknown>, retrieveOpts as RetrieveOptions, propertyNames);
    },
    async parsePage(page, parseOpts) {
      return client.retrieveFromPage(page, schema as ZodType<unknown>, parseOpts as RetrieveOptions);
    },
    async create(input) {
      const translated: Record<string, unknown> = {};
      const props = input.properties as Record<string, unknown>;
      for (const [propKey, value] of Object.entries(props)) {
        const { extractor } = findExtractorByProperty(finalShape, propKey);
        if (!extractor) continue;
        const translatedValue = translateProperty(extractor, value);
        translated[propKey] = translatedValue;
      }
      return client.createPage({
        parent: input.parent,
        properties: translated,
        markdown: input.markdown,
      });
    },
    async query(databaseId, queryOpts) {
      const { results } = await client.queryDatabase(databaseId, {
        filter: queryOpts?.filter as never,
        sorts: queryOpts?.sorts as never,
        filterProperties: [...propertyNames],
      });
      return Promise.all(
        results.map((page) =>
          client.retrieveFromPage(page, schema as ZodType<unknown>, queryOpts as RetrieveOptions)
        ),
      );
    },
  };

  return self as never;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function makeIdField(): ZodType {
  return makeIdBuilder() as ZodType;
}

function collectPropertyNames(shape: ZodRawShape): string[] {
  const names: string[] = [];
  for (const [key, fieldSchema] of Object.entries(shape)) {
    const meta = getNotionMeta(fieldSchema as ZodType);
    if (!meta) continue;
    const extractor = meta.extractor;
    if (!extractor) continue;
    if (extractor === "id" || extractor === "markdown") continue;
    const property = meta.notionProperty ?? key;
    if (property === "__icon__") continue;
    names.push(property);
  }
  return names;
}

function findExtractorByProperty(shape: ZodRawShape, propertyName: string): { extractor?: string } {
  for (const [, fieldSchema] of Object.entries(shape)) {
    const meta = getNotionMeta(fieldSchema as ZodType);
    if (!meta) continue;
    const extractor = meta.extractor;
    const property = meta.notionProperty;
    if (property === propertyName && extractor) {
      return { extractor };
    }
  }
  return {};
}