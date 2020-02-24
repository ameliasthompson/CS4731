// Globals

// Delta time variables:
var lastFrame = 0;
var thisFrame = 0;

// Range for rotation speed:
const speedMin = 0.01;
const speedMax = 0.1;
const speedRange = speedMax - speedMin;

// Range for height:
const heightMin = 1.5;
const heightMax = 3;
const heightRange = heightMax - heightMin;

// Constraints for mobile construction:
const maxDepth = 3; // Maximum depth.
const initialWidth = 2.8; // How much to seperate objects by.
const wdMult = 0.7; // How much to multiply width per layer.

// Camera:
const cameraFov = 60;
const cameraPos = vec3(0, -2, -8);
const cameraAt = vec3(0, -2, 0);
const projMat = flatten(perspective(cameraFov, 1, 0.01, 100));
const viewMat = lookAt(cameraPos, cameraAt, vec3(0.0, 1.0, 0.0));

// Lighting:
const lightPos = vec3(4, 4, -4);
const lightAmb = vec4(0.2, 0.2, 0.2, 1.0);
const lightDiff = vec4(1.0, 1.0, 1.0, 1.0);
const lightSpec = vec4(1.0, 1.0, 1.0, 1.0);

// Render context:
var gl = null;

// Attribute buffers:
var posBuf = null;
var normBuf = null;

// Uniform locations:
var modelView = null;
var color = null;
var diffProd = null;
var specProd = null;
var ambProd = null;

// Root object:
var root = null;

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

	// Add listeners
	document.addEventListener('keypress', keypress);

	// Initialize the mobile.
	initMobile();

	// Start the animation loop.
	render();
}

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
	
	var vNorm = gl.getAttribLocation(program, "vNormal");
	gl.vertexAttribPointer(vNorm, 4, gl.FLOAT, false, 0, 0)
	gl.enableVertexAttribArray(vNorm);

	// Find uniform locations.
	modelView = gl.getUniformLocation(program, "modView");
	color = gl.getUniformLocation(program, "color");
	diffProd = gl.getUniformLocation(program, "diffProd");
	specProd = gl.getUniformLocation(program, "specProd");
	ambProd = gl.getUniformLocation(program, "ambProd");

	// Set the default projection matrix.
	var projMatrix = gl.getUniformLocation(program, "proj");
	gl.uniformMatrix4fv(projMatrix, false, projMat);
}

function triangle(tris, a, b, c) {
	tris.p.push(a);
	tris.p.push(b);
	tris.p.push(c);
	
	tris.n.push(a[0],a[1], a[2], 0.0);
	tris.n.push(b[0],b[1], b[2], 0.0);
	tris.n.push(c[0],c[1], c[2], 0.0);
}

function initCube(obj) {
	var tris = {
		p : [],
		n : []
	};

	// All the points of the cube:
	// a---b bot e---f
	// |   | <-- |   |
	// |   | top |   |
	// c---d --> g---h
	
	const a = vec4(-0.5, -0.5, -0.5, 1.0);
	const b = vec4(0.5, -0.5, -0.5, 1.0);
	const c = vec4(-0.5, -0.5, 0.5, 1.0);
	const d = vec4(0.5, -0.5, 0.5, 1.0);
	const e = vec4(-0.5, 0.5, -0.5, 1.0);
	const f = vec4(0.5, 0.5, -0.5, 1.0);
	const g = vec4(-0.5, 0.5, 0.5, 1.0);
	const h = vec4(0.5, 0.5, 0.5, 1.0);

	triangle(tris, b, c, a); // Bottom face
	triangle(tris, b, d, c);
	triangle(tris, b, a, e); // Back face
	triangle(tris, b, e, f);
	triangle(tris, g, a, c); // Left face
	triangle(tris, g, e, a);
	triangle(tris, g, h, d); // Front face
	triangle(tris, g, d, c);
	triangle(tris, f, b, d); // Right face
	triangle(tris, f, d, h);
	triangle(tris, f, h, g); // Top face
	triangle(tris, f, g, e);

	return tris;
}

function initSphere() {

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

	// Set the mesh as either a cube or a sphere.
	cube ? initCube(obj.tris) : initSphere(obj.tris);

	return obj;
}

function initMobile() {
	root = initObj(true);
	root.left = initObj(true);
	root.right = initObj(true); 

	root.left.left = initObj(true);
	root.left.right = initObj(true);
	root.right.left = initObj(true);
	root.right.right = initObj(true);
}

/**
 * 
 * @param {*} event 
 */
function keypress(event) {
	switch (event.key) {
	case 'm':
		setShaders("smooth-shader", "frag-shader");
		break;
	case 'M':
		setShaders("flat-shader", "frag-shader");
		break;
	default:
		break;
	}
}

/**
 * Recursively render each object using DFS.
 * 
 * @param {object} obj The object to render.
 * @param {matrix} mat The current model matrix for the parent's depth.
 * @param {number} width How far to move the object from its parent.
 * @param {number} dt Delta time.
 * @param {int} depth How deep this object is in the tree.
 */
function renderObj(obj, mat, width, dt, depth) {
	
	// Update rotation
	obj.theta += obj.speed * dt;

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
	for(i = 0; i < obj.tris.p.length; i += 3)
		gl.drawArrays(gl.TRIANGLES, i, 3);
	

	// Render children.
	if (obj.left != null) { renderObj(obj.left, mat, width*wdMult, dt, depth+1); }
	if (obj.right != null) { renderObj(obj.right, mat, -width*wdMult, dt, depth+1); }
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

	// Use DFS to render every object.
	if (root != null) { renderObj(root, null, initialWidth, dt, 0); }

	requestAnimationFrame(render);
}