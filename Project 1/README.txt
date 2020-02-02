polylines.js:
    Almost the entire program is in the main function due to the pretty much complete lack of
    repeat code. Event handlers are implimented as lambda functions to maintain access to
    variables in the scope of main, so the only other function is render (which takes a
    list of objects and buffers and draws all of them one at a time).

    The main function is seperated into two main chunks. The first is initialization, and
    it just goes through the process of setting up WebGL as well as the program's state.
    The state is spread across curColor, curObj, objects, and curState. The most important
    of these is curState, which is used across both the mouse and keyboard event handlers
    to manage whether the program is drawing, loading, or displaying a file.

    Loading a file is done with a reader and the onload event handler. It's broken down
    into some initialization and then another state machine that interates over each line.
    Malformed extents or polyline count cause the load to abort, while malformed point
    count or coordinate pairs cause it to simply attempt to skip to the next.