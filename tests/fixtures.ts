import type {
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

/**
 * Ground truth test data for Notion integration tests.
 * Each entity type has 5 instances for comprehensive testing.
 * Property names match the Notion database schema (snake_case for most entities).
 */

// Helper function to create a page object with proper typing
function createPage(
  id: string,
  properties: PageObjectResponse["properties"] | Record<string, unknown>,
  databaseId: string,
): PageObjectResponse {
  return {
    object: "page",
    id,
    created_time: "2026-01-15T10:00:00.000Z",
    last_edited_time: "2026-01-15T10:00:00.000Z",
    created_by: { object: "user", id: "user-1" },
    last_edited_by: { object: "user", id: "user-1" },
    cover: null,
    icon: null,
    parent: { type: "database_id", database_id: databaseId },
    archived: false,
    in_trash: false,
    is_locked: false,
    public_url: null,
    properties: properties as PageObjectResponse["properties"],
    url: "",
    public_route: null,
    request_id: "req-1",
  } as unknown as PageObjectResponse;
}

// Helper for rich text
function rt(content: string): RichTextItemResponse[] {
  return [
    {
      type: "text" as const,
      text: { content, link: null },
      plain_text: content,
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: "default" as const,
      },
      href: null,
    },
  ];
}

// Helper for rollup
function rollup(content: string) {
  return {
    type: "rollup" as const,
    rollup: {
      type: "array" as const,
      array: [
        {
          type: "rich_text" as const,
          rich_text: rt(content),
        },
      ],
    },
  };
}

// Helper for rollup of relations (e.g. "Enrolled In" rollup on Students)
function rollupRelations(ids: string[]) {
  return {
    type: "rollup" as const,
    rollup: {
      type: "array" as const,
      array: ids.map((id) => ({
        type: "relation" as const,
        relation: [{ id }],
      })),
    },
  };
}

// ============== STUDENTS ==============
export const students: Record<string, PageObjectResponse> = {
  "student-1": createPage(
    "student-1",
    {
      "Student Email Address": {
        id: "email",
        type: "email",
        email: "alice@example.com",
      },
      "Student Name": {
        id: "name",
        type: "rich_text",
        rich_text: rt("Alice Johnson"),
      },
      "Enrolled In": rollupRelations(["cohort-1"]),
    },
    "students-db",
  ),
  "student-2": createPage(
    "student-2",
    {
      "Student Email Address": {
        id: "email",
        type: "email",
        email: "bob@example.com",
      },
      "Student Name": {
        id: "name",
        type: "rich_text",
        rich_text: rt("Bob Smith"),
      },
      "Enrolled In": rollupRelations(["cohort-1"]),
    },
    "students-db",
  ),
  "student-3": createPage(
    "student-3",
    {
      "Student Email Address": {
        id: "email",
        type: "email",
        email: "carol@example.com",
      },
      "Student Name": {
        id: "name",
        type: "rich_text",
        rich_text: rt("Carol Williams"),
      },
      "Enrolled In": rollupRelations(["cohort-2"]),
    },
    "students-db",
  ),
  "student-4": createPage(
    "student-4",
    {
      "Student Email Address": {
        id: "email",
        type: "email",
        email: "david@example.com",
      },
      "Student Name": {
        id: "name",
        type: "rich_text",
        rich_text: rt("David Brown"),
      },
      "Enrolled In": rollupRelations(["cohort-1"]),
    },
    "students-db",
  ),
  "student-5": createPage(
    "student-5",
    {
      "Student Email Address": {
        id: "email",
        type: "email",
        email: "eve@example.com",
      },
      "Student Name": {
        id: "name",
        type: "rich_text",
        rich_text: rt("Eve Davis"),
      },
      "Enrolled In": rollupRelations([]),
    },
    "students-db",
  ),
};

// ============== COHORTS ==============
export const cohorts: Record<string, PageObjectResponse> = {
  "cohort-1": createPage(
    "cohort-1",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("March 2026 Cohort"),
      },
      slug: {
        id: "slug",
        type: "rich_text",
        rich_text: rt("march-2026"),
      },
      active: {
        id: "active",
        type: "checkbox",
        checkbox: true,
      },
      description: {
        id: "description",
        type: "rich_text",
        rich_text: rt("Spring 2026 cohort"),
      },
      "bunny_library_id": {
        id: "bunny_lib",
        type: "rich_text",
        rich_text: rt("637578"),
      },
    },
    "cohorts-db",
  ),
  "cohort-2": createPage(
    "cohort-2",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("January 2026 Cohort"),
      },
      slug: {
        id: "slug",
        type: "rich_text",
        rich_text: rt("january-2026"),
      },
      active: {
        id: "active",
        type: "checkbox",
        checkbox: false,
      },
      description: {
        id: "description",
        type: "rich_text",
        rich_text: rt("Winter 2026 cohort"),
      },
      "bunny_library_id": {
        id: "bunny_lib",
        type: "rich_text",
        rich_text: rt("123456"),
      },
    },
    "cohorts-db",
  ),
  "cohort-3": createPage(
    "cohort-3",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("May 2026 Cohort"),
      },
      slug: {
        id: "slug",
        type: "rich_text",
        rich_text: rt("may-2026"),
      },
      active: {
        id: "active",
        type: "checkbox",
        checkbox: true,
      },
      description: {
        id: "description",
        type: "rich_text",
        rich_text: [],
      },
      "bunny_library_id": {
        id: "bunny_lib",
        type: "rich_text",
        rich_text: rt("234567"),
      },
    },
    "cohorts-db",
  ),
  "cohort-4": createPage(
    "cohort-4",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("July 2026 Cohort"),
      },
      slug: {
        id: "slug",
        type: "rich_text",
        rich_text: rt("july-2026"),
      },
      active: {
        id: "active",
        type: "checkbox",
        checkbox: false,
      },
      description: {
        id: "description",
        type: "rich_text",
        rich_text: rt("Summer 2026 cohort"),
      },
      "bunny_library_id": {
        id: "bunny_lib",
        type: "rich_text",
        rich_text: rt("345678"),
      },
    },
    "cohorts-db",
  ),
  "cohort-5": createPage(
    "cohort-5",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("September 2026 Cohort"),
      },
      slug: {
        id: "slug",
        type: "rich_text",
        rich_text: rt("september-2026"),
      },
      active: {
        id: "active",
        type: "checkbox",
        checkbox: true,
      },
      description: {
        id: "description",
        type: "rich_text",
        rich_text: rt("Fall 2026 cohort"),
      },
      "bunny_library_id": {
        id: "bunny_lib",
        type: "rich_text",
        rich_text: rt("456789"),
      },
    },
    "cohorts-db",
  ),
};

// ============== WEEKS ==============
export const weeks: Record<string, PageObjectResponse> = {
  "week-1": createPage(
    "week-1",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Week 1: Introduction"),
      },
      week_number: {
        id: "week_number",
        type: "number",
        number: 1,
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
      cohort: {
        id: "cohort",
        type: "relation",
        relation: [{ id: "cohort-1" }],
      },
    },
    "weeks-db",
  ),
  "week-2": createPage(
    "week-2",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Week 2: Fundamentals"),
      },
      week_number: {
        id: "week_number",
        type: "number",
        number: 2,
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
      cohort: {
        id: "cohort",
        type: "relation",
        relation: [{ id: "cohort-1" }],
      },
    },
    "weeks-db",
  ),
  "week-3": createPage(
    "week-3",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Week 3: Advanced Topics"),
      },
      week_number: {
        id: "week_number",
        type: "number",
        number: 3,
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: false,
      },
      cohort: {
        id: "cohort",
        type: "relation",
        relation: [{ id: "cohort-1" }],
      },
    },
    "weeks-db",
  ),
  "week-4": createPage(
    "week-4",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Week 4: Projects"),
      },
      week_number: {
        id: "week_number",
        type: "number",
        number: 4,
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
      cohort: {
        id: "cohort",
        type: "relation",
        relation: [{ id: "cohort-1" }],
      },
    },
    "weeks-db",
  ),
  "week-5": createPage(
    "week-5",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Week 5: Capstone"),
      },
      week_number: {
        id: "week_number",
        type: "number",
        number: 5,
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
      cohort: {
        id: "cohort",
        type: "relation",
        relation: [{ id: "cohort-1" }],
      },
    },
    "weeks-db",
  ),
};

// ============== LESSONS ==============
export const lessons: Record<string, PageObjectResponse> = {
  "lesson-1": createPage(
    "lesson-1",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Getting Started"),
      },
      slug: {
        id: "slug",
        type: "rich_text",
        rich_text: rt("getting-started"),
      },
      order: {
        id: "order",
        type: "number",
        number: 1,
      },
      youtube_url: {
        id: "youtube_url",
        type: "url",
        url: "https://youtube.com/watch?v=video1",
      },
      week: {
        id: "week",
        type: "relation",
        relation: [{ id: "week-1" }],
      },
      week_title: rollup("Week 1"),
      estimated_minutes: {
        id: "estimated_minutes",
        type: "number",
        number: 5,
      },
      code_env: {
        id: "code_env",
        type: "select",
        select: { name: "no_code" },
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
    },
    "lessons-db",
  ),
  "lesson-2": createPage(
    "lesson-2",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Core Concepts"),
      },
      slug: {
        id: "slug",
        type: "rich_text",
        rich_text: rt("core-concepts"),
      },
      order: {
        id: "order",
        type: "number",
        number: 2,
      },
      youtube_url: {
        id: "youtube_url",
        type: "url",
        url: "https://youtube.com/watch?v=video2",
      },
      week: {
        id: "week",
        type: "relation",
        relation: [{ id: "week-1" }],
      },
      week_title: rollup("Week 1"),
      estimated_minutes: {
        id: "estimated_minutes",
        type: "number",
        number: 10,
      },
      code_env: {
        id: "code_env",
        type: "select",
        select: { name: "test_runner" },
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
    },
    "lessons-db",
  ),
  "lesson-3": createPage(
    "lesson-3",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Best Practices"),
      },
      slug: {
        id: "slug",
        type: "rich_text",
        rich_text: rt("best-practices"),
      },
      order: {
        id: "order",
        type: "number",
        number: 3,
      },
      youtube_url: {
        id: "youtube_url",
        type: "url",
        url: "https://youtube.com/watch?v=video3",
      },
      week: {
        id: "week",
        type: "relation",
        relation: [{ id: "week-2" }],
      },
      week_title: rollup("Week 2"),
      estimated_minutes: {
        id: "estimated_minutes",
        type: "number",
        number: 15,
      },
      code_env: {
        id: "code_env",
        type: "select",
        select: { name: "ai_code_analysis" },
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
    },
    "lessons-db",
  ),
  "lesson-4": createPage(
    "lesson-4",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Performance Tips"),
      },
      slug: {
        id: "slug",
        type: "rich_text",
        rich_text: rt("performance-tips"),
      },
      order: {
        id: "order",
        type: "number",
        number: 4,
      },
      youtube_url: {
        id: "youtube_url",
        type: "url",
        url: "https://youtube.com/watch?v=video4",
      },
      week: {
        id: "week",
        type: "relation",
        relation: [{ id: "week-2" }],
      },
      week_title: rollup("Week 2"),
      estimated_minutes: {
        id: "estimated_minutes",
        type: "number",
        number: null,
      },
      code_env: {
        id: "code_env",
        type: "select",
        select: null,
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: false,
      },
    },
    "lessons-db",
  ),
  "lesson-5": createPage(
    "lesson-5",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Deployment"),
      },
      slug: {
        id: "slug",
        type: "rich_text",
        rich_text: rt("deployment"),
      },
      order: {
        id: "order",
        type: "number",
        number: 5,
      },
      youtube_url: {
        id: "youtube_url",
        type: "url",
        url: "https://youtube.com/watch?v=video5",
      },
      week: {
        id: "week",
        type: "relation",
        relation: [{ id: "week-3" }],
      },
      week_title: rollup("Week 3"),
      estimated_minutes: {
        id: "estimated_minutes",
        type: "number",
        number: 20,
      },
      code_env: {
        id: "code_env",
        type: "select",
        select: { name: "no_code" },
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
    },
    "lessons-db",
  ),
};

// Helper for multi_select
function multiSelect(names: string[]) {
  return {
    type: "multi_select" as const,
    multi_select: names.map((name) => ({
      id: name,
      name,
      color: "default" as const,
    })),
  };
}

// Helper for select
function select(name: string) {
  return {
    type: "select" as const,
    select: { id: name, name, color: "default" as const },
  };
}

// ============== QUIZ QUESTIONS ==============
// Each record is an individual question linked to a lesson
export const quizzes: Record<string, PageObjectResponse> = {
  "question-1": createPage(
    "question-1",
    {
      question_title: {
        id: "title",
        type: "title",
        title: rt("What is the correct way to declare a variable in JavaScript?"),
      },
      question_type: select("single"),
      correct_answer: multiSelect(["2"]),
      option_1: { id: "option_1", type: "rich_text", rich_text: rt("var x = 1") },
      option_2: { id: "option_2", type: "rich_text", rich_text: rt("const x = 1") },
      option_3: { id: "option_3", type: "rich_text", rich_text: rt("x := 1") },
      option_4: { id: "option_4", type: "rich_text", rich_text: rt("int x = 1") },
      option_1_feedback: { id: "option_1_feedback", type: "rich_text", rich_text: rt("var is outdated, prefer const or let") },
      option_2_feedback: { id: "option_2_feedback", type: "rich_text", rich_text: rt("Correct! const declares a block-scoped constant") },
      option_3_feedback: { id: "option_3_feedback", type: "rich_text", rich_text: [] },
      option_4_feedback: { id: "option_4_feedback", type: "rich_text", rich_text: [] },
      lesson: { id: "lesson", type: "relation", relation: [{ id: "lesson-1" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      concepts: multiSelect(["Variables", "JavaScript Basics"]),
    },
    "quizzes-db",
  ),
  "question-2": createPage(
    "question-2",
    {
      question_title: {
        id: "title",
        type: "title",
        title: rt("Which of the following are primitive types in JavaScript?"),
      },
      question_type: select("multiple"),
      correct_answer: multiSelect(["1", "3"]),
      option_1: { id: "option_1", type: "rich_text", rich_text: rt("string") },
      option_2: { id: "option_2", type: "rich_text", rich_text: rt("Array") },
      option_3: { id: "option_3", type: "rich_text", rich_text: rt("number") },
      option_4: { id: "option_4", type: "rich_text", rich_text: rt("Object") },
      option_1_feedback: { id: "option_1_feedback", type: "rich_text", rich_text: rt("Yes, string is a primitive type") },
      option_2_feedback: { id: "option_2_feedback", type: "rich_text", rich_text: rt("Array is an object, not a primitive") },
      option_3_feedback: { id: "option_3_feedback", type: "rich_text", rich_text: rt("Yes, number is a primitive type") },
      option_4_feedback: { id: "option_4_feedback", type: "rich_text", rich_text: rt("Object is not a primitive type") },
      lesson: { id: "lesson", type: "relation", relation: [{ id: "lesson-1" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      concepts: multiSelect(["Data Types"]),
    },
    "quizzes-db",
  ),
  "question-3": createPage(
    "question-3",
    {
      question_title: {
        id: "title",
        type: "title",
        title: rt("What does CSS stand for?"),
      },
      question_type: select("single"),
      correct_answer: multiSelect(["1"]),
      option_1: { id: "option_1", type: "rich_text", rich_text: rt("Cascading Style Sheets") },
      option_2: { id: "option_2", type: "rich_text", rich_text: rt("Creative Style System") },
      option_3: { id: "option_3", type: "rich_text", rich_text: rt("Computer Style Scripts") },
      option_4: { id: "option_4", type: "rich_text", rich_text: rt("Coded Style Syntax") },
      option_1_feedback: { id: "option_1_feedback", type: "rich_text", rich_text: rt("Correct!") },
      option_2_feedback: { id: "option_2_feedback", type: "rich_text", rich_text: [] },
      option_3_feedback: { id: "option_3_feedback", type: "rich_text", rich_text: [] },
      option_4_feedback: { id: "option_4_feedback", type: "rich_text", rich_text: [] },
      lesson: { id: "lesson", type: "relation", relation: [{ id: "lesson-2" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      concepts: multiSelect(["CSS"]),
    },
    "quizzes-db",
  ),
  "question-4": createPage(
    "question-4",
    {
      question_title: {
        id: "title",
        type: "title",
        title: rt("What is the box model in CSS?"),
      },
      question_type: select("single"),
      correct_answer: multiSelect(["3"]),
      option_1: { id: "option_1", type: "rich_text", rich_text: rt("A layout grid system") },
      option_2: { id: "option_2", type: "rich_text", rich_text: rt("A JavaScript framework") },
      option_3: { id: "option_3", type: "rich_text", rich_text: rt("The content, padding, border, and margin model") },
      option_4: { id: "option_4", type: "rich_text", rich_text: rt("A HTML element type") },
      option_1_feedback: { id: "option_1_feedback", type: "rich_text", rich_text: [] },
      option_2_feedback: { id: "option_2_feedback", type: "rich_text", rich_text: [] },
      option_3_feedback: { id: "option_3_feedback", type: "rich_text", rich_text: rt("Correct! Every element is a box with content, padding, border, and margin") },
      option_4_feedback: { id: "option_4_feedback", type: "rich_text", rich_text: [] },
      lesson: { id: "lesson", type: "relation", relation: [{ id: "lesson-2" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      concepts: multiSelect(["CSS", "Layout"]),
    },
    "quizzes-db",
  ),
  "question-5": createPage(
    "question-5",
    {
      question_title: {
        id: "title",
        type: "title",
        title: rt("Which HTTP methods are considered safe?"),
      },
      question_type: select("multiple"),
      correct_answer: multiSelect(["1", "4"]),
      option_1: { id: "option_1", type: "rich_text", rich_text: rt("GET") },
      option_2: { id: "option_2", type: "rich_text", rich_text: rt("POST") },
      option_3: { id: "option_3", type: "rich_text", rich_text: rt("DELETE") },
      option_4: { id: "option_4", type: "rich_text", rich_text: rt("HEAD") },
      option_1_feedback: { id: "option_1_feedback", type: "rich_text", rich_text: rt("GET is safe — it only retrieves data") },
      option_2_feedback: { id: "option_2_feedback", type: "rich_text", rich_text: rt("POST is not safe — it creates resources") },
      option_3_feedback: { id: "option_3_feedback", type: "rich_text", rich_text: rt("DELETE is not safe — it removes resources") },
      option_4_feedback: { id: "option_4_feedback", type: "rich_text", rich_text: rt("HEAD is safe — it only retrieves headers") },
      lesson: { id: "lesson", type: "relation", relation: [{ id: "lesson-3" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      concepts: multiSelect(["HTTP", "APIs"]),
    },
    "quizzes-db",
  ),
};

// ============== TODOS ==============
export const todos: Record<string, PageObjectResponse> = {
  "todo-1": createPage(
    "todo-1",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Setup Development Environment"),
      },
      description: {
        id: "description",
        type: "rich_text",
        rich_text: rt("Install Node.js, Git, and VS Code"),
      },
      link: {
        id: "link",
        type: "url",
        url: "https://docs.example.com/setup",
      },
      order: {
        id: "order",
        type: "number",
        number: 1,
      },
      type: {
        id: "type",
        type: "select",
        select: { name: "regular" },
      },
      week: {
        id: "week",
        type: "relation",
        relation: [{ id: "week-1" }],
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
    },
    "todos-db",
  ),
  "todo-2": createPage(
    "todo-2",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Complete Reading Assignment"),
      },
      description: {
        id: "description",
        type: "rich_text",
        rich_text: rt("Read Chapter 1-3"),
      },
      link: {
        id: "link",
        type: "url",
        url: "https://docs.example.com/reading",
      },
      order: {
        id: "order",
        type: "number",
        number: 2,
      },
      type: {
        id: "type",
        type: "select",
        select: { name: "submission" },
      },
      week: {
        id: "week",
        type: "relation",
        relation: [{ id: "week-1" }],
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
    },
    "todos-db",
  ),
  "todo-3": createPage(
    "todo-3",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Build First Project"),
      },
      description: {
        id: "description",
        type: "rich_text",
        rich_text: [],
      },
      link: {
        id: "link",
        type: "url",
        url: "https://github.com/example/project1",
      },
      order: {
        id: "order",
        type: "number",
        number: 3,
      },
      type: {
        id: "type",
        type: "select",
        select: { name: "regular" },
      },
      week: {
        id: "week",
        type: "relation",
        relation: [{ id: "week-2" }],
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
    },
    "todos-db",
  ),
  "todo-4": createPage(
    "todo-4",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Code Review"),
      },
      description: {
        id: "description",
        type: "rich_text",
        rich_text: rt("Review peer code submissions"),
      },
      link: {
        id: "link",
        type: "url",
        url: "",
      },
      order: {
        id: "order",
        type: "number",
        number: 4,
      },
      type: {
        id: "type",
        type: "select",
        select: { name: "regular" },
      },
      week: {
        id: "week",
        type: "relation",
        relation: [{ id: "week-2" }],
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: false,
      },
    },
    "todos-db",
  ),
  "todo-5": createPage(
    "todo-5",
    {
      title: {
        id: "title",
        type: "title",
        title: rt("Final Presentation"),
      },
      description: {
        id: "description",
        type: "rich_text",
        rich_text: rt("Prepare and deliver final presentation"),
      },
      link: {
        id: "link",
        type: "url",
        url: "https://docs.example.com/presentation",
      },
      order: {
        id: "order",
        type: "number",
        number: 5,
      },
      type: {
        id: "type",
        type: "select",
        select: { name: "submission" },
      },
      week: {
        id: "week",
        type: "relation",
        relation: [{ id: "week-3" }],
      },
      published: {
        id: "published",
        type: "checkbox",
        checkbox: true,
      },
    },
    "todos-db",
  ),
};

// ============== STANDUPS ==============
export const standups: Record<string, PageObjectResponse> = {
  "standup-1": createPage(
    "standup-1",
    {
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      when: { id: "when", type: "date", date: { start: "2026-07-01T10:00:00.000Z" } },
      link: { id: "link", type: "url", url: "https://meet.example.com/standup-1" },
    },
    "standups-db",
  ),
  "standup-2": createPage(
    "standup-2",
    {
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      when: { id: "when", type: "date", date: { start: "2026-07-08T10:00:00.000Z" } },
      link: { id: "link", type: "url", url: "https://meet.example.com/standup-2" },
    },
    "standups-db",
  ),
  "standup-3": createPage(
    "standup-3",
    {
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-2" }] },
      when: { id: "when", type: "date", date: { start: "2026-07-15T10:00:00.000Z" } },
      link: { id: "link", type: "url", url: "https://meet.example.com/standup-3" },
    },
    "standups-db",
  ),
  "standup-4": createPage(
    "standup-4",
    {
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      when: { id: "when", type: "date", date: { start: "2026-07-22T10:00:00.000Z" } },
      link: { id: "link", type: "url", url: null },
    },
    "standups-db",
  ),
"standup-5": createPage(
    "standup-5",
    {
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      when: { id: "when", type: "date", date: { start: "2026-07-29T10:00:00.000Z" } },
      link: { id: "link", type: "url", url: "https://meet.example.com/standup-5" },
    },
    "standups-db",
  ),
};

// ============== PROGRESS ==============
export const progress: Record<string, PageObjectResponse> = {
  "progress-1": createPage(
    "progress-1",
    {
      content_id: { id: "cid", type: "title", title: rt("lesson-1") },
      content_title: { id: "ct", type: "rich_text", rich_text: rt("Getting Started") },
      content_type: select("lesson"),
      student: { id: "student", type: "relation", relation: [{ id: "student-1" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      score: { id: "score", type: "number", number: 100 },
      timestamp: { id: "ts", type: "date", date: { start: "2026-06-01T10:00:00.000Z" } },
    },
    "progress-db",
  ),
  "progress-2": createPage(
    "progress-2",
    {
      content_id: { id: "cid", type: "title", title: rt("quiz-1") },
      content_title: { id: "ct", type: "rich_text", rich_text: rt("Quiz 1") },
      content_type: select("quiz"),
      student: { id: "student", type: "relation", relation: [{ id: "student-1" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      score: { id: "score", type: "number", number: 85 },
      timestamp: { id: "ts", type: "date", date: { start: "2026-06-02T10:00:00.000Z" } },
    },
    "progress-db",
  ),
  "progress-3": createPage(
    "progress-3",
    {
      content_id: { id: "cid", type: "title", title: rt("quiz-2") },
      content_title: { id: "ct", type: "rich_text", rich_text: rt("Quiz 2") },
      content_type: select("quiz"),
      student: { id: "student", type: "relation", relation: [{ id: "student-1" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      score: { id: "score", type: "number", number: 70 },
      timestamp: { id: "ts", type: "date", date: { start: "2026-06-03T10:00:00.000Z" } },
    },
    "progress-db",
  ),
  "progress-4": createPage(
    "progress-4",
    {
      content_id: { id: "cid", type: "title", title: rt("todo-1") },
      content_title: { id: "ct", type: "rich_text", rich_text: rt("Setup Dev Environment") },
      content_type: select("todo"),
      student: { id: "student", type: "relation", relation: [{ id: "student-1" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      score: { id: "score", type: "number", number: null },
      timestamp: { id: "ts", type: "date", date: { start: "2026-06-04T10:00:00.000Z" } },
    },
    "progress-db",
  ),
  "progress-5": createPage(
    "progress-5",
    {
      content_id: { id: "cid", type: "title", title: rt("lesson-low") },
      content_title: { id: "ct", type: "rich_text", rich_text: rt("Low Score Lesson") },
      content_type: select("lesson"),
      student: { id: "student", type: "relation", relation: [{ id: "student-1" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      score: { id: "score", type: "number", number: 50 },
      timestamp: { id: "ts", type: "date", date: { start: "2026-06-05T10:00:00.000Z" } },
    },
    "progress-db",
  ),
  "progress-6": createPage(
    "progress-6",
    {
      content_id: { id: "cid", type: "title", title: rt("lesson-boundary") },
      content_title: { id: "ct", type: "rich_text", rich_text: rt("Boundary Lesson") },
      content_type: select("lesson"),
      student: { id: "student", type: "relation", relation: [{ id: "student-1" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      score: { id: "score", type: "number", number: 80 },
      timestamp: { id: "ts", type: "date", date: { start: "2026-06-06T10:00:00.000Z" } },
    },
    "progress-db",
  ),
  "progress-7": createPage(
    "progress-7",
    {
      content_id: { id: "cid", type: "title", title: rt("code-attempt-1") },
      content_title: { id: "ct", type: "rich_text", rich_text: rt("Code Attempt") },
      content_type: select("code_attempt"),
      student: { id: "student", type: "relation", relation: [{ id: "student-1" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      score: { id: "score", type: "number", number: 50 },
      timestamp: { id: "ts", type: "date", date: { start: "2026-06-07T10:00:00.000Z" } },
    },
    "progress-db",
  ),
  "progress-8": createPage(
    "progress-8",
    {
      content_id: { id: "cid", type: "title", title: rt("code-attempt-2") },
      content_title: { id: "ct", type: "rich_text", rich_text: rt("Code Attempt") },
      content_type: select("code_attempt"),
      student: { id: "student", type: "relation", relation: [{ id: "student-1" }] },
      cohort: { id: "cohort", type: "relation", relation: [{ id: "cohort-1" }] },
      score: { id: "score", type: "number", number: 100 },
      timestamp: { id: "ts", type: "date", date: { start: "2026-06-08T10:00:00.000Z" } },
    },
    "progress-db",
  ),
};

// Combined export for easy access
export const groundTruth = {
  students,
  cohorts,
  weeks,
  lessons,
  quizzes,
  todos,
  standups,
  progress,
};
