// aiLogic.js

import { max } from 'three/webgpu';
import { allPossibleMoves, allPossibleMoves as chessAllPossibleMoves } from './chessLogic'; // Make sure castlingRights are passed here
// This function is used by the main thread (Board.jsx) and the AI worker to apply a move
export function doMove(board, move) { // move is [[fromR, fromC], [toR, toC]]
    const newBoard = board.map(row => [...row]);
    const [fromRow, fromCol] = move[0];
    const [toRow, toCol] = move[1];
    let pieceToMove = newBoard[fromRow][fromCol];

    // Standard move: move piece, clear old square
    newBoard[toRow][toCol] = pieceToMove;
    newBoard[fromRow][fromCol] = null;

    // Pawn Promotion
    if (pieceToMove && pieceToMove.charAt(1) === 'P' && (toRow === 0 || toRow === 7)) {
        newBoard[toRow][toCol] = pieceToMove.charAt(0) + 'Q'; // Auto-queen for simplicity
    }

    // Castling: If the king moved two squares, also move the rook
    if (pieceToMove && pieceToMove.charAt(1) === 'K' && Math.abs(fromCol - toCol) === 2) {
        const kingStartCol = 4; // Standard 'e'-file
        let rookFromCol, rookToCol;

        if (toCol > fromCol) { // King-side castle (king moved to g-file)
            // Rook moves from h-file (col 7) to f-file (col 5)
            rookFromCol = kingStartCol + 3; // or simply 7
            rookToCol = kingStartCol + 1;   // or simply 5
        } else { // Queen-side castle (king moved to c-file)
            // Rook moves from a-file (col 0) to d-file (col 3)
            rookFromCol = kingStartCol - 4; // or simply 0
            rookToCol = kingStartCol - 1;   // or simply 3
        }
        // Move the rook: The row (fromRow) is the same as the king's row for castling
        if (newBoard[fromRow][rookFromCol]) { // Check if rook is actually there
            newBoard[fromRow][rookToCol] = newBoard[fromRow][rookFromCol];
            newBoard[fromRow][rookFromCol] = null;
        } else {
            // This should ideally not happen if move generation for castling was correct
            console.error(`[doMove] Castling error: Rook not found at [${fromRow},${rookFromCol}] for move ${JSON.stringify(move)}`);
        }
    }

    return newBoard;
}

// --- Functions below are primarily for the AI worker ---

function evaluate(board, castlingRights) { // + for white winning, - for black winning
    const PIECE_VALUES = {
        'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 100 // K value is for checkmate detection, not material
    };

    // Checkmate/Stalemate detection
    // Note: chessAllPossibleMoves needs castlingRights
    if (chessAllPossibleMoves(board, 'w', castlingRights).length === 0) { // White has no legal moves
        // Check if white king is in check (black to move next, check if black attacks white king)
        let whiteKingPos = null;
        for(let r=0; r<8; r++) for(let c=0; c<8; c++) if(board[r][c] === 'wK') whiteKingPos = {r,c};
        
        if (whiteKingPos && isSquareAttacked(board, whiteKingPos.r, whiteKingPos.c, 'b', castlingRights)) { // castlingRights for isSquareAttacked
            return -10000; // Black wins (checkmate)
        } else {
            return 0; // Stalemate
        }
    }
    if (chessAllPossibleMoves(board, 'b', castlingRights).length === 0) { // Black has no legal moves
        let blackKingPos = null;
        for(let r=0; r<8; r++) for(let c=0; c<8; c++) if(board[r][c] === 'bK') blackKingPos = {r,c};

        if (blackKingPos && isSquareAttacked(board, blackKingPos.r, blackKingPos.c, 'w', castlingRights)) { // castlingRights for isSquareAttacked
            return 10000; // White wins (checkmate)
        } else {
            return 0; // Stalemate
        }
    }


    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece) {
                const player = piece.charAt(0);
                const type = piece.charAt(1);
                const val = PIECE_VALUES[type] || 0; // Default to 0 if type not in PIECE_VALUES (e.g., during testing)
                
                // Basic material score
                if (player === 'w') {
                    score += val;
                } else {
                    score -= val;
                }

                // Positional bonuses (simple example - can be greatly expanded)
                // Example: Pawns in center, knights on outposts, king safety, etc.
                if (type === 'P') {
                    if (player === 'w') {
                        if (r < 4) score += 0.1 * (4 - r); // Bonus for advanced white pawns
                        if ((c === 3 || c === 4) && (r === 4 || r === 3)) score += 0.2; // Center pawns
                    } else {
                        if (r > 3) score -= 0.1 * (r - 3); // Bonus for advanced black pawns
                        if ((c === 3 || c === 4) && (r === 3 || r === 4)) score -= 0.2; // Center pawns
                    }
                }
            }
        }
    }
    return score;
}

import { attacked as isSquareAttacked } from './chessLogic'; // This now directly uses the main one

function getUpdatedCastlingRights(currentRights, move, pieceMoved, boardBeforeMove) {
    const newRights = { ...currentRights };
    const [[fromRow, fromCol]] = move; // Only need fromSquare for piece identity

    if (pieceMoved.endsWith('K')) {
        if (pieceMoved.charAt(0) === 'w') {
            newRights.wK = false; newRights.wQ = false;
        } else {
            newRights.bK = false; newRights.bQ = false;
        }
    }
    if (pieceMoved === 'wR') {
        if (fromRow === 7 && fromCol === 7) newRights.wK = false;
        if (fromRow === 7 && fromCol === 0) newRights.wQ = false;
    }
    if (pieceMoved === 'bR') {
        if (fromRow === 0 && fromCol === 7) newRights.bK = false;
        if (fromRow === 0 && fromCol === 0) newRights.bQ = false;
    }
    // Add logic for rook capture losing rights if necessary (Board.jsx already does this for the main game state)
    return newRights;
}


function maxValue(board, player, alpha, beta, depth, originalPlayer, currentCastlingRights, maxdepth) {
    if (depth >= maxdepth || chessAllPossibleMoves(board, player, currentCastlingRights).length === 0) {
        return evaluate(board, currentCastlingRights);
    }
    let val = -Infinity;
    const actions = chessAllPossibleMoves(board, player, currentCastlingRights);

    for (const a of actions) {
        const pieceBeingMoved = board[a[0][0]][a[0][1]];
        const nextBoard = doMove(board, a);
        const nextCastlingRights = getUpdatedCastlingRights(currentCastlingRights, a, pieceBeingMoved, board);
        val = Math.max(val, minValue(nextBoard, player === 'w' ? 'b' : 'w', alpha, beta, depth + 1, originalPlayer, nextCastlingRights, maxdepth));
        if (val >= beta) {
            return val;
        }
        alpha = Math.max(alpha, val);
    }
    return val;
}

function minValue(board, player, alpha, beta, depth, originalPlayer, currentCastlingRights, maxdepth) {
    if (depth >= maxdepth || chessAllPossibleMoves(board, player, currentCastlingRights).length === 0) {
        return evaluate(board, currentCastlingRights);
    }
    let val = Infinity;
    const actions = chessAllPossibleMoves(board, player, currentCastlingRights);

    for (const a of actions) {
        const pieceBeingMoved = board[a[0][0]][a[0][1]];
        const nextBoard = doMove(board, a);
        const nextCastlingRights = getUpdatedCastlingRights(currentCastlingRights, a, pieceBeingMoved, board);
        val = Math.min(val, maxValue(nextBoard, player === 'w' ? 'b' : 'w', alpha, beta, depth + 1, originalPlayer, nextCastlingRights,maxdepth));
        if (val <= alpha) {
            return val;
        }
        beta = Math.min(beta, val);
    }
    return val;
}

// Minimax needs castlingRights to pass down
function minimax(board, player, castlingRights, maxdepth) {
    const actions = chessAllPossibleMoves(board, player, castlingRights);

    if (actions.length === 0) {
        console.warn("[AI Logic] Minimax found no actions for player:", player);
        return null;
    }

    let bestActions = [];
    let bestScore = player === 'w' ? -Infinity : Infinity;

    for (const a of actions) {
        const pieceBeingMoved = board[a[0][0]][a[0][1]];
        const nextBoard = doMove(board, a); // doMove handles castling board update
        const nextCastlingRights = getUpdatedCastlingRights(castlingRights, a, pieceBeingMoved, board); // Update CR for the simulated move

        let v;
        if (player === 'w') {
            v = minValue(nextBoard, 'b', -Infinity, Infinity, 1, player, nextCastlingRights, maxdepth); // opponent is 'b', depth starts at 1
            if (v > bestScore) {
                bestScore = v;
                bestActions = [a];
            } else if (v === bestScore) {
                bestActions.push(a);
            }
        } else { // player === 'b'
            v = maxValue(nextBoard, 'w', -Infinity, Infinity, 1, player, nextCastlingRights, maxdepth); // opponent is 'w', depth starts at 1
            if (v < bestScore) {
                bestScore = v;
                bestActions = [a];
            } else if (v === bestScore) {
                bestActions.push(a);
            }
        }
    }
    if (bestActions.length === 0) { // Should ideally not happen if actions had items
      console.warn("[AI Logic] Minimax bestActions is empty, returning first available action.");
      return actions[0];
    }
    // console.log(`[AI Logic] Best actions for ${player}:`, JSON.stringify(bestActions), "with score:", bestScore);
    return bestActions[Math.floor(Math.random() * bestActions.length)];
}


export function aiMove(board, player, castlingRights) {
    console.log(`[AI Logic] Calculating move for player: ${player} with CR:`, castlingRights);

    const possibleMoveCount = allPossibleMoves(board,'w').length + allPossibleMoves(board,'b').length;

    const maxdepth = Math.max(Math.min(6, Math.floor(64/possibleMoveCount)),3);
    console.log(`Max depth ${maxdepth}`);

    const move = minimax(board, player, castlingRights,maxdepth);
    if (move) {
        // console.log(`[AI Logic] Chosen move: ${JSON.stringify(move)}`);
    } else {
        console.log(`[AI Logic] No move found (checkmate/stalemate).`);
    }
    return move;
}