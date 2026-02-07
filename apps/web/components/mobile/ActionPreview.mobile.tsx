'use client';

import { useState } from 'react';

interface ActionPreviewMobileProps {
  action: {
    action_type?: string;
    title?: string;
    description?: string;
    content?: string;
  };
  onApprove?: () => void;
  onModify?: (content: string) => void;
  onReject?: () => void;
}

const actionTypeIcons: Record<string, string> = {
  document_action: '\u{1F4C4}',
  communication_action: '\u{1F4E7}',
  negotiation_action: '\u{1F91D}',
  analysis_action: '\u{1F50D}',
  escalation_action: '\u{26A0}',
};

export function ActionPreviewMobile({ action, onApprove, onModify, onReject }: ActionPreviewMobileProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(action.content || '');
  const icon = actionTypeIcons[action.action_type || ''] || '\u{2022}';

  return (
    <div className="rounded-lg border p-3">
      {/* Action header */}
      <div
        className="flex items-center gap-2 cursor-pointer min-h-[44px]"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-medium">{action.title || action.action_type || 'Action'}</p>
          {action.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{action.description}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{expanded ? '\u25B2' : '\u25BC'}</span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 pt-2 border-t">
          {editing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border rounded text-sm min-h-[100px]"
                style={{ fontSize: '16px' }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { onModify?.(editContent); setEditing(false); }}
                  className="flex-1 py-2 bg-blue-600 text-white rounded text-sm min-h-[44px]"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2 border rounded text-sm min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {action.content && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                  {action.content}
                </p>
              )}
              <div className="flex gap-2">
                {onApprove && (
                  <button
                    onClick={onApprove}
                    className="flex-1 py-2 bg-green-600 text-white rounded text-sm min-h-[44px]"
                  >
                    Approve
                  </button>
                )}
                {onModify && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex-1 py-2 bg-blue-600 text-white rounded text-sm min-h-[44px]"
                  >
                    Modify
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={onReject}
                    className="flex-1 py-2 bg-red-600 text-white rounded text-sm min-h-[44px]"
                  >
                    Reject
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
