// Additional features
//   -Press x to toggle between wireframe and solid
//   -Press n to view smooth shaded normals
//   -Press N to view flat shaded normals
//   -Press z to view with no shading

// Globals

// Delta time variables:
var lastFrame = 0;
var thisFrame = 0;

// Range for rotation speed:
const speedMin = 0.01;
const speedMax = 0.1;
const speedRange = speedMax - speedMin;
const sdMult = 2;

// Range for height:
const heightMin = 2.5;
const heightMax = 4.0;
const heightRange = heightMax - heightMin;
const midpoint = 1.3; // The preset midpoint for the horizontal skeleton lines

// Constraints for mobile construction:
const maxDepth = 3; // Maximum depth.
const initialWidth = 3.8; // How much to seperate objects by.
const wdMult = 0.6; // How much to multiply width per layer.

// Spheres:
const va = vec4(0.0, 0.0, -1.0, 1);
const vb = vec4(0.0, 0.942809, 0.333333, 1);
const vc = vec4(-0.816497, -0.471405, 0.333333, 1);
const vd = vec4(0.816497, -0.471405, 0.333333, 1);
const subdivisions = 5;
const sphereScale = 0.9;

// Camera:
const cameraFov = 60;
const cameraPos = vec3(0.0, -2.0, -9.0);
const cameraAt = vec3(0.0, -3.0, 0.0);
const projMat = flatten(perspective(cameraFov, 1, 0.01, 100));
const viewMat = lookAt(cameraPos, cameraAt, vec3(0.0, 1.0, 0.0));

// Lighting:
const lightPos = vec3(3.0, 4.0, 8.0);
const lightAmb = vec4(0.1, 0.1, 0.1, 1.0);
const lightDiff = vec4(1.0, 1.0, 1.0, 1.0);
const lightSpec = vec4(1.0, 1.0, 1.0, 1.0);
const lightFocus = vec3(0.0, 2.0, -4.0);
const lightDir = normalize(subtract(lightFocus, lightPos));

// Render context:
var gl = null;

// Attribute buffers:
var posBuf = null;
var normBuf = null;

// Uniform locations:
var modelView = null;
var faceNorm = null;
var diffProd = null;
var specProd = null;
var ambProd = null;
var lightDeg = null;

// The mobile:
var root = null;

// State:
var wireframe = false;
var lDeg = 0.95;

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

	// Set up the default shaders.
	setShaders("smooth-shader", "frag-shader");

	// Set up the viewport
	gl.viewport(0, 0, canvas.width, canvas.height);

	// Set the gl stuff.
	gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);

	// Add listeners
	document.addEventListener('keypress', keypress);

	// Initialize the mobile.
	initMobile();

	// Start the animation loop.
	render();
}

/**
 * Change to a different set of shaders and update all global uniform locations
 * while resetting static uniforms such as the projection matrix.
 * 
 * @param {string} vshader The vertex shader to use.
 * @param {string} fshader The fragment shader to use.
 */
function setShaders(vshader, fshader) {
	// Initialize shaders
	program = initShaders(gl, vshader, fshader);
	gl.useProgram(program);

	// Set up buffers and attributes
	posBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
	
	var vPos = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPos, 4, gl.FLOAT, false, 0, 0)
	gl.enableVertexAttribArray(vPos);

	normBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
	
	// Not doing this check makes WebGL throw warnings when using flat-shader
	var vNorm = gl.getAttribLocation(program, "vNormal");
	if (vNorm != -1) {
		gl.vertexAttribPointer(vNorm, 4, gl.FLOAT, false, 0, 0)
		gl.enableVertexAttribArray(vNorm);
	}

	// Find uniform locations.
	modelView = gl.getUniformLocation(program, "modView");
	faceNorm = gl.getUniformLocation(program, "faceNorm");
	diffProd = gl.getUniformLocation(program, "diffProd");
	specProd = gl.getUniformLocation(program, "specProd");
	ambProd = gl.getUniformLocation(program, "ambProd");
	lightDeg = gl.getUniformLocation(program, "lightDeg");

	// Set the default projection matrix.
	var projMatrix = gl.getUniformLocation(program, "proj");
	gl.uniformMatrix4fv(projMatrix, false, projMat);

	// Set light direction and position.
	var lPos = gl.getUniformLocation(program, "lightPos");
	gl.uniform3fv(lPos, lightPos);
	var lDir = gl.getUniformLocation(program, "lightDir");
	gl.uniform3fv(lDir, lightDir);
}

/**
 * Create a triangle and push both vertex and face normals to the given set
 * of arrays.
 * 
 * The first half was given in class, and the second half was
 * ported from Project 2. The only major changes were making the arrays to
 * push to a argument rather than a global.
 * 
 * @param {object} tris The array of triangles to push to.
 * @param {number} a Point a.
 * @param {number} b Point b.
 * @param {number} c Point c.
 */
function triangle(tris, a, b, c) {

	//  Vertices
	tris.p.push(a);
	tris.p.push(b);
	tris.p.push(c);
	
	// Vertex normals
	tris.n.push(vec4(a[0], a[1], a[2], 0.0));
	tris.n.push(vec4(b[0], b[1], b[2], 0.0));
	tris.n.push(vec4(c[0], c[1], c[2], 0.0));

	// Face normals

	// 0 - x
	// 1 - y
	// 2 - z
	var mx = (a[1] - b[1])*(a[2] + b[2]) + (b[1] - c[1])*(b[2] + c[2]) + (c[1] - a[1])*(c[2] + a[2]);
	var my = (a[2] - b[2])*(a[0] + b[0]) + (b[2] - c[2])*(b[0] + c[0]) + (c[2] - a[2])*(c[0] + a[0]);
	var mz = (a[0] - b[0])*(a[1] + b[1]) + (b[0] - c[0])*(b[1] + c[1]) + (c[0] - a[0])*(c[1] + a[1]);

	var norm = vec4(mx, my, mz, 0.0);
	norm = normalize(norm);

	tris.f.push(norm); // The face normal is the same for each vertex
	tris.f.push(norm);
	tris.f.push(norm);
}

/**
 * Used to subdivide triangles for the creation of spheres.
 * 
 * Given in class. The only change was replacing the global arrays with an
 * argument.
 * 
 * @param {object} tris The array of triangles to push to.
 * @param {number} a Point a.
 * @param {number} b Point b.
 * @param {number} c Point c.
 * @param {int} count The remaining subdivisions.
 */
function divideTriangle(tris, a, b, c, count) {
    if ( count > 0 ) {

        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        divideTriangle(tris, a, ab, ac, count - 1 );
        divideTriangle(tris, ab, b, bc, count - 1 );
        divideTriangle(tris, bc, c, ac, count - 1 );
        divideTriangle(tris, ab, bc, ac, count - 1 );
    } else {
        triangle(tris, c, b, a);
    }
}

/**
 * Create and subdivide a tetrahedron.
 * 
 * Given in class. The only change was replacing the global arrays with an
 * argument.
 * 
 * @param {object} tris The array of triangles to push to.
 * @param {number} a 
 * @param {number} b 
 * @param {number} c 
 * @param {number} d 
 * @param {int} n 
 */
function tetrahedron(tris, a, b, c, d, n) {
    divideTriangle(tris, a, b, c, n);
    divideTriangle(tris, d, c, b, n);
    divideTriangle(tris, a, d, b, n);
    divideTriangle(tris, a, c, d, n);
}

/**
 * Initialize the tris object as a sphere.
 * 
 * @returns tris object.
 */
function initSphere() {
	var tris = {
		p : [], // Vertices
		n : [], // Vertex normals
		f : []  // Face normals
	};
	
	tetrahedron(tris, va, vb, vc, vd, subdivisions);

	return tris;
}

/**
 * Create a quad made of two triangles.
 * 
 * Given in class. The only changes were replacing the global arrays with an
 * argument, and changing it to use the triangles function.
 * 
 * @param {object} tris The array of triangles to push to.
 * @param {number} a Point a.
 * @param {number} b Point b.
 * @param {number} c Point c.
 * @param {number} d Point d.
 */
function quad(tris, a, b, c, d) {
    var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5, -0.5, -0.5, 1.0 )
	];
	
	var indices = [a, b, c, a, c, d];

    // We need to parition the quad into two triangles in order for
    // WebGL to be able to render it.  In this case, we create two
    // triangles from the quad indices

	triangle(tris, vertices[indices[0]], vertices[indices[1]], vertices[indices[2]]);
	triangle(tris, vertices[indices[3]], vertices[indices[4]], vertices[indices[5]]);
}

/**
 * 
 * @param {*} tris 
 */
function makeCube(tris) {

	points = [];
	colors = [];
	
	quad(tris, 1, 0, 3, 2 );
	quad(tris, 2, 3, 7, 6 );
	quad(tris, 3, 0, 4, 7 );
	quad(tris, 6, 5, 1, 2 );
	quad(tris, 4, 5, 6, 7 );
	quad(tris, 5, 4, 0, 1 );
}

/**
 * Initialize the tris object as a cube.
 * 
 * @returns tris object.
 */
function initCube() {
	var tris = {
		p : [],
		n : [],
		f : []
	};

	makeCube(tris);

	return tris;
}

/**
 * Initialize a cube or sphere object.
 * 
 * @param {boolean} cube Whether to initialize a cube or a sphere.
 * @returns {object}
 */
function initObj(cube) {
	var obj = {
		tris : cube ? initCube() : initSphere(),
		theta : Math.random() * 2*Math.PI, // Start with a random rotation.
		speed : Math.random()*speedRange + speedMin, // Set a random rotation speed.
		color : vec4(Math.random(), Math.random(), Math.random(), 1), // Set a random color.
		y : -(Math.random()*heightRange + heightMin),
		left : null, // Set left and right child to null.
		right : null
	}

	return obj;
}

/**
 * Initialize the mobile structure.
 */
function initMobile() {
	// Initialize all the cubes and spheres.
	root = initObj(true);
	
	// Second layer.
	root.left = initObj(false);
	root.right = initObj(true); 

	// Third layer.
	root.left.left = initObj(true);
	root.left.right = initObj(false);
	root.right.left = initObj(false);
	root.right.right = initObj(true);
}

/**
 * Keypress listener.
 * 
 * @param {object} event The keypress event.
 */
function keypress(event) {
	switch (event.key) {
	case 'm':
		setShaders("smooth-shader", "frag-shader");
		break;
	case 'M':
		setShaders("flat-shader", "frag-shader");
		break;
	case 'p':
		lDeg -= 0.005;
		break;
	case 'P':
		lDeg += 0.005;
		break;
	case 'n':
		setShaders("smooth-normal-shader", "frag-shader");
		break;
	case 'N':
		setShaders("flat-normal-shader", "frag-shader");
		break;
	case 'x':
		wireframe = !wireframe;
		break;
	case 'z':
		setShaders("shadeless-shader", "frag-shader");
		break;
	default:
		break;
	}
}

/**
 * Update the rotation of each object in the mobile using a recursive DFS.
 * 
 * @param {object} obj The object.
 * @param {number} dt Delta time.
 * @param {int} depth The current depth.
 * @param {number} mult The current speed multiplier.
 */
function update(obj, dt, depth, mult) {
	
	// Update rotation
	if (depth % 2 == 1) {
		obj.theta += obj.speed * dt * mult;
	} else {
		obj.theta -= obj.speed * dt * mult;
	}

	// Move on to children
	if (obj.left != null) { update(obj.left, dt, depth+1, mult*sdMult); }
	if (obj.right != null) { update(obj.right, dt, depth+1, mult*sdMult); }
}

/**
 * Recursively render the lines between objects using DFS.
 * 
 * @param {object} obj The object to render.
 * @param {matrix} mat The current model matrix for the parent's depth.
 * @param {number} width How far the object is from its parent.
 * @param {int} depth How deep this object is in the tree.
 */
function renderSkele(obj, mat, width, depth) {
	
	// Update the model matrix.
	const trans = translate(width, obj.y, 0);
	const rot = rotateY(obj.theta);

	if (depth > 0) {
		mat = mult(mat, trans);

		// Construct the skeleton segment.
		// This has to be done here due to the width multiplier.
		var skele = [
			vec4(0.0, 0.0, 0.0, 1.0),                  // Center of the object.
			vec4(0.0, -obj.y - midpoint, 0.0, 1.0),    // Directly above
			vec4(-width, -obj.y - midpoint, 0.0, 1.0), // Directly below the parent
			vec4(-width, -obj.y, 0.0, 1.0)             // Center of the parent
		];

		// Set uniforms.
		gl.uniformMatrix4fv(modelView, false, flatten(mult(viewMat, mat)));
		gl.uniform4fv(diffProd, flatten(vec4(1.0, 1.0, 1.0, 1.0)));
		gl.uniform4fv(specProd, flatten(vec4(1.0, 1.0, 1.0, 1.0)));
		gl.uniform4fv(ambProd, flatten(vec4(1.0, 1.0, 1.0, 1.0)));

		// Buffer data.
		gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(skele), gl.STATIC_DRAW);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, normBuf); // We need to buffer something so it won't yell at us
		gl.bufferData(gl.ARRAY_BUFFER, flatten(skele), gl.STATIC_DRAW);
		
		// Draw skeleton
		gl.drawArrays(gl.LINE_STRIP, 0, 4);

		// Rotate for the children
		mat = mult(mat, rot);

	} else {
		// Don't draw a skeleton segment for the root object!
		// Rotate for the children
		mat = rot;
	}

	// Render children.
	if (obj.left != null) { renderSkele(obj.left, mat, width*wdMult, depth+1); }
	if (obj.right != null) { renderSkele(obj.right, mat, -width*wdMult, depth+1); }
}

/**
 * Recursively render each object using DFS.
 * 
 * @param {object} obj The object to render.
 * @param {matrix} mat The current model matrix for the parent's depth.
 * @param {number} width How far to move the object from its parent.
 * @param {int} depth How deep this object is in the tree.
 */
function renderObj(obj, mat, width, depth) {

	// Update the model matrix.
	const trans = translate(width, obj.y, 0);
	const rot = rotateY(obj.theta);

	if (depth > 0) {
		mat = mult(mat, trans);
		mat = mult(mat, rot);
	} else {
		// We only need to rotate for the first object.
		mat = rot;
	}

	// Set uniforms.
	gl.uniformMatrix4fv(modelView, false, flatten(mult(viewMat, mat)));
	gl.uniform4fv(diffProd, flatten(mult(lightDiff, obj.color)));
	gl.uniform4fv(specProd, flatten(mult(lightSpec, obj.color)));
	gl.uniform4fv(ambProd, flatten(mult(lightAmb, obj.color)));

	// Buffer data.
	gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.tris.p), gl.STATIC_DRAW);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(obj.tris.n), gl.STATIC_DRAW);
	

	// Draw triangles
	for(i = 0; i < obj.tris.p.length; i += 3) {
		gl.uniform4fv(faceNorm, flatten(obj.tris.f[i]));
		gl.drawArrays(wireframe ? gl.LINE_LOOP : gl.TRIANGLES, i, 3);
	}
	

	// Render children.
	if (obj.left != null) { renderObj(obj.left, mat, width*wdMult, depth+1); }
	if (obj.right != null) { renderObj(obj.right, mat, -width*wdMult, depth+1); }
}

/**
 * Render loop.
 */
function render() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Get deltatime
	lastFrame = thisFrame;
	thisFrame = Date.now();
	var dt = thisFrame - lastFrame;

	// Update light degree
	gl.uniform1f(lightDeg, lDeg);

	// Use DFS to update and render render every object.
	if (root != null) {
		update(root, dt, 0, 1);
		renderSkele(root, null, initialWidth, 0);
		renderObj(root, null, initialWidth, 0);
	}

	requestAnimationFrame(render);
}