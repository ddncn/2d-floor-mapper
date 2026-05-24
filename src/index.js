const {Room, Door} = require('./models');

// In-memory project document (simple)
function createRoom(spec){
  return new Room(spec);
}

function addDoorToRoom(room, doorSpec){
  return room.addDoor(doorSpec);
}

// Build connectivity graph: roomId -> [connectedRoomIds]
function buildConnectivity(rooms){
  const map = new Map();
  rooms.forEach(r => map.set(r.id, new Set()));
  rooms.forEach(r => {
    (r.doors || []).forEach(d => {
      if(d.connectsToRoomId) {
        map.get(r.id).add(d.connectsToRoomId);
      }
    });
  });
  const out = {};
  for(const [k,s] of map.entries()) out[k] = Array.from(s);
  return out;
}

function renderRoomMetadata(room){
  let lines = [];
  lines.push(`[Room: ${room.name}]`);
  lines.push(`Dimensions: ${room.length1} x ${room.length2}`);
  if(room.notes) lines.push(`Notes: ${room.notes}`);
  if(room.shade) lines.push(`Shade: ${room.shade}`);
  lines.push('Walls:');
  const walls = ['North','East','South','West'];
  walls.forEach((w, i) => {
    const wallId = ['N','E','S','W'][i];
    const doorList = (room.doors || []).filter(d => d.wallId === wallId);
    if(doorList.length===0) lines.push(`${w} Wall: No doors`);
    else doorList.forEach(d => lines.push(`${w} Wall: Door -> ${d.connectsToRoomId || 'Unlinked'} (offset: ${d.offsetFromCorner}, width: ${d.width})`));
  });
  return lines.join('\n');
}

// Very small ASCII renderer: places rooms in a stack with labels and a D where doors exist (not scaled)
function renderAscii(rooms){
  const blocks = rooms.map(r => {
    const w = Math.max(20, Math.round(r.length1));
    const h = Math.max(5, Math.round(r.length2/3)+3);
    const top = '+' + '-'.repeat(w) + '+';
    const mid = [];
    const shadeLine = `| ${r.name}`.padEnd(w) + '|';
    mid.push(shadeLine);
    for(let i=0;i<h-2;i++) mid.push(('|' + ' '.repeat(w) + '|'));
    const bottom = '+' + '-'.repeat(w) + '+';
    return [top, ...mid, bottom].join('\n');
  });
  return blocks.join('\n\n');
}

module.exports = {createRoom, addDoorToRoom, buildConnectivity, renderRoomMetadata, renderAscii};