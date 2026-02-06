export type VersionType =
  | 'template' | 'precedent_applied' | 'scrubbed' | 'adapted'
  | 'attorney_reviewed' | 'counterparty_markup' | 'response'
  | 'final' | 'executed';

export type DocumentSource =
  | 'system_generated' | 'attorney_edit' | 'counterparty' | 'third_party';

export interface DocumentVersion {
  id: string;
  checklist_item_id: string;
  deal_id: string;
  version_number: number;
  version_label: string;
  version_type: VersionType;
  file_path?: string | null;
  drive_file_id?: string | null;
  file_hash?: string | null;
  file_size_bytes?: number | null;
  change_summary?: Record<string, unknown> | null;
  provision_changes?: Record<string, unknown> | null;
  source?: DocumentSource | null;
  source_email_id?: string | null;
  created_by?: string | null;
  created_at: string;
}
