/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func The function to debounce.
 * @param {number} wait The number of milliseconds to delay.
 * @returns {Function} The debounced function.
 */
export function debounce(func, wait) {
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

/**
 * Displays an error message in the designated error div.
 * @param {HTMLElement} errorElement The HTML element to display the error in.
 * @param {string} message The error message to display.
 */
export function displayError(errorElement, message) {
    if (!errorElement) return;
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    // Optional: Style based on FF0000 -> D8000C + FFD2D2
    errorElement.style.color = '#D8000C';
    errorElement.style.backgroundColor = '#FFD2D2';
    errorElement.style.border = '1px solid #D8000C';
    errorElement.style.margin = '10px 0';
    errorElement.style.padding = '10px';
    errorElement.style.borderRadius = '3px';

    console.error("Error Displayed:", message); // Log to console as well
}

/**
 * Clears any existing error message from the designated error div.
 * @param {HTMLElement} errorElement The HTML element to clear the error from.
 */
export function clearError(errorElement) {
    if (!errorElement) return;
    errorElement.textContent = '';
    errorElement.style.display = 'none';
}