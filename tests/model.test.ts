import { describe, it, expect, vi, beforeEach } from "vitest";
import { NormClient } from "../src/client";
import { n } from "../src/builders";
import type { getType } from "../src/builders";
import type { NormConfig } from "../src/types";
import { lessons, cohorts } from "./fixtures";

function makeMockClient() {
  return {
    dataSources: { query: vi.fn() },
    pages: {
      retrieve: vi.fn(),
      retrieveMarkdown: vi.fn(),
      create: vi.fn(),
    },
    blocks: { children: { append: vi.fn() } },
    fileUploads: { create: vi.fn(), send: vi.fn() },
  };
}

function makeNorm(mockClient: ReturnType<typeof makeMockClient>): NormClient {
  return new NormClient({
    client: mockClient as unknown as NormConfig["client"],
    onWarn: vi.fn(),
    onError: vi.fn(),
  });
}

describe("norm.object (model factory)", () => {
  let mockClient: ReturnType<typeof makeMockClient>;
  let norm: NormClient;

  beforeEach(() => {
    mockClient = makeMockClient();
    norm = makeNorm(mockClient);
  });

  describe("auto-injects id", () => {
    it("auto-injects id: n.id() when not present", () => {
      const Model = norm.object({
        title: n.title(),
      });

      // propertyNames excludes id, so it should not be in the list
      expect(Model.propertyNames).toEqual(["title"]);
    });

    it("does not re-inject id when already present", () => {
      const Model = norm.object({
        id: n.id(),
        title: n.title(),
      });

      expect(Model.propertyNames).toEqual(["title"]);
    });
  });

  describe("propertyNames", () => {
    it("collects property names from n.* builders", () => {
      const Model = norm.object({
        title: n.title(),
        order: n.number({ property: "order" }),
        youtubeUrl: n.url({ property: "youtube_url" }),
      });

      expect(Model.propertyNames).toEqual(["title", "order", "youtube_url"]);
    });

    it("excludes markdown from propertyNames", () => {
      const Model = norm.object({
        title: n.title(),
        markdownContent: n.markdown().optional(),
      });

      expect(Model.propertyNames).toEqual(["title"]);
    });
  });

  describe("parse", () => {
    it("parses valid data", () => {
      const Model = norm.object({
        id: n.id(),
        title: n.title(),
      });

      const result = Model.parse({ id: "p1", title: "Hello" });
      expect(result).toEqual({ id: "p1", title: "Hello" });
    });
  });

  describe("parsePage", () => {
    it("extracts fields from a Notion page", async () => {
      const Model = norm.object({
        title: n.title(),
        order: n.number({ property: "order" }),
        youtubeUrl: n.url({ property: "youtube_url" }),
      });

      const result = await Model.parsePage(lessons["lesson-1"]!);
      expect(result.title).toBe("Getting Started");
      expect(result.order).toBe(1);
      expect(result.youtubeUrl).toBe("https://youtube.com/watch?v=video1");
    });

    it("auto-injects id from page.id", async () => {
      const Model = norm.object({
        title: n.title(),
      });

      const result = await Model.parsePage(lessons["lesson-1"]!);
      expect(result.id).toBe("lesson-1");
    });
  });

  describe("retrieve", () => {
    it("calls getPageById with filterProperties and returns parsed data", async () => {
      mockClient.pages.retrieve.mockResolvedValue(lessons["lesson-1"]!);
      mockClient.pages.retrieveMarkdown.mockResolvedValue({ markdown: "" });

      const Model = norm.object({
        title: n.title(),
        order: n.number({ property: "order" }),
      });

      const result = await Model.retrieve("lesson-1");

      expect(mockClient.pages.retrieve).toHaveBeenCalledWith(
        expect.objectContaining({
          page_id: "lesson-1",
          filter_properties: ["title", "order"],
        }),
      );
      expect(result?.title).toBe("Getting Started");
      expect(result?.order).toBe(1);
    });

    it("returns null when page not found", async () => {
      mockClient.pages.retrieve.mockResolvedValue(null);
      const Model = norm.object({ title: n.title() });
      const result = await Model.retrieve("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("query", () => {
    it("queries database with filterProperties and returns parsed array", async () => {
      mockClient.dataSources.query.mockResolvedValue({
        results: [lessons["lesson-1"]!, lessons["lesson-2"]!],
      });
      mockClient.pages.retrieveMarkdown.mockResolvedValue({ markdown: "" });

      const Model = norm.object({
        title: n.title(),
        order: n.number({ property: "order" }),
      });

      const results = await Model.query("ds_lessons", {
        filter: { property: "published", checkbox: { equals: true } },
        sorts: [{ property: "order", direction: "ascending" }],
      }) as Array<{ title: string }>;

      expect(mockClient.dataSources.query).toHaveBeenCalledWith(
        expect.objectContaining({
          data_source_id: "ds_lessons",
          filter: { property: "published", checkbox: { equals: true } },
          filter_properties: ["title", "order"],
        }),
      );
      expect(results).toHaveLength(2);
      expect(results[0]!.title).toBe("Getting Started");
      expect(results[1]!.title).toBe("Core Concepts");
    });
  });

  describe("create", () => {
    it("translates simplified properties to Notion format and calls createPage", async () => {
      mockClient.pages.create.mockResolvedValue({ id: "new-page-1" });

      const Model = norm.object({
        title: n.title(),
        order: n.number({ property: "order" }),
        published: n.checkbox({ property: "published" }),
        youtubeUrl: n.url({ property: "youtube_url" }),
      });

      const result = await Model.create({
        parent: { data_source_id: "ds_123" },
        properties: {
          title: "New Lesson",
          order: 10,
          published: true,
          youtube_url: "https://youtube.com/watch?v=abc",
        },
        markdown: "# Content",
      });

      expect(mockClient.pages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: { data_source_id: "ds_123" },
          markdown: "# Content",
        }),
      );
      expect(result).toBe("new-page-1");

      // Verify the properties were translated
      const call = mockClient.pages.create.mock.calls[0]![0] as { properties: Record<string, unknown> };
      expect(call.properties.title).toEqual({
        title: [{ text: { content: "New Lesson" } }],
      });
      expect(call.properties.order).toEqual({ number: 10 });
      expect(call.properties.published).toEqual({ checkbox: true });
      expect(call.properties.youtube_url).toEqual({ url: "https://youtube.com/watch?v=abc" });
    });

    it("handles null values", async () => {
      mockClient.pages.create.mockResolvedValue({ id: "new-page-1" });

      const Model = norm.object({
        title: n.title(),
        order: n.number({ property: "order" }),
        youtubeUrl: n.url({ property: "youtube_url" }),
      });

      await Model.create({
        parent: { data_source_id: "ds_123" },
        properties: {
          title: "Test",
          order: null,
          youtube_url: null,
        },
      });

      const call = mockClient.pages.create.mock.calls[0]![0] as { properties: Record<string, unknown> };
      expect(call.properties.order).toEqual({ number: null });
      expect(call.properties.youtube_url).toEqual({ url: null });
    });

    it("translates relation and multiSelect", async () => {
      mockClient.pages.create.mockResolvedValue({ id: "new-page-1" });

      const Model = norm.object({
        title: n.title(),
        week: n.relation({ property: "week" }),
        tags: n.multiSelect({ property: "tags" }),
      });

      await Model.create({
        parent: { data_source_id: "ds_123" },
        properties: {
          title: "Test",
          week: ["week-1", "week-2"],
          tags: ["a", "b"],
        },
      });

      const call = mockClient.pages.create.mock.calls[0]![0] as { properties: Record<string, unknown> };
      expect(call.properties.week).toEqual({
        relation: [{ id: "week-1" }, { id: "week-2" }],
      });
      expect(call.properties.tags).toEqual({
        multi_select: [{ name: "a" }, { name: "b" }],
      });
    });
  });

  describe("n.getType", () => {
    it("extracts the output type", () => {
      const Model = norm.object({
        title: n.title(),
        order: n.number({ property: "order" }),
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _model = Model;

      // Type-level test — if this compiles, getType works
      type T = getType<typeof Model>;
      const val: T = { id: "p1", title: "hello", order: 5 } as T;
      expect((val as { title: string }).title).toBe("hello");
    });
  });

  describe("transform option", () => {
    it("applies transform to the parsed output", async () => {
      const Model = norm.object(
        {
          option1: n.richText({ property: "option_1" }),
          option2: n.richText({ property: "option_2" }),
        },
        {
          transform: (data) => ({
            options: [data.option1, data.option2] as [string, string],
          }),
        },
      );

      const page = {
        ...cohorts["cohort-1"]!,
        properties: {
          option_1: { type: "rich_text", rich_text: [{ plain_text: "A", text: { content: "A", link: null }, type: "text", href: null, annotations: {} }] },
          option_2: { type: "rich_text", rich_text: [{ plain_text: "B", text: { content: "B", link: null }, type: "text", href: null, annotations: {} }] },
        },
      };

      const result = await Model.parsePage(page as never);
      expect(result.options).toEqual(["A", "B"]);
    });
  });
});