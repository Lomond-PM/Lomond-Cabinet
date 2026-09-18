import {MemoryStore} from '../memory-store.js';
import {seedCurveLibrary, validateCurveLibrary} from './curve-model.js';
import {seedAssetSettings, validateAssetSettings} from './asset-settings.js';
let curves, settings;
export const curveStore = () => curves || (curves = new MemoryStore(seedCurveLibrary(), validateCurveLibrary));
export const assetSettingsStore = () => settings || (settings = new MemoryStore(seedAssetSettings(), validateAssetSettings));
