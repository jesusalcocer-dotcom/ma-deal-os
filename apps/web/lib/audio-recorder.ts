/**
 * Audio Recorder Utility
 * Web Audio API / MediaRecorder for voice note recording.
 */

export interface RecordingResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private stream: MediaStream | null = null;

  /**
   * Check if recording is supported.
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined'
      && 'mediaDevices' in navigator
      && typeof MediaRecorder !== 'undefined';
  }

  /**
   * Start recording audio.
   */
  async start(): Promise<void> {
    if (!AudioRecorder.isSupported()) {
      throw new Error('Audio recording not supported in this browser');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.startTime = Date.now();

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };
    this.mediaRecorder.start();
  }

  /**
   * Stop recording and return the result.
   */
  stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        const durationMs = Date.now() - this.startTime;

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        resolve({
          blob,
          durationMs,
          mimeType: this.mediaRecorder?.mimeType || 'audio/webm',
        });

        this.mediaRecorder = null;
        this.chunks = [];
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel recording without saving.
   */
  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.chunks = [];
  }

  /**
   * Check if currently recording.
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
