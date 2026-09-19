// Synthetic test data only. This file is never loaded by the production page.
const originalFetch = window.fetch;
window.fetch = (url,opts) => String(url).startsWith('https://data.calgary.ca/resource/') ? Promise.resolve(new Response(JSON.stringify({type:'FeatureCollection',features:[
 {type:'Feature',geometry:{type:'Point',coordinates:[-114.0719,51.0447]},properties:{name:'TEST Central library',description:'<img src=x onerror=alert(1)>'}},
 {type:'Feature',geometry:{type:'Polygon',coordinates:[[[-114.10,51.06],[-114.08,51.06],[-114.08,51.07],[-114.10,51.06]]]},properties:{name:'TEST Park'}},
 {type:'Feature',geometry:{type:'LineString',coordinates:[[-114.04,51.04],[-114.03,51.06]]},properties:{name:'TEST Path'}},
 {type:'Feature',geometry:null,properties:{name:'TEST No geometry'}}
 ]}),{headers:{'Content-Type':'application/json'}})) : originalFetch(url,opts);
// Isolate this fixture from the real offline caches and installation.
Object.defineProperty(window,'caches',{value:undefined});
Object.defineProperty(navigator,'serviceWorker',{value:{register:()=>Promise.resolve()}});
document.title='TEST ONLY · Calgary Atlas';
