export interface Document {
  id: number;
  title: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  totalChunks: number;
  isActive: boolean;
}

export interface SourceReference {
  chunkId: number;
  documentId: number;
  documentTitle: string;
  similarity: number;
}
