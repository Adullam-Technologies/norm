import type { Client } from "@notionhq/client";
import type {
  BlockObjectRequest,
  PageObjectResponse,
  QueryDataSourceParameters,
} from "@notionhq/client/build/src/api-endpoints";
import type { z, ZodType, ZodRawShape, ZodObject } from "zod";
import type { NormConfig, RetrieveOptions, QueryDatabaseResult, CreatePageInput, GetPageByIdOptions, NormAttachment } from "./types";
import { retrieveFromPage, retrievePage, getSchemaShape, unwrapSchema } from "./retriever";
import { notionRegistry } from "./registry";
import { defineObject, type NormModel } from "./model";

export class NormClient {
  private readonly client: Client;
  private readonly onWarn?: (msg: string, ctx: Record<string, unknown>) => void;
  private readonly onError?: (err: Error, ctx: Record<string, unknown>) => void;

  constructor(config: NormConfig) {
    this.client = config.client;
    this.onWarn = config.onWarn;
    this.onError = config.onError;
  }

  async queryDatabase(
    dataSourceId: string,
    opts: {
      filter?: QueryDataSourceParameters["filter"];
      sorts?: QueryDataSourceParameters["sorts"];
      filterProperties?: string[];
    } = {},
  ): Promise<QueryDatabaseResult> {
    try {
      const response = await this.client.dataSources.query({
        data_source_id: dataSourceId,
        filter: opts.filter,
        sorts: opts.sorts,
        filter_properties: opts.filterProperties,
      });
      return { results: response.results as PageObjectResponse[] };
    } catch (error) {
      this.onError?.(error as Error, { dataSourceId });
      return { results: [] };
    }
  }

  async getPageById(
    pageId: string,
    opts?: GetPageByIdOptions,
  ): Promise<PageObjectResponse | null> {
    try {
      const response = await this.client.pages.retrieve({
        page_id: pageId,
        filter_properties: opts?.filterProperties,
      } as never);
      if (!response || !("properties" in response)) {
        this.onWarn?.("Page retrieved has no properties", { pageId });
        return null;
      }
      return response as PageObjectResponse;
    } catch (error) {
      this.onError?.(error as Error, { pageId });
      return null;
    }
  }

  async getPageMarkdown(pageId: string): Promise<string> {
    try {
      const response = await this.client.pages.retrieveMarkdown({
        page_id: pageId,
      });
      return response.markdown;
    } catch (error) {
      this.onError?.(error as Error, { pageId });
      return "";
    }
  }

  async createPage(input: CreatePageInput): Promise<string | null> {
    try {
      const response = await this.client.pages.create({
        parent: input.parent as never,
        properties: input.properties as never,
        markdown: input.markdown,
      });
      return response.id;
    } catch (error) {
      this.onError?.(error as Error, { parent: input.parent });
      return null;
    }
  }

  async uploadFile(file: {
    filename: string;
    contentType: string;
    data: Buffer;
  }): Promise<string | null> {
    try {
      const createResponse = await this.client.fileUploads.create({
        mode: "single_part",
        filename: file.filename,
        content_type: file.contentType,
      });

      if (!createResponse.id) {
        this.onWarn?.("File upload creation returned no id", { filename: file.filename });
        return null;
      }

      await this.client.fileUploads.send({
        file_upload_id: createResponse.id,
        file: {
          filename: file.filename,
          data: new Blob([new Uint8Array(file.data)], { type: file.contentType }),
        },
      });

      return createResponse.id;
    } catch (error) {
      this.onError?.(error as Error, { filename: file.filename });
      return null;
    }
  }

  async appendFileBlocks(
    pageId: string,
    attachments: NormAttachment[],
  ): Promise<boolean> {
    if (attachments.length === 0) return true;

    try {
      const children: BlockObjectRequest[] = attachments.map((attachment) => {
        if (attachment.blockType === "file") {
          return {
            file: {
              file_upload: { id: attachment.fileUploadId },
              name: attachment.filename ?? "Attachment",
            },
            type: "file",
            object: "block",
          } as BlockObjectRequest;
        }
        return {
          [attachment.blockType]: {
            file_upload: { id: attachment.fileUploadId },
          },
          type: attachment.blockType,
          object: "block",
        } as BlockObjectRequest;
      });

      await this.client.blocks.children.append({
        block_id: pageId,
        children,
      });

      return true;
    } catch (error) {
      this.onError?.(error as Error, { pageId });
      return false;
    }
  }

  async retrievePage<T extends ZodType>(
    pageId: string,
    schema: T,
    options?: RetrieveOptions,
    propertyNames?: readonly string[],
  ): Promise<z.infer<T> | null> {
    return retrievePage(
      pageId,
      schema,
      (id, opts) => this.getPageById(id, opts),
      (id) => this.getPageMarkdown(id),
      options,
      propertyNames,
    );
  }

  async retrieveFromPage<T extends ZodType>(
    page: PageObjectResponse,
    schema: T,
    options?: RetrieveOptions,
  ): Promise<z.infer<T>> {
    return retrieveFromPage(page, schema, options, {
      getPageMarkdown: (id) => this.getPageMarkdown(id),
    });
  }

  /**
   * Collect the Notion property names declared in a schema, excluding id,
   * markdownContent, and derived fields. Used for auto filter_properties.
   */
  collectPropertyNames(schema: ZodType): string[] {
    const shape = getSchemaShape(schema);
    const names: string[] = [];
    for (const [key, fieldSchema] of Object.entries(shape)) {
      let brand = (fieldSchema as unknown as { _notion?: { extractor: string } })._notion;
      let meta = notionRegistry.get(fieldSchema);
      if (!brand && !meta) {
        const inner = unwrapSchema(fieldSchema);
        brand = (inner as unknown as { _notion?: { extractor: string } })._notion;
        meta = notionRegistry.get(inner);
      }
      if (!brand && !meta) continue;
      const extractor = brand?.extractor ?? meta?.extractor;
      if (!extractor) continue;
      if (extractor === "id" || extractor === "markdown" || extractor === "derived") continue;
      const property = meta?.notionProperty ?? key;
      if (property === "__icon__") continue;
      names.push(property);
    }
    return names;
  }

  /**
   * Define a Notion model bound to this client. Auto-injects `id: n.id()`
   * if not present in the shape.
   */
  object<TShape extends ZodRawShape, TArgs = void>(
    shape: TShape,
    opts?: {
      transform?: (data: z.infer<ZodObject<TShape>>) => unknown;
    },
  ): NormModel<unknown, unknown, TArgs> {
    return defineObject(this, shape, opts as never) as never;
  }
}