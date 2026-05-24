// Simple Room and Door models with basic validation
class Door {
  constructor({id, wallId, offsetFromCorner, offsetReferenceCorner, width, connectsToRoomId=null} = {}){
    this.id = id || `door_${Math.random().toString(36).slice(2,8)}`;
    this.wallId = wallId; // 'N'|'E'|'S'|'W'
    this.offsetFromCorner = Number(offsetFromCorner) || 0;
    this.offsetReferenceCorner = offsetReferenceCorner || 'tl';
    this.width = Number(width) || 0;
    this.connectsToRoomId = connectsToRoomId || null;
  }
}

class Room {
  constructor({id, name, type, notes, length1, length2, shade=null, doors=[]} = {}){
    this.id = id || `room_${Math.random().toString(36).slice(2,8)}`;
    this.name = name || this.id;
    this.type = type || null;
    this.notes = notes || null;
    this.length1 = Number(length1) || 0;
    this.length2 = Number(length2) || 0;
    this.shade = shade || null;
    this.doors = (doors || []).map(d => d instanceof Door ? d : new Door(d));
  }

  addDoor(doorSpec){
    const d = doorSpec instanceof Door ? doorSpec : new Door(doorSpec);
    this.doors.push(d);
    return d;
  }
}

module.exports = {Door, Room};