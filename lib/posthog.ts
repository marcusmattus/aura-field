/*
 * Initialize PostHog for the web template.
 * This is used to track events and sessions for the web template.
 * Do not modify this function as an agent.
 * @returns void
 */
export function initPostHog(): void {
  if (typeof window === 'undefined' || window === window.parent) return;

  const params = new URLSearchParams(window.location.search);
  const key = params.get('__ph_key');
  const host = params.get('__ph_host');
  if (!key || !host) return;

  // Lazy-load so Expo Go / native never evaluate the web SDK at import time.
  void import('posthog-js')
    .then(({ posthog }) => {
      posthog.init(key, {
        api_host: host,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: false,
        session_recording: {},
      });
    })
    .catch(() => {
      // Preview iframe / missing SDK — ignore.
    });
}
