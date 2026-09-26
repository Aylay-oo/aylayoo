'use client';

import { DialogsProvider } from '../lib/dialogs';
import { LangProvider } from '../lib/i18n';
import { TravelStateProvider } from '../lib/travel-state';
import { Home } from './components/Home';

/* The whole page is client-rendered.
 *
 * It could have fetched on the server, but nearly everything here is interactive state the
 * visitor drives — the map selection, the checklist, the language, the carousels — and the
 * requirement is that each section shows its own loading and error state and that the page
 * still works when the API is down. Owning the data on the client is what makes those two
 * things straightforward, and it is why the API base URL is a NEXT_PUBLIC_ variable.
 */
export default function Page() {
  return (
    <LangProvider>
      <TravelStateProvider>
        <DialogsProvider>
          <Home />
        </DialogsProvider>
      </TravelStateProvider>
    </LangProvider>
  );
}
