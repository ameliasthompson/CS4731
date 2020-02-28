The program is entirely inside mobile.js, while mobile.html contains only the
shader code for several different shaders and the page layout. Most variables
that regard the state of the program are globals.

Functions are broken down as follows (in order of appearance):

    main(): This function sets up the webGL environment, as well as setting up
        the mobile and assigning listeners. It then starts the render loop.
    
    setShaders(vshader, fshader): This function changes out the current shaders
        (or sets them for the first time), as well as setting all the location
        globals and constant uniforms such as the projection matrix.
    
    triangle(tris, a, b, c): This function was given in class and has had some
        minor modifications. It makes a triangle.

    divideTriangle(tris, a, b, c, count): This function was given in class and
        has had some minor modifications. It subdivide surfaces a triangle.
    
    tetrahedron(tris, a, b, c, d, n): This function was given in class and
        has had some minor modifications. It creates a tetrahedron and subdivision
        surfaces it until there is a sphere.
    
    initSphere(): This function acts as a wrapper for tetrahedron() in order to
        make a tris object for use in initObj(). The tris object is just a set
        of three arrays containing information on each face.
    
    quad(tris, a, b, c, d): This function was given in class and has had some
        minor modifications. It creates a quad out of two triagnles.
    
    makeCube(tris): This function was given in class and has had some minor
        modifications. It creates a cube out of six quads.
    
    initCube(): This function acts as a wrapper for makeCube() in the same way
        as initSphere acts as a wrapper for tetrahedron(). It is also for use
        in initObj().

    initObj(cube): This function creates an object in the mobile with a random
        rotation speed (within a range), a random starting rotation, a random
        color, and a random vertical distance from its parent (within a range).
    
    initMobile(): This function creates the mobile. The only thing preset is
        whether each object is a cube or a sphere. Everything else is randomized
        by initObj().

    keypress(event): This is the keypress listener, and it modifies globals and
        calls setShaders() to change shaders for 'm' and 'M' as well as the
        additional shaders.

    update(obj, dt, depth, mult): This function uses DFS to update the rotation
        of every object in the mobile.

    renderSkele(obj, mat, width, depth): This function uses DFS to draw the lines
        between each object.

    renderObj(obj, mat, width, depth): This function sues DFS to draw each object.

    render(): This function is the render loop. It calculates delta time, clears
        the buffers, updates the spotlight angle, and calls all the render functions.