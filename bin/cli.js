#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {createRoom, addDoorToRoom, buildConnectivity, renderRoomMetadata, renderAscii} = require('../src/index');

const DATA_FILE = path.join(process.cwd(),'floorplan.json');

function load(){
  if(fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
  return {rooms:[]};
}
function save(doc){
  fs.writeFileSync(DATA_FILE, JSON.stringify(doc, null, 2));
}

const argv = process.argv.slice(2);
const cmd = argv[0];

if(!cmd || cmd==='help'){
  console.log('Usage: 2dfloor <command> [args]\nCommands: init, create-room, add-door, list, render-ascii, export');
  process.exit(0);
}

if(cmd==='init'){
  save({rooms:[]});
  console.log('Initialized floorplan.json');
  process.exit(0);
}

if(cmd==='create-room'){
  const name = argv[1] || 'Room';
  const l1 = Number(argv[2]) || 10;
  const l2 = Number(argv[3]) || 10;
  const doc = load();
  const room = createRoom({name, length1:l1, length2:l2});
  doc.rooms.push(room);
  save(doc);
  console.log('Created room', room.id);
  process.exit(0);
}

if(cmd==='add-door'){
  const roomId = argv[1];
  const wall = argv[2];
  const offset = Number(argv[3])||0;
  const width = Number(argv[4])||3;
  const connectsTo = argv[5] || null;
  const doc = load();
  const room = doc.rooms.find(r=>r.id===roomId||r.name===roomId);
  if(!room) return console.error('Room not found');
  const door = {wallId: wall, offsetFromCorner: offset, width, connectsToRoomId: connectsTo};
  room.doors = room.doors || [];
  room.doors.push(door);
  save(doc);
  console.log('Added door to', room.id);
  process.exit(0);
}

if(cmd==='list'){
  const doc = load();
  doc.rooms.forEach(r=>{
    console.log(r.id, r.name, `(${r.length1}x${r.length2})`);
  });
  process.exit(0);
}

if(cmd==='render-ascii'){
  const doc = load();
  console.log(renderAscii(doc.rooms));
  process.exit(0);
}

if(cmd==='export'){
  const out = argv[1] || 'export.md';
  const doc = load();
  const lines = [];
  doc.rooms.forEach(r=>{
    lines.push(require('../src/index').renderRoomMetadata(r));
    lines.push('\n');
  });
  fs.writeFileSync(out, lines.join('\n'));
  console.log('Exported to', out);
  process.exit(0);
}

console.error('Unknown command');
process.exit(1);
