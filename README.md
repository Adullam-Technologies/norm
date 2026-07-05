# @adullamtech/norm

A Notion ORM for TypeScript. Define Notion-backed models with a declarative schema, retrieve/create pages with type safety, and let the library handle property extraction, translation, and response filtering.

Framework-agnostic — no Next.js, no Sentry, no env. You bring the `@notionhq/client` instance; `norm` does the rest.

## Installation

```bash
pnpm add @adullamtech/norm @notionhq/client zod
```

`zod` and `@notionhq/client` are peer dependencies.

## Quick start

```ts
import { NormClient, n } from "@adullamtech/norm";
import { Client } from "@notionhq/client";

const norm = new NormClient({
  client: new Client({ auth: process.env.NOTION_API_KEY }),
  onWarn: (msg, ctx) => console.warn(msg, ctx),
  onError: (err, ctx) => console.error(err, ctx),
});
```

### Define a model

```ts
interface LessonArgs {
  studentId: string;
  cohortId: string;
  contentType: "lesson" | "quiz" | "todo";
}

export const Lesson = norm.object({
  // id is auto-injected — you don't write it
  title: n.title(),
  order: n.number({ property: "order" }),
  youtubeUrl: n.url({ property: "youtube_url" }),
  bunnyVideoId: n.richText({ property: "bunny_video_id" }).optional(),
  weekId: n.relation({ property: "week", single: true }),
  weekTitle: n.rollupText({ property: "week_title" }),
  estimatedMinutes: n.number({ property: "estimated_minutes" }).transform(v => v ?? 5),
  codeEnv: n.select({
    property: "code_env",
    enum: ["no_code", "test_runner", "ai_code_analysis", "submission"],
    // fallback defaults to the first enum option ("no_code") if omitted
  }),
  starterCode: n.richText({ property: "starter_code" }).default("# Write your code here\n\n"),
  isCompleted: n.derived<boolean, LessonArgs>("isCompleted").default(false),
  score: n.derived<number | undefined, LessonArgs>("score").optional(),
  isLocked: n.derived<boolean>("isLocked").default(false),
  markdownContent: n.markdown().optional(),
});

export type LessonModel = n.getType<typeof Lesson>;
```

### Retrieve a page (with derived properties)

```ts
const lesson = await Lesson.retrieve(lessonId, {
  args: { studentId, cohortId, contentType: "lesson" },
  derived: async ({ key, args, page }) => {
    if (!args) return undefined;
    if (key === "isCompleted") return isContentCompleted(page.id, args.studentId, args.cohortId, args.contentType);
    if (key === "score") return (await getProgress(page.id, args.studentId, args.cohortId, args.contentType))?.score;
    if (key === "isLocked") return false;
    return undefined;
  },
  includeMarkdown: true,
});
```

The `args` is typed as `LessonArgs | undefined` (inferred from the derived fields' args types). The `derived` resolver dispatches by `key`. If it returns `undefined`, the field falls back to `.default()` / `.optional()`.

### Query a database (auto filter_properties + auto parse)

```ts
const lessons = await Lesson.query(env.NOTION_DS_LESSONS, {
  filter: {
    and: [
      { property: "week", relation: { contains: weekId } },
      { property: "published", checkbox: { equals: true } },
    ],
  },
  sorts: [{ property: "order", direction: "ascending" }],
  args: { studentId, cohortId, contentType: "lesson" },
  derived: async ({ key, args, page }) => {
    if (!args) return undefined;
    if (key === "isCompleted") return isContentCompleted(page.id, args.studentId, args.cohortId, args.contentType);
    if (key === "score") return (await getProgress(page.id, args.studentId, args.cohortId, args.contentType))?.score;
    return undefined;
  },
});
// lessons is already LessonModel[] — no manual parsePage step
```

`Lesson.query` automatically:
1. Calls `queryDatabase` with `filter_properties` set to the schema's property names (slimmer Notion responses, faster queries)
2. Parses each result page through `Lesson.parsePage` (passing through `args`/`derived`/`includeMarkdown`)

### Create a page (schema-typed, simplified input)

```ts
const pageId = await Lesson.create({
  parent: { data_source_id: "ds_abc123" },
  properties: {
    title: "Intro to JavaScript",
    order: 5,
    youtube_url: null,
    week: ["week_abc123"],
    code_env: "test_runner",
    estimated_minutes: 30,
    starter_code: "# Start here\n\n",
  },
  markdown: "# Hello\n\nLesson content...",
});
```

The `properties` keys are the **Notion property names** (from the schema's `n.*({ property: "..." })`). The values are **simplified** — `string` for title/richText/select/email, `number | null` for number/url, `boolean` for checkbox, `string[]` for multiSelect/relation, `Date | string | null` for date. The library translates these to Notion's verbose format internally.

All properties are optional. Rollup/derived/id/markdown fields are excluded from the create input — the type system enforces this. Typos in property names or wrong value types are **compile errors**.

---

## API reference

### `n.*` builders

All return Zod schemas registered with `notionRegistry`, branded at the type level with `{ extractor, property }` for `norm.object` to compute `CreateProps`.

| Builder | Returns | Extractor | Creatable | Simplified input |
|---|---|---|---|---|
| `n.id()` | `z.string()` | — (special-cased) | No | — |
| `n.title({ property? })` | `z.string()` | `title` | Yes | `string` |
| `n.richText({ property })` | `z.string()` | `richText` | Yes | `string` |
| `n.number({ property })` | `z.number().nullable()` | `number` | Yes | `number \| null` |
| `n.checkbox({ property })` | `z.boolean()` | `checkbox` | Yes | `boolean` |
| `n.url({ property })` | `z.string().nullable()` | `url` | Yes | `string \| null` |
| `n.email({ property })` | `z.string()` | `email` | Yes | `string` |
| `n.date({ property })` | `z.date().nullable()` | `date` | Yes | `Date \| string \| null` |
| `n.multiSelect({ property })` | `z.array(z.string())` | `multiSelect` | Yes | `string[]` |
| `n.select({ property, enum?, fallback? })` | `z.enum([...])` or `z.string().nullable()` | `select` | Yes | `string` (enum member) or `string \| null` |
| `n.relation({ property, single? })` | `z.array(z.string()).transform(...)` | `relationIds` | Yes | `string[]` |
| `n.rollupText({ property })` | `z.string()` | `rollupText` | No | — |
| `n.rollupRelation({ property })` | `z.array(z.string())` | `rollupRelationIds` | No | — |
| `n.pageIcon()` | `z.string().nullable()` | `pageIcon` | No | — |
| `n.derived<T, Args = void>(key)` | `z.custom<T>()` | — (flagged `derived: true`) | No | — |
| `n.markdown()` | `z.string().optional()` | — (special-cased) | No | — |

#### `n.select` semantics

- `enum` required for typed selects → `z.enum([...])`
- `fallback` optional; **defaults to the first `enum` option** if not specified
- `fallback` applies via `.transform(v => v ?? fallback)`
- Without `enum`: untyped → `z.string().nullable()`, no fallback transform

### `n.getType<typeof Model>`

Type alias that extracts the model's output type (post-transform if `transform` option provided):

```ts
type getType<M> = M extends NormModel<infer T, any, any> ? T : never;
```

### `NormClient`

```ts
class NormClient {
  constructor(config: NormConfig);

  // Low-level Notion ops (framework-agnostic)
  queryDatabase(dataSourceId: string, opts: QueryOpts): Promise<{ results: PageObjectResponse[] }>;
  getPageById(pageId: string, opts?: { filterProperties?: string[] }): Promise<PageObjectResponse | null>;
  getPageMarkdown(pageId: string): Promise<string>;
  uploadFile(file: { filename: string; contentType: string; data: Buffer }): Promise<string | null>;
  appendFileBlocks(pageId: string, attachments: Attachment[]): Promise<boolean>;
  createPage(input: CreatePageInput): Promise<string | null>;

  // Retriever (generic)
  retrievePage<T>(pageId: string, schema: ZodType<T>, opts?: RetrieveOptions): Promise<T | null>;
  retrieveFromPage<T>(page: PageObjectResponse, schema: ZodType<T>, opts?: RetrieveOptions): Promise<T>;

  // Model factory — auto-injects id: n.id() if not present
  object<T extends ZodRawShape>(shape: T, opts?: { transform?: (data: RawShape<T>) => unknown }): NormModel<...>;
}

interface NormConfig {
  client: Client;
  onWarn?: (msg: string, ctx: object) => void;
  onError?: (err: Error, ctx: object) => void;
}
```

### `NormModel<T, CreateProps, Args>`

```ts
interface NormModel<T, CreateProps, Args> {
  readonly propertyNames: readonly string[];   // collected from n.* brands, excludes id/markdown/derived
  parse(data: unknown): T;
  retrieve(pageId: string, opts?: {
    args?: Args;
    derived?: DerivedResolver<Args>;
    includeMarkdown?: boolean;
  }): Promise<T | null>;
  parsePage(page: PageObjectResponse, opts?: { ... }): Promise<T>;
  create(input: {
    parent: PageParent;
    properties: CreateProps;     // simplified shape, Notion property names as keys, all optional
    markdown?: string;
  }): Promise<string | null>;
  query(databaseId: string, opts?: QueryOpts<Args>): Promise<T[]>;
}
```

### `DerivedResolver<Args>`

```ts
type DerivedResolver<Args> = (ctx: {
  key: string;
  args?: Args;
  page: PageObjectResponse;
}) => Promise<unknown | undefined>;
```

Retriever calls resolver once per `n.derived` field. `undefined` return → field falls back to schema `.default()`/`.optional()`. Host writes a `switch`/`if` chain on `key`.

---

## Auto `filter_properties`

`norm` automatically requests only the properties declared in the schema:

1. **`Lesson.retrieve(pageId, opts)`** — calls `getPageById(pageId, { filterProperties: Lesson.propertyNames })`
2. **`Lesson.query(databaseId, opts)`** — calls `queryDatabase(databaseId, { filter, sorts, filterProperties: Lesson.propertyNames })`

`Lesson.propertyNames` excludes `id` (always returned by Notion), `markdownContent` (fetched separately via `getPageMarkdown`), and `n.derived` fields (not Notion properties).

Filters still work normally — Notion's `filter` (which pages match) is independent of `filter_properties` (which property values come back). Hosts can filter on properties NOT in the schema (e.g. `published: true`); the filter operates server-side, the property just isn't returned on each page.

---

## Design principles

1. **Framework-agnostic** — no Next.js, no Sentry, no env. Caching stays in the host (wrap call sites with `"use cache"; cacheLife(...)` if using Next).
2. **Schema definition is pure** — `n.*` builders touch only the global `notionRegistry` (metadata). No client needed to define a model.
3. **Data access is bound** — `norm.object(...)` binds the schema to a `NormClient` instance. `Lesson.retrieve(...)` / `Lesson.create(...)` / `Lesson.query(...)` work without re-passing the client.
4. **LMS/business logic stays in the host** — `norm` knows nothing about `isCompleted`, `score`, `content_type`, progress tracking, or LMS rules. Derived fields are resolved by a host-supplied hook.
5. **Type safety end-to-end** — `n.getType<typeof Lesson>` for the output type; `CreateProps` for the create input (typos and wrong types are compile errors); `Args` inferred from derived fields.
6. **Auto-optimization** — `filter_properties` is injected automatically from the schema's property names, so Notion responses are as slim as possible.
7. **OOP client** — instantiate `NormClient` once with config, export it, all callers reuse it. No per-call config.

---

## Development

```bash
pnpm install
pnpm test        # Vitest
pnpm build       # tsdown → dist/
pnpm lint        # ESLint flat config
```

- **Build**: `tsdown` (ESM + DTS, zero-config)
- **Test**: Vitest with ported Notion ground-truth fixtures
- **Node**: `>=24`
- **Peer deps**: `zod@^4`, `@notionhq/client@^5`

---

## License

See `LICENSE`.