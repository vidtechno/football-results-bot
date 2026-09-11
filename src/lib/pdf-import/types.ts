export type PdfImportStatus =
  | 'uploaded'
  | 'extracting'
  | 'analyzing'
  | 'needs_review'
  | 'ready'
  | 'importing'
  | 'completed'
  | 'failed';

export interface ImportChapter {
  id: string;
  title: string;
  content: string;
  sourceText?: string;
  order: number;
  confidence: number;
  sourceStart: number;
  sourceEnd: number;
}

export interface ImportStats {
  pageCount: number;
  originalCharacters: number;
  originalWords: number;
  assignedCharacters: number;
  metadataCharacters: number;
  unassignedCharacters: number;
  coverage: number;
  fingerprint: string;
}
