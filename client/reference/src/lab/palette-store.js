// Adapter replacing the Site's D1 store. Only an ephemeral fixture checkpoint.
import {MemoryStore} from '../memory-store.js';
import {seedLibrary, validateLibrary} from './palette-model.js';
let shared;
export const paletteStore = () => shared || (shared = new MemoryStore(seedLibrary(), validateLibrary));
