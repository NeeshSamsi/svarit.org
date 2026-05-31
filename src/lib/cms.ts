import contentData from "@/data/content.json";

export type ContentData = typeof contentData;

export function getContent(): ContentData {
  return contentData;
}
