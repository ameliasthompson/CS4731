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
const cameraPos = vec3(4.0, -1.0, -12.0);
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
var tcoordBuf = null;

// Vertex shader uniform locations:
var modelView = null;
var faceNorm = null;
var diffProd = null;
var specProd = null;
var ambProd = null;
var lightDeg = null;
var lightOn = null;

// Fragment shader uniform locations:
var useTexture = null;

// The mobile:
var root = null;

// State:
var wireframe = false;
var shadows = false;
var texturing = true;
var reflection = false;
var refraction = false;
var lDeg = 0.95;

// Textures:
var debug = null;
var grass = null;
var stones = null;
var nvnegx = null;
var nvnegy = null;
var nvnegz = null;
var nvposx = null;
var nvposy = null;
var nvposz = null;

// Walls/floor:
const negx = -8.0;
const negy = -9.0;
const negz = -8.0;
const posx = 8.0;
const posy = 4.0;
const posz = 8.0;
const sceneModelMat = translate(0, 0, 0);
const wallTexScale = 0.15;
const wallMesh = {
	p : [
		vec4(negx, negy, negz), // Right wall lower tri
		vec4(negx, posy, negz),
		vec4(negx, negy, posz),
		vec4(negx, posy, negz), // Right wall upper tri
		vec4(negx, posy, posz),
		vec4(negx, negy, posz),
		vec4(negx, negy, posz), // Left wall lower tri
		vec4(negx, posy, posz),
		vec4(posx, negy, posz),
		vec4(negx, posy, posz), // Left wall upper tri
		vec4(posx, posy, posz),
		vec4(posx, negy, posz)
	],
	n : [
		vec4(1, 0, 0), // Right wall
		vec4(1, 0, 0),
		vec4(1, 0, 0),
		vec4(1, 0, 0),
		vec4(1, 0, 0),
		vec4(1, 0, 0),
		vec4(1, 0, 0),
		vec4(0, 0, 1), // Left wall
		vec4(0, 0, 1),
		vec4(0, 0, 1),
		vec4(0, 0, 1),
		vec4(0, 0, 1),
		vec4(0, 0, 1)
	],
	f : [
		vec4(1, 0, 0), // Right wall
		vec4(1, 0, 0),
		vec4(1, 0, 0),
		vec4(1, 0, 0),
		vec4(1, 0, 0),
		vec4(1, 0, 0),
		vec4(1, 0, 0),
		vec4(0, 0, 1), // Left wall
		vec4(0, 0, 1),
		vec4(0, 0, 1),
		vec4(0, 0, 1),
		vec4(0, 0, 1),
		vec4(0, 0, 1)
	],
	t : [
		vec2(negy*wallTexScale, negz*wallTexScale), // Right wall lower tri
		vec2(negy*wallTexScale, posz*wallTexScale),
		vec2(posy*wallTexScale, negz*wallTexScale),
		vec2(negy*wallTexScale, posz*wallTexScale), // Right wall upper tri
		vec2(posy*wallTexScale, posz*wallTexScale),
		vec2(posy*wallTexScale, negz*wallTexScale),
		vec2(negx*wallTexScale, negy*wallTexScale), // Left wall lower tri
		vec2(negx*wallTexScale, posy*wallTexScale),
		vec2(posx*wallTexScale, negy*wallTexScale),
		vec2(negx*wallTexScale, posy*wallTexScale), // Left wall upper tri
		vec2(posx*wallTexScale, posy*wallTexScale),
		vec2(posx*wallTexScale, negy*wallTexScale),
	]
}
const floorTexScale = 0.2;
const floorMesh = {
	p : [
		vec4(posx, negy, negz), // Right tri
		vec4(negx, negy, negz),
		vec4(negx, negy, posz),
		vec4(posx, negy, negz), // Left tri
		vec4(negx, negy, posz),
		vec4(posx, negy, posz)
	],
	n : [
		vec4(0, 1, 0),
		vec4(0, 1, 0),
		vec4(0, 1, 0),
		vec4(0, 1, 0),
		vec4(0, 1, 0),
		vec4(0, 1, 0)
	],
	f : [
		vec4(0, 1, 0),
		vec4(0, 1, 0),
		vec4(0, 1, 0),
		vec4(0, 1, 0),
		vec4(0, 1, 0),
		vec4(0, 1, 0)
	],
	t : [
		vec2(posx*floorTexScale, negz*floorTexScale), // Left tri
		vec2(negx*floorTexScale, negz*floorTexScale),
		vec2(negx*floorTexScale, posz*floorTexScale),
		vec2(posx*floorTexScale, negz*floorTexScale), // Right tri
		vec2(negx*floorTexScale, posz*floorTexScale),
		vec2(posx*floorTexScale, posz*floorTexScale),
	]
}


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

	// Load images and make them textures
	loadAllImages();

	// Add listeners
	document.addEventListener('keypress', keypress);

	// Initialize the mobile.
	initMobile();

	// Start the animation loop.
	render()
}

/**
 * Load all the images required as textures.
 */
function loadAllImages() {
	
	// Set all textures to placeholders.
	debug = createTexture(null);
	grass = createTexture(null);
	stones = createTexture(null);
	nvnegx = createTexture(null);
	nvnegy = createTexture(null);
	nvnegz = createTexture(null);
	nvposx = createTexture(null);
	nvposy = createTexture(null);
	nvposz = createTexture(null);

	// Load all images, and replace the placeholders when loaded.
	var grassimg = new Image();
	grassimg.crossOrigin = "";
	grassimg.src = "http://web.cs.wpi.edu/~jmcuneo/grass.bmp";
	grassimg.onload = function() { grass = createTexture(grassimg); }

	var stonesimg = new Image();
	stonesimg.crossOrigin = "";
	stonesimg.src = "http://web.cs.wpi.edu/~jmcuneo/stones.bmp";
	stonesimg.onload = function() { stones = createTexture(stonesimg); }

	var nvnegximg = new Image();
	nvnegximg.crossOrigin = "";
	nvnegximg.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegx.bmp";
	nvnegximg.onload = function() { nvnegx = createTexture(nvnegximg); }

	var nvnegyimg = new Image();
	nvnegyimg.crossOrigin = "";
	nvnegyimg.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegy.bmp";
	nvnegyimg.onload = function() { nvnegy = createTexture(nvnegyimg); }

	var nvnegzimg = new Image();
	nvnegzimg.crossOrigin = "";
	nvnegzimg.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegz.bmp";
	nvnegzimg.onload = function() { nvnegz = createTexture(nvnegzimg); }

	var nvposximg = new Image();
	nvposximg.crossOrigin = "";
	nvposximg.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposx.bmp";
	nvposximg.onload = function() { nvposx = createTexture(nvposximg); }

	var nvposyimg = new Image();
	nvposyimg.crossOrigin = "";
	nvposyimg.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposy.bmp";
	nvposyimg.onload = function() { nvposy = createTexture(nvposyimg); }

	var nvposzimg = new Image();
	nvposzimg.crossOrigin = "";
	nvposzimg.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposz.bmp";
	nvposzimg.onload = function() { nvposz = createTexture(nvposzimg); }
}

/**
 * Create a texture from an image. If null is provided as an argument, the default
 * texture will be created instead.
 * 
 * @param {Image} img The image to create a texture from. 
 * @return {glTexture} The texture
 */
function createTexture(img) {
	var tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

	// If an image is provided, use it as a texture.
	if (img != null) {
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
	
	// If an image is not provided, create a texture.
	} else {
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE,
			new Uint8Array([0, 0, 255, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255])
		);
	}

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	return tex;
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

	// Vertex position buffer
	posBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
	
	var vPos = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPos, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPos);

	// Vertex normal buffer
	normBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
	
	// Not doing this check makes WebGL throw warnings when using flat-shader
	var vNorm = gl.getAttribLocation(program, "vNormal");
	if (vNorm != -1) {
		gl.vertexAttribPointer(vNorm, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vNorm);
	}

	// Texture coordinates buffer
	tcoordBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, tcoordBuf);
	
	var vTcoord = gl.getAttribLocation(program, "vTcoord");
	gl.vertexAttribPointer(vTcoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vTcoord);

	// Find vertex shader uniform locations.
	modelView = gl.getUniformLocation(program, "modView");
	faceNorm = gl.getUniformLocation(program, "faceNorm");
	diffProd = gl.getUniformLocation(program, "diffProd");
	specProd = gl.getUniformLocation(program, "specProd");
	ambProd = gl.getUniformLocation(program, "ambProd");
	lightDeg = gl.getUniformLocation(program, "lightDeg");
	lightOn = gl.getUniformLocation(program, "lightOn");

	// Find fragment shader uniform locations.
	useTexture = gl.getUniformLocation(program, "useTexture");

	// Set default texture level.
	var activeTexture = gl.getUniformLocation(program, "texture");
	gl.uniform1i(activeTexture, 0);

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

	// Texture coordinates
	tris.t.push(vec2(0, 0));
	tris.t.push(vec2(1, 1));
	tris.t.push(vec2(0, 1));
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
		f : [], // Face normals
		t : []  // Texture coordinates
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
		f : [],
		t : []
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
	case 'B':
	case 'b':
		texturing = !texturing;
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
		// It isn't the worst thing in the world because this is done six times per frame.
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
		
		// We need to buffer something for these so it won't yell at us
		gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(skele), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, tcoordBuf);
		gl.bufferData(gl.ARRAY_BUFFER, flatten([vec2(0, 0), vec2(0, 0), vec2(0, 0), vec2(0, 0)]), gl.STATIC_DRAW);
		
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

	renderMesh(obj.tris, mat, obj.color);

	// Render children.
	if (obj.left != null) { renderObj(obj.left, mat, width*wdMult, depth+1); }
	if (obj.right != null) { renderObj(obj.right, mat, -width*wdMult, depth+1); }
}

/**
 * Render a mesh.
 * 
 * @param {mesh} mesh The mesh to render.
 * @param {mat4} modelMat The model matrix.
 * @param {vec4} color The color to use when texturing is disabled.
 */
function renderMesh(mesh, modelMat, color) {
	
	// Set uniforms.
	gl.uniformMatrix4fv(modelView, false, flatten(mult(viewMat, modelMat)));
	gl.uniform4fv(diffProd, flatten(mult(lightDiff, color)));
	gl.uniform4fv(specProd, flatten(mult(lightSpec, color)));
	gl.uniform4fv(ambProd, flatten(mult(lightAmb, color)));


	// Buffer data.
	gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(mesh.p), gl.STATIC_DRAW);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(mesh.n), gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, tcoordBuf);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(mesh.t), gl.STATIC_DRAW);

	// Draw triangles
	for(i = 0; i < mesh.p.length; i += 3) {
		gl.uniform4fv(faceNorm, flatten(mesh.f[i]));
		gl.drawArrays(wireframe ? gl.LINE_LOOP : gl.TRIANGLES, i, 3);
	}
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

	// Set textures off and turn on lighting for mobile.
	gl.uniform1i(useTexture, false);
	gl.uniform1i(lightOn, true);

	// Use DFS to update and render render every object.
	if (root != null) {
		update(root, dt, 0, 1);
		renderSkele(root, null, initialWidth, 0);
		renderObj(root, null, initialWidth, 0);
	}

	// Enable textures for the walls and floor if that's on
	if (texturing) { gl.uniform1i(useTexture, true); }

	// Turn off lighting on walls and floor.
	gl.uniform1i(lightOn, false);

	// Set texture for walls and render
	gl.bindTexture(gl.TEXTURE_2D, stones);
	renderMesh(wallMesh, sceneModelMat, vec4(0.0, 0.0, 1.0, 1.0));
	
	// Set texture for floor and render
	gl.bindTexture(gl.TEXTURE_2D, grass);
	renderMesh(floorMesh, sceneModelMat, vec4(0.5, 0.5, 0.5, 1.0));

	requestAnimationFrame(render);
}