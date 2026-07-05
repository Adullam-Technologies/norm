import type {
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

function getText(richText: Array<RichTextItemResponse> | undefined): string {
  if (!richText || richText.length === 0) return "";
  return richText.map((item) => item.plain_text).join("");
}

export function getTitle(page: PageObjectResponse, property: string): string {
  const prop = page.properties[property];
  if (!prop || prop.type !== "title") return "";
  return getText(prop.title);
}

export function getEmail(page: PageObjectResponse, property: string): string {
  const prop = page.properties[property];
  if (!prop || prop.type !== "email") return "";
  return prop.email || "";
}

export function getRichText(
  page: PageObjectResponse,
  property: string,
): string {
  const prop = page.properties[property];
  if (!prop || prop.type !== "rich_text") return "";
  return getText(prop.rich_text);
}

export function getRollupText(
  page: PageObjectResponse,
  property: string,
): string {
  const prop = page.properties[property];
  if (!prop || prop.type !== "rollup" || prop.rollup.type != "array") return "";
  const values = prop.rollup.array;
  for (const v of values) {
    if (v.type === "rich_text") {
      return getText(v.rich_text);
    } else if (v.type === "relation") {
      return v.relation[0]?.id ?? "";
    }
  }

  return "";
}

export function getNumber(
  page: PageObjectResponse,
  property: string,
): number | null {
  const prop = page.properties[property];
  if (!prop || prop.type !== "number") return null;
  return prop.number;
}

export function getSelect(
  page: PageObjectResponse,
  property: string,
): string | null {
  const prop = page.properties[property];
  if (!prop || prop.type !== "select") return null;
  return prop.select?.name ?? null;
}

export function getCheckbox(
  page: PageObjectResponse,
  property: string,
): boolean {
  const prop = page.properties[property];
  if (!prop || prop.type !== "checkbox") return false;
  return prop.checkbox;
}

export function getDate(
  page: PageObjectResponse,
  property: string,
): Date | null {
  const prop = page.properties[property];
  if (!prop || prop.type !== "date" || !prop.date) return null;
  return prop.date.start ? new Date(prop.date.start) : null;
}

export function getUrl(
  page: PageObjectResponse,
  property: string,
): string | null {
  const prop = page.properties[property];
  if (!prop || prop.type !== "url") return null;
  return prop.url;
}

export function getMultiSelect(
  page: PageObjectResponse,
  property: string,
): string[] {
  const prop = page.properties[property];
  if (!prop || prop.type !== "multi_select") return [];
  return prop.multi_select.map((item) => item.name);
}

export function getRelationIds(
  page: PageObjectResponse,
  property: string,
): string[] {
  const prop = page.properties[property];
  if (!prop || prop.type !== "relation") return [];
  return prop.relation.map((item) => item.id);
}

export function getPageIcon(page: PageObjectResponse): string | null {
  const icon = page.icon;
  if (!icon) return null;
  if (icon.type === "emoji") return icon.emoji;
  if (icon.type === "external") return icon.external.url;
  if (icon.type === "file") return icon.file.url;
  return null;
}

export function getRollupRelationIds(
  page: PageObjectResponse,
  property: string,
): string[] {
  const prop = page.properties[property];
  if (!prop || prop.type !== "rollup" || prop.rollup.type !== "array") return [];
  const ids: string[] = [];
  for (const v of prop.rollup.array) {
    if (v.type === "relation") {
      for (const rel of v.relation) {
        if (rel.id) ids.push(rel.id);
      }
    }
  }
  return ids;
}