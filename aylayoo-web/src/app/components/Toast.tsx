'use client';

import { useDialogs } from '../../lib/dialogs';

/* The design's toast: a pill that slides up from the bottom and leaves after a few seconds.
 *
 * It is always in the DOM and CSS toggles visibility, as the mockup had it, so the slide
 * animation has something to animate. role="status" means a screen reader hears the message
 * without it stealing focus — which matters because the only things that raise a toast here
 * are failures reported while a dialog is still open.
 */
export function Toast() {
  const { toast } = useDialogs();
  return (
    <div className={toast ? 'toast show' : 'toast'} role="status">
      {toast}
    </div>
  );
}
