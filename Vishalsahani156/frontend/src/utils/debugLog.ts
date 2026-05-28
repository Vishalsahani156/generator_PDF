/** Debug-session logging (no secrets). */
export function debugLog(payload: {
  location: string;
  message: string;
  hypothesisId?: string;
  data?: Record<string, unknown>;
}) {
  // #region agent log
  fetch('http://127.0.0.1:7769/ingest/0b666d77-cf74-4f58-9c71-18f9dbb40ba2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '00b5b6' },
    body: JSON.stringify({
      sessionId: '00b5b6',
      runId: 'client',
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {});
  // #endregion
}
