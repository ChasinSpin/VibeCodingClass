'use strict';
const $ = (selector) => document.querySelector(selector);
const KEY = 'still-seizure-journal-v1';
const classifications = ['Less', 'Typical', 'More', 'Alarming'];
let loadFailed = false;
let entries = [], demo = false, samples = [], range = 30, editingId = null, deletingId = null, toastTimer;
const journal = new JournalStorage();
let journalReady = false, saving = false;
const dateLabel = (date, opts = {}) => new Date(date).toLocaleDateString(undefined, { month:'short', day:'numeric', ...opts });
const timeLabel = date => new Date(date).toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
const localTime = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
const escapeHTML = str => String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data = () => (demo ? samples : entries).slice().sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp));
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 4500); }
async function persist(record, deletedId = null) {
  if (!journalReady || loadFailed || saving) { toast('Your journal is not ready to save yet.'); return false; }
  if (demo) {
    samples = samples.filter(e => e.id !== (record?.id || deletedId));
    if (record) samples.push(record);
    return true;
  }
  saving = true;
  $('#record-section').inert = true;
  $('#confirm-delete').disabled = true;
  try {
    entries = await journal.write(record, deletedId);
    updateStorageStatus();
    return true;
  } catch {
    $('#form-error').textContent = 'Unable to save. Keep this app open, export a copy, and check available device storage.';
    toast('Changes were not saved. Your entry is still in the form.');
    return false;
  } finally {
    saving = false;
    $('#record-section').inert = false;
    $('#confirm-delete').disabled = false;
  }
}
function render() {
  const records = data(), now = new Date(), last = records.find(e => new Date(e.timestamp) <= now);
  const cutoff = now.getTime() - 30*86400000;
  const recent = records.filter(e => new Date(e.timestamp).getTime() >= cutoff && new Date(e.timestamp) <= now);
  $('#today').textContent = now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  if (last) {
    const mins = Math.max(0, Math.floor((now-new Date(last.timestamp))/60000));
    const days = Math.floor(mins/1440), hours = Math.floor(mins/60);
    $('#last-elapsed').innerHTML = days ? `${days} <small>${days===1?'day':'days'} ago</small>` : hours ? `${hours} <small>${hours===1?'hour':'hours'} ago</small>` : `${mins} <small>${mins===1?'minute':'minutes'} ago</small>`;
    $('#last-detail').textContent = `${dateLabel(last.timestamp,{year:'numeric'})} at ${timeLabel(last.timestamp)}`;
  } else { $('#last-elapsed').textContent = '—'; $('#last-detail').textContent = 'Your next entry starts your story'; }
  $('#month-count').innerHTML = `${recent.length} <small>${recent.length===1?'event':'events'}</small>`;
  $('#frequency').innerHTML = recent.length ? `${(recent.length/30*7).toFixed(1)} <small>per week</small>` : '—';
  $('#frequency-detail').textContent = 'Weekly average · last 30 days';
  $('#history-count').textContent = records.length;
  $('#demo-banner').hidden = !demo;
  $('#export').disabled = records.length === 0;
  renderChart(records); renderHistory(records);
}
function renderChart(records) {
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(today); start.setDate(start.getDate()-range+1);
  const days = Array.from({length:range},(_,i) => {const d = new Date(start); d.setDate(d.getDate()+i); return {date:d,counts:[0,0,0,0]};});
  const dayKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const lookup = new Map(days.map(d => [dayKey(d.date),d]));
  records.forEach(e => { const d = lookup.get(dayKey(new Date(e.timestamp))); if (d) d.counts[classifications.indexOf(e.severity)]++; });
  const total = days.reduce((sum,d) => sum+d.counts.reduce((a,b)=>a+b,0),0);
  const max = Math.max(4,...days.map(d=>d.counts.reduce((a,b)=>a+b,0)));
  const scaleMax = Math.ceil(max/4)*4, width=1000, height=200, left=28, right=16, top=16, bottom=30, plotHeight=height-top-bottom, step=(width-left-right)/range;
  let svg = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">`;
  for(let i=0;i<=4;i++) {const y=top+plotHeight*i/4;svg+=`<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#eaf0e6" stroke-dasharray="3 5"/><text x="8" y="${y+3}" font-size="9" fill="#9ba894">${scaleMax*(4-i)/4}</text>`;}
  days.forEach((d,i)=>{let base=top+plotHeight;d.counts.forEach((count,j)=>{if(!count)return; const h=count/scaleMax*plotHeight; base-=h; svg+=`<rect x="${left+step*i+step*.2}" y="${base}" width="${step*.6}" height="${h}" rx="2" fill="${['#a7c8b6','#427c69','#d8ae66','#c57669'][j]}"><title>${escapeHTML(dateLabel(d.date))}: ${count} ${classifications[j]}</title></rect>`;});if(i===0||i===range-1||i%Math.max(1,Math.floor(range/6))===0 && i<range-3) svg+=`<text x="${left+step*i+step/2}" y="${height-8}" font-size="9" text-anchor="${i===0?'start':i===range-1?'end':'middle'}" fill="#9ba894">${escapeHTML(dateLabel(d.date))}</text>`;});
  $('#chart').innerHTML = svg+'</svg>';
  $('#chart').setAttribute('aria-label', `${total} seizures over ${range} days. ${days.filter(d=>d.counts.some(Boolean)).map(d=>dateLabel(d.date)+': '+d.counts.reduce((a,b)=>a+b,0)).join('; ')}`);
  $('#chart-empty').hidden = total > 0;
  $('#chart-total').textContent = `${total} ${total===1?'event':'events'} in this period`;
}
function renderHistory(records = data()) {
  const search = $('#search').value.toLowerCase().trim(), filter = $('#severity-filter').value;
  const shown = records.filter(e => (!filter || e.severity === filter) && `${e.location} ${e.notes}`.toLowerCase().includes(search));
  $('#history-body').innerHTML = shown.map(e=>`<tr><td>${escapeHTML(dateLabel(e.timestamp,{year:'numeric'}))}<time datetime="${escapeHTML(e.timestamp)}">${escapeHTML(timeLabel(e.timestamp))}</time></td><td><span class="severity-badge"><i class="${e.severity.toLowerCase()}"></i>${e.severity}</span></td><td>${escapeHTML(e.location || '—')}</td><td class="notes-cell">${escapeHTML(e.notes || '—')}</td><td><div class="row-actions"><button class="icon-button" data-edit="${escapeHTML(e.id)}" aria-label="Edit entry from ${escapeHTML(dateLabel(e.timestamp))}">✎</button><button class="icon-button" data-delete="${escapeHTML(e.id)}" aria-label="Delete entry from ${escapeHTML(dateLabel(e.timestamp))}">×</button></div></td></tr>`).join('');
  $('#history-empty').hidden = shown.length > 0;
  $('#history-empty h3').textContent = records.length ? 'No matching entries.' : 'A fresh page.';
  $('#history-empty p').textContent = records.length ? 'Try another search or classification.' : 'Record your first seizure now, or add an event from an earlier day.';
  $('#first-event').hidden = records.length > 0;
  $('#shown-count').textContent = records.length ? `Showing ${shown.length} of ${records.length} entries` : 'No entries yet';
}
let capturedTime = null;
let manualTime = false;
function setMode(manual) {
  manualTime = manual;
  $('#mode-now').classList.toggle('selected', !manual);
  $('#mode-manual').classList.toggle('selected', manual);
  $('#mode-now').setAttribute('aria-pressed', String(!manual));
  $('#mode-manual').setAttribute('aria-pressed', String(manual));
  $('#time-hint').textContent = manual ? 'Choose the date and time this event happened.' : capturedTime ? 'Time captured when you started. Choose Just now to recapture it.' : 'Captured when you start recording. You can change it.';
}
function captureNow() {
  capturedTime = new Date();
  $('#event-time').value = localTime(capturedTime);
  $('#event-time').max = localTime();
  setMode(false);
}
function resetForm() {
  editingId = null;
  capturedTime = null;
  $('#event-form').reset();
  $('#form-error').textContent = '';
  $('#entry-title').textContent = 'Record a seizure';
  $('#reset-entry').textContent = 'Clear form';
  $('#event-time').value = localTime();
  $('#event-time').max = localTime();
  setMode(false);
}
function openForm(id = null) {
  resetForm();
  const entry = id && data().find(e => e.id === id);
  if (entry) {
    editingId = id;
    $('#entry-title').textContent = 'Edit seizure entry';
    $('#reset-entry').textContent = 'Cancel edit';
    $('#event-time').value = localTime(new Date(entry.timestamp));
    $('#event-location').value = entry.location;
    $('#event-notes').value = entry.notes;
    document.querySelectorAll('[name="severity"]').forEach(r => r.checked = r.value === entry.severity);
    setMode(true);
  }
  $('#record-section').scrollIntoView({behavior:'smooth', block:'start'});
  $('#event-location').focus({preventScroll:true});
}
$('#first-event').onclick = () => openForm();
$('#reset-entry').onclick = resetForm;
$('#event-form').addEventListener('focusin', () => {
  $('#event-time').max = localTime();
  if (!manualTime && !capturedTime && !editingId) captureNow();
});
$('#mode-now').onclick = captureNow;
$('#mode-manual').onclick = () => { setMode(true); $('#event-time').focus(); };
$('#event-time').oninput = () => setMode(true);
$('#event-form').onsubmit = async event => {
  event.preventDefault();
  const timestamp = manualTime ? new Date($('#event-time').value) : capturedTime || new Date();
  if (!Number.isFinite(timestamp.getTime()) || timestamp > new Date()) {
    $('#form-error').textContent = 'Choose a valid date and time that is not in the future.';
    return;
  }
  const wasEditing = Boolean(editingId);
  const record = {id:editingId || crypto.randomUUID(), timestamp:timestamp.toISOString(), severity:document.querySelector('[name="severity"]:checked').value, location:$('#event-location').value.trim(), notes:$('#event-notes').value.trim()};
  if (await persist(record)) {
    resetForm();
    render();
    if (event.submitter?.id === 'save-close' && !demo) {
      // Storage succeeded before requesting tab closure. Keep confirmation
      // visible if the browser refuses, without offering a duplicate save.
      $('#saved-dialog').showModal();
      try { window.close(); } catch { /* The saved confirmation remains visible. */ }
    } else {
      toast(demo ? 'Sample entry saved in preview only. Exit preview to save a personal record.' : wasEditing ? 'Entry updated.' : 'Entry saved to your journal.');
    }
  }
};
$('#keep-open').onclick = () => $('#saved-dialog').close();
$('#history-body').onclick = event => {if(saving)return;const edit=event.target.closest('[data-edit]'),del=event.target.closest('[data-delete]');if(edit)openForm(edit.dataset.edit);if(del){deletingId=del.dataset.delete;$('#delete-dialog').showModal();}};
$('#cancel-delete').onclick=()=>$('#delete-dialog').close();
$('#confirm-delete').onclick=async()=>{if(await persist(null,deletingId)){$('#delete-dialog').close();render();toast('Entry deleted.');}};
$('#search').oninput=()=>renderHistory();$('#severity-filter').onchange=()=>renderHistory();
for(const button of document.querySelectorAll('[data-days]')) button.onclick=()=>{range=Number(button.dataset.days);document.querySelectorAll('[data-days]').forEach(b=>b.classList.toggle('selected',b===button));renderChart(data());};
$('#preview-demo').onclick=()=>{if(saving||!journalReady)return;resetForm();demo=true;samples=[1,3,4,7,7,10,13,16,19,22,24,28].map((days,i)=>{const date=new Date();date.setDate(date.getDate()-days);date.setHours(9+i%8,15,0,0);return {id:`sample-${i}`,timestamp:date.toISOString(),severity:classifications[[1,0,1,2,1,0,1,3,1,0,2,1][i]],location:['At home','Bedroom','Living room','At work'][i%4],notes:['Rested afterward.','Added later from my notes.','A typical event for me.','Noticed after waking up.'][i%4]};});render();};
$('#exit-demo').onclick=()=>{if(saving)return;resetForm();demo=false;$('#search').value='';$('#severity-filter').value='';render();};
$('#export').onclick=()=>{const csvCell=value=>`"${String(value).replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')}"`;const rows=[['Timestamp (ISO 8601)','Local date','Local time','Classification','Location','Notes'],...data().map(e=>[e.timestamp,dateLabel(e.timestamp,{year:'numeric'}),timeLabel(e.timestamp),e.severity,e.location,e.notes])];const blob=new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`still-${demo?'sample-':''}journal-${localTime().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Journal exported.');};
$('#history-nav').onclick=()=>{$('#history-section').scrollIntoView({behavior:'smooth',block:'start'});$('.nav.active').classList.remove('active');$('#history-nav').classList.add('active');$('#page-label').textContent='Seizure history';};
$('#overview-nav').onclick=()=>{window.scrollTo({top:0,behavior:'smooth'});$('.nav.active').classList.remove('active');$('#overview-nav').classList.add('active');$('#page-label').textContent='Overview';};
resetForm();render();setInterval(() => {
  if (!manualTime && !capturedTime) $('#event-time').value = localTime();
  $('#event-time').max = localTime();
  render();
},60000);

async function initializeJournal() {
  try {
    entries = await journal.open(() => localStorage.getItem(KEY));
    journalReady = true;
    $('#record-section').inert = false;
    $('#journal-status').textContent = 'Journal ready · records saved on this device';
    render();
  } catch {
    loadFailed = true;
    $('#journal-status').textContent = 'Your journal could not be opened. Existing records have not been overwritten. Close other app windows and reload to retry.';
  }
}
initializeJournal();
