import * as THREE from 'three';
import { config } from './config.js'; // Ensure config path is correct

let scene, camera, renderer;
let characterSprite = null;
let platform;
let targetPosition = new THREE.Vector3(); // Target world coordinates for movement
let isMoving = false;
let currentCharacterImage = { // Store details of the current character
    originalUrl: null,
    processedUrl: null, // URL after background removal (might be blob URL)
    isProcessed: false
};

const promptInput = document.getElementById('prompt');
const createButton = document.getElementById('create-button');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessageDiv = document.getElementById('error-message');
const sceneContainer = document.getElementById('scene-container');

// Debounce function (optional, but good practice for button clicks)
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function displayError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.style.display = 'block';
    console.error(message);
}

function clearError() {
    errorMessageDiv.textContent = '';
    errorMessageDiv.style.display = 'none';
}

function initScene() {
    clearError(); // Clear any previous errors on init
    const containerWidth = sceneContainer.clientWidth;
    const containerHeight = sceneContainer.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(config.backgroundColor);

    // Orthographic Camera for 2D
    camera = new THREE.OrthographicCamera(
        containerWidth / -2, containerWidth / 2,
        containerHeight / 2, containerHeight / -2,
        1, 1000
    );
    camera.position.z = 10; // Distance doesn't affect size in orthographic, just clipping

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha for potential future use
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // For sharper rendering on high DPI screens
    sceneContainer.appendChild(renderer.domElement);

    // Ground Platform
    const platformGeometry = new THREE.PlaneGeometry(1000000, config.platformHeight); // Extremely wide
    const platformMaterial = new THREE.MeshBasicMaterial({ color: config.platformColor, side: THREE.DoubleSide });
    platform = new THREE.Mesh(platformGeometry, platformMaterial);
    // Position platform's top edge at the bottom of the view
    platform.position.y = (-containerHeight / 2) + (config.platformHeight / 2);
    scene.add(platform);

    // Initial character position calculation (will be refined when character loads)
    // Use a sensible default height before character exists
    const defaultSpriteHeight = config.characterRenderHeight;
    targetPosition.y = platform.position.y + (config.platformHeight / 2) + (defaultSpriteHeight / 2);
    targetPosition.x = 0; // Start centered horizontally

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    sceneContainer.addEventListener('click', onSceneClick); // Use direct click handler

    // Debounce the create button click slightly to prevent accidental double clicks
    const debouncedCreateCharacter = debounce(createCharacter, 300);
    createButton.addEventListener('click', debouncedCreateCharacter);

    promptInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
             // Prevent default form submission if inside a form
            event.preventDefault();
            debouncedCreateCharacter();
        }
    });

    animate();
}

function onWindowResize() {
    const containerWidth = sceneContainer.clientWidth;
    const containerHeight = sceneContainer.clientHeight;

    camera.left = containerWidth / -2;
    camera.right = containerWidth / 2;
    camera.top = containerHeight / 2;
    camera.bottom = containerHeight / -2;
    camera.updateProjectionMatrix();

    renderer.setSize(containerWidth, containerHeight);

    // Adjust platform position based on new height
    platform.position.y = (-containerHeight / 2) + (config.platformHeight / 2);

    // Adjust character's vertical position if it exists
    const spriteHeight = characterSprite ? characterSprite.scale.y : config.characterRenderHeight;
    targetPosition.y = platform.position.y + (config.platformHeight / 2) + (spriteHeight / 2);
    if (characterSprite) {
       characterSprite.position.y = targetPosition.y;
       // Keep camera centered on character after resize
       camera.position.x = characterSprite.position.x;
    } else {
        // If no character, ensure target Y is updated for when one is created
         targetPosition.y = platform.position.y + (config.platformHeight / 2) + (config.characterRenderHeight / 2);
    }
}

async function createCharacter() {
    const userPrompt = promptInput.value.trim();
    if (!userPrompt) {
        displayError('Please describe your character.');
        return;
    }

    clearError();
    loadingIndicator.style.display = 'flex'; // Use flex for the spinner layout
    loadingIndicator.querySelector('p').textContent = 'Generating character...'; // Initial status
    createButton.disabled = true;
    promptInput.disabled = true;

    // Cleanup previous character's resources if any *before* starting new generation
    cleanupCharacterResources();
    if (characterSprite) {
       scene.remove(characterSprite); // Remove old sprite from scene immediately
       characterSprite = null; // Ensure old sprite reference is gone
    }


    try {
        // 1. Generate Image
        // Add variations for better white background results
        const generationPrompt = `simple drawing of ${userPrompt}, character only, full body, plain white background, solid white background, no background elements`;
        console.log("Generating image with prompt:", generationPrompt);
        const imageResult = await websim.imageGen({
            prompt: generationPrompt,
            width: config.imageSize.width,
            height: config.imageSize.height,
            // Let imageGen default aspect ratio or use config setting if added later
            // aspect_ratio: "1:1" // Ensure square aspect ratio for easier sprite handling - or use config
        });

        if (!imageResult || !imageResult.url) {
            throw new Error("Image generation failed to return a valid URL.");
        }
        console.log("Image generated:", imageResult.url);
        currentCharacterImage.originalUrl = imageResult.url;

        // 2. Remove Background (using ClipDrop)
        let finalImageUrl = imageResult.url; // Default to original
        currentCharacterImage.isProcessed = false;

        if (config.backgroundRemovalApiKey && config.backgroundRemovalApiKey !== 'YOUR_CLIPDROP_API_KEY') {
            console.log("Attempting background removal...");
            loadingIndicator.querySelector('p').textContent = 'Removing background...'; // Update status
            try {
                const formData = new FormData();
                // Fetch the generated image and append it as a blob
                 const response = await fetch(imageResult.url);
                 if (!response.ok) throw new Error(`Failed to fetch generated image: ${response.statusText} (URL: ${imageResult.url})`);
                 const blob = await response.blob();
                 // Basic check for valid image blob type
                 if (!blob.type.startsWith('image/')) {
                    throw new Error(`Fetched resource is not an image: ${blob.type}`);
                 }
                 formData.append('image_file', blob, 'character.png');

                 const removeBgResponse = await fetch('https://clipdrop-api.co/remove-background/v1', {
                    method: 'POST',
                    headers: {
                        'x-api-key': config.backgroundRemovalApiKey,
                    },
                    body: formData,
                 });


                if (removeBgResponse.ok) {
                    const imageBlob = await removeBgResponse.blob();
                     // Check if the result is an image, API might return error as JSON/text instead of image blob on failure
                    if (imageBlob.type.startsWith('image/')) {
                        finalImageUrl = URL.createObjectURL(imageBlob);
                        currentCharacterImage.processedUrl = finalImageUrl; // Store blob URL
                        currentCharacterImage.isProcessed = true;
                        console.log("Background removed successfully.");
                    } else {
                        // Read the response as text to understand the error
                        const errorText = await imageBlob.text(); // Re-read response as text
                        console.error('Background removal API returned non-image data:', errorText);
                        throw new Error(`Background removal failed: API returned non-image response. Check API key/credits.`);
                    }
                } else {
                     const errorText = await removeBgResponse.text();
                     console.error('Background removal failed:', removeBgResponse.statusText, errorText);
                     // Try to parse errorText if it's JSON
                     let specificError = removeBgResponse.statusText;
                     try {
                         const errorJson = JSON.parse(errorText);
                         specificError = errorJson.error || specificError;
                     } catch (e) { /* Ignore parsing error */ }
                     displayError(`Background removal failed (${specificError}). Using original image.`);
                     // Fallback to original image URL handled by finalImageUrl default
                }
            } catch (fetchError) {
                 console.error('Error during background removal process:', fetchError);
                 displayError(`Error during background removal: ${fetchError.message}. Using original image.`);
                 // Fallback to original image URL handled by finalImageUrl default
            }
        } else if (config.backgroundRemovalApiKey === 'YOUR_CLIPDROP_API_KEY') {
             console.warn("ClipDrop API key is set to the default placeholder. Skipping background removal.");
             // Optionally inform the user non-intrusively
        } else {
             console.warn("ClipDrop API key not configured. Skipping background removal.");
        }


        // 3. Create Sprite
        loadingIndicator.querySelector('p').textContent = 'Loading character...';
        console.log("Loading texture from:", finalImageUrl);
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            finalImageUrl,
            (texture) => {
                console.log("Texture loaded successfully");
                if (!texture.image || texture.image.width === 0 || texture.image.height === 0) {
                     console.error("Texture loaded, but image data seems invalid/empty.");
                     throw new Error("Loaded texture contains no valid image data.");
                 }
                // Texture settings for pixel art / sprites
                texture.magFilter = THREE.NearestFilter; // Pixelated look when scaled up
                texture.minFilter = THREE.NearestFilter; // Use Nearest for consistency? Or LinearMipmapLinearFilter for smoother downscale
                texture.colorSpace = THREE.SRGBColorSpace; // Ensure correct color

                const material = new THREE.SpriteMaterial({
                    map: texture,
                    alphaTest: 0.1, // Discard nearly transparent pixels (good for clean edges)
                    // depthTest: false // Might help if Z-fighting issues occur, but usually okay for single sprite layer
                 });

                const sprite = new THREE.Sprite(material);

                // Scale sprite: Maintain aspect ratio, set height based on config
                const aspectRatio = texture.image.width / texture.image.height;
                const spriteHeight = config.characterRenderHeight;
                const spriteWidth = spriteHeight * aspectRatio;
                sprite.scale.set(spriteWidth, spriteHeight, 1);

                // Calculate initial position (centered horizontally based on camera, vertically on platform)
                const initialY = platform.position.y + (config.platformHeight / 2) + (spriteHeight / 2);
                const initialX = camera.position.x; // Start at current camera center x
                sprite.position.set(initialX, initialY, 0); // Place sprite
                targetPosition.set(initialX, initialY, 0); // Set initial target to current pos


                // Add the new sprite to the scene
                characterSprite = sprite; // Assign to global variable
                scene.add(characterSprite);
                console.log("Character sprite added to scene.");

                // Reset state
                isMoving = false;
                loadingIndicator.style.display = 'none';
                createButton.disabled = false;
                promptInput.disabled = false;


            },
            undefined, // onProgress callback
            (error) => {
                console.error('Error loading texture:', error, 'URL:', finalImageUrl);
                // Try to provide more specific feedback based on the URL type
                if (finalImageUrl.startsWith('blob:')) {
                    displayError('Failed to load processed character texture. The background removal might have produced an invalid image.');
                } else {
                     displayError('Failed to load generated character texture. The image generation might have failed or the URL is broken.');
                }
                loadingIndicator.style.display = 'none';
                createButton.disabled = false;
                promptInput.disabled = false;
                // Attempt cleanup even on texture load error
                cleanupCharacterResources(); // Clean up potential blob URL etc.
            }
        );

    } catch (error) {
        console.error('Error in createCharacter process:', error);
        displayError(`An error occurred: ${error.message}`);
        loadingIndicator.style.display = 'none';
        createButton.disabled = false;
        promptInput.disabled = false;
        cleanupCharacterResources(); // Ensure cleanup on general errors too
    }
}

// Separate function to clean up resources of the *previous* character
function cleanupCharacterResources() {
     // No need to dispose sprite material/texture here if we remove the sprite from scene
     // Three.js GC should handle it once the sprite/material/texture are no longer referenced.
     // The primary concern is revoking Object URLs.

    // Revoke the blob URL if one was created for the *previous* character
    if (currentCharacterImage.processedUrl && currentCharacterImage.processedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentCharacterImage.processedUrl);
        console.log("Revoked previous blob URL:", currentCharacterImage.processedUrl);
    }
    // Reset tracker for the *next* character
    currentCharacterImage.originalUrl = null;
    currentCharacterImage.processedUrl = null;
    currentCharacterImage.isProcessed = false;
}

function onSceneClick(event) {
    if (!characterSprite) return; // No character, no move

    const rect = sceneContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top; 

    const mouseX = (x / sceneContainer.clientWidth) * 2 - 1;
    const mouseY = -(y / sceneContainer.clientHeight) * 2 + 1; 

    const vector = new THREE.Vector3(mouseX, mouseY, 0.5);

    vector.unproject(camera);

    targetPosition.x = vector.x;

    const spriteHeight = characterSprite.scale.y;
    targetPosition.y = platform.position.y + (config.platformHeight / 2) + (spriteHeight / 2);

    isMoving = true;
}

let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);

    const now = time * 0.001; 
    const deltaTime = Math.min(0.1, now - (lastTime || now)); 
    lastTime = now;


    if (characterSprite) {
        const correctY = platform.position.y + (config.platformHeight / 2) + (characterSprite.scale.y / 2);
        characterSprite.position.y = correctY;
        targetPosition.y = correctY; 

        if (isMoving) {
            const distanceToTargetX = targetPosition.x - characterSprite.position.x;
            const moveThreshold = 1.5; 

            if (Math.abs(distanceToTargetX) > moveThreshold) {
                const direction = Math.sign(distanceToTargetX);
                const moveDistance = direction * config.characterMoveSpeed * deltaTime;

                if (Math.abs(moveDistance) >= Math.abs(distanceToTargetX)) {
                    characterSprite.position.x = targetPosition.x;
                    isMoving = false;
                } else {
                    characterSprite.position.x += moveDistance;
                }
            } else {
                characterSprite.position.x = targetPosition.x;
                isMoving = false;
            }
        }

        camera.position.x = characterSprite.position.x;
        // camera.position.x = THREE.MathUtils.lerp(camera.position.x, characterSprite.position.x, 0.1);

    }

    renderer.render(scene, camera);
}

// --- Initialization ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScene);
} else {
    initScene();
}