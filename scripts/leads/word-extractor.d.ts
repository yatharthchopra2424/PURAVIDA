declare module "word-extractor" {
  export default class WordExtractor {
    extract(filePath: string): Promise<{
      getBody(): string;
      getFootnotes(): string;
      getEndnotes(): string;
      getHeaders(): string;
      getFooters(): string;
    }>;
  }
}
