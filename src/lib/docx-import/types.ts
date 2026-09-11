export type DocxImportStatus = 'needs_review' | 'ready' | 'importing' | 'completed' | 'failed';

export type DocxChapter = {
  id: string;
  title: string;
  contentHtml: string;
  plainText: string;
  order: number;
  confidence: number;
};

export type DocxImportStats = {
  originalCharacters: number;
  originalWords: number;
  finalCharacters: number;
  finalWords: number;
  paragraphCount: number;
  chapterCount: number;
  textRetention: number;
  suspiciousLoss: boolean;
  fingerprint: string;
};

export type AiSuggestion = {
  id: string;
  chapterId: string;
  category: 'whitespace' | 'duplicate' | 'punctuation' | 'heading' | 'formatting';
  explanation: string;
  before: string;
  after: string;
  status: 'pending' | 'accepted' | 'rejected';
};
