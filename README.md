# Be Anything 2D

Create a 2D character from a text prompt using AI and walk it around in a simple side-scrolling world!

## Features

-   **AI Character Generation:** Describe your character (e.g., "a cute cat wizard", "a steampunk robot dog") and an AI generates the image. The prompt is enhanced to encourage a white background.
-   **Automatic Background Removal:** Attempts to automatically remove the background from the generated character image using the ClipDrop API (requires configuration). Falls back to the original image if removal fails or is not configured.
-   **2D Side-Scrolling Scene:** Places the character on a long platform in a 2D environment with a sky-blue background.
-   **Click to Move:** Click anywhere horizontally in the scene view to make the character walk left or right towards that point.
-   **Following Camera:** The camera instantly follows the character as it moves along the platform.
-   **Responsive Design:** Basic responsiveness for different screen sizes.

## Setup

1.  **ClipDrop API Key (Recommended for Background Removal):**
    *   This project uses [ClipDrop by Stability AI](https://clipdrop.co/) for automatic background removal. This significantly improves the character's appearance in the scene.
    *   Sign up for a **free API key** at [https://clipdrop.co/](https://clipdrop.co/).
    *   Open the `config.js` file in your project folder.
    *   Find the line `backgroundRemovalApiKey: 'YOUR_CLIPDROP_API_KEY',`
    *   Replace `YOUR_CLIPDROP_API_KEY` with your actual API key between the single quotes: `backgroundRemovalApiKey: 'your_real_api_key_here',`
    *   **Important:** If you leave this as the placeholder or empty, background removal will be **skipped**, and the character will appear with its original generated background (results may vary).

2.  **Run the Project:**
    *   This project uses JavaScript Modules (`import`). You need a simple local web server to run it directly from files due to browser security restrictions.
    *   **Using VS Code:** Install the "Live Server" extension, right-click on `index.html` in the file explorer, and choose "Open with Live Server".
    *   **Using Python:** Open a terminal or command prompt in the project directory.
        *   If you have Python 3: run `python -m http.server`
        *   If you have Python 2: run `python -m SimpleHTTPServer`
        *   Then, open your web browser and go to `http://localhost:8000` (or the address shown in the terminal).
    *   **Using Node.js:** Install `http-server` globally (`npm install -g http-server`), navigate to the project directory in your terminal, and run `http-server`. Then open the provided localhost URL.
    *   **Using WebSim:** Just load the `index.html`.

## How to Use

1.  Enter a description of the character you want to create in the input field. Be creative! (e.g., "a tiny green alien holding a flower", "a majestic lion wearing a crown")
2.  Click the "Create" button or press Enter.
3.  Wait a few moments. You'll see status updates like "Generating character...", "Removing background...", "Loading character...".
4.  If there's an error (e.g., API key issue, generation problem), a message will appear below the input field.
5.  Once the character appears on the platform, click anywhere **horizontally** within the scene view (the box with the sky background). The character will start walking towards the point you clicked.

## Configuration (`config.js`)

You can tweak the experience by editing `config.js`:

-   `backgroundRemovalApiKey`: **(Important)** Your API key for ClipDrop background removal. Leave as `'YOUR_CLIPDROP_API_KEY'` or empty to disable.
-   `imageSize`: The dimensions (width, height) requested for the generated character image (e.g., `{ width: 512, height: 512 }`). Note: The AI might return a slightly different aspect ratio.
-   `characterRenderHeight`: Controls how tall the character sprite appears in the game world (in pixels). The width will adjust automatically to maintain the aspect ratio of the loaded image.
-   `characterMoveSpeed`: How fast the character walks (in world units per second).
-   `platformColor`: The color of the ground platform (uses hexadecimal format, e.g., `0xaaaaaa` for grey).
-   `platformHeight`: The thickness (height) of the platform (in world units/pixels).
-   `backgroundColor`: The color of the scene background (sky color) (uses hexadecimal format, e.g., `0x87CEEB` for sky blue).

## Dependencies

-   **Three.js:** A 3D graphics library used here for the 2D scene setup (orthographic camera, sprites, rendering). Included via CDN.
-   **websim:** Provides the AI image generation (`websim.imageGen`) capability (assumed to be available in the execution environment).
-   **ClipDrop API:** Used for background removal (external service). Requires a separate API key.