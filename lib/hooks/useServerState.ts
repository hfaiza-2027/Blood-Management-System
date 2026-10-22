import { useState } from "react";

/**
 * Local state seeded from server data that follows the server.
 *
 * `useState(initial)` only reads its argument on the first render, so when
 * the page is refreshed with newer data (router.refresh(), live updates) the
 * component kept showing the old list until it was unmounted. This hook
 * replaces the local copy whenever the server sends a new value, while still
 * allowing optimistic edits in between.
 */
export function useServerState<T>(serverValue: T) {
  const [state, setState] = useState(serverValue);
  const [seen, setSeen] = useState(serverValue);
  if (serverValue !== seen) {
    // Adjusting state during render is React's recommended way to reset on a prop change.
    setSeen(serverValue);
    setState(serverValue);
  }
  return [state, setState] as const;
}
