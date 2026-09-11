declare module 'pdf-parse/lib/pdf-parse.js' {
  type PdfOptions = { pagerender?: (pageData: any) => Promise<string> | string };
  type PdfResult = { numpages: number; text: string };
  export default function pdf(data: Buffer, options?: PdfOptions): Promise<PdfResult>;
}
