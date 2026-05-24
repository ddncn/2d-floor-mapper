// Enhanced UI: guided room/door forms and live JSON sync
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

const newPlanBtn = document.getElementById('newPlan');
const addRoomBtn = document.getElementById('addRoom');
const addDoorBtn = document.getElementById('addDoor');

const roomPanel = document.getElementById('roomPanel');
const roomPanelTitle = document.getElementById('roomPanelTitle');
const roomName = document.getElementById('roomName');
const roomL1 = document.getElementById('roomL1');
const roomL2 = document.getElementById('roomL2');
const roomShade = document.getElementById('roomShade');
const roomNotes = document.getElementById('roomNotes');
const saveRoomBtn = document.getElementById('saveRoom');
const cancelRoomBtn = document.getElementById('cancelRoom');

const doorPanel = document.getElementById('doorPanel');
const doorRoom = document.getElementById('doorRoom');
const doorWall = document.getElementById('doorWall');
const doorOffset = document.getElementById('doorOffset');
const doorWidth = document.getElementById('doorWidth');
const doorConnect = document.getElementById('doorConnect');
const saveDoorBtn = document.getElementById('saveDoor');
const cancelDoorBtn = document.getElementById('cancelDoor');

const roomsList = document.getElementById('roomsList');

let renderTimer = null;
let currentDoc = null;
let editingRoomId = null;

function uid(prefix){ return prefix + Math.random().toString(36).slice(2,8); }

function parseDoc(){
  try{ currentDoc = JSON.parse(dataEl.value); if(!currentDoc.rooms) currentDoc.rooms = []; } catch(e){ currentDoc = {rooms:[]}; }
}

function syncTextarea(){ dataEl.value = JSON.stringify(currentDoc, null, 2); debounceRender(); }

function renderAll(){
  parseDoc();
  metaEl.textContent = renderMetadata(currentDoc);
  asciiEl.textContent = renderAsciiWithDoors(currentDoc);
  renderRoomsList();
  populateDoorRoomSelects();
}

function debounceRender(){
  if(renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(()=>{ renderAll(); }, 200);
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

newPlanBtn.addEventListener('click', ()=>{ currentDoc = {rooms:[]}; syncTextarea(); showRoomPanel(false); });
addRoomBtn.addEventListener('click', ()=>{ showRoomPanel(false); });
addDoorBtn.addEventListener('click', ()=>{ showDoorPanel(); });

cancelRoomBtn.addEventListener('click', ()=>{ hideRoomPanel(); });
cancelDoorBtn.addEventListener('click', ()=>{ hideDoorPanel(); });

saveRoomBtn.addEventListener('click', ()=>{
  const name = (roomName.value || '').trim() || 'Room';
  const l1 = Number(roomL1.value) || 10;
  const l2 = Number(roomL2.value) || 10;
  const shade = roomShade.value || null;
  const notes = roomNotes.value || null;

  if(editingRoomId){
    const r = currentDoc.rooms.find(x=>x.id===editingRoomId);
    if(r){ r.name=name; r.length1=l1; r.length2=l2; r.shade=shade; r.notes=notes; }
  } else {
    const room = { id: uid('room_'), name, length1:l1, length2:l2, shade, notes, doors:[] };
    currentDoc.rooms.push(room);
  }
  syncTextarea(); hideRoomPanel();
});

saveDoorBtn.addEventListener('click', ()=>{
  const rid = doorRoom.value;
  const wall = doorWall.value;
  const offset = Number(doorOffset.value) || 0;
  const width = Number(doorWidth.value) || 3;
  const connectsTo = doorConnect.value || null;
  const room = currentDoc.rooms.find(r=>r.id===rid);
  if(!room){ alert('Room not found'); return; }
  const door = { id: uid('door_'), wallId: wall, offsetFromCorner:offset, width, connectsToRoomId: connectsTo || null };
  room.doors = room.doors || [];
  room.doors.push(door);
  syncTextarea(); hideDoorPanel();
});

function showRoomPanel(edit=false, room=null){
  editingRoomId = null;
  roomPanel.hidden = false;
  roomPanel.scrollIntoView({behavior:'smooth', block:'center'});
  roomPanelTitle.textContent = edit ? 'Edit Room' : 'Add Room';
  if(edit && room){ editingRoomId = room.id; roomName.value=room.name; roomL1.value=room.length1; roomL2.value=room.length2; roomShade.value=room.shade||''; roomNotes.value=room.notes||''; }
  else { roomName.value=''; roomL1.value=10; roomL2.value=10; roomShade.value=''; roomNotes.value=''; }
}
function hideRoomPanel(){ roomPanel.hidden = true; }

function showDoorPanel(){
  doorPanel.hidden = false; doorPanel.scrollIntoView({behavior:'smooth', block:'center'}); populateDoorRoomSelects(); doorOffset.value=''; doorWidth.value=3;
}
function hideDoorPanel(){ doorPanel.hidden = true; }

function renderRoomsList(){
  roomsList.innerHTML = '';
  (currentDoc.rooms||[]).forEach(r=>{
    const el = document.createElement('div'); el.className='room-item';
    el.innerHTML = `<div class="room-row"><strong>${escapeHtml(r.name)}</strong> <span class="muted">(${r.length1}x${r.length2})</span></div>`;
    const editBtn = document.createElement('button'); editBtn.textContent='Edit'; editBtn.onclick = ()=>{ showRoomPanel(true,r); };
    const delBtn = document.createElement('button'); delBtn.textContent='Delete'; delBtn.onclick = ()=>{ if(confirm('Delete room?')){ currentDoc.rooms = currentDoc.rooms.filter(x=>x.id!==r.id); syncTextarea(); } };
    const addDoorBtnLocal = document.createElement('button'); addDoorBtnLocal.textContent='Add Door'; addDoorBtnLocal.onclick = ()=>{ showDoorPanel(); doorRoom.value=r.id; };
    const row = document.createElement('div'); row.className='room-actions'; row.append(editBtn, addDoorBtnLocal, delBtn);
    el.append(row);
    roomsList.append(el);
  });
}

function populateDoorRoomSelects(){
  const rooms = currentDoc.rooms || [];
  doorRoom.innerHTML = rooms.map(r=>`<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
  doorConnect.innerHTML = '<option value="">(none)</option>' + rooms.map(r=>`<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

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
