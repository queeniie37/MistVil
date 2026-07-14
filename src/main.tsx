import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {MistVilDatabase} from './data';
import './index.css';

// Load persisted data (IndexedDB, migrating any old localStorage content)
// into the synchronous cache BEFORE the first render — components read
// their initial state from MistVilDatabase.get() in useState initializers.
MistVilDatabase.hydrate().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
