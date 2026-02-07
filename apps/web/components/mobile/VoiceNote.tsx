'use client';

import { useState, useRef, useCallback } from 'react';

interface VoiceNoteProps {
  onRecorded?: (blob: Blob, durationMs: number) => void;
}

export function VoiceNote({ onRecorded }: VoiceNoteProps) {
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState<{ url: string; durationMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const durationMs = Date.now() - startTimeRef.current;
        const url = URL.createObjectURL(blob);
        setRecorded({ url, durationMs });
        onRecorded?.(blob, durationMs);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setError(null);
    } catch {
      setError('Microphone access denied');
    }
  }, [onRecorded]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const clearRecording = useCallback(() => {
    if (recorded?.url) URL.revokeObjectURL(recorded.url);
    setRecorded(null);
  }, [recorded]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium mb-2">Voice Note</p>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {recorded ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <audio src={recorded.url} controls className="flex-1 h-8" />
            <span className="text-xs text-muted-foreground">
              {formatDuration(recorded.durationMs)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearRecording}
              className="px-3 py-1.5 border rounded text-sm min-h-[44px] flex-1"
            >
              Discard
            </button>
          </div>
        </div>
      ) : (
        <button
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          className={`w-full py-3 rounded-lg text-sm font-medium min-h-[44px] ${
            recording
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {recording ? 'Recording... Release to stop' : 'Hold to Record'}
        </button>
      )}
    </div>
  );
}
