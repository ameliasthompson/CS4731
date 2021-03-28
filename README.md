# CS 4731: Computer Graphics

CS 4732 was a course on the standard graphics pipeline and what goes into rendering a graphic to the screen. It was written in JavaScript using the WebGL library to render various graphics throughout the term.

## Assignment Breakdown

Each project folder contains a completed assignment and a more detailed readme file for that project. Projects 1 and 2 both contain a further subfolder of .ply and .dat files that are required for running those projects.

### Project 1

Project 1 consisted of taking a set of points and drawing them to the canvas as a polyline. It supported both a draw mode where the user clicks to set points and a file mode where the user loads a specifically formatted .dat file from their computer that contains a series of points and potentially the object's extents. Additionally, the color of the line can be cycled between red, green, blue, and black.

#### Flaws

If the user presses the 'f' key to swap to file mode without a file loaded, the browser will attempt to print the page instead.

### Project 2

Project 2 consisted of taking a .ply file and drawing it to the canvas as a wireframe. The application supported translation of the model in the world, rotation of the model about its own origin, and "pulsing" of the model's polygons about its own origin.

### Project 3 Part 1

The first part of project 3 consisted of generating a set of simple objects in a mobile (the thing that hangs above a crib) configuration without use of an external loaded file and with lines connecting each object similar to a mobile. The mobile is procedurally generated every time the webpage is loaded. The application implemented a spot light, as well as several different shaders that can be swapped between at will.

### Project 3 Part 2

The second part of project 3 was an extension of the first part that implemented both a texture mapped half cube background as well as shadow casting of the mobile on the background by (in the shader) rendering a duplicate of the mobile projected onto each surface of the background. Additionally, both refraction and reflection modes were implemented ustilizing an enviornment map.

#### Flaws

Although the shadows project onto the background, they do not do so correctly. Each wall views the light source as coming from an incorrect location.

## Running the Projects

All projects can be run in the browser and for ease of use may be accessed from the [github pages index](https://ameliasthompson.github.io/CS4731/) for this project. All projects were tested on the Chrome browser, and behavior on other browsers may be unpredictable.