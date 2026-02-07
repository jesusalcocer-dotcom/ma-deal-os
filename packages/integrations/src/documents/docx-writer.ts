import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';

export interface DocumentContent {
  title: string;
  sections: Array<{
    heading?: string;
    paragraphs: string[];
  }>;
}

/**
 * Generate a DOCX buffer from structured document content.
 */
export async function generateDocxFromContent(content: DocumentContent): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: content.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  for (const section of content.sections) {
    if (section.heading) {
      children.push(
        new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
    }

    for (const para of section.paragraphs) {
      // Handle indented sub-sections (lines starting with "(")
      const isSubSection = para.trim().match(/^\([a-z]\)/);
      children.push(
        new Paragraph({
          children: [new TextRun({ text: para, size: 24 })],
          spacing: { after: 120 },
          indent: isSubSection ? { left: 720 } : undefined,
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

/**
 * Generate a DOCX buffer from plain text with basic formatting.
 * Splits on double newlines for paragraphs, detects headings by patterns.
 */
export async function generateDocxFromText(text: string, title: string): Promise<Buffer> {
  const lines = text.split('\n');
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  let currentParagraph = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line = paragraph break
    if (!trimmed) {
      if (currentParagraph.trim()) {
        children.push(createParagraph(currentParagraph.trim()));
        currentParagraph = '';
      }
      continue;
    }

    // Detect article headings
    if (trimmed.match(/^ARTICLE\s+[IVXLCDM]+$/i)) {
      if (currentParagraph.trim()) {
        children.push(createParagraph(currentParagraph.trim()));
        currentParagraph = '';
      }
      children.push(
        new Paragraph({
          text: trimmed,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
        })
      );
      continue;
    }

    // Detect section headings (e.g., "Section 1.1")
    if (trimmed.match(/^Section\s+\d+\.\d+/)) {
      if (currentParagraph.trim()) {
        children.push(createParagraph(currentParagraph.trim()));
        currentParagraph = '';
      }
      children.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, bold: true, size: 24 })],
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }

    // Detect title lines (all caps)
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && !trimmed.match(/^\(/)) {
      if (currentParagraph.trim()) {
        children.push(createParagraph(currentParagraph.trim()));
        currentParagraph = '';
      }
      children.push(
        new Paragraph({
          text: trimmed,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { before: 300, after: 200 },
        })
      );
      continue;
    }

    currentParagraph += (currentParagraph ? ' ' : '') + trimmed;
  }

  if (currentParagraph.trim()) {
    children.push(createParagraph(currentParagraph.trim()));
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

function createParagraph(text: string): Paragraph {
  const isSubSection = text.match(/^\([a-z]\)/);
  return new Paragraph({
    children: [new TextRun({ text, size: 24 })],
    spacing: { after: 120 },
    indent: isSubSection ? { left: 720 } : undefined,
  });
}
