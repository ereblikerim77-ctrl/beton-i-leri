import { Loader2, Mic, Square } from 'lucide-react';
import { useRef, useState } from 'react';

interface VoiceInputButtonProps {
  onTranscribed: (text: string) => void;
  onError?: (msg: string) => void;
  compact?: boolean;
  label?: string;
}

export function VoiceInputButton({
  onTranscribed,
  onError,
  compact = false,
  label = 'Səslə yaz',
}: VoiceInputButtonProps) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function toggleRecording() {
    if (transcribing) return;

    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onError?.('Brauzeriniz mikrofon dəstəkləmir.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 300) {
          return;
        }
        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', blob, `voice.${mimeType.includes('mp4') ? 'm4a' : 'webm'}`);
          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) {
            onError?.(data.error || 'Səs yazısı mətnə çevrilə bilmədi.');
          } else if (data.text) {
            onTranscribed(data.text);
          }
        } catch {
          onError?.('Səs transkripsiyası zamanı bağlantı xətası baş verdi.');
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      onError?.('Mikrofona icazə verilmədi.');
    }
  }

  return (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={transcribing}
      title={
        recording
          ? 'Səs yazmanı dayandır'
          : transcribing
          ? 'Mətnə çevrilir...'
          : 'Mikrofonla səsli diktə et'
      }
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
        compact ? 'h-10 w-10' : 'px-3 py-1.5 text-xs font-medium'
      } ${
        recording
          ? 'border-red-600 bg-red-600 text-white'
          : 'border-[#E7E2DA] bg-[#FAF7F2] text-[#3A3A3A] hover:border-[#6B7A3F] hover:text-[#6B7A3F]'
      } disabled:opacity-60`}
    >
      {transcribing ? (
        <Loader2 size={15} className="animate-spin text-[#6B7A3F]" />
      ) : recording ? (
        <Square size={14} />
      ) : (
        <Mic size={15} className="text-[#6B7A3F]" />
      )}
      {!compact && (
        <span>
          {transcribing ? 'Çevrilir...' : recording ? 'Dayandır' : label}
        </span>
      )}
    </button>
  );
}
