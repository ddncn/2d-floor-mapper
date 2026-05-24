# 2D Floor Planner – Functional Specification

## Overview
The application is a **2D floor plan capture tool** designed to model interior spaces using a structured, measurement-first workflow. Users define rooms with dimensions and add doors with precise placement information. The system must represent:

1. **Room geometry** (2D layout derived from user-provided dimensions)  
2. **Room connectivity** (which rooms connect via doorways)  
3. **A text-based visual representation** of the layout that communicates structure, dimensions, and metadata clearly  

---

## Functional Requirements

### 1. Room Creation & Data Capture
- The system shall allow users to create rooms individually.
- Each room shall store:
  - `length1` (numeric)
  - `length2` (numeric)
  - optional descriptive fields:
    - room name
    - room type
    - notes / features
  - optional visual attribute:
    - `shade` (e.g., pattern, symbol, or identifier for rendering)

---

### 2. Door Definition (Per Room)
- The system shall allow users to define one or more doors per room.
- Each door shall include:
  - associated wall (e.g., North/East/South/West or Wall A/B/C/D)
  - `offsetFromCorner` (distance from a specified corner along the wall)
  - `offsetReferenceCorner` (which corner is used as the origin)
  - `width` (doorway width)

---

### 3. Room-to-Room Connectivity
- The system shall allow a door in one room to be linked to a door/opening in another room.
- The system shall maintain a connectivity model (graph or equivalent) to represent adjacency.
- The system shall support queries such as:
  - “Which rooms are connected to this room?”
  - “Through which doorway are Room A and Room B connected?”

---

### 4. Visualization (Internal / Optional UI)
- The system may render a graphical 2D representation for verification.
- Doors must appear on the correct wall at the correct offset and width.

---

## 5. Text-Based Visual Representation (REQUIRED OUTPUT)

### Purpose
The system shall generate a **text-based layout representation** that allows the user to understand:
- Room sizes and shapes
- Door placements
- Room connectivity
- Room-specific metadata
- Optional visual differentiation (shading)

---

### Output Requirements

#### 5.1 Structure
- The output shall represent each room in a consistent textual format.
- The layout should reflect **relative structure and adjacency** (not necessarily to exact scale, but proportionally meaningful where possible).
- Rooms should be arranged or listed in a way that reflects their connectivity.

---

#### 5.2 Room Representation
Each room must include:
- Room name or identifier
- Dimensions (`length1 x length2`)
- Optional notes
- Optional shading indicator
- Door definitions (explicitly described)

Example format (conceptual):

[Room: Living Room]
Dimensions: 20 x 15
Notes: Hardwood floors, fireplace
Shade: Light Gray
Walls:
North Wall: Door -> Kitchen (offset: 5 ft, width: 3 ft)
East Wall: No doors
South Wall: Door -> Hallway (offset: 10 ft, width: 3 ft)
West Wall: No doors


---

#### 5.3 Layout Representation (ASCII-style)
The system shall optionally generate a **diagram-like ASCII representation** that visually communicates layout.

Example (simplified):


+---------------------+
|     Living Room     |
|   [shaded: light]   |
|                     |
|        D            |
+----+---------+------+
| Kitchen |
|         |
+---------+

Where:
- `+`, `-`, `|` represent walls
- `D` represents a doorway
- Labels identify rooms
- Shading is indicated via text or symbols (e.g., `[shaded: light]`, `###`, `...`)

---

#### 5.4 Shading Support
- The system shall allow rooms to be optionally assigned a **shade or pattern identifier**.
- The shading shall be reflected in the text output using:
  - textual labels (e.g., `"Shade: Dark"`)
  - or repeatable characters/patterns (e.g., `###`, `~~~`, `...`)
- The shading mechanism does not need to be graphical but must be **visually distinguishable in text form**.

---

#### 5.5 Door Representation
- Doors must be visible in the text layout and described in metadata.
- The output shall include:
  - wall location
  - offset measurement
  - width
  - connected room (if defined)

---

## 6. Data Model (Reference)

### Room
- id
- name
- type
- notes
- length1
- length2
- shade (optional)
- doors[]

### Door
- id
- wallId
- offsetFromCorner
- offsetReferenceCorner
- width
- connectsToRoomId (optional)

---

## Key Design Insight (Important)
This system is effectively combining:
- **Geometric modeling** (room dimensions, wall positions)
- **Topological modeling** (room connectivity graph)
- **Textual rendering** (human-readable layout)

The **text-based output is not just a report**—it is a **primary deliverable** that must stand on its own as a clear representation of the floor plan.

---

## Optional Enhancement Ideas (for later)
- Scaled ASCII rendering based on measurements  
- Export formats (JSON, Markdown, plain text)  
- Validation (e.g., doors must align between connected rooms)  
- Auto-layout generation based on connectivity