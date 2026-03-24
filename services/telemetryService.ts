export type TelemetryEventName =
  | 'spotify_search_success'
  | 'spotify_search_error'
  | 'search_no_result_view'
  | 'search_request_submitted'
  | 'request_notification_received';

export interface TelemetryPayload {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Minimal telemetry logger.
 * This starts with console instrumentation so rollout can begin
 * without introducing third-party analytics dependencies.
 */
export const trackEvent = (name: TelemetryEventName, payload?: TelemetryPayload) => {
  if (import.meta.env.DEV) {
    // Keep local development noise readable.
    console.info(`[telemetry] ${name}`, payload || {});
    return;
  }

  // In production, still log to browser console for support triage.
  // This can be replaced with server-side analytics in a later phase.
  console.log(`[telemetry] ${name}`, payload || {});
};
