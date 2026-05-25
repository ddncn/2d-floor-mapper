// Enhanced UI: guided room/door forms and live JSON sync
const sample = {
  rooms: [
    {id:'r1', name:'Living Room', length1:20, length2:15, shade:'light', notes:'Hardwood', doors:[{id:'d1', wallId:'S', offsetFromCorner:10, width:3, connectsToRoomId:'r2'}]},
    {id:'r2', name:'Kitchen', length1:12, length2:10, shade:'dark', notes:'Tile', doors:[{id:'d2', wallId:'N', offsetFromCorner:10, width:3, connectsToRoomId:'r1'}]}
  ]
};

const dataEl = document.getElementById('data');
const metaEl = document.getElementById('meta');
const asciiEl = document.getElementById('ascii');
const fileInput = document.getElementById('fileInput');
const fileInputContainer = document.getElementById('fileInputContainer');
const showUploadBtn = document.getElementById('showUploadBtn');
const loadSampleBtn = document.getElementById('loadSample');
const saveJsonBtn = document.getElementById('saveJson');
const exportMetaBtn = document.getElementById('exportMeta');
const exportAsciiBtn = document.getElementById('exportAscii');
const themeToggleBtn = document.getElementById('themeToggle');

// initialize theme from cookie
(function(){
  try{
    const t = getCookie('floorplanner_theme');
    if(t === 'dark') document.documentElement.classList.add('dark-theme');
    else if(t === 'light') document.documentElement.classList.remove('dark-theme');
    else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark-theme');
  }catch(e){}
  if(themeToggleBtn){ themeToggleBtn.addEventListener('click', ()=>{
    const isDark = document.documentElement.classList.toggle('dark-theme');
    setCookie('floorplanner_theme', isDark ? 'dark' : 'light', 365);
    showToast('Theme: ' + (isDark ? 'Dark' : 'Light'), 1000);
  }); }
})();

const editorDetails = document.getElementById('editorDetails');
const tabButtons = document.querySelectorAll('.tab-btn');

const newPlanBtn = document.getElementById('newPlan');
const addDoorBtn = document.getElementById('addDoor');

// start with editor closed unless user toggles
if(editorDetails) editorDetails.open = false;

function switchTab(tabId){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const content = document.getElementById(tabId);
  if(btn) btn.classList.add('active');
  if(content) content.classList.add('active');
}

// wire tab buttons
tabButtons.forEach(b=>b.addEventListener('click', ()=>{ const t = b.dataset.tab; switchTab(t); }));


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
function oppositeWall(w){ const m = {N:'S',S:'N',E:'W',W:'E'}; return (w||'').toUpperCase().split('')[0] ? m[(w||'').toUpperCase()]||w : w; }

function parseDoc(){
  try{ currentDoc = JSON.parse(dataEl.value); if(!currentDoc.rooms) currentDoc.rooms = []; } catch(e){ currentDoc = {rooms:[]}; }
}

function syncTextarea(){ dataEl.value = JSON.stringify(currentDoc, null, 2); debounceRender(); }

function setCookie(name, value, days){ const d = new Date(); d.setTime(d.getTime() + (days*24*60*60*1000)); document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;expires=' + d.toUTCString(); }
function getCookie(name){ const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'); return v ? decodeURIComponent(v.pop()) : null; }

function showToast(msg, duration=2500){
  let t = document.getElementById('toast');
  if(!t){ t = document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ try{ t.style.opacity='0'; }catch(e){} }, duration);
}

function mirrorOffset(srcRoom, srcDoor, dstRoom, oppWall){
  const wall = (srcDoor.wallId||'').toUpperCase();
  const srcLen = (wall==='N' || wall==='S') ? (srcRoom.length1||1) : (srcRoom.length2||1);
  const dstLen = (oppWall==='N' || oppWall==='S') ? (dstRoom.length1||1) : (dstRoom.length2||1);
  const frac = srcLen>0 ? ((Number(srcDoor.offsetFromCorner)||0) / srcLen) : 0.5;
  const dstOffset = Math.round(frac * dstLen);
  return dstOffset;
}

function normalizeReciprocalDoors(){
  if(!currentDoc || !Array.isArray(currentDoc.rooms)) return;
  let created = 0; let cleaned = 0;
  const roomsById = {};
  currentDoc.rooms.forEach(r=>roomsById[r.id]=r);
  // cleanup dangling connectsToRoomId
  currentDoc.rooms.forEach(r=>{
    r.doors = r.doors || [];
    r.doors.forEach(d=>{
      if(d.connectsToRoomId){ if(!roomsById[d.connectsToRoomId]){ d.connectsToRoomId = null; cleaned++; } }
    });
  });
  // ensure reciprocals
  currentDoc.rooms.forEach(src=>{
    (src.doors||[]).forEach(d=>{
      if(!d.connectsToRoomId) return;
      const dst = roomsById[d.connectsToRoomId];
      if(!dst) return; // already cleaned
      const opp = oppositeWall(d.wallId);
      const dstDoors = dst.doors || [];
      // look for an existing reciprocal door linked back to src on the opposite wall
      let match = dstDoors.find(dd => String((dd.connectsToRoomId||'')) === String(src.id) && String((dd.wallId||'')).toUpperCase() === opp);
      if(match) return; // already reciprocal
      // try to find a door on opposite wall and close offset to mirror
      const mirroredOffset = mirrorOffset(src,d,dst,opp);
      const threshold = Math.max(1, Math.round(( (opp==='N'||opp==='S') ? dst.length1 : dst.length2 ) * 0.15));
      match = dstDoors.find(dd => String((dd.wallId||'')).toUpperCase() === opp && Math.abs((dd.offsetFromCorner||0) - mirroredOffset) <= threshold);
      if(match){ match.connectsToRoomId = src.id; created++; return; }
      // create reciprocal
      const rec = { id: uid('door_'), wallId: opp, offsetFromCorner: mirroredOffset, width: d.width || 3, connectsToRoomId: src.id };
      dst.doors = dst.doors || [];
      dst.doors.push(rec);
      created++;
    });
  });
  if(created>0 || cleaned>0){
    // update textarea content directly to avoid scheduling extra render loops
    try{ dataEl.value = JSON.stringify(currentDoc, null, 2); }catch(e){}
    if(created>0) showToast(`${created} reciprocal door(s) created`);
    if(cleaned>0) showToast(`${cleaned} dangling door link(s) cleared`);
  }
}

function renderAll(){
  parseDoc();
  normalizeReciprocalDoors();
  metaEl.textContent = renderMetadata(currentDoc);
  renderVisual(currentDoc);
  asciiEl.textContent = renderAsciiWithDoors(currentDoc);
  renderRoomsList();
  populateDoorRoomSelects();
}

function debounceRender(){
  if(renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(()=>{ renderAll(); }, 200);
}

dataEl.addEventListener('input', debounceRender);

if(loadSampleBtn){
  loadSampleBtn.addEventListener('click', ()=>{ try{ dataEl.value = JSON.stringify(sample, null, 2); renderAll(); } catch(e){ console.error('loadSample error', e); alert('Failed to load sample: '+e); } });
} else console.warn('loadSampleBtn not found');

if(showUploadBtn){
  showUploadBtn.addEventListener('click', ()=>{
    if(fileInputContainer){
      fileInputContainer.hidden = !fileInputContainer.hidden;
      if(!fileInputContainer.hidden && fileInput) fileInput.focus();
    }
  });
} else console.warn('showUploadBtn not found');

if(fileInput){
  fileInput.addEventListener('change', (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{ dataEl.value = r.result; renderAll(); };
    r.readAsText(f);
  });
} else console.warn('fileInput not found');

if(saveJsonBtn){ saveJsonBtn.addEventListener('click', ()=>{ download('floorplan.json', dataEl.value); }); } else console.warn('saveJsonBtn not found');

if(exportMetaBtn){ exportMetaBtn.addEventListener('click', ()=>{
  const md = `# Floorplan Metadata\n\n<details>\n<summary>Show metadata</summary>\n\n\`\`\`\n${metaEl.textContent}\n\`\`\`\n\n</details>`;
  download('floorplan_metadata.md', md);
}); } else console.warn('exportMetaBtn not found');

if(exportAsciiBtn){ exportAsciiBtn.addEventListener('click', ()=>{ download('floorplan_ascii.txt', asciiEl.textContent); }); } else console.warn('exportAsciiBtn not found');

if(newPlanBtn){
  newPlanBtn.addEventListener('click', ()=>{
    try{
      console.log('newPlan clicked');
      currentDoc = {rooms:[]};
      syncTextarea();
      showRoomPanel(false);
    }catch(e){
      console.error('newPlan handler error', e);
      alert('Failed to create a new plan: ' + e);
    }
  });
} else {
  console.warn('newPlanBtn not found');
}

if(addDoorBtn){ addDoorBtn.addEventListener('click', ()=>{ showDoorPanel(); }); } else console.warn('addDoorBtn not found');
const addRoomLocalBtn = document.getElementById('addRoomLocal');
if(addRoomLocalBtn){ addRoomLocalBtn.addEventListener('click', ()=>{ showRoomPanel(false); }); } else console.warn('addRoomLocal not found');


if(cancelRoomBtn){ cancelRoomBtn.addEventListener('click', ()=>{ hideRoomPanel(); }); } else console.warn('cancelRoomBtn not found');
if(cancelDoorBtn){ cancelDoorBtn.addEventListener('click', ()=>{ hideDoorPanel(); }); } else console.warn('cancelDoorBtn not found');

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
  const wall = (doorWall.value||'').toUpperCase();
  const offset = Number(doorOffset.value) || 0;
  const width = Number(doorWidth.value) || 3;
  const connectsTo = doorConnect.value || null;
  const room = currentDoc.rooms.find(r=>r.id===rid);
  if(!room){ alert('Room not found'); return; }
  room.doors = room.doors || [];
  const door = { id: uid('door_'), wallId: wall, offsetFromCorner:offset, width, connectsToRoomId: connectsTo || null };
  room.doors.push(door);

  // if door connects to another room, ensure a reciprocal door exists on that room
  if(connectsTo){
    const dst = currentDoc.rooms.find(r=>r.id===connectsTo);
    if(dst){
      dst.doors = dst.doors || [];
      const opp = oppositeWall(wall);
      // prefer an existing door that already links back
      let matching = dst.doors.find(dd => (dd.connectsToRoomId === room.id) && (String(dd.wallId||'').toUpperCase() === opp));
      if(!matching){
        // try to find a door at same wall/offset and attach it
        matching = dst.doors.find(dd => String(dd.wallId||'').toUpperCase() === opp && Math.abs((dd.offsetFromCorner||0) - offset) < 0.5);
        if(matching){
          matching.connectsToRoomId = room.id;
        } else {
          // create reciprocal door; compute mirrored offset proportional to wall lengths
          const mirroredOffset = mirrorOffset(room, door, dst, opp);
          const recDoor = { id: uid('door_'), wallId: opp, offsetFromCorner: mirroredOffset, width, connectsToRoomId: room.id };
          dst.doors.push(recDoor);
        }
      }
    }
  }

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
    const header = document.createElement('div'); header.className='room-row';
    header.innerHTML = `<strong>${escapeHtml(r.name)}</strong> <span class="muted">(${r.length1}x${r.length2})</span>`;
    el.appendChild(header);
    // metadata under each room
    const meta = document.createElement('div'); meta.className='room-meta muted';
    const notes = r.notes ? `<div>Notes: ${escapeHtml(r.notes)}</div>` : '';
    const shade = r.shade ? `<div>Shade: ${escapeHtml(r.shade)}</div>` : '';
    const doorsHtml = (r.doors||[]).map(d=>{
      const target = d.connectsToRoomId ? (currentDoc.rooms.find(rr=>rr.id===d.connectsToRoomId)||{}).name : '(none)';
      return `<div class="door-entry">Wall ${escapeHtml(d.wallId)} - offset ${escapeHtml(String(d.offsetFromCorner))} - width ${escapeHtml(String(d.width))} -> ${escapeHtml(target)}</div>`;
    }).join('');
    meta.innerHTML = `${notes}${shade}<div>Doors:${doorsHtml ? '' : ' None'}</div><div>${doorsHtml}</div>`;
    el.appendChild(meta);

    const actions = document.createElement('div'); actions.className='room-actions';
    const editBtn = document.createElement('button'); editBtn.textContent='Edit'; editBtn.onclick = ()=>{ showRoomPanel(true,r); };
    const addDoorBtnLocal = document.createElement('button'); addDoorBtnLocal.textContent='Add Door'; addDoorBtnLocal.onclick = ()=>{ showDoorPanel(); doorRoom.value=r.id; };
    const delBtn = document.createElement('button'); delBtn.textContent='Delete'; delBtn.onclick = ()=>{ if(confirm('Delete room?')){ // remove reciprocal doors in other rooms
        let removedRecips = 0;
        currentDoc.rooms.forEach(other=>{
          if(other.id===r.id) return;
          const before = (other.doors||[]).length;
          other.doors = (other.doors||[]).filter(dd=>dd.connectsToRoomId !== r.id);
          removedRecips += before - (other.doors||[]).length;
        });
        currentDoc.rooms = currentDoc.rooms.filter(x=>x.id!==r.id);
        syncTextarea();
        if(removedRecips>0) showToast(`${removedRecips} reciprocal door(s) removed`);
      } };

    actions.append(editBtn, addDoorBtnLocal, delBtn);
    el.appendChild(actions);

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

function renderVisual(doc){
  const area = document.getElementById('visual');
  area.innerHTML = '';
  // choose a pixelsPerUnit so rooms sizes are reasonable
  const ppu = 10; // pixels per length unit
  // ensure each room has x,y
  (doc.rooms||[]).forEach((r, idx)=>{ if(typeof r.x !== 'number') r.x = idx * 20; if(typeof r.y !== 'number') r.y = 0; });

  // create SVG overlay for connectors
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class','visual-svg');
  svg.style.position = 'absolute'; svg.style.left = '0'; svg.style.top = '0'; svg.style.pointerEvents = 'none';
  area.appendChild(svg);

  // create room elements
  doc.rooms.forEach(r=>{
    const el = document.createElement('div');
    el.className = 'room-visual';
    el.dataset.id = r.id;
    el.style.width = Math.max(40, Math.round(r.length1 * ppu)) + 'px';
    el.style.height = Math.max(30, Math.round(r.length2 * ppu)) + 'px';
    el.style.left = (r.x * ppu) + 'px';
    el.style.top = (r.y * ppu) + 'px';
    el.innerHTML = `<div class="room-title">${escapeHtml(r.name)}</div>`;
    makeDraggable(el, r);
    area.appendChild(el);

    // render door glyphs inside the room
    (r.doors||[]).forEach(d=>{
      const leftPx = (r.x||0) * ppu; const topPx = (r.y||0) * ppu;
      const wPx = Math.max(40, Math.round(r.length1 * ppu)); const hPx = Math.max(30, Math.round(r.length2 * ppu));
      const pt = computeDoorPoint(r, d, leftPx, topPx, wPx, hPx);
      const relX = pt.x - leftPx; const relY = pt.y - topPx;
      const doorEl = document.createElement('div');
      doorEl.className = 'door-visual';
      // adjust size to door.width where possible
      const doorWidthPx = Math.max(8, Math.round((d.width||3) * ppu * 0.6));
      doorEl.style.width = doorWidthPx + 'px';
      doorEl.style.height = Math.max(6, Math.round(8 * (doorWidthPx/14))) + 'px';
      doorEl.style.left = relX + 'px';
      doorEl.style.top = relY + 'px';
      el.appendChild(doorEl);
    });
  });

  // adjust svg size to content
  svg.setAttribute('width', area.scrollWidth || area.clientWidth);
  svg.setAttribute('height', area.scrollHeight || area.clientHeight);

  // draw connectors for doors that link rooms
  const ppuLocal = ppu;
  doc.rooms.forEach(src=>{
    (src.doors||[]).forEach(d=>{
      if(!d.connectsToRoomId) return;
      const dst = (doc.rooms||[]).find(rr=>rr.id===d.connectsToRoomId);
      if(!dst) return;
      // compute source point
      const srcLeft = (src.x||0) * ppuLocal; const srcTop = (src.y||0) * ppuLocal;
      const srcW = Math.max(40, Math.round(src.length1 * ppuLocal)); const srcH = Math.max(30, Math.round(src.length2 * ppuLocal));
      const spt = computeDoorPoint(src, d, srcLeft, srcTop, srcW, srcH);
      // find matching door on dst that points back to src
      const matching = (dst.doors||[]).find(dd => dd.connectsToRoomId === src.id);
      let dpt;
      if(matching){
        const dstLeft = (dst.x||0) * ppuLocal; const dstTop = (dst.y||0) * ppuLocal;
        const dstW = Math.max(40, Math.round(dst.length1 * ppuLocal)); const dstH = Math.max(30, Math.round(dst.length2 * ppuLocal));
        dpt = computeDoorPoint(dst, matching, dstLeft, dstTop, dstW, dstH);
      } else {
        // fallback to center of dst
        dpt = {x: (dst.x||0)*ppuLocal + Math.max(40, Math.round(dst.length1 * ppuLocal))/2, y: (dst.y||0)*ppuLocal + Math.max(30, Math.round(dst.length2 * ppuLocal))/2};
      }
      // draw line
      const line = document.createElementNS(svgNS,'line');
      line.setAttribute('x1', spt.x); line.setAttribute('y1', spt.y);
      line.setAttribute('x2', dpt.x); line.setAttribute('y2', dpt.y);
      line.setAttribute('stroke','#ff7043'); line.setAttribute('stroke-width','2'); line.setAttribute('stroke-linecap','round');
      svg.appendChild(line);
    });
  });
}

function computeDoorPoint(room, door, left, top, widthPx, heightPx){
  const wall = (door.wallId||'').toUpperCase();
  const off = Number(door.offsetFromCorner) || 0;
  let x = left + widthPx/2; let y = top + heightPx/2;
  if(wall==='N'){
    const frac = room.length1 ? (off / room.length1) : 0.5;
    x = left + Math.min(widthPx-4, Math.max(4, Math.round(frac * widthPx)));
    y = top;
  } else if(wall==='S'){
    const frac = room.length1 ? (off / room.length1) : 0.5;
    x = left + Math.min(widthPx-4, Math.max(4, Math.round(frac * widthPx)));
    y = top + heightPx;
  } else if(wall==='W'){
    const frac = room.length2 ? (off / room.length2) : 0.5;
    x = left;
    y = top + Math.min(heightPx-4, Math.max(4, Math.round(frac * heightPx)));
  } else if(wall==='E'){
    const frac = room.length2 ? (off / room.length2) : 0.5;
    x = left + widthPx;
    y = top + Math.min(heightPx-4, Math.max(4, Math.round(frac * heightPx)));
  }
  return {x,y};
}

function makeDraggable(el, room){
  let dragging = false;
  let startX=0, startY=0, origX=0, origY=0;
  el.addEventListener('pointerdown', (ev)=>{
    el.setPointerCapture(ev.pointerId);
    dragging = true;
    startX = ev.clientX; startY = ev.clientY;
    origX = parseInt(el.style.left||0,10); origY = parseInt(el.style.top||0,10);
    el.classList.add('dragging');
  });
  window.addEventListener('pointermove', (ev)=>{
    if(!dragging) return;
    const dx = ev.clientX - startX; const dy = ev.clientY - startY;
    el.style.left = (origX + dx) + 'px'; el.style.top = (origY + dy) + 'px';
  });
  window.addEventListener('pointerup', (ev)=>{
    if(!dragging) return;
    dragging = false; el.classList.remove('dragging');
    // store new room coords in room.x, room.y (in units)
    const ppu = 10;
    const left = parseInt(el.style.left||0,10); const top = parseInt(el.style.top||0,10);
    // snap to grid (1 unit)
    const gridUnits = 1;
    room.x = Math.round((left / ppu) / gridUnits) * gridUnits;
    room.y = Math.round((top / ppu) / gridUnits) * gridUnits;
    // resolve collisions with other rooms
    resolveCollisions(room, currentDoc);
    syncTextarea();
  });
}

function resolveCollisions(movedRoom, doc){
  const others = (doc.rooms||[]).filter(r=>r.id!==movedRoom.id);
  const maxAttempts = 50;
  let attempt = 0;
  while(attempt++ < maxAttempts){
    const overlap = others.find(o=>isOverlapRect(movedRoom,o));
    if(!overlap) break;
    // push movedRoom right by a small step to avoid overlap
    movedRoom.x += Math.max(1, Math.round(overlap.length1||5));
  }
}

function isOverlapRect(a,b){
  const ax1 = a.x; const ay1 = a.y; const ax2 = a.x + (a.length1||1); const ay2 = a.y + (a.length2||1);
  const bx1 = b.x; const by1 = b.y; const bx2 = b.x + (b.length1||1); const by2 = b.y + (b.length2||1);
  return !(ax2 <= bx1 || ax1 >= bx2 || ay2 <= by1 || ay1 >= by2);
}

function renderAsciiWithDoors(doc){
  // Very small scaled ASCII based on room positions and sizes
  const unitPerChar = 4; // length units per character cell
  const rooms = doc.rooms || [];
  // compute ascii rectangles
  const rects = rooms.map(r => {
    const w = Math.max(6, Math.round(r.length1 / unitPerChar));
    const h = Math.max(3, Math.round(r.length2 / (unitPerChar*0.6)));
    const x = Math.round((r.x||0) / unitPerChar) + 1;
    const y = Math.round((r.y||0) / unitPerChar) + 1;
    return {id:r.id, name:r.name, x,y,w,h,doors:r.doors||[]};
  });
  // compute canvas size
  let maxX=0,maxY=0; rects.forEach(rc=>{ maxX = Math.max(maxX, rc.x+rc.w+1); maxY = Math.max(maxY, rc.y+rc.h+1); });
  // build grid
  const grid = Array.from({length:maxY+1}, ()=>Array.from({length:maxX+1}, ()=>' '));
  rects.forEach(rc=>{
    const left = rc.x; const right = rc.x + rc.w; const top = rc.y; const bottom = rc.y + rc.h;
    // draw horizontal borders
    for(let cx=left; cx<=right; cx++){
      grid[top][cx] = '-'; grid[bottom][cx] = '-';
    }
    // draw vertical borders
    for(let ry=top; ry<=bottom; ry++){
      grid[ry][left] = '|'; grid[ry][right] = '|';
    }
    grid[top][left] = '+'; grid[top][right] = '+'; grid[bottom][left] = '+'; grid[bottom][right] = '+';
    // write name
    const name = rc.name.slice(0, rc.w-1);
    for(let i=0;i<name.length;i++){ grid[top+1][left+1+i] = name[i]; }
    // doors
    rc.doors.forEach(d=>{
      const wall = (d.wallId||'').toUpperCase(); const offset = Math.round((d.offsetFromCorner||0)/unitPerChar);
      if(wall==='N'){
        const px = Math.min(right-1, left+1+offset);
        grid[top][px] = 'D';
      } else if(wall==='S'){
        const px = Math.min(right-1, left+1+offset);
        grid[bottom][px] = 'D';
      } else if(wall==='W'){
        const py = Math.min(bottom-1, top+1+offset);
        grid[py][left] = 'D';
      } else if(wall==='E'){
        const py = Math.min(bottom-1, top+1+offset);
        grid[py][right] = 'D';
      }
    });
  });
  return grid.map(row=>row.join('')).join('\n');
}

function replaceAt(str, idx, chr){
  if(idx<0 || idx>=str.length) return str;
  return str.slice(0,idx) + chr + str.slice(idx+1);
}

// splitter resize behavior
(function setupSplitter(){
  const split = document.getElementById('split');
  const splitter = document.getElementById('splitter');
  const leftPane = document.getElementById('leftPane');
  if(!split || !splitter || !leftPane) return;
  // disable splitter on small screens (layout switches to stacked)
  if(window.matchMedia && window.matchMedia('(max-width:980px)').matches){
    try{ splitter.style.display = 'none'; }catch(e){}
    try{ split.style.gridTemplateColumns = '1fr'; }catch(e){}
    return;
  }
  let dragging = false; let startX = 0; let startLeft = 0;
  splitter.addEventListener('pointerdown', (e)=>{
    dragging = true; startX = e.clientX; startLeft = leftPane.getBoundingClientRect().width; splitter.setPointerCapture(e.pointerId); document.body.style.userSelect='none';
  });
  window.addEventListener('pointermove', (e)=>{
    if(!dragging) return; const dx = e.clientX - startX; const newLeft = Math.max(200, Math.min(480, startLeft + dx)); split.style.gridTemplateColumns = `${newLeft}px 8px 1fr 1fr`;
  });
  window.addEventListener('pointerup', (e)=>{ if(!dragging) return; dragging = false; document.body.style.userSelect='auto'; try{ splitter.releasePointerCapture(e.pointerId); }catch(e){} });
})();

// initial render
renderAll();
