// B-only fixtures. No localStorage, network, Site data, production Store or Host.
export const copy = value => JSON.parse(JSON.stringify(value));
export class MemoryStore {
  constructor(data, validate = value => value) {
    this.validate = validate; this.validate(data); this.data = copy(data); this.saved = copy(data);
    this.listeners = new Set(); this.status = 'saved'; this.error = ''; this.generation = 0;
    this.savedGeneration = 0; this.undoEntry = null; this.failSave = false; this.ready = Promise.resolve();
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(kind = 'render') { [...this.listeners].forEach(fn => fn(kind)); }
  change(fn, { kind = 'render', undo = '' } = {}) {
    const next = copy(this.data); fn(next); this.validate(next);
    this.undoEntry = undo ? { data: copy(this.data), label: undo } : null;
    this.data = next; this.generation++; this.status = 'unsaved'; this.error = ''; this.emit(kind);
  }
  get dirty() { return JSON.stringify(this.data) !== JSON.stringify(this.saved); }
  flush() {
    if (this.failSave) { this.status = 'error'; this.error = 'Fixture save failed; your draft is retained.'; }
    else { this.saved = copy(this.data); this.savedGeneration = this.generation; this.status = 'saved'; this.error = ''; }
    this.emit('status');
    return { accepted: true, applied: true, persisted: false, fixtureSaved: !this.failSave };
  }
  reload() { this.data = copy(this.saved); this.undoEntry = null; this.generation = this.savedGeneration; this.status = 'saved'; this.error = ''; this.emit(); }
  undo() { if (!this.undoEntry) return; const value = this.undoEntry.data; this.change(next => Object.assign(next, value)); }
  dispose() { this.listeners.clear(); }
}
