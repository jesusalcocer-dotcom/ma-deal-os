export type EmailClassification =
  | 'markup_delivery' | 'comment_letter' | 'dd_response'
  | 'scheduling' | 'general' | 'unclassified';

export type EmailProcessingStatus = 'pending' | 'classified' | 'processed' | 'error';

export interface EmailRecipient {
  email: string;
  name?: string;
  type: 'to' | 'cc' | 'bcc';
}

export interface EmailAttachment {
  filename: string;
  size: number;
  content_type: string;
  drive_file_id?: string;
  processed: boolean;
}

export interface DealEmail {
  id: string;
  deal_id: string;
  outlook_message_id?: string | null;
  outlook_conversation_id?: string | null;
  thread_id?: string | null;
  subject: string;
  sender_email: string;
  sender_name?: string | null;
  recipients?: EmailRecipient[] | null;
  received_at: string;
  classification?: EmailClassification | null;
  classification_confidence?: number | null;
  body_preview?: string | null;
  body_text?: string | null;
  has_attachments: boolean;
  attachments?: EmailAttachment[];
  processing_status: EmailProcessingStatus;
  created_at: string;
}
