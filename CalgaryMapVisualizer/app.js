'use strict';
const $ = id => document.getElementById(id);
const datasets = [
 {id:'x34e-bcjz',name:'Community services',note:'Libraries, courts & public places',color:'#247b66',icon:'⌂'},
 {id:'bdu9-amk8',name:'Playground equipment',note:'Play spaces across the city',color:'#d19a24',icon:'◇'},
 {id:'kami-qbfh',name:'Park sites',note:'Parks & open spaces',color:'#558641',icon:'♧'},
 {id:'ap4r-bav3',name:'Police service',note:'Police service locations',color:'#527cac',icon:'◎'}
];
const states = new Map();
const map = L.map('map',{zoomControl:false,preferCanvas:true}).setView([51.0447,-114.0719],11);
L.control.zoom({position:'bottomright'}).addTo(map);
const base = {
 street:L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'})
};
base.street.addTo(map);
let visibleFeatures = [], installPrompt;
function featurePopup(feature, dataset){
 const box=document.createElement('div'),title=document.createElement('strong');title.textContent=dataset.name;box.append(title);
 const table=document.createElement('table');table.className='feature-props';
 for(const [key,value] of Object.entries(feature.properties || {})){
  if(value===null || key.startsWith(':'))continue;
  const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');
  th.textContent=key.replaceAll('_',' ');td.textContent=typeof value==='object'?JSON.stringify(value):String(value);tr.append(th,td);table.append(tr);
 }box.append(table);return box;
}
function addCard(dataset){
 const state={dataset,active:false,loading:false,data:null,error:'',cached:false,partial:false};states.set(dataset.id,state);
 const label=document.createElement('label');label.className='layer';label.style.setProperty('--color',dataset.color);
 const icon=document.createElement('span');icon.className='layer-icon';icon.textContent=dataset.icon;
 const text=document.createElement('span'),title=document.createElement('span'),sub=document.createElement('small');title.className='layer-title';title.textContent=dataset.name;sub.textContent=dataset.note;text.append(title,sub);
 const input=document.createElement('input');input.type='checkbox';input.setAttribute('aria-label',dataset.name);input.addEventListener('change',()=>{state.active=input.checked;if(state.active&&!state.data)load(state);render();});state.input=input;state.sub=sub;label.append(icon,text,input);$('layers').append(label);
}
async function cachedData(id){try {const cache=await caches.open('calgary-data-v1');const response=await cache.match(new URL('./saved/'+id,location.href));return response?await response.json():null;}catch{return null;}}
async function saveData(id,data){try{const cache=await caches.open('calgary-data-v1');await cache.put(new URL('./saved/'+id,location.href),new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}}));}catch{/* Storage unavailable: live data remains usable. */}}
async function load(state){
 if(state.loading)return;state.loading=true;state.error='';state.sub.textContent='Loading from Calgary…';renderStatus();
 try{
  let features=[],partial=false;
  for(let offset=0;offset<20000;offset+=1000){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
   let page;
   try{const response=await fetch(`https://data.calgary.ca/resource/${state.dataset.id}.geojson?$limit=1000&$offset=${offset}&$order=:id`,{signal:controller.signal});if(!response.ok)throw Error(`Portal returned ${response.status}`);page=await response.json();}finally{clearTimeout(timer);}
   if(page.type!=='FeatureCollection'||!Array.isArray(page.features))throw Error('Dataset does not provide GeoJSON');
   features.push(...page.features);if(page.features.length<1000)break;if(offset===19000)partial=true;
  }
  state.data={type:'FeatureCollection',features};state.cached=false;state.partial=partial;state.savedAt=new Date().toISOString();
  await saveData(state.dataset.id,{data:state.data,partial,savedAt:state.savedAt});
 }catch(error){
  const saved=await cachedData(state.dataset.id);
  if(saved){state.data=saved.data;state.partial=saved.partial;state.savedAt=saved.savedAt;state.cached=true;}
  else if(!state.data)state.error=error.name==='AbortError'?'Portal timed out':error.message;
  else state.cached=true;
 }finally{state.loading=false;state.sub.textContent=state.error?'Unavailable · retry below':`${state.data.features.filter(f=>f.geometry).length.toLocaleString()} mapped${state.cached?' · saved offline':''}${state.partial?' · first 20,000 rows':''}`;render();}
}
function renderStatus(){
 const active=[...states.values()].filter(s=>s.active),loading=active.filter(s=>s.loading),errors=active.filter(s=>s.error),saved=active.filter(s=>s.cached),partial=active.filter(s=>s.partial);
 $('active-count').textContent=`${active.length} active`;
 $('status').textContent=loading.length?`Loading ${loading.map(s=>s.dataset.name).join(', ')}…`:errors.length?`${errors.map(s=>s.dataset.name).join(', ')} unavailable. Check your connection or retry. Other layers remain usable.`:saved.length?`Using saved data from ${new Date(saved[0].savedAt).toLocaleString()}. Reconnect and retry to refresh.`:active.length?`${partial.length?'Large datasets are limited to the first 20,000 rows. ':''}Source: City of Calgary Open Data. Features without geometry are excluded.`:'Select a layer to begin.';
 $('retry').hidden=!errors.length&&!saved.length;
 $('connection').textContent=!navigator.onLine?'Offline · saved data':saved.length?'Saved data':loading.length?'Connecting to portal…':errors.length?'Some layers unavailable':'Live portal data';
}
function render(){
 visibleFeatures=[];const query=$('filter').value.trim().toLowerCase(),bounds=map.getBounds();
 for(const state of states.values()){
  if(state.layer)map.removeLayer(state.layer);if(!state.active||!state.data)continue;
  const features=state.data.features.filter(f=>f.geometry&&(!query||JSON.stringify(f.properties).toLowerCase().includes(query)));
  state.layer=L.geoJSON(features,{style:{color:state.dataset.color,weight:2,fillOpacity:.18},pointToLayer:(_,latlng)=>L.circleMarker(latlng,{radius:5,color:'#fff',weight:1.3,fillColor:state.dataset.color,fillOpacity:.88}),onEachFeature:(f,l)=>l.bindPopup(()=>featurePopup(f,state.dataset))});
  state.layer.eachLayer(layer=>{
   const inside=!$('viewport-only').checked||(layer.getLatLng?bounds.contains(layer.getLatLng()):bounds.intersects(layer.getBounds()));
   if(inside)visibleFeatures.push({...layer.feature,properties:{...layer.feature.properties,_dataset:state.dataset.name,_dataset_id:state.dataset.id}});else state.layer.removeLayer(layer);
  });state.layer.addTo(map);
 }
 $('feature-count').textContent=visibleFeatures.length.toLocaleString();$('export').disabled=!visibleFeatures.length;renderStatus();
}
datasets.forEach(addCard);
$('filter').addEventListener('input',render);$('viewport-only').addEventListener('change',render);map.on('moveend',()=>{if($('viewport-only').checked)render();});
$('home').onclick=()=>map.setView([51.0447,-114.0719],11);
$('fit').onclick=()=>{const layers=[...states.values()].filter(s=>s.active&&s.layer).map(s=>s.layer);const bounds=L.featureGroup(layers).getBounds();if(bounds.isValid())map.fitBounds(bounds,{padding:[45,45],maxZoom:16});else $('status').textContent='No loaded features to fit. Select a layer or clear your filter.';};
$('locate').onclick=()=>{if(!navigator.geolocation){$('status').textContent='Location is unavailable in this browser.';return;}navigator.geolocation.getCurrentPosition(pos=>{map.setView([pos.coords.latitude,pos.coords.longitude],14);},()=>{$('status').textContent='Could not find your location. Check browser location permissions.';},{timeout:10000});};
$('retry').onclick=()=>{for(const state of states.values())if(state.active&&(state.error||state.cached))load(state);};
$('add').onclick=()=>{const raw=$('dataset-id').value.trim();const match=raw.match(/^(?:https:\/\/data\.calgary\.ca\/(?:[^?#]*\/)?|)([a-z0-9]{4}-[a-z0-9]{4})(?:\/[^?#]*)?(?:[?#].*)?$/i);if(!match){$('status').textContent='Enter a Calgary dataset ID such as abcd-1234 or a data.calgary.ca dataset URL.';return;}const id=match[1].toLowerCase();if(!states.has(id))addCard({id,name:`Dataset ${id}`,note:'Custom portal layer',color:'#9662ac',icon:'⊕'});const state=states.get(id);state.input.checked=true;state.input.dispatchEvent(new Event('change'));$('dataset-id').value='';};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({type:'FeatureCollection',features:visibleFeatures},null,2)],{type:'application/geo+json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='calgary-atlas.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else $('help').showModal();};$('close-help').onclick=()=>$('help').close();
window.addEventListener('online',renderStatus);window.addEventListener('offline',renderStatus);
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{$('status').textContent='Offline installation is unavailable. The online map still works.';});
const initial=states.get('x34e-bcjz');initial.input.checked=true;initial.input.dispatchEvent(new Event('change'));
