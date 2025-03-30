import * as THREE from 'three';
import { config as appConfig } from './config.js'; // Use a different name to avoid conflict

let scene, camera, renderer;
let platform;
let sceneContainerRef; // Reference to the DOM container
let characterUpdateCallback = null; // Function to call for character updates
let lastTime = 0;

/**
 * Initializes the Three.js scene, camera, renderer, and platform.
 * @param {HTMLElement} sceneContainer The container element for the scene.
 * @param {object} config The application configuration.
 * @returns {object|null} An object containing scene elements { scene, camera, renderer, platform, setCharacterUpdate } or null on failure.
 */
export function initScene(sceneContainer, config) {
    if (!sceneContainer) {
        console.error("Scene container element not found.");
        return null;
    }
    sceneContainerRef = sceneContainer; // Store reference for resize handler

    try {
        const containerWidth = sceneContainer.clientWidth;
        const containerHeight = sceneContainer.clientHeight;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(config.backgroundColor);

        // Orthographic Camera
        camera = new THREE.OrthographicCamera(
            containerWidth / -2, containerWidth / 2,
            containerHeight / 2, containerHeight / -2,
            1, 1000
        );
        camera.position.z = 10;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(containerWidth, containerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        sceneContainer.innerHTML = ''; // Clear previous canvas if any
        sceneContainer.appendChild(renderer.domElement);

        // Ground Platform
        const platformGeometry = new THREE.PlaneGeometry(1000000, config.platformHeight);
        const platformMaterial = new THREE.MeshBasicMaterial({ color: config.platformColor, side: THREE.DoubleSide });
        platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = (-containerHeight / 2) + (config.platformHeight / 2);
        scene.add(platform);

        // Add resize listener
        window.addEventListener('resize', onWindowResize, false);

        return {
            scene,
            camera,
            renderer,
            platform,
            // Provide a way for other modules to register their update logic
            setCharacterUpdate: (callback) => {
                characterUpdateCallback = callback;
            }
        };
    } catch (error) {
        console.error("Error initializing Three.js scene:", error);
        // Optionally display an error to the user via a utility function if available here
        return null;
    }
}

function onWindowResize() {
    if (!sceneContainerRef || !camera || !renderer || !platform) return;

    const containerWidth = sceneContainerRef.clientWidth;
    const containerHeight = sceneContainerRef.clientHeight;

    camera.left = containerWidth / -2;
    camera.right = containerWidth / 2;
    camera.top = containerHeight / 2;
    camera.bottom = containerHeight / -2;
    camera.updateProjectionMatrix();

    renderer.setSize(containerWidth, containerHeight);

    // Adjust platform position
    platform.position.y = (-containerHeight / 2) + (appConfig.platformHeight / 2);

    // Character position adjustment should be handled within the character module's update loop
    // or triggered via a callback if necessary during resize.
}

function animate(time) {
    requestAnimationFrame(animate);

    const now = time * 0.001; // Convert time to seconds
    const deltaTime = Math.min(0.1, now - (lastTime || now)); // Cap delta time
    lastTime = now;

    // Call the character update function if it's registered
    if (characterUpdateCallback) {
        characterUpdateCallback(deltaTime); // Pass deltaTime
    }

    // Camera follow logic might be better placed within the character update logic
    // if it depends directly on the character's current state.
    // If camera follows characterSprite directly:
    // if (characterSprite) { // Assuming characterSprite is accessible or passed
    //     camera.position.x = characterSprite.position.x;
    // }


    if (renderer && scene && camera) {
       renderer.render(scene, camera);
    }
}

/**
 * Starts the main animation loop.
 */
export function startAnimationLoop() {
    lastTime = performance.now() * 0.001; // Initialize lastTime
    animate(performance.now()); // Start the loop
}

/**
 * Utility function to get scene elements if needed by other modules directly.
 * Avoid direct manipulation outside this module if possible.
 */
export function getSceneElements() {
    return { scene, camera, renderer, platform };
}