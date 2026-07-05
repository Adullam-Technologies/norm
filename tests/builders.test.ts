import { describe, it, expect } from "vitest";
import { n } from "../src/builders";
import { notionRegistry } from "../src/registry";

describe("builders", () => {
  describe("n.id", () => {
    it("returns a z.ZodString", () => {
      const schema = n.id();
      expect(schema.parse("abc")).toBe("abc");
    });

    it("brands with extractor=id, property=id", () => {
      const schema = n.id() as unknown as { _notion: unknown };
      expect(schema._notion).toEqual({ extractor: "id", property: "id" });
    });
  });

  describe("n.title", () => {
    it("defaults property to 'title'", () => {
      const schema = n.title() as unknown as { _notion: unknown };
      expect(schema._notion).toEqual({ extractor: "title", property: "title" });
    });

    it("accepts a custom property name", () => {
      const schema = n.title({ property: "Name" }) as unknown as { _notion: unknown };
      expect(schema._notion).toEqual({ extractor: "title", property: "Name" });
    });

    it("parses a string", () => {
      const schema = n.title();
      expect(schema.parse("hello")).toBe("hello");
    });

    it("registers metadata in notionRegistry", () => {
      const schema = n.title({ property: "title" });
      const meta = notionRegistry.get(schema);
      expect(meta?.extractor).toBe("title");
      expect(meta?.notionProperty).toBe("title");
    });
  });

  describe("n.richText", () => {
    it("brands with extractor=richText", () => {
      const schema = n.richText({ property: "desc" }) as unknown as { _notion: unknown };
      expect(schema._notion).toEqual({ extractor: "richText", property: "desc" });
    });

    it("parses a string", () => {
      expect(n.richText({ property: "desc" }).parse("text")).toBe("text");
    });
  });

  describe("n.number", () => {
    it("returns a nullable number", () => {
      const schema = n.number({ property: "count" });
      expect(schema.parse(5)).toBe(5);
      expect(schema.parse(null)).toBeNull();
    });
  });

  describe("n.checkbox", () => {
    it("parses a boolean", () => {
      expect(n.checkbox({ property: "active" }).parse(true)).toBe(true);
    });
  });

  describe("n.url", () => {
    it("returns a nullable string", () => {
      const schema = n.url({ property: "link" });
      expect(schema.parse("https://example.com")).toBe("https://example.com");
      expect(schema.parse(null)).toBeNull();
    });
  });

  describe("n.email", () => {
    it("parses a string", () => {
      expect(n.email({ property: "email" }).parse("a@b.com")).toBe("a@b.com");
    });
  });

  describe("n.date", () => {
    it("returns a nullable date", () => {
      const schema = n.date({ property: "when" });
      const d = new Date("2026-01-01");
      expect(schema.parse(d)).toEqual(d);
      expect(schema.parse(null)).toBeNull();
    });
  });

  describe("n.multiSelect", () => {
    it("returns an array of strings", () => {
      const schema = n.multiSelect({ property: "tags" });
      expect(schema.parse(["a", "b"])).toEqual(["a", "b"]);
    });
  });

  describe("n.select", () => {
    it("with enum: returns a z.enum", () => {
      const schema = n.select({ property: "env", enum: ["a", "b", "c"] });
      expect(schema.parse("a")).toBe("a");
    });

    it("with enum: fallback defaults to first option", () => {
      const schema = n.select({ property: "env", enum: ["a", "b", "c"] });
      // null falls through transform → returns fallback "a"
      expect(schema.parse(null)).toBe("a");
    });

    it("with enum: explicit fallback overrides default", () => {
      const schema = n.select({ property: "env", enum: ["a", "b", "c"], fallback: "b" });
      expect(schema.parse(null)).toBe("b");
    });

    it("without enum: returns nullable string", () => {
      const schema = n.select({ property: "env" });
      expect(schema.parse("anything")).toBe("anything");
      expect(schema.parse(null)).toBeNull();
    });
  });

  describe("n.relation", () => {
    it("without single: returns string array", () => {
      const schema = n.relation({ property: "week" });
      expect(schema.parse(["id1", "id2"])).toEqual(["id1", "id2"]);
    });

    it("with single: transforms to first id or empty string", () => {
      const schema = n.relation({ property: "week", single: true });
      expect(schema.parse(["id1", "id2"])).toBe("id1");
      expect(schema.parse([])).toBe("");
    });
  });

  describe("n.rollupText", () => {
    it("parses a string", () => {
      expect(n.rollupText({ property: "title" }).parse("hello")).toBe("hello");
    });
  });

  describe("n.rollupRelation", () => {
    it("returns an array of strings", () => {
      const schema = n.rollupRelation({ property: "enrolled" });
      expect(schema.parse(["id1"])).toEqual(["id1"]);
    });
  });

  describe("n.pageIcon", () => {
    it("returns a nullable string", () => {
      const schema = n.pageIcon();
      expect(schema.parse("icon")).toBe("icon");
      expect(schema.parse(null)).toBeNull();
    });
  });

  describe("n.derived", () => {
    it("brands with extractor=derived and carries the key", () => {
      const schema = n.derived<boolean>("isCompleted") as unknown as { _notion: unknown };
      expect(schema._notion).toEqual({ extractor: "derived", property: "isCompleted" });
    });

    it("registers derived metadata in notionRegistry", () => {
      const schema = n.derived<number>("score");
      const meta = notionRegistry.get(schema);
      expect(meta?.derived).toBe(true);
      expect(meta?.derivedKey).toBe("score");
    });
  });

  describe("n.markdown", () => {
    it("returns an optional string", () => {
      const schema = n.markdown();
      expect(schema.parse("hello")).toBe("hello");
      expect(schema.parse(undefined)).toBeUndefined();
    });

    it("brands with extractor=markdown", () => {
      const schema = n.markdown() as unknown as { _notion: unknown };
      expect(schema._notion).toEqual({ extractor: "markdown", property: "markdown" });
    });
  });
});