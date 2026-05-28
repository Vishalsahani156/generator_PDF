import { FormEvent, useMemo, useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PdfRange } from '../lib/api';

interface Props {
  onSubmit: (range: PdfRange) => void;
  onCancel: () => void;
  submitting?: boolean;
  error?: string | null;
}

type Preset = 'all' | 'today' | 'week' | 'month' | 'custom';

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function presetRange(preset: Preset): { from: string; to: string } | null {
  const now = new Date();
  if (preset === 'today') {
    const day = toDateInput(now);
    return { from: day, to: day };
  }
  if (preset === 'week') {
    const end = new Date(now);
    end.setDate(now.getDate() + 6);
    return { from: toDateInput(now), to: toDateInput(end) };
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toDateInput(start), to: toDateInput(end) };
  }
  return null;
}

export function DownloadRangeForm({ onSubmit, onCancel, submitting, error }: Props) {
  const [preset, setPreset] = useState<Preset>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const effective = useMemo<PdfRange>(() => {
    if (preset === 'all') return {};
    if (preset === 'custom') {
      return { from: from || undefined, to: to || undefined };
    }
    const p = presetRange(preset);
    return p ? { from: p.from, to: p.to } : {};
  }, [preset, from, to]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(effective);
  }

  const presetOptions: { value: Preset; label: string; hint: string }[] = [
    { value: 'all', label: 'All events', hint: 'Everything you have added' },
    { value: 'today', label: 'Today', hint: 'Events scheduled today' },
    { value: 'week', label: 'Next 7 days', hint: 'From today through next week' },
    { value: 'month', label: 'This month', hint: 'Whole calendar month' },
    { value: 'custom', label: 'Custom range', hint: 'Pick start and end dates' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 block text-sm font-medium text-ink">Range</legend>
        {presetOptions.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-2 transition-colors ${
              preset === opt.value
                ? 'border-blue-600 bg-blue-50'
                : 'border-blue-200 bg-white hover:bg-blue-50'
            }`}
          >
            <input
              type="radio"
              name="preset"
              className="mt-1 accent-blue-600"
              checked={preset === opt.value}
              onChange={() => setPreset(opt.value)}
            />
            <span className="flex-1">
              <span className="block text-sm font-medium text-ink">{opt.label}</span>
              <span className="block text-xs text-blue-600">{opt.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {preset === 'custom' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">From</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      )}

      {error && (
        <div
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-600"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Preparing…' : 'Download PDF'}
        </Button>
      </div>
    </form>
  );
}
