import * as THREE from 'three';
import { displayError, clearError } from './utils.js';
import { config as appConfig } from './config.js'; // Use alias

let characterSprite = null;
let targetPosition = new THREE.Vector3(0, 0, 0);
let isMoving = false;
let currentCharacterImage = {
    originalUrl: null,
    processedUrl: null,
    isProcessed: false
};
let sceneRef, cameraRef, platformRef, sceneContainerRef, configRef;
let updateCharacterInLoop; // Callback reference from scene module

// Function to set up references and callbacks
export function setupCharacterControls(params) {
    sceneContainerRef = params.sceneContainer;
    cameraRef = params.camera;
    platformRef = params.platform;
    configRef = params.config;

    // Register the update function with the scene's animation loop
    params.setCharacterUpdateCallback(updateCharacterMovement);

    // Add scene click listener
    if (sceneContainerRef) {
        sceneContainerRef.addEventListener('click', onSceneClick);
    } else {
        console.error("Scene container reference not provided for click events.");
    }
}


// --- Character Creation ---

/**
 * Handles the entire character creation process: prompt -> image gen -> background removal -> sprite creation.
 * @param {object} params - Object containing necessary elements and config.
 * @param {HTMLInputElement} params.promptInput
 * @param {HTMLButtonElement} params.createButton
 * @param {HTMLElement} params.loadingIndicator
 * @param {HTMLElement} params.errorMessageDiv
 * @param {THREE.Scene} params.scene
 * @param {THREE.OrthographicCamera} params.camera
 * @param {THREE.Mesh} params.platform
 * @param {object} params.config
 */
export async function createCharacter({
    promptInput, createButton, loadingIndicator, errorMessageDiv,
    scene, camera, platform, config
}) {
    // Assign to module-level refs if needed by other functions (like onSceneClick uses camera/platform)
    sceneRef = scene;
    cameraRef = camera;
    platformRef = platform;
    configRef = config; // Ensure configRef is set

    const userPrompt = promptInput.value.trim();
    if (!userPrompt) {
        displayError(errorMessageDiv, 'Please describe your character.');
        return;
    }

    clearError(errorMessageDiv);
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
        loadingIndicator.querySelector('p').textContent = 'Generating character...';
    }
    if (createButton) createButton.disabled = true;
    if (promptInput) promptInput.disabled = true;

    cleanupCharacterResources(); // Clean up previous resources FIRST
    if (characterSprite) {
        sceneRef.remove(characterSprite); // Remove old sprite
        characterSprite.material.map?.dispose(); // Dispose texture
        characterSprite.material.dispose(); // Dispose material
        characterSprite = null;
    }


    try {
        // 1. Generate Image
        const generationPrompt = `simple flat 2d drawing of ${userPrompt}, character only, full body shot, facing forward or slightly sideways, plain white background, solid white background, centered, minimal details, clean lines, vector art style, no shadows, on white background`;
        console.log("Generating image with prompt:", generationPrompt);
        const imageResult = await websim.imageGen({
            prompt: generationPrompt,
            width: configRef.imageSize.width,
            height: configRef.imageSize.height,
        });

        if (!imageResult || !imageResult.url) {
            throw new Error("Image generation failed to return a valid URL.");
        }
        console.log("Image generated:", imageResult.url);
        currentCharacterImage.originalUrl = imageResult.url;
        let finalImageUrl = imageResult.url;
        currentCharacterImage.isProcessed = false;

        // 2. Remove Background (ClipDrop)
        if (configRef.backgroundRemovalApiKey && configRef.backgroundRemovalApiKey !== 'YOUR_CLIPDROP_API_KEY') {
            console.log("Attempting background removal...");
            if (loadingIndicator) loadingIndicator.querySelector('p').textContent = 'Removing background...';
            try {
                const formData = new FormData();
                const response = await fetch(imageResult.url);
                if (!response.ok) throw new Error(`Failed to fetch generated image: ${response.statusText} (URL: ${imageResult.url})`);
                const blob = await response.blob();
                 if (!blob.type.startsWith('image/')) {
                    throw new Error(`Fetched resource is not an image: ${blob.type}`);
                 }
                formData.append('image_file', blob, 'character.png');

                const removeBgResponse = await fetch('https://clipdrop-api.co/remove-background/v1', {
                    method: 'POST',
                    headers: { 'x-api-key': configRef.backgroundRemovalApiKey },
                    body: formData,
                });

                if (removeBgResponse.ok) {
                    const imageBlob = await removeBgResponse.blob();
                    if (imageBlob.type.startsWith('image/')) {
                        finalImageUrl = URL.createObjectURL(imageBlob);
                        currentCharacterImage.processedUrl = finalImageUrl;
                        currentCharacterImage.isProcessed = true;
                        console.log("Background removed successfully. Using blob URL:", finalImageUrl);
                    } else {
                        const errorText = await imageBlob.text();
                        console.error('ClipDrop API returned non-image data:', errorText);
                        throw new Error(`Background removal failed: API returned non-image response. Check API key/credits/image format. Response: ${errorText}`);
                    }
                } else {
                    const errorText = await removeBgResponse.text();
                    let specificError = `Status ${removeBgResponse.status}: ${removeBgResponse.statusText}`;
                     try {
                         const errorJson = JSON.parse(errorText);
                         specificError += ` - ${errorJson.error || errorText}`;
                     } catch (e) { specificError += ` - ${errorText}`; }
                    console.error('Background removal failed:', specificError);
                    displayError(errorMessageDiv, `Background removal failed (${specificError}). Using original image.`);
                }
            } catch (fetchError) {
                console.error('Error during background removal process:', fetchError);
                displayError(errorMessageDiv, `Error during background removal: ${fetchError.message}. Using original image.`);
            }
        } else {
            console.warn("Background removal skipped (API key missing or placeholder).");
             if (configRef.backgroundRemovalApiKey === 'YOUR_CLIPDROP_API_KEY') {
                 // Optionally add a non-error message to UI:
                 // displayInfo(infoElement, "Configure a ClipDrop API key in config.js for background removal.");
             }
        }

        // 3. Create Sprite
        if (loadingIndicator) loadingIndicator.querySelector('p').textContent = 'Loading character...';
        console.log("Loading texture from final URL:", finalImageUrl);
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            finalImageUrl,
            (texture) => { // onLoad
                if (!texture.image || texture.image.naturalWidth === 0 || texture.image.naturalHeight === 0) {
                     console.error("Texture loaded, but image data seems invalid (width/height is 0). URL:", finalImageUrl);
                     throw new Error("Loaded texture contains no valid image dimensions.");
                 }
                console.log("Texture loaded successfully from:", finalImageUrl);
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.LinearMipmapLinearFilter; // Smoother for shrinking
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.needsUpdate = true; // Ensure texture updates are applied

                const material = new THREE.SpriteMaterial({
                    map: texture,
                    alphaTest: 0.05, // Adjust slightly if needed
                    transparent: true, // Necessary for transparency from background removal
                     sizeAttenuation: false // Optional: prevents sprite size changing with distance (good for ortho)
                });

                const sprite = new THREE.Sprite(material);
                const aspectRatio = texture.image.naturalWidth / texture.image.naturalHeight;
                const spriteHeight = configRef.characterRenderHeight;
                const spriteWidth = spriteHeight * aspectRatio;
                sprite.scale.set(spriteWidth, spriteHeight, 1);

                // Recalculate platform position in case of resize before load finished
                const currentPlatformY = platformRef.position.y;
                const initialY = currentPlatformY + (configRef.platformHeight / 2) + (spriteHeight / 2);
                 const initialX = cameraRef.position.x; // Start centered on camera
                sprite.position.set(initialX, initialY, 0);
                targetPosition.set(initialX, initialY, 0);

                characterSprite = sprite; // Assign to module-level variable
                sceneRef.add(characterSprite);
                console.log("Character sprite added to scene.");

                isMoving = false;
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                if (createButton) createButton.disabled = false;
                if (promptInput) promptInput.disabled = false;
            },
            undefined, // onProgress
            (error) => { // onError
                console.error('Error loading texture:', error, 'Attempted URL:', finalImageUrl);
                 let userMsg = 'Failed to load character texture.';
                 if (finalImageUrl.startsWith('blob:')) {
                    userMsg += ' The background removal might have produced an invalid image, or the generated image was incompatible.';
                } else {
                    userMsg += ' The image generation might have failed or the URL is broken.';
                }
                 // Also check the original image URL if background removal was attempted
                 if (currentCharacterImage.isProcessed && currentCharacterImage.originalUrl) {
                     userMsg += ` Original URL: ${currentCharacterImage.originalUrl}`;
                 }
                displayError(errorMessageDiv, userMsg);

                if (loadingIndicator) loadingIndicator.style.display = 'none';
                if (createButton) createButton.disabled = false;
                if (promptInput) promptInput.disabled = false;
                cleanupCharacterResources(); // Clean up blob URL etc.
            }
        );

    } catch (error) {
        console.error('Error in createCharacter process:', error);
        displayError(errorMessageDiv, `An error occurred: ${error.message}`);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (createButton) createButton.disabled = false;
        if (promptInput) promptInput.disabled = false;
        cleanupCharacterResources();
    }
}


function cleanupCharacterResources() {
    // Revoke previous blob URL if it exists
    if (currentCharacterImage.processedUrl && currentCharacterImage.processedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentCharacterImage.processedUrl);
        console.log("Revoked previous character blob URL:", currentCharacterImage.processedUrl);
    }
    // Reset tracker object
    currentCharacterImage.originalUrl = null;
    currentCharacterImage.processedUrl = null;
    currentCharacterImage.isProcessed = false;
     // Note: Texture and material disposal now happens right before creating the new one
}


// --- Character Movement ---

function onSceneClick(event) {
    if (!characterSprite || !sceneContainerRef || !cameraRef || !platformRef || !configRef) return;

    const rect = sceneContainerRef.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const mouseX = (x / sceneContainerRef.clientWidth) * 2 - 1;
    const vector = new THREE.Vector3(mouseX, 0, 0.5);
    vector.unproject(cameraRef);

    targetPosition.x = vector.x;
    // Ensure Y target is always correct based on current sprite scale and platform position
    targetPosition.y = platformRef.position.y + (configRef.platformHeight / 2) + (characterSprite.scale.y / 2);
    isMoving = true;
}


/**
 * Updates character position and camera based on movement state.
 * Called by the animation loop in scene.js.
 * @param {number} deltaTime Time elapsed since the last frame in seconds.
 */
export function updateCharacterMovement(deltaTime) {
    if (!characterSprite || !configRef || !platformRef || !cameraRef) return; // Ensure refs are valid

    // 1. Ensure Y Position is Correct
    // Recalculate correct Y based on potentially resized platform/sprite
    const correctY = platformRef.position.y + (configRef.platformHeight / 2) + (characterSprite.scale.y / 2);
    if (characterSprite.position.y !== correctY) {
         characterSprite.position.y = correctY;
         // Update target Y as well if it drifted (e.g., due to resize during movement setup)
         targetPosition.y = correctY;
    }


    // 2. Handle X-axis Movement
    if (isMoving) {
        const distanceToTargetX = targetPosition.x - characterSprite.position.x;
        const moveThreshold = 1.5; // Stop if very close

        if (Math.abs(distanceToTargetX) > moveThreshold) {
            const direction = Math.sign(distanceToTargetX);
            // Ensure characterMoveSpeed is defined and positive
            const speed = Math.max(0, configRef.characterMoveSpeed || 250);
            const moveDistance = direction * speed * deltaTime;

            // Prevent overshooting
            if (Math.abs(moveDistance) >= Math.abs(distanceToTargetX)) {
                characterSprite.position.x = targetPosition.x;
                isMoving = false;
            } else {
                characterSprite.position.x += moveDistance;
                 // Flip sprite based on movement direction
                 if (direction < 0 && characterSprite.scale.x > 0) {
                    characterSprite.scale.x *= -1; // Flip left
                } else if (direction > 0 && characterSprite.scale.x < 0) {
                    characterSprite.scale.x *= -1; // Flip right
                }
            }
        } else {
            characterSprite.position.x = targetPosition.x; // Snap to final target
            isMoving = false;
        }
    }

    // 3. Camera Follow (Instant)
    // Place camera follow logic here since it depends on the character's final position for the frame
    cameraRef.position.x = characterSprite.position.x;
    // Note: No need to call camera.updateProjectionMatrix() for orthographic position changes.
}

// Function to potentially get character state if needed elsewhere (use sparingly)
export function getCharacterState() {
    return {
        sprite: characterSprite,
        isMoving,
        targetPosition
    };
}