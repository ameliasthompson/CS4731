const state = {
	DRAW : 1,
	FILE : 2,
	LOADING: 3 // A file is being loaded right now.
}

const colState = {
	BLACK : 1,
	RED : 2,
	GREEN : 3,
	BLUE : 4
}

const lineState = {
	EXTENTS : 1,   // Looking for extents.
	POLYLINES : 2, // Looking for total number of polylines.
	POINTS : 3,    // Looking for number of points in polyline.
	COORDS : 4,    // Looking for coorderinates of each point.
	BAD : 5,	   // Something has gone wrong, and the read needs to be abborted.
	FINISHED : 6   // Self explanitory.
}

function main() {
	// Retrieve <canvas> element
	var canvas = document.getElementById('webgl');

	// Get the rendering context for WebGL
	var gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// Initialize shaders
	program = initShaders(gl, "vshader", "fshader");
	gl.useProgram(program);

	// Set up the viewport
	gl.viewport( 0, 0, canvas.width, canvas.height );

	// Set up polyline point storage.
	var objects = [];			// An array of arrays of vec4s (arrays)
	var curObj = 0; 			// The current object to add to in draw mode.
	objects.push([]);  			// The first object. (Because we default to draw mode.)

	// Set default state.
	var curState = state.DRAW;

	// Create and bind the point buffer.
	var pBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
	
	var vPos = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPos, 4, gl.FLOAT, false, 0, 0)
	gl.enableVertexAttribArray(vPos);

	// Set the default draw color and screen clear color.
	var drawColor = gl.getUniformLocation(program, "vColor");
	var curColor = colState.BLACK;
	gl.uniform4f(drawColor, 0.0, 0.0, 0.0, 1.0);
	gl.clearColor(1.0, 1.0, 1.0, 1.0);

	// Set the default projection matrix.
	var projMatrix = gl.getUniformLocation(program, "proj");
	gl.uniformMatrix4fv(projMatrix, false, flatten(ortho(-1, 1, -1, 1, -1, 1)));

	// Set up keypress listener.
	// Lambda expressions are used to maintain access to variables in the
	// scope of main without using globals. To be fair though, at this scale
	// they might as well be global. I'm just new to JavaScript and lambdas
	// looked cool.
	document.addEventListener('keypress', (event) => {
		switch (event.key) {
		case 'c': // Swap color.
			// Select the next color.
			curColor++;
			if (curColor > colState.BLUE) { curColor = colState.BLACK; }
			
			// And then set it as the draw color.
			switch (curColor) {
			case colState.BLACK:
				gl.uniform4f(drawColor, 0.0, 0.0, 0.0, 1.0);
				break;

			case colState.RED:
				gl.uniform4f(drawColor, 1.0, 0.0, 0.0, 1.0);
				break;

			case colState.GREEN:
				gl.uniform4f(drawColor, 0.0, 1.0, 0.0, 1.0);
				break;

			case colState.BLUE:
				gl.uniform4f(drawColor, 0.0, 0.0, 1.0, 1.0);
				break;
			}

			render(gl, objects); // Draw all the shapes again.
			break; // case 'c'
		
		case 'd': // Enter draw mode.
			if (curState == state.FILE) {
				// If we're transitioning from FILE, clear the objects.
				objects = [];
				objects.push([]);
				curObj = 0;

				gl.viewport(0, 0, canvas.width, canvas.height); // Reset the aspect ratio
				gl.uniformMatrix4fv(projMatrix, false, flatten(ortho(-1, 1, -1, 1, -1, 1))); // Reset the projection.

				// We only need to render again while moving out of file mode.
				// When moving from draw to draw, no changes are made to the scene until after the user has
				// clicked at least twice. When moving from file to draw, the contents of the file need to
				// be cleared from the screen, however.
				render(gl, objects);
				
				curState = state.DRAW;
			
			} else if (curState == state.DRAW) {
				// If we're already in draw, set up a new object.
				objects.push([]);
				curObj++;
			}

			break;

		case 'f': // Enter file mode.
			// Stop if there isn't actually a file to proccess (or if there are too many).
			if (document.getElementById('input').files.length != 1) {
				print('Improper number of files.\n');
				break;
			}
		
			// Otherwise transition to file mode:
			curState = state.FILE;		
			objects = []; // Clear any objects from either draw mode or previous file.
			curObj = -1; // This just makes the loop a bit further down work out better.

			// Load the file.
			var file = document.getElementById('input').files[0];
			var reader = new FileReader();

			// Make the reader do the thing:
			reader.onload = (event) => {
				var lines = event.target.result.split(/\r?\n/);
				// First find the * line or fail to find it.
				var start = 0; // The start index.
				for (var i = 0; i < lines.length; i++) {
					if (lines[i].charAt(0) == '*') {
						start = i + 1;
						break;
					};
				}

				// Return if the * line was the last line.
				// This way we don't go out of bounds.
				if (start == lines.length) { return; }

				// Now start processing in earnest.
				var readState = lineState.EXTENTS;
				var polylines = 0;
				var points = 0;
				for (var i = start; i < lines.length && readState != lineState.BAD && readState != lineState.FINISHED; i++) {
					
					// Just skip the line if it's empty like in scene.dat
					if (lines[i] == "") { continue; }
					
					switch (readState) {
					case lineState.EXTENTS: // Grab the extents.
						var extents = lines[i].split(/ +/);

						// Check for the appropriate number of lines, and then process.
						if (extents.length != 4) {
							readState = lineState.BAD;
							break;
						}
						const left = Number(extents[0]);
						const top = Number(extents[1]);
						const right = Number(extents[2]);
						const bot = Number(extents[3]);

						// Break if any of these didn't read right for some reason.
						if (left == NaN || top == NaN || right == NaN || bot == NaN) { 
							readState = lineState.BAD;
							break;
						}

						var width = right - left;
						var height = top - bot;

						// Find the correct aspect ratio and set the viewport:
						// (This works under the assumption that the canvas is the standard 400 x 400)
						if (height > width) {
							width = canvas.width * width / height;
							height = canvas.height;

						} else if (width > height) {
							height = canvas.height * height / width;
							width = canvas.width;

						} else if (width == height) {
							// It's already a square so we're good.
							width = canvas.width;
							height = canvas.height;
						}

						gl.viewport(0, 0, width, height);

						// Set the projection:
						gl.uniformMatrix4fv(projMatrix, false, flatten(ortho(left, right, bot, top, -1, 1)));

						// Move on to the next step.
						readState = lineState.POLYLINES;
						break;

					case lineState.POLYLINES:
						polylines = Number(lines[i]);
						// Break if this didn't read for some reason
						if (polylines == NaN) {
							readState = lineState.BAD;
							break;
						}

						// Move to the next step.
						readState = lineState.POINTS;
						break;

					case lineState.POINTS:
						// Finish up if there aren't actually any lines left.
						if (polylines == 0) {
							readState = lineState.FINISHED;
							break;
						}

						polylines--; // Start the new polyline.						
						objects.push([]);
						curObj++;
						points = Number(lines[i]);
						// Skip the line if this didn't read for some reason
						if (points == NaN) { break;	}

						// Move to the next step.
						readState = lineState.COORDS;
						break;

					case lineState.COORDS:
						// Make a new point.
						points--;
						
						var coords = lines[i].split(/ +/);

						// Clean up the "" that comes from leading whitespace if there is any.
						if (coords.length > 0 && coords[0] == "") { coords.shift();	}

						// Check for the appropriate number of lines, and then process.
						// If there isn't, we just skip this line.
						if (coords.length != 2) { break; }

						const xCoord = Number(coords[0]);
						const yCoord = Number(coords[1]);

						// If either of those didn't read for some reason, skip the line.
						if (xCoord == NaN || yCoord == NaN) { break; }

						// Otherwise push the new line.
						objects[curObj].push(vec4(xCoord, yCoord, 0.0, 1.0));

						// Move to the next line if there aren't any points left.
						if (points == 0) {
							readState = lineState.POINTS;
						}

						break;

					default:
						break;
					} // line state switch
				} // for each line

				// Draw the thing to the screen.
				// We have to do this here because it turns out JS will just run this event handler
				// in the background, and it only took me like 20 minutes to figure that out.
				render(gl, objects);

				curState = state.FILE; // Finally we're done and can do other things.

			}; // reader.onload()

			// Finally we need to actually run that monstrocity above.
			curState = state.LOADING; // Change state to loading so that nothing interrupts this.
			reader.readAsText(file);

			break;
		} // input key switch
	});

	// Set up mouse click listener.
	document.addEventListener('click', (event) => {
		if (curState == state.DRAW) {
			// If there are 100 or more points in the current object we need to
			// start a new one.
			if (objects[curObj].length >= 100) {
				objects.push([]);
				curObj++;
			}
			
			// These formulas for mouse position were taken from a Stack Overflow
			// question. Essentially they first remove whatever offset may be
			// caused by the location of the canvas from the pixel coordinate of the mouse.
			// They then convert it to a float with the width/height of the canvas,
			// and move the origin from the upper left corner to the center.
			// https://stackoverflow.com/questions/14488971/webgl-three-js-get-mouse-position-on-mesh
			var bounds = canvas.getBoundingClientRect()
			var x = ((event.clientX - bounds.x) / canvas.clientWidth) * 2 - 1;
			var y = -((event.clientY - bounds.y) / canvas.clientHeight) * 2 + 1;

			objects[curObj].push(vec4(x, y));

			render(gl, objects);
		}
	});

	// Initial clear.
	gl.clear(gl.COLOR_BUFFER_BIT);

	// Everything after this (including rendering the scene after changes) is
	// handled by the event listeners.
}

function render(gl, objects) {
	gl.clear(gl.COLOR_BUFFER_BIT);

	// Make one draw call per object.
	for(i = 0; i < objects.length; i++) {
		gl.bufferData(gl.ARRAY_BUFFER, flatten(objects[i]), gl.STATIC_DRAW);
		gl.drawArrays(gl.LINE_STRIP, 0, objects[i].length);
	}
}