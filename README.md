# @adullamtech/norm

A Notion ORM for TypeScript. Define Notion-backed models with a declarative schema, retrieve/create/query pages with full type safety, and let the library handle all the Notion verbosity — property extraction, value translation, response filtering — so you don't have to.

Framework-agnostic. No Next.js, no Sentry, no hidden dependencies. You bring the `@notionhq/client` instance; `norm` does the rest.

---

## Why norm?

Working with the Notion API directly means writing **a lot** of boilerplate. Every page response comes back as a deeply nested JSON blob. Every property needs manual extraction with type guards. Creating a page requires the verbose Notion property format. Querying a database returns every property even when you only need three. And none of it is type-safe.

**norm** eliminates all of that:

```ts
// ❌ Without norm: manual extraction, verbose JSON, no types
const response = await notion.pages.retrieve({ page_id: "abc" });
const prop = response.properties as Record<string, any>;
const title = prop.Name.title?.[0]?.plain_text ?? "";
const status = prop.Status.select?.name ?? null;
const price = prop.Price.number ?? null;
// ... repeat for every field, every time

// ✅ With norm: declare once, use everywhere
const product = await Product.retrieve("abc");
//    ^? ProductModel — fully typed, no manual extraction
console.log(product.title, product.status, product.price);
```

**With norm, you:**
1. **Declare a model** — map Notion properties to clean TypeScript fields using simple builders
2. **Get type safety** — both for reading and creating pages. Typos in property names? Wrong value types? Compile errors
3. **Forget the Notion format** — the library extracts values on read, translates simplified values on write
4. **Save bandwidth** — only requested properties are returned from the API (`filter_properties` is automatic)

---

## Installation

```bash
pnpm add @adullamtech/norm @notionhq/client zod
```

`zod` and `@notionhq/client` are peer dependencies.

---

## Quick start

```ts
import { NormClient, n } from "@adullamtech/norm";
import { Client } from "@notionhq/client";

const norm = new NormClient({
  client: new Client({ auth: process.env.NOTION_API_KEY }),
  onWarn: (msg, ctx) => console.warn(msg, ctx),
  onError: (err, ctx) => console.error(err, ctx),
});

export { norm };
```

That's your one-time setup. Now define models.

---

## Models — the heart of norm

A model is a declarative map between your Notion database columns and TypeScript fields. You define it once; everything else flows from it.

### Simple example: a Product database

Suppose you have a Notion database called **Products** with columns: `Name` (title), `Price` (number), `Status` (select), `In Stock` (checkbox), `Tags` (multi-select), and `SKU` (rich text).

```ts
export const Product = norm.object({
  title: n.title(),                                    // maps to the "title" property
  price: n.number({ property: "Price" }),
  status: n.select({
    property: "Status",
    enum: ["active", "draft", "archived"],
  }),
  inStock: n.checkbox({ property: "In Stock" }),
  tags: n.multiSelect({ property: "Tags" }),
  sku: n.richText({ property: "SKU" }).optional(),
});

// Extract the output type
export type ProductModel = n.getType<typeof Product>;
//    ^? { id: string; title: string; price: number | null; status: "active" | "draft" | "archived"; inStock: boolean; tags: string[]; sku?: string | undefined }
```

That's it. The `property` option tells norm which Notion column to read/write. The TypeScript field name (`title`, `price`, etc.) is what you use in code.

### `n.select` with enums and fallbacks

```ts
const status = n.select({
  property: "Status",
  enum: ["active", "draft", "archived"],
  // fallback defaults to the first enum option ("active") if omitted
});
// Type: "active" | "draft" | "archived"  (never null — falls back to default)
```

Without `enum`, the type is `string | null` and no fallback is applied.

### `n.singleRelation` / `n.multiRelation` — single vs array

```ts
// Single relation — returns the first ID as a string, or ""
const categoryId = n.singleRelation({ property: "Category" });
// Type: string

// Multi relation — returns an array of IDs
const tagIds = n.multiRelation({ property: "Tags" });
// Type: string[]
```

> `n.relation(...)` is an alias for `n.singleRelation(...)`.

### `n.select` with rollups

```ts
// Roll up a text value from a related database
const categoryName = n.rollupText({ property: "Category Name" });
// Type: string

// Roll up relation IDs from a related database
const relatedItems = n.rollupRelation({ property: "Related Items" });
// Type: string[]
```

---

## Reading data

### Retrieve a single page by ID

```ts
const product = await Product.retrieve("some-page-id");
//    ^? ProductModel | null

if (product) {
  console.log(product.title, product.price, product.status);
}
```

### Parse an already-fetched page

Useful when you already have a `PageObjectResponse` from somewhere else:

```ts
const product = await Product.parsePage(existingPage);
//    ^? ProductModel
```

### Query a database

```ts
const products = await Product.query("ds_abc123", {
  filter: {
    and: [
      { property: "Status", select: { equals: "active" } },
      { property: "In Stock", checkbox: { equals: true } },
    ],
  },
  sorts: [{ property: "Price", direction: "ascending" }],
});
// products is ProductModel[] — fully typed, no manual parsing
```

**`query()` automatically:**
1. Sends `filter_properties` with only your schema's property names — slimmer responses, faster queries
2. Parses every result page through the schema — you get typed models back immediately

### Include page content as markdown

For databases with rich page content, pass `includeMarkdown: true`:

```ts
const product = await Product.retrieve(pageId, {
  includeMarkdown: true,
});
// product.markdownContent?: string  — the full page as markdown
```

This fetches the page's markdown representation via a second API call. The field only exists if you declared `n.markdown().optional()` in your schema.

---

## Creating pages

Creating a Notion page with the raw API is verbose. With norm, you provide **simplified values** that match your model's field types:

```ts
const pageId = await Product.create({
  parent: { data_source_id: "ds_abc123" },
  properties: {
    title: "Ergonomic Keyboard",
    Price: 149.99,
    Status: "active",
    "In Stock": true,
    Tags: ["electronics", "keyboards"],
    SKU: "KB-001",
  },
  markdown: "# Ergonomic Keyboard\n\nA mechanical keyboard with **RGB backlighting**.\n\n- Wireless\n- Hot-swappable switches\n- USB-C charging",
});
```

**Simplified value mapping:**

| Notion type | Simplified input |
|---|---|
| Title | `string` |
| Rich text | `string` |
| Number | `number \| null` |
| URL | `string \| null` |
| Email | `string` |
| Checkbox | `boolean` |
| Date | `Date \| string \| null` |
| Select | `string` (enum member) or `string \| null` |
| Multi-select | `string[]` |
| Relation | `string[]` |

norm translates these to Notion's verbose format internally. **Typos in property names or wrong value types are compile errors.** Rollup, id, and markdown fields are automatically excluded from the create input — you can't accidentally try to write to a computed field.

---

## Page icon

```ts
export const Book = norm.object({
  title: n.title(),
  icon: n.pageIcon(),
});

const book = await Book.retrieve(pageId);
console.log(book.icon); // string | null — the emoji or image URL
```

---

## Transforming output

Need to massage the parsed data? Pass a `transform` to `norm.object()`:

```ts
export const Product = norm.object({
  title: n.title(),
  price: n.number({ property: "Price" }),
  currency: n.richText({ property: "Currency" }).default("USD"),
}, {
  transform: (data) => ({
    ...data,
    displayPrice: `${data.currency} ${data.price?.toFixed(2) ?? "0.00"}`,
  }),
});

type ProductModel = n.getType<typeof Product>;
// Includes: { ...; displayPrice: string }
```

The transform runs after Zod parsing and extraction, so `data` already has all Notion fields resolved.

---

## Low-level API

If you need more control, `NormClient` exposes the raw Notion operations:

```ts
// Query a database directly
const { results } = await norm.queryDatabase("ds_abc123", {
  filter: { /* Notion filter */ },
  filterProperties: ["Name", "Price"],
});

// Get a page by ID
const page = await norm.getPageById("abc123", {
  filterProperties: ["Name", "Price"],
});

// Get page markdown
const md = await norm.getPageMarkdown("abc123");

// Retrieve + parse with any Zod schema (not just norm models)
const data = await norm.retrievePage(pageId, someZodSchema);

// Upload a file
const fileId = await norm.uploadFile({
  filename: "report.pdf",
  contentType: "application/pdf",
  data: buffer,
});

// Append file blocks to a page
await norm.appendFileBlocks(pageId, [
  { fileUploadId: fileId, filename: "report.pdf", blockType: "file" },
]);
```

---

## API reference

### `n.*` builders

All return Zod schemas registered with `notionRegistry`, branded at the type level so `norm.object` can compute the create-props type.

| Builder | Returns | Creatable | Simplified input |
|---|---|---|---|
| `n.id()` | `z.string()` | No | — |
| `n.title({ property? })` | `z.string()` | Yes | `string` |
| `n.richText({ property })` | `z.string()` | Yes | `string` |
| `n.number({ property })` | `z.number().nullable()` | Yes | `number \| null` |
| `n.checkbox({ property })` | `z.boolean()` | Yes | `boolean` |
| `n.url({ property })` | `z.string().nullable()` | Yes | `string \| null` |
| `n.email({ property })` | `z.string()` | Yes | `string` |
| `n.date({ property })` | `z.date().nullable()` | Yes | `Date \| string \| null` |
| `n.multiSelect({ property })` | `z.array(z.string())` | Yes | `string[]` |
| `n.select({ property, enum?, fallback? })` | `z.enum([...])` or `z.string().nullable()` | Yes | `string` or `string \| null` |
| `n.relation({ property })` | `z.array(z.string()).transform(...)` | Yes | `string` |
| `n.singleRelation({ property })` | `z.array(z.string()).transform(...)` | Yes | `string` |
| `n.multiRelation({ property })` | `z.array(z.string())` | Yes | `string[]` |
| `n.rollupText({ property })` | `z.string()` | No | — |
| `n.rollupRelation({ property })` | `z.array(z.string())` | No | — |
| `n.pageIcon()` | `z.string().nullable()` | No | — |
| `n.markdown()` | `z.string().optional()` | No | — |

### `NormClient`

```ts
class NormClient {
  constructor(config: NormConfig);

  // Model factory
  object<T extends ZodRawShape>(shape: T, opts?: {
    transform?: (data: z.infer<ZodObject<T>>) => unknown;
  }): NormModel<...>;

  // Low-level Notion ops
  queryDatabase(dataSourceId: string, opts: {
    filter?: Record<string, unknown>;
    sorts?: Array<Record<string, unknown>>;
    filterProperties?: string[];
  }): Promise<{ results: PageObjectResponse[] }>;

  getPageById(pageId: string, opts?: {
    filterProperties?: string[];
  }): Promise<PageObjectResponse | null>;

  getPageMarkdown(pageId: string): Promise<string>;

  createPage(input: {
    parent: Record<string, unknown>;
    properties: Record<string, unknown>;
    markdown?: string;
  }): Promise<string | null>;

  uploadFile(file: {
    filename: string;
    contentType: string;
    data: Buffer;
  }): Promise<string | null>;

  appendFileBlocks(pageId: string, attachments: {
    fileUploadId: string;
    filename?: string;
    blockType: string;
  }[]): Promise<boolean>;

  // Generic parse (works with any Zod schema, not just norm models)
  retrievePage<T>(pageId: string, schema: ZodType<T>, opts?: {
    includeMarkdown?: boolean;
  }): Promise<T | null>;

  retrieveFromPage<T>(page: PageObjectResponse, schema: ZodType<T>, opts?: {
    includeMarkdown?: boolean;
  }): Promise<T>;
}

interface NormConfig {
  client: Client;
  onWarn?: (msg: string, ctx: Record<string, unknown>) => void;
  onError?: (err: Error, ctx: Record<string, unknown>) => void;
}
```

### `NormModel<T, CreateProps>`

```ts
interface NormModel<T, CreateProps> {
  /** The underlying Zod schema. */
  readonly schema: ZodType<T>;
  /** Notion property names (excludes id/markdown). Used for filter_properties. */
  readonly propertyNames: readonly string[];

  /** Parse arbitrary data through the schema. */
  parse(data: unknown): T;

  /** Fetch a single page, extract properties, and parse. */
  retrieve(pageId: string, opts?: {
    includeMarkdown?: boolean;
  }): Promise<T | null>;

  /** Parse an already-fetched PageObjectResponse. */
  parsePage(page: PageObjectResponse, opts?: {
    includeMarkdown?: boolean;
  }): Promise<T>;

  /** Query a Notion database. Automatically sets filter_properties. */
  query(databaseId: string, opts?: {
    filter?: Record<string, unknown>;
    sorts?: Array<Record<string, unknown>>;
    includeMarkdown?: boolean;
  }): Promise<T[]>;

  /** Create a page with simplified property values. */
  create(input: {
    parent: Record<string, unknown>;
    properties: Partial<CreateProps>;
    markdown?: string;
  }): Promise<string | null>;
}
```

### `n.getType<typeof Model>`

Extracts the model's output type (post-transform if `transform` option provided):

```ts
type getType<M> = M extends { readonly _normType: infer T } ? T : never;
```

---

## Auto `filter_properties`

norm automatically requests only the properties declared in the schema:

1. **`Model.retrieve(pageId)`** — calls `getPageById` with `filterProperties: Model.propertyNames`
2. **`Model.query(databaseId)`** — calls `queryDatabase` with `filterProperties: Model.propertyNames`

`Model.propertyNames` excludes `id` (always returned by Notion) and `markdownContent` (fetched separately).

Filters still work on any property — Notion's `filter` (which pages match) is independent of `filter_properties` (which values are returned). You can filter on properties NOT in the schema (e.g. `published: true`); the filter runs server-side, the property just isn't returned per-page.

This means **your API responses are as slim as possible** with zero effort.

---

## Examples

### Blog with categories

```ts
export const BlogPost = norm.object({
  title: n.title(),
  slug: n.richText({ property: "Slug" }),
  publishedAt: n.date({ property: "Published At" }),
  tags: n.multiSelect({ property: "Tags" }),
  category: n.select({
    property: "Category",
    enum: ["tech", "design", "business"],
  }),
  featured: n.checkbox({ property: "Featured" }),
  readTime: n.number({ property: "Read Time" }),
  // Rollup: author name from a related "Authors" database
  authorName: n.rollupText({ property: "Author Name" }),
});

// Fetch published tech posts
const posts = await BlogPost.query("ds_blog", {
  filter: {
    and: [
      { property: "Category", select: { equals: "tech" } },
      { property: "Featured", checkbox: { equals: true } },
    ],
  },
  sorts: [{ property: "Published At", direction: "descending" }],
});
```

### Task tracker

```ts
export const Task = norm.object({
  title: n.title(),
  dueDate: n.date({ property: "Due Date" }),
  priority: n.select({
    property: "Priority",
    enum: ["low", "medium", "high", "critical"],
  }),
  assignee: n.singleRelation({ property: "Assignee" }),
  status: n.select({
    property: "Status",
    enum: ["todo", "in_progress", "done"],
  }).default("todo"),
});
```

### Product catalog with transformed display price

```ts
export const Product = norm.object({
  title: n.title(),
  price: n.number({ property: "Price" }),
  currency: n.richText({ property: "Currency" }).default("USD"),
}, {
  transform: (data) => ({
    ...data,
    displayPrice: `${data.currency} $${data.price?.toFixed(2) ?? "0.00"}`,
    isFree: data.price === null || data.price === 0,
  }),
});

// displayPrice and isFree are available on the model output
```

---

## License

MIT © [Adullam Technologies](https://adullamtech.com)

---

## Contributing

Contributions are welcome! Please open an [issue](https://github.com/Adullam-Technologies/norm/issues) or submit a PR.