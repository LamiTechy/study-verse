declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(
    buffer: Buffer,
    options?: any
  ): Promise<{
    numpages: number;
    text: string;
    [key: string]: any;
  }>;
  export default pdfParse;
}
