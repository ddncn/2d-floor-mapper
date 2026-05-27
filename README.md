# Floor Plan Organizer

A browser-based 2D floor plan tool built with vanilla HTML/CSS/JS — no install, no build step, no dependencies. Works on desktop and mobile.

**Live demo:** https://YOUR-USERNAME.github.io/floorplan/

## Features

- Draw rooms by clicking and dragging on the canvas
- Resize rooms by dragging corner and edge handles
- Snap rooms to each other's edges while dragging
- Define doors on any wall with exact offset and width in feet
- Connect doors between rooms or mark them as leading outside
- Assign floor types (hardwood, carpet, tile, concrete, laminate, vinyl) with visual hatching
- Blueprint-style rendering with grid, dimension labels, and wall gaps for doors
- Room stats panel shows width, depth, and square footage
- Export your floor plan as a JSON file and re-import it later
- Generate a plain ASCII text drawing of the floor plan (copyable)
- Auto-saves to browser cookies so your work persists between visits
- Load a built-in example Craftsman home layout to get started

## How to Use

| Action | How |
|---|---|
| Add a room | Select "Add Room" then click and drag on the canvas |
| Move a room | Select tool → drag the room |
| Resize a room | Select tool → drag a corner or edge handle |
| Rename a room | Double-click it |
| Add a door | Select a room, then click "+ Add Door" in the sidebar |
| Edit a door | Click the door arc directly on the canvas |
| Pan the canvas | Drag on empty space, or middle-click drag |
| Zoom | Scroll wheel |

## Saving Your Work

- **Browser save:** click the 💾 Save button — restores automatically on your next visit
- **Export:** downloads a `floorplan.json` file you can back up or share
- **Import:** re-uploads a previously exported JSON file

## Running Locally

Just open `index.html` in any modern browser. No server needed.

## License

MIT