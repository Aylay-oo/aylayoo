'use client';

import {
  createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode,
} from 'react';

/* One place owns the modal and the toast, because they are opened from all over the page:
 * a guide card, a trip card, the city button, the header and the footer. The design did this
 * with a single document-level click listener watching for [data-contact] and [data-open];
 * here the components call these functions directly.
 */

export type ContactRequest = {
  /** "contact" writes to a guide, "booking" orders a listed trip. */
  kind: 'contact' | 'booking';
  /** The guide or trip the dialog was opened from — shown in the title, sent as `subject`. */
  subject: string;
  /** Set only when opened from a guide's card, so the message can be attributed. */
  guideId?: number;
};

type DialogsValue = {
  contact: ContactRequest | null;
  openContact: (request: ContactRequest) => void;
  closeContact: () => void;

  registerOpen: boolean;
  openRegister: () => void;
  closeRegister: () => void;

  toast: string | null;
  showToast: (message: string) => void;
};

const DialogsContext = createContext<DialogsValue | null>(null);

/** How long the design left a toast on screen. */
const TOAST_MS = 2400;

export function DialogsProvider({ children }: { children: ReactNode }) {
  const [contact, setContact] = useState<ContactRequest | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    // A second toast replaces the first rather than queueing, and restarts the clock — so
    // two quick failures do not leave the second one visible for a blink.
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, TOAST_MS);
  }, []);

  const value = useMemo<DialogsValue>(() => ({
    contact,
    openContact: setContact,
    closeContact: () => setContact(null),
    registerOpen,
    openRegister: () => setRegisterOpen(true),
    closeRegister: () => setRegisterOpen(false),
    toast,
    showToast,
  }), [contact, registerOpen, toast, showToast]);

  return <DialogsContext.Provider value={value}>{children}</DialogsContext.Provider>;
}

export function useDialogs(): DialogsValue {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error('useDialogs must be used inside <DialogsProvider>');
  return ctx;
}
