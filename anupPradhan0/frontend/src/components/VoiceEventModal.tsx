import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import {
  bulkCreateEvents,
  EventInput,
  ParsedEvent,
  voiceExtract,
} from '../lib/api';
import { useVoiceRecorder } from '../lib/useVoiceRecorder';

type Stage = 'instructions' | 'recording' | 'transcribing' | 'review';

interface Props {
  open: boolean;
  onClose: () => void;
}

function fmtElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtForInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
  );
}

interface EditableEvent extends ParsedEvent {
  selected: boolean;
}

export function VoiceEventModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const recorder = useVoiceRecorder();
  const [stage, setStage] = useState<Stage>('instructions');
  const [transcript, setTranscript] = useState('');
  const [items, setItems] = useState<EditableEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      recorder.reset();
      setStage('instructions');
      setTranscript('');
      setItems([]);
      setError(null);
    }
  }, [open, recorder]);

  const extractMutation = useMutation({
    mutationFn: (audio: Blob) => voiceExtract(audio),
    onSuccess: (data) => {
      setTranscript(data.transcript);
      setItems(data.events.map((e) => ({ ...e, selected: true })));
      setStage('review');
    },
    onError: (err) => {
      setError(apiErrorMessage(err, 'Could not process audio'));
      setStage('instructions');
    },
  });

  const saveMutation = useMutation({
    mutationFn: (events: EventInput[]) => bulkCreateEvents(events),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onClose();
    },
    onError: (err) => {
      setError(apiErrorMessage(err, 'Could not save events'));
    },
  });

  const selectedCount = useMemo(
    () => items.filter((i) => i.selected).length,
    [items]
  );

  async function handleStart() {
    setError(null);
    await recorder.start();
    if (recorder.status !== 'idle') setStage('recording');
    // Note: if recorder.start fails, error state is set, stay on instructions.
  }

  async function handleStop() {
    const blob = await recorder.stop();
    if (!blob) {
      setError('No audio was recorded');
      setStage('instructions');
      return;
    }
    setStage('transcribing');
    extractMutation.mutate(blob);
  }

  function updateItem(idx: number, patch: Partial<EditableEvent>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function handleSave() {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) return;
    setError(null);
    saveMutation.mutate(
      selected.map((s) => ({
        name: s.name,
        datetime: new Date(s.datetime).toISOString(),
        number: s.number,
        location: s.location,
      }))
    );
  }

  const showRecorderError = stage === 'recording' && recorder.error;

  return (
    <Modal open={open} onClose={onClose} title="Add events by voice">
      {error && (
        <div
          className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-600"
          role="alert"
        >
          {error}
        </div>
      )}
      {showRecorderError && (
        <div
          className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-600"
          role="alert"
        >
          {recorder.error}
        </div>
      )}

      {stage === 'instructions' && (
        <div className="space-y-6">
          <p className="text-sm text-blue-600">
            Click the mic and speak naturally. You can list <strong>multiple events</strong> in
            one recording — for each, mention the <strong>name</strong>, <strong>time/date</strong>,
            a <strong>number</strong> (attendees, room, etc.), and the <strong>location</strong>.
          </p>
          <p className="text-xs text-blue-300">
            Example: <em>“Quarterly review tomorrow at 10 AM for 24 people at Conference
            Room B; and a customer dinner Friday at 7 PM for 12 at The Slanted Door.”</em>
          </p>
          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={handleStart}
              disabled={recorder.status === 'requesting'}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60"
              aria-label="Start recording"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="23" />
                <line x1="8" x2="16" y1="23" y2="23" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-blue-300">
            {recorder.status === 'requesting' ? 'Waiting for microphone…' : 'Tap to start'}
          </p>
        </div>
      )}

      {stage === 'recording' && (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-blue-600 opacity-30" />
              <span className="absolute inset-2 rounded-full bg-blue-600 opacity-60" />
              <span className="relative inline-block h-12 w-12 rounded-full bg-blue-600" />
            </div>
            <p className="font-mono text-lg font-semibold text-ink">{fmtElapsed(recorder.elapsedMs)}</p>
            <p className="text-xs text-blue-300">Recording… speak clearly</p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="secondary" onClick={() => { recorder.reset(); setStage('instructions'); }}>
              Cancel
            </Button>
            <Button onClick={handleStop}>Stop &amp; transcribe</Button>
          </div>
        </div>
      )}

      {stage === 'transcribing' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />
          <p className="text-sm text-blue-600">Transcribing and extracting events…</p>
          <p className="text-xs text-blue-300">This usually takes a few seconds.</p>
        </div>
      )}

      {stage === 'review' && (
        <div className="space-y-4">
          {transcript && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-blue-300">Transcript</p>
              <p className="mt-1 text-sm text-ink">{transcript}</p>
            </div>
          )}

          {items.length === 0 ? (
            <p className="rounded-lg border border-blue-200 bg-white px-4 py-6 text-center text-sm text-blue-600">
              No events could be extracted. Try again with more detail.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((item, idx) => (
                <li
                  key={idx}
                  className={`rounded-lg border px-4 py-3 transition-colors ${
                    item.selected ? 'border-blue-600 bg-blue-50' : 'border-blue-200 bg-white'
                  }`}
                >
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 accent-blue-600"
                      checked={item.selected}
                      onChange={(e) => updateItem(idx, { selected: e.target.checked })}
                    />
                    <div className="flex-1 space-y-2">
                      <Input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                      />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          type="datetime-local"
                          value={fmtForInput(item.datetime)}
                          onChange={(e) =>
                            updateItem(idx, {
                              datetime: new Date(e.target.value).toISOString(),
                            })
                          }
                        />
                        <Input
                          type="number"
                          value={item.number}
                          onChange={(e) => updateItem(idx, { number: Number(e.target.value) })}
                        />
                      </div>
                      <Input
                        type="text"
                        value={item.location}
                        onChange={(e) => updateItem(idx, { location: e.target.value })}
                      />
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setItems([]);
                setTranscript('');
                setStage('instructions');
              }}
            >
              Record again
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedCount === 0 || saveMutation.isPending}
            >
              {saveMutation.isPending
                ? 'Saving…'
                : `Save ${selectedCount} event${selectedCount === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
