// Browser-side renderer with file load/save and live preview
const sample = {
  rooms: [
    {id:'r1', name:'Living Room', length1:20, length2:15, shade:'light', notes:'Hardwood', doors:[{id:'d1', wallId:'S', offsetFromCorner:10, width:3, connectsToRoomId:'r2'}]},
    {id:'r2', name:'Kitchen', length1:12, length2:10, shade:'dark', doors:[]}
  ]
};

const dataEl = document.getElementById('data');
const metaEl = document.getElementById('meta');
const asciiEl = document.getElementById('ascii');
const fileInput = document.getElementById('fileInput');
const loadSampleBtn = document.getElementById('loadSample');
const saveJsonBtn = document.getElementById('saveJson');
const exportMetaBtn = document.getElementById('exportMeta');
const exportAsciiBtn = document.getElementById('exportAscii');

let renderTimer = null;

dataEl.value = JSON.stringify(sample, null, 2);

function renderAll(){
  let doc;
  try{ doc = JSON.parse(dataEl.value); } catch(e){ metaEl.textContent = 'JSON parse error: '+e; asciiEl.textContent = ''; return; }
  metaEl.textContent = renderMetadata(doc);
  asciiEl.textContent = renderAsciiWithDoors(doc);
}

function debounceRender(){
  if(renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(renderAll, 250);
}

dataEl.addEventListener('input', debounceRender);

loadSampleBtn.addEventListener('click', ()=>{ dataEl.value = JSON.stringify(sample, null, 2); renderAll(); });

fileInput.addEventListener('change', (e)=>{
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{ dataEl.value = r.result; renderAll(); };
  r.readAsText(f);
});

saveJsonBtn.addEventListener('click', ()=>{ download('floorplan.json', dataEl.value); });
exportMetaBtn.addEventListener('click', ()=>{ download('floorplan_metadata.md', metaEl.textContent); });
exportAsciiBtn.addEventListener('click', ()=>{ download('floorplan_ascii.txt', asciiEl.textContent); });

function download(filename, text){
  const blob = new Blob([text], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function renderMetadata(doc){
  const lines = [];
  (doc.rooms||[]).forEach(r=>{
    lines.push(`[Room: ${r.name}]`);
    lines.push(`Dimensions: ${r.length1} x ${r.length2}`);
    if(r.notes) lines.push(`Notes: ${r.notes}`);
    if(r.shade) lines.push(`Shade: ${r.shade}`);
    lines.push('Walls:');
    ['N','E','S','W'].forEach((w,i)=>{
      const names = ['North','East','South','West'];
      const doorList = (r.doors||[]).filter(d=>d.wallId===w);
      if(doorList.length===0) lines.push(`${names[i]} Wall: No doors`);
      else doorList.forEach(d=>lines.push(`${names[i]} Wall: Door -> ${d.connectsToRoomId||'Unlinked'} (offset: ${d.offsetFromCorner}, width: ${d.width})`));
    });
    lines.push('\n');
  });
  return lines.join('\n');
}

function renderAsciiWithDoors(doc){
  const blocks = (doc.rooms||[]).map(r=>{
    const w = Math.max(20, Math.round(r.length1||20));
    const h = Math.max(5, Math.round((r.length2||10)/3)+3);
    // build empty box
    let top = '+' + '-'.repeat(w) + '+';
    let mid = [];
    mid.push('| ' + r.name.padEnd(w-2) + '|');
    for(let i=0;i<h-2;i++) mid.push('|' + ' '.repeat(w) + '|');
    let bottom = '+' + '-'.repeat(w) + '+';

    // place doors
    (r.doors||[]).forEach(d=>{
      const wall = (d.wallId||'').toUpperCase();
      const offset = Number(d.offsetFromCorner) || 0;
      const doorWidth = Math.max(1, Math.round(Number(d.width)||1));
      if(wall==='N'){
        // position along top border; scale offset relative to length1
        const pos = 1 + Math.max(0, Math.min(w-1, Math.round((offset / (r.length1||w)) * w)));
        top = replaceAt(top, pos, 'D');
      } else if(wall==='S'){
        const pos = 1 + Math.max(0, Math.min(w-1, Math.round((offset / (r.length1||w)) * w)));
        bottom = replaceAt(bottom, pos, 'D');
      } else if(wall==='E'){
        const midRow = Math.floor(mid.length/2);
        // replace right wall char '|' with 'D'
        mid[midRow] = replaceAt(mid[midRow], mid[midRow].length-1, 'D');
      } else if(wall==='W'){
        const midRow = Math.floor(mid.length/2);
        // replace left wall '|' with 'D'
        mid[midRow] = replaceAt(mid[midRow], 0, 'D');
      }
    });

    return [top, ...mid, bottom].join('\n');
  });
  return blocks.join('\n\n');
}

function replaceAt(str, idx, chr){
  if(idx<0 || idx>=str.length) return str;
  return str.slice(0,idx) + chr + str.slice(idx+1);
}

// initial render
renderAll();
