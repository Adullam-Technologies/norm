import { z } from "zod";
import { notionRegistry, type ExtractorType } from "./registry";

/**
 * Type-level utility: extracts the brand string from a Zod schema's output.
 * In Zod v4, `.brand<T>()` adds `$brand<T>` to the output type (not the schema).
 * This type lets consumers extract whether a Zod schema carries a Notion brand.
 *
 * @example
 *   const title = n.title();
 *   type T = z.output<typeof title>; // string & NotionBrand<"title", "title">
 */
export type NotionBrand<
  E extends string,
  P extends string = string,
> = z.$brand<`${E}::${P}`>;

function reg<T extends z.ZodType, P extends string>(
  schema: T,
  property: P,
  extractor: ExtractorType,
  extra: Record<string, unknown> = {},
): T {
  const meta = { notionProperty: property, extractor, ...extra };
  notionRegistry.add(schema, meta);
  return schema;
}

// ─── id ──────────────────────────────────────────────────────────────────────

export function id() {
  return reg(z.string(), "id", "id").brand<"id::id">();
}

// ─── title ───────────────────────────────────────────────────────────────────

export function title<P extends string = "title">(opts?: { property?: P }) {
  const property = (opts?.property ?? "title") as P;
  return reg(z.string(), property, "title").brand<`title::${P}`>();
}

// ─── richText ────────────────────────────────────────────────────────────────

export function richText<P extends string>(opts: { property: P }) {
  return reg(z.string(), opts.property, "richText").brand<`richText::${P}`>();
}

// ─── number ──────────────────────────────────────────────────────────────────

export function number<P extends string>(opts: { property: P }) {
  return reg(
    z.number().nullable(),
    opts.property,
    "number",
  ).brand<`number::${P}`>();
}

// ─── checkbox ────────────────────────────────────────────────────────────────

export function checkbox<P extends string>(opts: { property: P }) {
  return reg(z.boolean(), opts.property, "checkbox").brand<`checkbox::${P}`>();
}

// ─── url ─────────────────────────────────────────────────────────────────────

export function url<P extends string>(opts: { property: P }) {
  return reg(z.string().nullable(), opts.property, "url").brand<`url::${P}`>();
}

// ─── email ───────────────────────────────────────────────────────────────────

export function email<P extends string>(opts: { property: P }) {
  return reg(z.string(), opts.property, "email").brand<`email::${P}`>();
}

// ─── date ─────────────────────────────────────────────────────────────────────

export function date<P extends string>(opts: { property: P }) {
  return reg(z.date().nullable(), opts.property, "date").brand<`date::${P}`>();
}

// ─── multiSelect ──────────────────────────────────────────────────────────────

export function multiSelect<P extends string>(opts: { property: P }) {
  return reg(
    z.array(z.string()),
    opts.property,
    "multiSelect",
  ).brand<`multiSelect::${P}`>();
}

// ─── select ──────────────────────────────────────────────────────────────────

export function select<P extends string>(opts: {
  property: P;
  enum?: readonly [string, ...string[]];
  fallback?: string;
}) {
  const { property, enum: enumValues, fallback } = opts;

  if (enumValues && enumValues.length > 0) {
    const fb = fallback ?? enumValues[0];
    const base = z.enum(enumValues);
    const transformed = base
      .nullable()
      .transform((v: string | null) => v ?? fb);
    return reg(transformed, property, "select").brand<`select::${P}`>();
  }

  return reg(z.string().nullable(), property, "select").brand<`select::${P}`>();
}

// ─── relation ────────────────────────────────────────────────────────────────

export function relation<
  P extends string,
  S extends boolean | undefined = undefined,
>(opts: { property: P; single?: S }) {
  const base = z.array(z.string());
  const schema = opts.single
    ? reg(
        base.transform((ids: string[]) => ids[0] ?? ""),
        opts.property,
        "relationIds",
      )
    : reg(base, opts.property, "relationIds");
  return schema.brand<`relationIds::${P}`>();
}

// ─── rollupText ──────────────────────────────────────────────────────────────

export function rollupText<P extends string>(opts: { property: P }) {
  return reg(
    z.string(),
    opts.property,
    "rollupText",
  ).brand<`rollupText::${P}`>();
}

// ─── rollupRelation ──────────────────────────────────────────────────────────

export function rollupRelation<P extends string>(opts: { property: P }) {
  return reg(
    z.array(z.string()),
    opts.property,
    "rollupRelationIds",
  ).brand<`rollupRelationIds::${P}`>();
}

// ─── pageIcon ────────────────────────────────────────────────────────────────

export function pageIcon() {
  return reg(
    z.string().nullable(),
    "__icon__",
    "pageIcon",
  ).brand<"pageIcon::__icon__">();
}

// ─── markdown ─────────────────────────────────────────────────────────────────

export function markdown() {
  return reg(
    z.string().optional(),
    "markdown",
    "markdown",
  ).brand<"markdown::markdown">();
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
  markdown,
};

/** Extract the output type of a NormModel. Usage: `type Foo = n.getType<typeof Model>`. */
export type getType<M> = M extends { readonly _normType: infer T } ? T : never;
