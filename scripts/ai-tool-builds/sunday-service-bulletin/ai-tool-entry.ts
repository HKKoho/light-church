// Module evaluation follows import order: install the IndexedDB fallback
// before the app's own code runs.
import './idb-fallback';
import './src/main';
