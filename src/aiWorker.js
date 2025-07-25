// ./src/aiWorker.js

// Import the main AI function from aiLogic.js
// aiLogic.js should be structured to handle its own dependencies (like chessLogic.js).
import { aiMove } from './aiLogic.js';

self.onmessage = function(event) {
    // Destructure board, player, AND castlingRights from event.data
    const { board, player, castlingRights } = event.data;

    // Validate all required data
    if (!board || !player || castlingRights === undefined) { // Check for undefined specifically
        console.error('[Worker] Invalid data received. Board, player, or castlingRights missing:', event.data);
        self.postMessage({ type: 'AIMOVES_ERROR', error: 'Invalid data received by worker (board, player, or castlingRights missing).' });
        return;
    }
    
    console.log('[Worker] Received task: Calculate AI move for player:', player, 'with CR:', castlingRights);
    try {
        // Call the imported AI move calculation function from aiLogic.js,
        // passing along the board, player, and castlingRights.
        const move = aiMove(board, player, castlingRights); 
        
        if (move) {
            console.log('[Worker] Calculated AI move:', move);
            self.postMessage({ type: 'AIMOVES_CALCULATED', move: move });
        } else {
            // This case handles scenarios where aiMove returns null (e.g., checkmate or stalemate).
            console.warn('[Worker] AI could not find a move (likely checkmate or stalemate).');
            self.postMessage({ type: 'AIMOVES_CALCULATED', move: null }); 
        }
    } catch (error) {
        console.error('[Worker] Error during AI move calculation:', error);
        // Send back the error message for the main thread to handle or log.
        self.postMessage({ type: 'AIMOVES_ERROR', error: error.message || 'Unknown error in AI worker' });
    }
};

self.onerror = function(event) {
    console.error('[Worker] Unhandled error in worker:', event.message, event.filename, event.lineno);
};