export const config = {
  // IMPORTANT: Get your free API key from https://clipdrop.co/
  // If you leave this empty or 'YOUR_CLIPDROP_API_KEY', background removal will be skipped.
  backgroundRemovalApiKey: 'YOUR_CLIPDROP_API_KEY', // <-- PASTE YOUR CLIPDROP_API_KEY HERE

  // Image generation settings
  imageSize: { width: 512, height: 512 }, // Requested size for image generation (aspect ratio may override)

  // Scene object settings
  characterRenderHeight: 100, // How tall the character sprite appears in the scene (pixels)
  characterMoveSpeed: 250,   // How fast the character walks (pixels per second)
  platformColor: 0xaaaaaa,   // Color of the ground platform (hexadecimal)
  platformHeight: 50,        // Thickness of the platform (pixels)
  backgroundColor: 0x87CEEB, // Color of the scene background (sky blue - hexadecimal)
};