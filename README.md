# 2d-floor-mapper

Skeleton implementation providing:
- Room and Door models (src/models.js)
- Small library functions (src/index.js)
- CLI entrypoint (bin/cli.js)
- Static web UI scaffold (docs/ for GitHub Pages)

Usage:
- Initialize a floorplan: node bin/cli.js init
- Create a room: node bin/cli.js create-room "Living Room" 20 15
- Add a door: node bin/cli.js add-door <roomId|name> N 5 3 <connectsToRoomId>
- Render ASCII: node bin/cli.js render-ascii

Open docs/index.html in a browser or publish docs/ to GitHub Pages.
