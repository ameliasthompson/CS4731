IMPORTANT NOTE: This program uses delta-time when computing rotation, translation,
    and pulse steps. On models that render slowly these operations will appear
    choppy rather than slowing down.

The program is primarily inside plyread.js, while plyread.html contains only the
shader code and page layout. Within plyread.js, most variables that effect the
state of the object and scene are globals to make interacting with them through
listeners easier.

Functions are broken down as follows (in order of appearance):
    
    Main(): This function sets up the WebGL context, as well as setting up the
        buffer, and some defaults for the perspective and viewport. Because only
        one buffer is used, it is also bound here. Finally listeners are registered.

    load(event): This function listens for a file being submitted, and constructs
        a FileReader to read it. It then assigns the appropriate listener and runs
        it.
    
    read(event): This function acts as a listener for FileReader.onload. It first
        resets any values that may have been changed while interacting with the
        previous object (translation, rotation, pulse, and input state). In
        addition to this it resets the object itself and all accompying data.

        First the header is read, skipping over the appropriate lines and storing
        the important values. Then each vertex is read into the points array. The
        extents are calculated during this operation. Following this, all the
        triangles are read, referencing the array of vertices for their points.
        Then the surface normal for each triangle is generated for later use.

        Finally, the camera's direction, starting location, and clipping planes
        are calculated. Because these will not change, the are stored in the
        appropriate uniforms.

    keypress(event): This function listens for keyboard input and updates global
        flags and state variables accordingly. If there is an active translation
        direction, all translation keys will turn off any active translation
        WITHOUT enabling its own direction. This is specified in the FAQ rather
        than the portion of the assignment that discusses translation.

    render(): This function is the render/update loop for each frame. First
        delta-time is calculated, and then it is used along with the various
        global step values to calculate any changes to pulse, rotation, or
        translation if those flags are enabled.

        The model translation and rotation matrix are then generated any multiplied
        with each other (in the correct order) before being stored in the
        appropriate uniform.

        Following this, each triangle is iterated over and a translation matrix
        along the surface normal with the length of the current pulse distance
        is generated. Then the triangle is drawn before proceeding to the next.