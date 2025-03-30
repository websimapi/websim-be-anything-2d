# Be Anything 2D

This project allows users to create a 2D character using a text prompt powered by an AI image generation model. The character's background is automatically removed, and it's placed in a simple 2D side-scrolling scene where users can click to move it left or right along a platform.

## Features

- **AI Character Generation:** Describe your character using text, and an AI generates the image.
- **Background Removal:** Automatically removes the background from the generated character image (requires configuration).
- **2D Scene:** Places the character in a simple 2D environment with an infinitely scrolling platform.
- **Click to Move:** Click anywhere on the scene to make the character walk towards that horizontal position.
- **Side-Scrolling Camera:** The camera follows the character as it moves.

## Setup

1.  **API Key (Optional but Recommended):**
    *   This project uses ClipDrop by Stability AI for background removal by default.
    *   Sign up for a free API key at [https://clipdrop.co/](https://clipdrop.co/).
    *   Open `config.js`.
    *   Replace `'YOUR_CLIPDROP_API_KEY'` with your actual ClipDrop API key in the `backgroundRemovalApiKey` field.
    *   **If you don't provide an API key, background removal will be skipped, and the character will appear with its original generated background (which we attempt to make white via the prompt).**

2.  **Run the Project:**
    *   Open the `index.html` file in your web browser.

## How to Use

1.  Enter a description of the character you want to create in the input field (e.g., "a small blue robot with wings", "a knight riding a giant snail").
2.  Click the "Create" button or press Enter.
3.  Wait for the character image to be generated and the background removed (if configured).
4.  Once the character appears on the platform, click anywhere horizontally in the scene view to make the character move to that point.

## Configuration (`config.js`)

You can adjust some parameters in the `config.js` file:

-   `backgroundRemovalApiKey`: Your API key for the background removal service (ClipDrop).
-   `imageSize`: The dimensions (width, height) of the generated character image.
-   `characterMoveSpeed`: How fast the character moves horizontally (in pixels per second).
-   `platformColor`: The color of the ground platform (hexadecimal value).
-   `backgroundColor`: The color of the scene background (sky color) (hexadecimal value).

## Dependencies

-   **Three.js:** Used for creating the 2D scene, camera, and rendering. Included via CDN.
-   **websim:** Provides the AI image generation (`websim.imageGen`) capability.

## Notes

-   The background removal step relies on an external service (ClipDrop). Its availability and performance depend on that service.
-   The quality of the character generation depends on the AI model and the prompt provided. The prompt is automatically modified to request a white background ("test [your prompt] test, white background") to aid the background removal process.
-   This is a simple demonstration. More advanced features like animations, collisions (other than the platform), or more complex environments could be added.
`````` index.html
<!DOCTYPE html>
<html>
<head>
  <title>Be Anything 2D</title>
  <link rel="stylesheet" href="style.css">
  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
        "config": "./config.js"
      }
    }
  </script>
</head>
<body>
  <div id="container">
    <h1>Be Anything 2D</h1>
    <div id="input-area">
      <label for="prompt">Describe your character:</label>
      <input type="text" id="prompt" name="prompt" placeholder="e.g., a brave knight riding a giant snail">
      <button id="create-button">Create</button>
    </div>
    <div id="loading-indicator" style="display: none;">
      <p>Generating character...</p>
      <div class="spinner"></div>
    </div>
     <div id="error-message" style="display: none; color: red; margin-top: 10px;"></div>
    <div id="scene-container"></div>
     <p class="instructions">Click in the scene to move your character!</p>
  </div>
  <script type="module" src="main.js"></script>
</body>
</html>

# Be Anything 2D

Create a 2D character from a text prompt using AI and walk it around in a simple side-scrolling world!

## Features

-   **AI Character Generation:** Describe your character (e.g., "a cute cat wizard", "a steampunk robot dog") and an AI generates the image.
-   **Automatic Background Removal:** Attempts to automatically remove the background from the generated character image using the ClipDrop API (requires configuration). Falls back to the original image if removal fails or is not configured.
-   **2D Side-Scrolling Scene:** Places the character on a long platform in a 2D environment.
-   **Click to Move:** Click anywhere horizontally in the scene view to make the character walk left or right towards that point.
-   **Following Camera:** The camera follows the character smoothly as it moves along the platform.

## Setup

1.  **ClipDrop API Key (Recommended for Background Removal):**
    *   This project uses [ClipDrop by Stability AI](https://clipdrop.co/) for automatic background removal. This significantly improves the character's look in the scene.
    *   Sign up for a **free API key** at [https://clipdrop.co/](https://clipdrop.co/).
    *   Open the `config.js` file in your project folder.
    *   Find the line `backgroundRemovalApiKey: '',`
    *   Paste your API key between the single quotes: `backgroundRemovalApiKey: 'YOUR_ACTUAL_API_KEY_HERE',`
    *   **Important:** If you don't provide a valid API key, background removal will be **skipped**, and the character will appear with its original generated background (which the app tries to make white via the prompt, but results may vary).

2.  **Run the Project:**
    *   You need a simple web server to run this project because it uses JavaScript Modules (`import`). Many code editors have extensions for this (like VS Code's "Live Server"), or you can use Python's built-in server:
        *   Open a terminal or command prompt in the project directory.
        *   Run `python -m http.server` (for Python 3) or `python -m SimpleHTTPServer` (for Python 2).
        *   Open your web browser and go to `http://localhost:8000` (or the address shown in the terminal).
    *   Alternatively, if using a platform like WebSim, just load the `index.html`.

## How to Use

1.  Enter a description of the character you want to create in the input field. Be creative!
2.  Click the "Create" button or press Enter.
3.  Wait a few moments. You'll see status updates like "Generating character...", "Removing background...", "Loading character...".
4.  If there's an error (e.g., API key issue, generation problem), a message will appear.
5.  Once the character appears on the platform, click anywhere **horizontally** within the scene view (the box with the sky background). The character will start walking towards the point you clicked.

## Configuration (`config.js`)

You can tweak the experience by editing `config.js`:

-   `backgroundRemovalApiKey`: **(Important)** Your API key for ClipDrop background removal.
-   `imageSize`: The dimensions (width, height) requested for the generated character image (defaults to 512x512).
-   `characterRenderHeight`: Controls how tall the character sprite appears in the game world (in pixels). The width will adjust automatically to maintain the aspect ratio.
-   `characterMoveSpeed`: How fast the character walks (in pixels per second).
-   `platformColor`: The color of the ground platform (hexadecimal value).
-   `platformHeight`: The thickness of the platform (in pixels).
-   `backgroundColor`: The color of the scene background (sky color) (hexadecimal value).

## Dependencies

-   **Three.js:** A 3D graphics library used here for the 2D scene, camera, sprites, and rendering. Included via CDN.
-   **websim:** Provides the AI image generation (`websim.imageGen`) capability (assumed to be available in the execution environment).
-   **ClipDrop API:** Used for background removal (external service).

