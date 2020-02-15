// Globals
var tris = [];       // Triangles in the current mesh.
var normals = [];    // Surface normals for each triangle
var points = [];     // Vertices in the current mesh.
var pulse = 0.0;     // How much to translate a triangle out.
var pulseMult = 1.1; // How far to pulse.
var rot = 0.0;       // How much to rotate the mesh by.
var transX = 0.0;    // How much to translate the mesh by.
var transY = 0.0;    // How much to translate the mesh by.
var transZ = 0.0;    // How much to translate the mesh by.
var gl;              // Rendering context.
var program;         // Program

const fov = 60;
const padding = 1.2;

function main() {
	
	// Retrieve elements
	var canvas = document.getElementById('webgl');
	var fin = document.getElementById('input');

	// Get the rendering context for WebGL	
	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	// Initialize shaders
	program = initShaders(gl, "vshader", "fshader");
	gl.useProgram(program);

	// Set up the viewport
	gl.viewport(0, 0, canvas.width, canvas.height);

	// Create and bind the point buffer.
	var pBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
	
	var vPos = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPos, 4, gl.FLOAT, false, 0, 0)
	gl.enableVertexAttribArray(vPos);

	// Set the clear color.
	gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black

	// Set the default projection matrix.
	var projMatrix = gl.getUniformLocation(program, "proj");
	gl.uniformMatrix4fv(projMatrix, false, flatten(perspective(fov, 1, 1, 100)));

	// Set the default model view matrix
	var modelViewMatrix = gl.getUniformLocation(program, "modelview");
	gl.uniformMatrix4fv(modelViewMatrix, false, flatten(
		lookAt(vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0))));

	// Add listeners
	fin.addEventListener('input', load);

	// Start the animation loop.
	render();
}

/**
 * Event listener for file input.
 * 
 * @param {*} event 
 */
function load(event) {
	// Grab the file path if it exists...
	var filePath = event.target.files;
	if (filePath.length != 1) {
		console.log("Incorrect number of files! Please only use one.\n");
		return;
	}

	// ...And then read it.
	var reader = new FileReader();
	reader.onload = read;
	reader.readAsText(filePath[0]);
}

/**
 * Event listener for reader used by file input.
 * 
 * @param {*} event 
 */
function read(event) {
	
	// Clear the tris and vertices
	points = [];
	tris = [];
	normals = [];

	// Reset all the translation stuff.
	pulse = 0.0;
	rot = 0.0;
	trans = 0.0;

	// Get the lines.
	var lines = event.target.result.split(/\r?\n/);

	// Stop reading if the file is empty.
	if (lines.length == 0) {
		console.log("File is empty!\n");
		return;
	}

	// Stop reading if first line isn't "ply".
	if (lines[0] != "ply") {
		console.log("File is not a ply file!\n");
		return;
	}

	var i = 2;  // Maintain an index of the current line.
	var nv = 0; // The number of vertices in the file.
	var np = 0; // The number of polygons in the file.

	// Check the second line for the number of vertices.
	if (lines.length > 1 && lines[i].substring(0, 15) == "element vertex ") {
		// If it's what we're looking for, convert the trailing number and then break.
		nv = Number(lines[i].substring(15));
	
	} else {
		// If it's not, then the file is bad.
		console.log("Number of vertices missing!\n");
		return;
	}

	// Skip lines until the second "element" line.
	for (; i < lines.length; i++) {
		// Check the first 14 characters of the line:
		if (lines[i].substring(0, 13) == "element face ") {
			// If it's what we're looking for, convert the trailing number and then break.
			np = Number(lines[i].substring(13));
			break;
		}
	}

	// If either of those are NaN the file is bad.
	if (nv == NaN || np == NaN) {
		console.log("Could not read number of vertices or number of faces.\n");
		return;
	}

	i += 3; // Skip the "property" line and end of header line.

	// Keep track of maximum and minimum coordinates for later.
	var maxx = 0;
	var maxy = 0;
	var maxz = 0;

	var minx = 0;
	var miny = 0;
	var minz = 0;

	// Read all the vertices:
	while (i < lines.length && nv > 0) {
		// Split the line up into tokens that are *hopefully* each part of the coordinates.
		var v = lines[i].split(/ /);
		
		// >= 3 because there might be some trash at the end of the line like a space or something
		if (v.length >= 3) {
			var x = Number(v[0]);
			var y = Number(v[1]);
			var z = Number(v[2]);

			// Check to make sure these are all valid.
			if (x == NaN || y == NaN || z == NaN) {
				// If any of them are invalid, just push a bunch of zeros.
				console.log("Malformed vertex information.\n");
				points.push(vec4(0.0, 0.0, 0.0, 1.0));
			
			} else {
				// If they're good we push them.
				points.push(vec4(x, y, z, 1.0));

				// We also update the mins and maxes.
				if (x > maxx) { maxx = x; }
				if (y > maxy) { maxy = y; }
				if (z > maxz) { maxz = z; }

				if (x < minx) { minx = x; }
				if (y < miny) { miny = y; }
				if (z < minz) { minz = z; }
			}

		} else {
			// If the vertex was malformed for some reason, we still push *something*
			console.log("Malformed vertex information.\n");
			points.push(vec4(0.0, 0.0, 0.0, 1.0));
		}

		// Move to the next line and vertex:
		i++;
		nv--;
	}

	// Read all the triangles:
	while (i < lines.length && np > 0) {
		// Split the line up into tokens that are *hopefully* each part of the face.
		var p = lines[i].split(/ /);
		
		// Start a new triangle.
		var tmp = [];

		if (p.length >= 4 && p[0] == "3") {
			var a = Number(p[1]);
			var b = Number(p[2]);
			var c = Number(p[3]);

			// Check to make sure these are all valid.
			if (a == NaN || b == NaN || c == NaN) {
				// If any of them are invalid, just push a bunch of zeros.
				console.log("Malformed face information.\n");
				tmp.push(vec4(0.0, 0.0, 0.0, 1.0));
				tmp.push(vec4(0.0, 0.0, 0.0, 1.0));
				tmp.push(vec4(0.0, 0.0, 0.0, 1.0));
			
			} else {
				// If they're good we push them.
				tmp.push(points[a]);
				tmp.push(points[b]);
				tmp.push(points[c]);
			}

		} else {
			// If the face was malformed for some reason, we still push *something*
			console.log("Malformed face information.\n");
			tmp.push(vec4(0.0, 0.0, 0.0, 1.0));
			tmp.push(vec4(0.0, 0.0, 0.0, 1.0));
			tmp.push(vec4(0.0, 0.0, 0.0, 1.0));
		}

		// Push the new tri.
		tris.push(tmp);

		// Move to the next line and face:
		i++;
		np--;
	}
	
	// Hopefully end of file.

	// Generate all the surface normals:
	for (var j = 0; j < tris.length; j++) {
		var a = tris[j][2];
		var b = tris[j][1];
		var c = tris[j][0];

		// 0 - x
		// 1 - y
		// 2 - z
		var mx = (a[1] - b[1])*(a[2] + b[2]) + (b[1] - c[1])*(b[2] + c[2]) + (c[1] - a[1])*(c[2] + a[2]);
		var my = (a[2] - b[2])*(a[0] + b[0]) + (b[2] - c[2])*(b[0] + c[0]) + (c[2] - a[2])*(c[0] + a[0]);
		var mz = (a[0] - b[0])*(a[1] + b[1]) + (b[0] - c[0])*(b[1] + c[1]) + (c[0] - a[0])*(c[1] + a[1]);

		var norm = vec3(mx, my, mz);
		norm = normalize(norm);

		normals.push(norm);
	}

	var canvas = document.getElementById('webgl');

	// Update the perspective, modelview, and viewport.
	var height = maxy - miny;
	var width = maxx - minx;
	var depth = maxz - minz;

	/*
	// Find the distance that's good enough.
	var distance = -(Math.max(height, width, depth)*1.5);
	*/

	// Update the perspective, modelview, and viewport.

	// Find the distance the camera needs to be to perfectly frame the largest dimension.
	var distance = Math.max(height, width, depth) / 2 / Math.tan((fov/2)*(Math.PI/180));
	distance -= Math.min(minx, miny, minz); // Offset to compensate for center of model.

	pulseMult = Math.max(height, width, depth)*0.1;

	// Set the eye to be distance away plus a little padding.
	var eye = vec3((minx + maxx)/2, (miny + maxy)/2, -(distance + pulseMult*2) * padding);

	// Find the center of the model
	var center = vec3((minx + maxx)/2, (miny + maxy)/2, (minz + maxz)/2); // Wrong

	var viewMatrix = gl.getUniformLocation(program, "view");
	gl.uniformMatrix4fv(viewMatrix, false, flatten(lookAt(eye, center, vec3(0.0, 1.0, 0.0))));

	var projMatrix = gl.getUniformLocation(program, "proj");
	gl.uniformMatrix4fv(projMatrix, false, flatten(perspective(60, 1, 1, (distance + pulseMult*2)*padding + depth + pulseMult*2)));
	gl.viewport(0, 0, canvas.width, canvas.height);

}

/**
 * 
 * @param {*} event 
 */
function keypress(event) {

}

/**
 * Render loop.
 */
function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);

	// Get some uniforms.
	var pulseMatrix = gl.getUniformLocation(program, "pulse");
	var modelMatrix = gl.getUniformLocation(program, "model");

	// Set the model matrix
	rtMat = mult(translate(transX, transY, transZ), rotateX(rot));
	gl.uniformMatrix4fv(modelMatrix, false, flatten(rtMat));


	// Make one draw call per object.
	for(i = 0; i < tris.length; i++) {
		
		// Calculate pulse translation.
		var norm = normals[i];
		var pdist = (Math.sin(pulse - Math.PI/2) + 1) * pulseMult;

		var pMat = translate(norm[0]*pdist, norm[1]*pdist, norm[2]*pdist);
		gl.uniformMatrix4fv(pulseMatrix, false, flatten(pMat));
		
		// Draw the triangle.
		gl.bufferData(gl.ARRAY_BUFFER, flatten(tris[i]), gl.STATIC_DRAW);
		gl.drawArrays(gl.LINE_LOOP, 0, 3);
	}

	// Update values
	pulse += 0.01;

	requestAnimationFrame(render);
}