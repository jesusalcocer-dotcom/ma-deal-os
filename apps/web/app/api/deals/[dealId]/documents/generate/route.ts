import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { generateDocument } from '@ma-deal-os/ai';
import { getSPATemplateText, DOCUMENT_TEMPLATES } from '@ma-deal-os/core';
import { generateDocxFromText } from '@ma-deal-os/integrations';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * POST /api/deals/[dealId]/documents/generate
 * Trigger document generation for a checklist item.
 * Body: { checklist_item_id, stage: 'v1_template' | 'v2_precedent' | 'v3_scrubbed' }
 */
export async function POST(req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const body = await req.json();
    const { checklist_item_id, stage } = body;

    if (!checklist_item_id || !stage) {
      return NextResponse.json(
        { error: 'checklist_item_id and stage are required' },
        { status: 400 }
      );
    }

    // Get the deal
    const { data: deal, error: dealError } = await supabase()
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get the checklist item
    const { data: checklistItem, error: itemError } = await supabase()
      .from('checklist_items')
      .select('*')
      .eq('id', checklist_item_id)
      .single();

    if (itemError || !checklistItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    const docType = (checklistItem as any).document_type;

    // Get existing versions for this checklist item
    const { data: existingVersions } = await supabase()
      .from('document_versions')
      .select('*')
      .eq('checklist_item_id', checklist_item_id)
      .order('version_number', { ascending: false });

    const versions = existingVersions || [];
    const latestVersion = versions[0] as any;
    const nextVersionNumber = versions.length > 0 ? (latestVersion.version_number + 1) : 1;

    // Get previous version text if needed
    let previousVersionText: string | undefined;
    if (stage !== 'v1_template' && latestVersion?.file_path) {
      try {
        const filePath = latestVersion.file_path as string;
        // The file_path stores the .docx path; derive the .txt path
        const txtPath = filePath.replace(/\.docx$/, '.txt');
        if (fs.existsSync(txtPath)) {
          previousVersionText = fs.readFileSync(txtPath, 'utf-8');
        }
      } catch {
        // Will be handled below
      }
    }

    // Get template text for v1
    let templateText: string | undefined;
    if (stage === 'v1_template') {
      // Map checklist item document_type to template type
      const templateType = mapDocTypeToTemplate(docType);
      if (templateType && DOCUMENT_TEMPLATES[templateType]) {
        templateText = DOCUMENT_TEMPLATES[templateType].getTemplate();
      } else {
        templateText = getSPATemplateText(); // Default to SPA
      }
    }

    // Get precedent text for v2
    let precedentText: string | undefined;
    if (stage === 'v2_precedent') {
      precedentText = await loadPrecedentForDocType(docType);
    }

    // Build deal details for v3
    let dealDetails: Record<string, string> | undefined;
    if (stage === 'v3_scrubbed') {
      dealDetails = buildDealDetails(deal as any);
    }

    // Build deal context
    const dealContext = buildDealContext(deal as any, checklistItem as any);

    // Generate the document
    const result = await generateDocument({
      dealId,
      checklistItemId: checklist_item_id,
      documentType: docType,
      stage,
      templateText,
      precedentText,
      previousVersionText: previousVersionText || templateText,
      dealDetails,
      dealContext,
    });

    // Save the generated text to a file
    const outputDir = path.resolve('generated-documents', dealId);
    fs.mkdirSync(outputDir, { recursive: true });

    const safeDocType = docType.replace(/[^a-zA-Z0-9]/g, '_');
    const baseName = `${safeDocType}_${result.versionLabel}`;
    const txtPath = path.join(outputDir, `${baseName}.txt`);
    const docxPath = path.join(outputDir, `${baseName}.docx`);

    // Save text version
    fs.writeFileSync(txtPath, result.text, 'utf-8');

    // Generate DOCX
    let fileHash = '';
    let fileSizeBytes = 0;
    try {
      const docxBuffer = await generateDocxFromText(
        result.text,
        `${(checklistItem as any).document_name} - ${result.versionLabel}`
      );
      fs.writeFileSync(docxPath, docxBuffer);
      fileHash = crypto.createHash('sha256').update(docxBuffer).digest('hex');
      fileSizeBytes = docxBuffer.length;
    } catch (docxError) {
      console.warn('DOCX generation failed, text file saved:', docxError);
    }

    // Save to database
    const { data: docVersion, error: insertError } = await supabase()
      .from('document_versions')
      .insert({
        checklist_item_id,
        deal_id: dealId,
        version_number: nextVersionNumber,
        version_label: result.versionLabel,
        version_type: result.versionType,
        file_path: docxPath,
        file_hash: fileHash || null,
        file_size_bytes: fileSizeBytes || null,
        change_summary: result.changeSummary || null,
        source: 'system_generated',
      } as any)
      .select()
      .single();

    if (insertError) throw insertError;

    // Update checklist item status
    await supabase()
      .from('checklist_items')
      .update({
        status: stage === 'v3_scrubbed' ? 'draft' : 'identified',
        current_document_version_id: (docVersion as any).id,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', checklist_item_id);

    // Try Google Drive upload (non-blocking)
    try {
      if (deal.drive_folder_id && fs.existsSync(docxPath)) {
        // Drive upload would go here - currently blocked by environment
        console.log('Drive upload skipped (not implemented in this environment)');
      }
    } catch (driveError) {
      console.warn('Drive upload failed (non-fatal):', driveError);
    }

    return NextResponse.json({
      message: `Generated ${result.versionLabel} for ${(checklistItem as any).document_name}`,
      version: docVersion,
      textLength: result.text.length,
      filePath: docxPath,
    });
  } catch (error) {
    console.error('Failed to generate document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document', details: String(error) },
      { status: 500 }
    );
  }
}

function mapDocTypeToTemplate(docType: string): string | null {
  const mapping: Record<string, string> = {
    SPA: 'SPA',
    STOCK_PURCHASE_AGREEMENT: 'SPA',
  };
  return mapping[docType] || null;
}

async function loadPrecedentForDocType(docType: string): Promise<string | undefined> {
  // Try to load a precedent from the EDGAR-harvested files
  const precedentDir = path.resolve('precedent-database');
  if (!fs.existsSync(precedentDir)) return undefined;

  try {
    const deals = fs.readdirSync(precedentDir).filter(d => d.startsWith('0'));
    for (const deal of deals) {
      const agreementDir = path.join(precedentDir, deal, '02_Purchase_Agreement');
      if (fs.existsSync(agreementDir)) {
        const files = fs.readdirSync(agreementDir);
        if (files.length > 0) {
          const filePath = path.join(agreementDir, files[0]);
          const text = fs.readFileSync(filePath, 'utf-8');
          // HTML files from EDGAR - strip tags for basic text
          const cleanText = text
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
          // Limit to first 15000 chars to fit in context
          return cleanText.substring(0, 15000);
        }
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function buildDealDetails(deal: any): Record<string, string> {
  const params = deal.parameters || {};
  const details: Record<string, string> = {
    DATE: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    BUYER_NAME: deal.buyer_name || '[BUYER NAME]',
    SELLER_NAME: deal.seller_name || '[SELLER NAME]',
    TARGET_NAME: deal.target_name || '[TARGET NAME]',
    DEAL_VALUE: deal.deal_value ? `$${Number(deal.deal_value).toLocaleString()}` : '[DEAL VALUE]',
    JURISDICTION: params.jurisdiction || 'Delaware',
    ESCROW_AMOUNT: deal.deal_value
      ? `$${Math.round(Number(deal.deal_value) * 0.10).toLocaleString()}`
      : '[ESCROW AMOUNT]',
    ESCROW_AGENT: 'JPMorgan Chase Bank, N.A.',
    EARNOUT_TARGET_1: deal.deal_value
      ? `$${Math.round(Number(deal.deal_value) * 0.6).toLocaleString()}`
      : '[EARNOUT TARGET 1]',
    EARNOUT_AMOUNT_1: deal.deal_value
      ? `$${Math.round(Number(deal.deal_value) * 0.05).toLocaleString()}`
      : '[EARNOUT AMOUNT 1]',
    EARNOUT_TARGET_2: deal.deal_value
      ? `$${Math.round(Number(deal.deal_value) * 0.75).toLocaleString()}`
      : '[EARNOUT TARGET 2]',
    EARNOUT_AMOUNT_2: deal.deal_value
      ? `$${Math.round(Number(deal.deal_value) * 0.08).toLocaleString()}`
      : '[EARNOUT AMOUNT 2]',
    SURVIVAL_PERIOD: 'eighteen (18) months',
    BASKET_AMOUNT: deal.deal_value
      ? `$${Math.round(Number(deal.deal_value) * 0.0075).toLocaleString()}`
      : '[BASKET AMOUNT]',
    CAP_AMOUNT: deal.deal_value
      ? `$${Math.round(Number(deal.deal_value) * 0.10).toLocaleString()}`
      : '[CAP AMOUNT]',
    OUTSIDE_DATE: 'the date that is ninety (90) days after the date of this Agreement',
    MATERIALITY_THRESHOLD: deal.deal_value
      ? `${Math.round(Number(deal.deal_value) * 0.001).toLocaleString()}`
      : '100,000',
    PERCENTAGE: '5',
  };
  return details;
}

function buildDealContext(deal: any, checklistItem: any): string {
  const params = deal.parameters || {};
  return [
    `Deal: ${deal.name} (${deal.code_name || 'N/A'})`,
    `Document: ${checklistItem.document_name} (${checklistItem.document_type})`,
    `Transaction Structure: ${params.transaction_structure || 'N/A'}`,
    `Deal Value: ${deal.deal_value ? '$' + Number(deal.deal_value).toLocaleString() : 'N/A'}`,
    `Buyer: ${deal.buyer_name || 'N/A'} (${deal.buyer_type || 'N/A'})`,
    `Target: ${deal.target_name || 'N/A'}`,
    `Seller: ${deal.seller_name || 'N/A'}`,
    `Jurisdiction: ${params.jurisdiction || 'N/A'}`,
    `Indemnification: ${params.indemnification || 'N/A'}`,
    `Escrow: ${params.escrow ? 'Yes' : 'No'}`,
    `Regulatory: ${(params.regulatory || []).join(', ') || 'None'}`,
  ].join('\n');
}
