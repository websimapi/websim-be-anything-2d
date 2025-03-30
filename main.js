import * as THREE from 'three'; 
import { config } from './config.js';
import { initScene, startAnimationLoop, getSceneElements } from './scene.js';
import { createCharacter, setupCharacterControls, updateCharacterMovement } from './character.js';
import { debounce, clearError } from './utils.js'; 


const promptInput = document.getElementById('prompt');
const createButton = document.getElementById('create-button');
const sceneContainer = document.getElementById('scene-container');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessageDiv = document.getElementById('error-message');

function main() {
    clearError(errorMessageDiv); 

    const sceneElements = initScene(sceneContainer, config);

    if (!sceneElements) {
        console.error("Scene initialization failed.");
        return;
    }

    setupCharacterControls({
        sceneContainer,
        camera: sceneElements.camera,
        platform: sceneElements.platform,
        config,
        setCharacterUpdateCallback: (updateFn) => {
            sceneElements.setCharacterUpdate(updateFn);
        }
    });

    const debouncedCreateCharacter = debounce(() => {
        createCharacter({
            promptInput,
            createButton,
            loadingIndicator,
            errorMessageDiv,
            scene: sceneElements.scene,
            camera: sceneElements.camera,
            platform: sceneElements.platform,
            config
        });
    }, 300);

    createButton.addEventListener('click', debouncedCreateCharacter);

    promptInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            debouncedCreateCharacter();
        }
    });

    startAnimationLoop();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}