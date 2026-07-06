import { describe, it, expect } from "vitest";
import { z } from "zod";
import { retrieveFromPage } from "../src/retriever";
import { n } from "../src/builders";
import { lessons, cohorts, weeks, students } from "./fixtures";

describe("retriever", () => {
  describe("retrieveFromPage with lessons", () => {
    const lessonSchema = z.object({
      id: n.id(),
      title: n.title(),
      order: n.number({ property: "order" }),
      youtubeUrl: n.url({ property: "youtube_url" }),
      weekId: n.relation({ property: "week", single: true }),
      weekTitle: n.rollupText({ property: "week_title" }),
      estimatedMinutes: n.number({ property: "estimated_minutes" }).transform((v: number | null) => v ?? 5),
      codeEnv: n.select({ property: "code_env", enum: ["no_code", "test_runner", "ai_code_analysis", "submission"] }),
      published: n.checkbox({ property: "published" }),
    });

    it("extracts all fields from lesson-1", async () => {
      const page = lessons["lesson-1"]!;
      const result = await retrieveFromPage(page, lessonSchema);

      expect(result.id).toBe("lesson-1");
      expect(result.title).toBe("Getting Started");
      expect(result.order).toBe(1);
      expect(result.youtubeUrl).toBe("https://youtube.com/watch?v=video1");
      expect(result.weekId).toBe("week-1");
      expect(result.weekTitle).toBe("Week 1");
      expect(result.estimatedMinutes).toBe(5);
      expect(result.codeEnv).toBe("no_code");
      expect(result.published).toBe(true);
    });

    it("handles null values (lesson-4)", async () => {
      const page = lessons["lesson-4"]!;
      const result = await retrieveFromPage(page, lessonSchema);

      expect(result.estimatedMinutes).toBe(5); // null → fallback 5
      expect(result.codeEnv).toBe("no_code"); // null select → fallback to first enum option
      expect(result.published).toBe(false);
    });

    it("extracts all 5 lessons", async () => {
      for (const page of Object.values(lessons)) {
        const result = await retrieveFromPage(page, lessonSchema);
        expect(result.id).toBe(page.id);
        expect(result.title).toBeTruthy();
      }
    });
  });

  describe("retrieveFromPage with cohorts", () => {
    const cohortSchema = z.object({
      id: n.id(),
      title: n.title(),
      slug: n.richText({ property: "slug" }),
      active: n.checkbox({ property: "active" }),
      description: n.richText({ property: "description" }),
      bunnyLibraryId: n.richText({ property: "bunny_library_id" }),
    });

    it("extracts cohort-1", async () => {
      const page = cohorts["cohort-1"]!;
      const result = await retrieveFromPage(page, cohortSchema);

      expect(result.id).toBe("cohort-1");
      expect(result.title).toBe("March 2026 Cohort");
      expect(result.slug).toBe("march-2026");
      expect(result.active).toBe(true);
      expect(result.description).toBe("Spring 2026 cohort");
      expect(result.bunnyLibraryId).toBe("637578");
    });

    it("handles empty rich_text (cohort-3 description)", async () => {
      const page = cohorts["cohort-3"]!;
      const result = await retrieveFromPage(page, cohortSchema);
      expect(result.description).toBe("");
    });
  });

  describe("retrieveFromPage with weeks", () => {
    const weekSchema = z.object({
      id: n.id(),
      title: n.title(),
      weekNumber: n.number({ property: "week_number" }),
      published: n.checkbox({ property: "published" }),
      cohortId: n.relation({ property: "cohort", single: true }),
    });

    it("extracts week-1", async () => {
      const page = weeks["week-1"]!;
      const result = await retrieveFromPage(page, weekSchema);

      expect(result.id).toBe("week-1");
      expect(result.title).toBe("Week 1: Introduction");
      expect(result.weekNumber).toBe(1);
      expect(result.published).toBe(true);
      expect(result.cohortId).toBe("cohort-1");
    });
  });

  describe("retrieveFromPage with markdown", () => {
    const schema = z.object({
      id: n.id(),
      title: n.title(),
      markdownContent: n.markdown().optional(),
    });

    it("fetches markdown when includeMarkdown=true", async () => {
      const page = lessons["lesson-1"]!;
      const result = await retrieveFromPage(page, schema, {
        includeMarkdown: true,
      }, {
        getPageMarkdown: async () => "# Hello World",
      });

      expect(result.markdownContent).toBe("# Hello World");
    });

    it("does not fetch markdown when includeMarkdown not set", async () => {
      const page = lessons["lesson-1"]!;
      const result = await retrieveFromPage(page, schema, {}, {
        getPageMarkdown: async () => "should not be called",
      });

      expect(result.markdownContent).toBeUndefined();
    });
  });

  describe("retrieveFromPage with students (email + rollupRelation)", () => {
    const studentSchema = z.object({
      id: n.id(),
      email: n.email({ property: "Student Email Address" }),
      name: n.richText({ property: "Student Name" }),
      enrolledIn: n.rollupRelation({ property: "Enrolled In" }),
    });

    it("extracts student-1", async () => {
      const page = students["student-1"]!;
      const result = await retrieveFromPage(page, studentSchema);

      expect(result.id).toBe("student-1");
      expect(result.email).toBe("alice@example.com");
      expect(result.name).toBe("Alice Johnson");
      expect(result.enrolledIn).toEqual(["cohort-1"]);
    });

    it("handles empty rollup (student-5)", async () => {
      const page = students["student-5"]!;
      const result = await retrieveFromPage(page, studentSchema);
      expect(result.enrolledIn).toEqual([]);
    });
  });
});