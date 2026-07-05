import { z } from "zod";
import { notionRegistry, type ExtractorType } from "./registry";

/**
 * Internal: brand a Zod schema with Notion metadata at the type level so
 * `norm.object` can compute `CreateProps` and `propertyNames`.
 *
 * The brand is purely a type-level marker; it has no runtime cost.
 * At runtime, `.register(notionRegistry, meta)` attaches the same metadata
 * to the registry so the retriever can look it up.
 */
export interface NotionBrand<E extends string, P extends string = string> {
  readonly _notion: { readonly extractor: E; readonly property: P };
}

type Branded<E extends string, P extends string, T> = T & NotionBrand<E, P>;

function brand<E extends string, P extends string, T>(
  schema: T,
  extractor: E,
  property: P,
): Branded<E, P, T> {
  (schema as unknown as { _notion: unknown })._notion = { extractor, property };
  return schema as Branded<E, P, T>;
}

function reg<T extends z.ZodType, P extends string>(
  schema: T,
  property: P,
  extractor: ExtractorType,
  extra: Record<string, unknown> = {},
): T {
  const meta = { notionProperty: property, extractor, ...extra };
  // Use .add() on the registry directly, which has simpler typing.
  notionRegistry.add(schema, meta as never);
  return schema;
}

// ─── id ──────────────────────────────────────────────────────────────────────

export function id(): Branded<"id", "id", z.ZodString> {
  return brand(z.string(), "id", "id");
}

// ─── title ───────────────────────────────────────────────────────────────────

export function title<P extends string = "title">(opts?: { property?: P }): Branded<"title", P, z.ZodString> {
  const property = (opts?.property ?? "title") as P;
  return brand(reg(z.string(), property, "title"), "title", property);
}

// ─── richText ────────────────────────────────────────────────────────────────

export function richText<P extends string>(opts: { property: P }): Branded<"richText", P, z.ZodString> {
  return brand(reg(z.string(), opts.property, "richText"), "richText", opts.property);
}

// ─── number ──────────────────────────────────────────────────────────────────

export function number<P extends string>(opts: { property: P }): Branded<"number", P, z.ZodNullable<z.ZodNumber>> {
  return brand(reg(z.number().nullable(), opts.property, "number"), "number", opts.property);
}

// ─── checkbox ────────────────────────────────────────────────────────────────

export function checkbox<P extends string>(opts: { property: P }): Branded<"checkbox", P, z.ZodBoolean> {
  return brand(reg(z.boolean(), opts.property, "checkbox"), "checkbox", opts.property);
}

// ─── url ─────────────────────────────────────────────────────────────────────

export function url<P extends string>(opts: { property: P }): Branded<"url", P, z.ZodNullable<z.ZodString>> {
  return brand(reg(z.string().nullable(), opts.property, "url"), "url", opts.property);
}

// ─── email ───────────────────────────────────────────────────────────────────

export function email<P extends string>(opts: { property: P }): Branded<"email", P, z.ZodString> {
  return brand(reg(z.string(), opts.property, "email"), "email", opts.property);
}

// ─── date ─────────────────────────────────────────────────────────────────────

export function date<P extends string>(opts: { property: P }): Branded<"date", P, z.ZodNullable<z.ZodDate>> {
  return brand(reg(z.date().nullable(), opts.property, "date"), "date", opts.property);
}

// ─── multiSelect ──────────────────────────────────────────────────────────────

export function multiSelect<P extends string>(opts: { property: P }): Branded<"multiSelect", P, z.ZodArray<z.ZodString>> {
  return brand(reg(z.array(z.string()), opts.property, "multiSelect"), "multiSelect", opts.property);
}

// ─── select ──────────────────────────────────────────────────────────────────

export function select<P extends string>(opts: {
  property: P;
  enum?: readonly [string, ...string[]];
  fallback?: string;
}): Branded<"select", P, z.ZodType> {
  const { property, enum: enumValues, fallback } = opts;

  if (enumValues && enumValues.length > 0) {
    const fb = fallback ?? enumValues[0];
    const base = z.enum(enumValues);
    const transformed = base.transform((v: string) => v ?? fb);
    return brand(reg(transformed, property, "select"), "select", property);
  }

  return brand(reg(z.string().nullable(), property, "select"), "select", property);
}

// ─── relation ────────────────────────────────────────────────────────────────

export function relation<P extends string>(opts: {
  property: P;
  single?: boolean;
}): Branded<"relationIds", P, z.ZodType> {
  const base = z.array(z.string());
  const schema = opts.single
    ? reg(base.transform((ids: string[]) => ids[0] ?? ""), opts.property, "relationIds")
    : reg(base, opts.property, "relationIds");
  return brand(schema, "relationIds", opts.property);
}

// ─── rollupText ──────────────────────────────────────────────────────────────

export function rollupText<P extends string>(opts: { property: P }): Branded<"rollupText", P, z.ZodString> {
  return brand(reg(z.string(), opts.property, "rollupText"), "rollupText", opts.property);
}

// ─── rollupRelation ──────────────────────────────────────────────────────────

export function rollupRelation<P extends string>(opts: { property: P }): Branded<"rollupRelationIds", P, z.ZodArray<z.ZodString>> {
  return brand(reg(z.array(z.string()), opts.property, "rollupRelationIds"), "rollupRelationIds", opts.property);
}

// ─── pageIcon ────────────────────────────────────────────────────────────────

export function pageIcon(): Branded<"pageIcon", "__icon__", z.ZodNullable<z.ZodString>> {
  return brand(reg(z.string().nullable(), "__icon__", "pageIcon"), "pageIcon", "__icon__");
}

// ─── derived ─────────────────────────────────────────────────────────────────

export function derived<T, Args = void>(key: string): z.ZodType<T> & NotionBrand<"derived", string> {
  const schema = z.custom<T>();
  notionRegistry.add(schema, { derived: true, derivedKey: key } as never);
  return brand(schema, "derived", key) as z.ZodType<T> & NotionBrand<"derived", string>;
}

// ─── markdown ─────────────────────────────────────────────────────────────────

export function markdown(): z.ZodOptional<z.ZodString> & NotionBrand<"markdown", "markdown"> {
  return brand(z.string().optional(), "markdown", "markdown") as z.ZodOptional<z.ZodString> & NotionBrand<"markdown", "markdown">;
}

// ─── n namespace ─────────────────────────────────────────────────────────────

export const n = {
  id,
  title,
  richText,
  number,
  checkbox,
  url,
  email,
  date,
  multiSelect,
  select,
  relation,
  rollupText,
  rollupRelation,
  pageIcon,
  derived,
  markdown,
};

/** Extract the output type of a NormModel. Usage: `type Foo = n.getType<typeof Model>`. */
export type getType<M> = M extends { readonly _normType: infer T } ? T : never;