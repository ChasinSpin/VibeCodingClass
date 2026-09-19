'use strict';
// One record per key: changes in one window never replace unrelated records.
class JournalStorage {
  constructor(name = 'still-journal') { this.name = name; this.db = null; }
  static validate(records) {
    if (!Array.isArray(records) || records.some(e => !e || typeof e.id !== 'string' || !e.id || !Number.isFinite(Date.parse(e.timestamp)) || !['Less','Typical','More','Alarming'].includes(e.severity) || typeof e.location !== 'string' || typeof e.notes !== 'string')) throw new Error('Invalid journal data');
    return records;
  }
  async open(legacyReader) {
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('events', {keyPath:'id'});
        request.result.createObjectStore('metadata');
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Close other journal windows and try again.'));
      request.onsuccess = () => resolve(request.result);
    });
    this.db.onversionchange = () => this.db.close();
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(['events','metadata'], 'readwrite');
      const meta = tx.objectStore('metadata');
      let failure;
      tx.oncomplete = resolve;
      tx.onabort = () => reject(failure || tx.error || new Error('Migration was interrupted'));
      tx.onerror = () => {};
      const marker = meta.get('legacy-migrated');
      marker.onsuccess = () => {
        if (marker.result) return;
        try {
          const raw = legacyReader();
          const records = JournalStorage.validate(JSON.parse(raw || '[]'));
          const store = tx.objectStore('events');
          for (const record of records) {
            const existing = store.get(record.id);
            existing.onsuccess = () => { if (!existing.result) store.put(record); };
          }
          meta.put(true, 'legacy-migrated');
        } catch (error) { failure = error; tx.abort(); }
      };
    });
    return this.all();
  }
  all() {
    return new Promise((resolve,reject) => {
      const tx = this.db.transaction('events','readonly');
      const request = tx.objectStore('events').getAll();
      tx.oncomplete = () => { try { resolve(JournalStorage.validate(request.result)); } catch(error) { reject(error); } };
      tx.onabort = () => reject(tx.error || new Error('Could not read journal'));
      tx.onerror = () => {};
    });
  }
  write(record, deletedId) {
    if (record) JournalStorage.validate([record]);
    return new Promise((resolve,reject) => {
      let tx;
      try { tx = this.db.transaction('events','readwrite',{durability:'strict'}); }
      catch { tx = this.db.transaction('events','readwrite'); }
      const store = tx.objectStore('events');
      if (record) store.put(record); else store.delete(deletedId);
      const all = store.getAll();
      // Success is only reported after commit, including for Save & Close.
      tx.oncomplete = () => resolve(all.result);
      tx.onabort = () => reject(tx.error || new Error('Changes were not saved'));
      tx.onerror = () => {};
    });
  }
}
