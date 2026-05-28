import { FormEvent, useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { EventInput } from '../lib/api';

interface Props {
  onSubmit: (input: EventInput) => void;
  onCancel: () => void;
  submitting?: boolean;
  error?: string | null;
}

export function EventForm({ onSubmit, onCancel, submitting, error }: Props) {
  const [name, setName] = useState('');
  const [datetime, setDatetime] = useState('');
  const [number, setNumber] = useState('');
  const [location, setLocation] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      datetime: new Date(datetime).toISOString(),
      number: Number(number),
      location: location.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Name</label>
        <Input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Quarterly review"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Time &amp; date</label>
        <Input
          type="datetime-local"
          required
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Number</label>
        <Input
          type="number"
          required
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="e.g. 24"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Location</label>
        <Input
          type="text"
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Office HQ, room 4"
        />
      </div>
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
          {submitting ? 'Saving…' : 'Add event'}
        </Button>
      </div>
    </form>
  );
}
