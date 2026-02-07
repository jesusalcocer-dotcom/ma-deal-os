export { getAnthropicClient, callClaude } from './client';
export { parseTermSheet } from './pipelines/parse-term-sheet';
export type { TermSheetParseResult } from './pipelines/parse-term-sheet';
export { generateDocument } from './pipelines/generate-document';
export type { GenerateDocumentInput, GenerateDocumentResult } from './pipelines/generate-document';
export { generateDisclosureSchedules } from './pipelines/disclosure-generator';
export type { DisclosureScheduleExtraction, DisclosureGenerationResult } from './pipelines/disclosure-generator';
export { extractPositionsFromEmail } from './pipelines/position-extractor';
export type { ExtractedPosition, PositionExtractionResult } from './pipelines/position-extractor';
