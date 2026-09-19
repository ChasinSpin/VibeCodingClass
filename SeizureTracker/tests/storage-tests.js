'use strict';
document.querySelector('#run').onclick = async () => {
  const output = document.querySelector('#results');
  output.textContent = '';
  const connections = [], names = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); output.textContent += `PASS: ${message}\n`; };
  const create = () => { const name = `still-test-${crypto.randomUUID()}`; names.push(name); const db = new JournalStorage(name); connections.push(db); return db; };
  const sample = {id:'one',timestamp:'2026-01-02T10:00:00.000Z',severity:'Typical',location:'Test',notes:'Migration fixture'};
  try {
    const db = create();
    let records = await db.open(() => JSON.stringify([sample]));
    check(records.length === 1 && records[0].notes === sample.notes, 'Legacy records migrate');
    records = await db.write({...sample,notes:'Edited'});
    check(records[0].notes === 'Edited', 'Edits commit');
    const second = new JournalStorage(db.name); connections.push(second);
    records = await second.open(() => { throw new Error('Must not re-read legacy data'); });
    check(records[0].notes === 'Edited', 'Reopening retains committed records and skips migration');
    await db.write({...sample,id:'two'});
    await second.write({...sample,id:'three'});
    check((await db.all()).length === 3, 'Separate connections preserve unrelated records');
    await db.write(null,'one');
    const third = new JournalStorage(db.name); connections.push(third);
    records = await third.open(() => JSON.stringify([sample]));
    check(records.length === 2 && !records.some(e=>e.id==='one'), 'Deleted records are not reimported');
    const corrupt = create(); let rejected = false;
    try { await corrupt.open(() => '{bad json'); } catch { rejected = true; }
    check(rejected, 'Corrupt legacy data fails without a partial migration');
    const retry = new JournalStorage(corrupt.name); connections.push(retry);
    check((await retry.open(() => JSON.stringify([sample]))).length === 1, 'Failed migration can retry');
    db.db.close(); rejected = false;
    try { await db.write({...sample,id:'failed'}); } catch { rejected = true; }
    check(rejected, 'Unavailable database rejects a save');
    const quotaDb = create(); await quotaDb.open(() => null);
    const originalTransaction = quotaDb.db.transaction.bind(quotaDb.db);
    quotaDb.db.transaction = (...args) => {const tx=originalTransaction(...args); const originalStore=tx.objectStore.bind(tx); tx.objectStore=name=>{const store=originalStore(name); store.put=()=>{queueMicrotask(()=>tx.abort());}; return store;}; return tx;};
    rejected = false; try { await quotaDb.write(sample); } catch { rejected = true; }
    check(rejected,'Aborted write never reports success');
    output.textContent += 'All storage checks passed.\n';
  } catch(error) { output.textContent += `FAIL: ${error.message}\n`; }
  finally {
    for (const connection of connections) connection.db?.close();
    for (const name of names) indexedDB.deleteDatabase(name);
  }
};
