import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEvent,
  deleteEvent,
  downloadEventsPdf,
  EventInput,
  EventItem,
  listEvents,
  PdfRange,
} from '../lib/api';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EventForm } from '../components/EventForm';
import { EventList } from '../components/EventList';
import { DownloadRangeForm } from '../components/DownloadRangeForm';
import { VoiceEventModal } from '../components/VoiceEventModal';

function apiErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const eventsQuery = useQuery<EventItem[]>({
    queryKey: ['events'],
    queryFn: listEvents,
  });

  const createMutation = useMutation({
    mutationFn: (input: EventInput) => createEvent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setModalOpen(false);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(apiErrorMessage(err, 'Could not save event'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onMutate: (id) => {
      setPageError(null);
      setDeletingId(id);
    },
    onError: (err) => {
      setPageError(apiErrorMessage(err, 'Could not delete event'));
    },
    onSettled: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: (range: PdfRange) => downloadEventsPdf(range),
    onMutate: () => {
      setPageError(null);
      setDownloadError(null);
    },
    onSuccess: () => {
      setDownloadOpen(false);
    },
    onError: (err) => {
      setDownloadError(apiErrorMessage(err, 'Could not download PDF'));
    },
  });

  const events = eventsQuery.data ?? [];

  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Your events</h1>
            <p className="mt-2 text-sm text-blue-600">
              Add events, then export the full list as a styled PDF.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => {
                setDownloadError(null);
                setDownloadOpen(true);
              }}
              disabled={events.length === 0}
            >
              Download PDF
            </Button>
            <Button variant="secondary" onClick={() => setVoiceOpen(true)}>
              Add by voice
            </Button>
            <Button
              onClick={() => {
                setFormError(null);
                setModalOpen(true);
              }}
            >
              Add event
            </Button>
          </div>
        </div>

        {pageError && (
          <div
            className="mt-8 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-600"
            role="alert"
          >
            {pageError}
          </div>
        )}

        <div className="mt-12">
          {eventsQuery.isLoading ? (
            <p className="text-sm text-blue-300">Loading events…</p>
          ) : events.length === 0 ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-ink">No events yet</h2>
              <p className="mt-2 text-sm text-blue-600">
                Click <span className="font-medium">Add event</span> to create your first one.
              </p>
            </div>
          ) : (
            <EventList
              events={events}
              onDelete={(id) => deleteMutation.mutate(id)}
              deletingId={deletingId}
            />
          )}
        </div>
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add event">
        <EventForm
          onSubmit={(input) => createMutation.mutate(input)}
          onCancel={() => setModalOpen(false)}
          submitting={createMutation.isPending}
          error={formError}
        />
      </Modal>

      <Modal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        title="Download events PDF"
      >
        <DownloadRangeForm
          onSubmit={(range) => downloadMutation.mutate(range)}
          onCancel={() => setDownloadOpen(false)}
          submitting={downloadMutation.isPending}
          error={downloadError}
        />
      </Modal>

      <VoiceEventModal open={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </AppShell>
  );
}
