import * as THREE from 'three';
import { config } from 'config';

let scene, camera, renderer;
let characterSprite = null;
let platform;
let targetPosition = new THREE.Vector3();
let isMoving = false;

const promptInput = document.getElementById('prompt');
const createButton = document.getElementById('create-button');
const loadingIndicator = document.getElementById('loading-indicator');
const sceneContainer = document.getElementById('scene-container');

function initScene() {
    const containerWidth = sceneContainer.clientWidth;
    const containerHeight = sceneContainer.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(config.backgroundColor);

    // Use OrthographicCamera for 2D effect
    camera = new THREE.OrthographicCamera(
        containerWidth / -2, containerWidth / 2,
        containerHeight / 2, containerHeight / -2,
        1, 1000
    );
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerWidth, containerHeight);
    sceneContainer.appendChild(renderer.domElement);

    // Create the ground platform
    const platformGeometry = new THREE.PlaneGeometry(100000, 50); // Very wide platform
    const platformMaterial = new THREE.MeshBasicMaterial({ color: config.platformColor });
    platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = -containerHeight / 2 + 25; // Position at the bottom
    scene.add(platform);

    // Set initial target position to center
    targetPosition.x = 0;
    targetPosition.y = platform.position.y + 25 + (config.imageSize.height / 4) ; // Place character slightly above platform

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Handle clicks for movement
    sceneContainer.addEventListener('click', onSceneClick);

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
    platform.position.y = -containerHeight / 2 + 25;
     if (characterSprite) {
       targetPosition.y = platform.position.y + 25 + (characterSprite.material.map.image.height / 4);
       if (!isMoving) { // Keep character on platform if not currently moving to a click target
           characterSprite.position.y = targetPosition.y;
       }
    } else {
         targetPosition.y = platform.position.y + 25 + (config.imageSize.height / 4);
    }
}

async function createCharacter() {
    const userPrompt = promptInput.value.trim();
    if (!userPrompt) {
        alert('Please describe your character.');
        return;
    }

    loadingIndicator.style.display = 'block';
    createButton.disabled = true;
    promptInput.disabled = true;

    try {
        // 1. Generate Image with white background enforcement
        const generationPrompt = `test ${userPrompt} test, white background`;
        console.log("Generating image with prompt:", generationPrompt);
        const imageResult = await websim.imageGen({
            prompt: generationPrompt,
            width: config.imageSize.width,
            height: config.imageSize.height,
        });
        console.log("Image generated:", imageResult.url);

        // 2. Remove Background (Using ClipDrop - requires API key in config.js)
        // You might need to replace this with another background removal service or handle it differently
        // if you don't have a ClipDrop API key.
        let characterImageUrl = imageResult.url; // Default to original if removal fails

         if (config.backgroundRemovalApiKey && config.backgroundRemovalApiKey !== 'YOUR_CLIPDROP_API_KEY') {
            console.log("Removing background...");
            const formData = new FormData();
            // Fetch the generated image and append it as a blob
            const response = await fetch(imageResult.url);
            const blob = await response.blob();
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
                 characterImageUrl = URL.createObjectURL(imageBlob);
                console.log("Background removed successfully.");
            } else {
                console.error('Background removal failed:', removeBgResponse.statusText, await removeBgResponse.text());
                alert('Background removal failed. Using original image.');
            }
         } else {
             console.warn("ClipDrop API key not configured. Skipping background removal.");
             alert("Background removal requires configuration. Using original image.");
         }


        // 3. Create Sprite
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            characterImageUrl,
            (texture) => {
                // Ensure texture settings are optimal for sprites
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.LinearMipmapLinearFilter; // Or NearestMipmapNearestFilter

                const material = new THREE.SpriteMaterial({ map: texture });
                const sprite = new THREE.Sprite(material);

                // Scale the sprite based on original image dimensions vs desired size
                const aspectRatio = texture.image.width / texture.image.height;
                const spriteHeight = config.imageSize.height / 2; // Adjust scale as needed
                const spriteWidth = spriteHeight * aspectRatio;
                sprite.scale.set(spriteWidth, spriteHeight, 1);

                 // Set initial position
                sprite.position.copy(targetPosition); // Start at the initial target y on platform
                sprite.position.x = camera.position.x; // Center horizontally initially


                // Remove previous character if exists
                if (characterSprite) {
                    scene.remove(characterSprite);
                    characterSprite.material.map.dispose(); // Dispose texture
                    characterSprite.material.dispose(); // Dispose material
                }

                characterSprite = sprite;
                scene.add(characterSprite);
                console.log("Character added to scene.");

                // Clean up object URL if created
                 if (characterImageUrl.startsWith('blob:')) {
                     URL.revokeObjectURL(characterImageUrl);
                 }

                loadingIndicator.style.display = 'none';
                createButton.disabled = false;
                promptInput.disabled = false;


            },
            undefined, // onProgress callback not needed
            (error) => {
                console.error('Error loading texture:', error);
                alert('Failed to load character texture.');
                loadingIndicator.style.display = 'none';
                createButton.disabled = false;
                promptInput.disabled = false;
                 // Clean up object URL if created
                 if (characterImageUrl.startsWith('blob:')) {
                     URL.revokeObjectURL(characterImageUrl);
                 }
            }
        );

    } catch (error) {
        console.error('Error creating character:', error);
        alert('An error occurred while creating the character.');
        loadingIndicator.style.display = 'none';
        createButton.disabled = false;
        promptInput.disabled = false;
    }
}

function onSceneClick(event) {
    if (!characterSprite) return; // Don't move if no character

    const rect = sceneContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const mouse = new THREE.Vector2(
        (x / sceneContainer.clientWidth) * 2 - 1,
        -(y / sceneContainer.clientHeight) * 2 + 1
    );

    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);

    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));


    // Set target position x, keep y on the platform level
    targetPosition.x = pos.x;
    targetPosition.y = platform.position.y + 25 + (characterSprite.scale.y / 2); // Keep on platform
    isMoving = true;
    console.log("Target position set:", targetPosition.x);
}

let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);

    const now = time * 0.001; // convert time to seconds
    const deltaTime = now - lastTime;
    lastTime = now;


    if (characterSprite && isMoving) {
        const distanceToTarget = characterSprite.position.x - targetPosition.x;
        const moveDistance = config.characterMoveSpeed * deltaTime;

        if (Math.abs(distanceToTarget) > moveDistance) {
             // Move towards target
             const direction = Math.sign(targetPosition.x - characterSprite.position.x);
            characterSprite.position.x += direction * moveDistance;

             // Move camera to follow character
             camera.position.x = characterSprite.position.x;

        } else {
            // Reached target
            characterSprite.position.x = targetPosition.x;
            isMoving = false;
             console.log("Reached target position.");
        }
         // Always ensure character is on the platform vertically
         characterSprite.position.y = targetPosition.y;
    } else if (characterSprite) {
         // Ensure character stays on the platform if not actively moving
         characterSprite.position.y = targetPosition.y;
         // Keep camera centered on character even when idle
         camera.position.x = characterSprite.position.x;
    }


    renderer.render(scene, camera);
}

// --- Initialization ---
createButton.addEventListener('click', createCharacter);
promptInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        createCharacter();
    }
});

initScene();

import * as THREE from 'three';
import { config } from 'config';

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

// Debounce function to prevent rapid clicks
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
    targetPosition.y = platform.position.y + (config.platformHeight / 2) + (config.characterRenderHeight / 2);
    targetPosition.x = 0; // Start centered horizontally

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    sceneContainer.addEventListener('click', onSceneClick); // Use direct click handler
    createButton.addEventListener('click', createCharacter);
    promptInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            createCharacter();
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
    targetPosition.y = platform.position.y + (config.platformHeight / 2) + (config.characterRenderHeight / 2);
    if (characterSprite) {
       characterSprite.position.y = targetPosition.y;
       // Keep camera centered on character after resize
       camera.position.x = characterSprite.position.x;
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
    createButton.disabled = true;
    promptInput.disabled = true;

    // Cleanup previous character's resources if any
    cleanupCharacterResources();

    try {
        // 1. Generate Image
        const generationPrompt = `test ${userPrompt} test, white background, solid white background, simple background`; // Add more keywords for white bg
        console.log("Generating image with prompt:", generationPrompt);
        const imageResult = await websim.imageGen({
            prompt: generationPrompt,
            width: config.imageSize.width,
            height: config.imageSize.height,
            aspect_ratio: "1:1" // Ensure square aspect ratio for easier sprite handling
        });
        console.log("Image generated:", imageResult.url);
        currentCharacterImage.originalUrl = imageResult.url;

        // 2. Remove Background (using ClipDrop)
        let finalImageUrl = imageResult.url; // Default to original
        currentCharacterImage.isProcessed = false;

        if (config.backgroundRemovalApiKey) {
            console.log("Attempting background removal...");
            loadingIndicator.querySelector('p').textContent = 'Removing background...'; // Update status
            try {
                const formData = new FormData();
                // Fetch the generated image and append it as a blob
                 const response = await fetch(imageResult.url);
                 if (!response.ok) throw new Error(`Failed to fetch generated image: ${response.statusText}`);
                 const blob = await response.blob();
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
                    finalImageUrl = URL.createObjectURL(imageBlob);
                    currentCharacterImage.processedUrl = finalImageUrl; // Store blob URL
                    currentCharacterImage.isProcessed = true;
                    console.log("Background removed successfully.");
                } else {
                     const errorText = await removeBgResponse.text();
                     console.error('Background removal failed:', removeBgResponse.statusText, errorText);
                     displayError(`Background removal failed (${removeBgResponse.statusText}). Check API key or try a different prompt. Using original image.`);
                     // Fallback to original image URL handled by finalImageUrl default
                }
            } catch (fetchError) {
                 console.error('Error during background removal fetch:', fetchError);
                 displayError(`Network error during background removal: ${fetchError.message}. Using original image.`);
                 // Fallback to original image URL handled by finalImageUrl default
            }
        } else {
            console.warn("ClipDrop API key not configured. Skipping background removal.");
            // Optionally inform the user, maybe not with an error but a note?
            // displayError("Background removal skipped (API key not configured).");
        }

        // 3. Create Sprite
        loadingIndicator.querySelector('p').textContent = 'Loading character...';
        console.log("Loading texture from:", finalImageUrl);
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            finalImageUrl,
            (texture) => {
                console.log("Texture loaded successfully");
                // Texture settings for pixel art / sprites
                texture.magFilter = THREE.NearestFilter; // Pixelated look when scaled up
                texture.minFilter = THREE.LinearMipmapLinearFilter; // Smoother when scaled down
                texture.colorSpace = THREE.SRGBColorSpace; // Ensure correct color

                const material = new THREE.SpriteMaterial({
                    map: texture,
                    // alphaTest: 0.1, // Discard nearly transparent pixels
                    // depthTest: false // Render sprites without depth checking issues
                 });

                const sprite = new THREE.Sprite(material);

                // Scale sprite: Maintain aspect ratio, set height based on config
                const aspectRatio = texture.image.width / texture.image.height;
                const spriteHeight = config.characterRenderHeight;
                const spriteWidth = spriteHeight * aspectRatio;
                sprite.scale.set(spriteWidth, spriteHeight, 1);

                // Calculate initial position (centered horizontally, on platform)
                 const initialY = platform.position.y + (config.platformHeight / 2) + (spriteHeight / 2);
                 sprite.position.set(camera.position.x, initialY, 0); // Place at current camera center x, on platform y
                 targetPosition.set(sprite.position.x, initialY, 0); // Set initial target to current pos

                // Remove previous character
                if (characterSprite) {
                    scene.remove(characterSprite);
                    // Resources are cleaned up by cleanupCharacterResources() earlier
                }

                characterSprite = sprite;
                scene.add(characterSprite);
                console.log("Character sprite added to scene.");

                // Reset state
                isMoving = false;
                loadingIndicator.style.display = 'none';
                createButton.disabled = false;
                promptInput.disabled = false;

                // Note: Blob URL (finalImageUrl if processed) is automatically managed by the browser
                // We stored it in currentCharacterImage.processedUrl if needed later,
                // but don't need manual revoke *immediately* after load typically.
                // It gets revoked in cleanupCharacterResources() before creating the *next* character.

            },
            undefined, // onProgress callback
            (error) => {
                console.error('Error loading texture:', error);
                displayError('Failed to load character texture. The image might be invalid or inaccessible.');
                loadingIndicator.style.display = 'none';
                createButton.disabled = false;
                promptInput.disabled = false;
                // Attempt cleanup even on texture load error
                cleanupCharacterResources();
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
     if (characterSprite) {
        if (characterSprite.material.map) {
            characterSprite.material.map.dispose(); // Dispose texture
        }
        characterSprite.material.dispose(); // Dispose material
        // Geometry is managed by Three.js for Sprites
    }
    // Revoke the blob URL if one was created for the *previous* character
    if (currentCharacterImage.processedUrl && currentCharacterImage.processedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentCharacterImage.processedUrl);
        console.log("Revoked previous blob URL:", currentCharacterImage.processedUrl);
    }
    // Reset tracker
    currentCharacterImage.originalUrl = null;
    currentCharacterImage.processedUrl = null;
    currentCharacterImage.isProcessed = false;
}


function onSceneClick(event) {
    if (!characterSprite) return; // No character, no move

    const rect = sceneContainer.getBoundingClientRect();
    // Calculate mouse position relative to the scene container
    const x = event.clientX - rect.left;
    // const y = event.clientY - rect.top; // y is not needed for horizontal movement

    // Convert screen x coordinate to Three.js world x coordinate
    const mouseX = (x / sceneContainer.clientWidth) * 2 - 1; // Normalize to -1 to +1

    // Create a vector representing the mouse position in normalized device coordinates (NDC)
    // We are only interested in the x position, y can be anything as we unproject.
    const vector = new THREE.Vector3(mouseX, 0, 0.5); // z=0.5 is halfway between near and far plane

    // Unproject the vector from camera's perspective to get world coordinates
    vector.unproject(camera);

    // The resulting vector's x component is our target world x
    targetPosition.x = vector.x;
    // Keep y fixed on the platform
    targetPosition.y = platform.position.y + (config.platformHeight / 2) + (characterSprite.scale.y / 2);
    isMoving = true;
    // console.log("Target world position x set:", targetPosition.x);
}


let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);

    const now = time * 0.001; // Convert time to seconds
    const deltaTime = now - lastTime;
    lastTime = now;

    // Guard against large deltaTime spikes (e.g., tab switching)
    const dt = Math.min(deltaTime, 0.1); // Cap delta time at 100ms


    if (characterSprite && isMoving) {
        const distanceToTargetX = targetPosition.x - characterSprite.position.x;
        const moveThreshold = 1; // Stop moving if very close

        if (Math.abs(distanceToTargetX) > moveThreshold) {
            const direction = Math.sign(distanceToTargetX);
            const moveDistance = direction * config.characterMoveSpeed * dt;

            // Prevent overshooting
            if (Math.abs(moveDistance) > Math.abs(distanceToTargetX)) {
                characterSprite.position.x = targetPosition.x;
                isMoving = false;
                 // console.log("Reached target (overshoot check).");
            } else {
                characterSprite.position.x += moveDistance;
            }
        } else {
            // Close enough, snap to target
            characterSprite.position.x = targetPosition.x;
            isMoving = false;
            // console.log("Reached target (threshold).");
        }

        // Always ensure character stays vertically correct
        characterSprite.position.y = targetPosition.y;

        // Camera follows the character smoothly (or instantly)
        // Instant follow:
        camera.position.x = characterSprite.position.x;
        // Optional: Smooth follow (Lerp)
        // camera.position.x = THREE.MathUtils.lerp(camera.position.x, characterSprite.position.x, 0.1);

        camera.updateProjectionMatrix(); // Needed if camera moves/rotates? Usually not for ortho translation.

    } else if (characterSprite) {
        // If not moving, still ensure Y position is correct and camera is centered
         characterSprite.position.y = targetPosition.y; // targetPosition.y should be stable platform height
         camera.position.x = characterSprite.position.x;
    }


    renderer.render(scene, camera);
}

// --- Initialization ---
initScene();

