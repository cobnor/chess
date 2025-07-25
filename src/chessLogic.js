function getSlidingMoves(board, r, c, player, directions) {
	const currentMoves = [];
	const opponent = player === 'w' ? 'b' : 'w';
	for (const [dr, dc] of directions) {
		for (let i = 1; i < 8; i++) {
			const nextR = r + dr * i;
			const nextC = c + dc * i;
			if (nextR < 0 || nextR >= 8 || nextC < 0 || nextC >= 8) {
                break;
            }
			const pieceAtTarget = board[nextR][nextC];
			if (pieceAtTarget) {
				if (pieceAtTarget.charAt(0) === opponent) {
                    currentMoves.push([nextR, nextC]);
                } else {
                }
				break;
			} else {
				currentMoves.push([nextR, nextC]);
			}
		}
	}
	return currentMoves;
}


function getKnightMoves(board, r, c, player) {
	// console.log(`[getKnightMoves] Called for ${player} at [${r},${c}]`);
	const currentMoves = [];
	const opponent = player === 'w' ? 'b' : 'w';
	const knightOffsets = [
		[-2, -1], [-2, 1], [-1, -2], [-1, 2],
		[1, -2], [1, 2], [2, -1], [2, 1]
	];
	for (const [dr, dc] of knightOffsets) {
		const nextR = r + dr;
		const nextC = c + dc;
		if (nextR >= 0 && nextR < 8 && nextC >= 0 && nextC < 8) {
			const pieceAtTarget = board[nextR][nextC];
			if (!pieceAtTarget || pieceAtTarget.charAt(0) === opponent) {
				currentMoves.push([nextR, nextC]);
			}
		}
	}
	// console.log(`[getKnightMoves] Returning for ${player} at [${r},${c}]:`, JSON.stringify(currentMoves));
	return currentMoves;
}

function getKingMoves(board, r, c, player, castlingRights) {
	// console.log(`[getKingMoves] Called for ${player} at [${r},${c}] with CR:`, castlingRights);
	const currentMoves = [];
	const opponent = player === 'w' ? 'b' : 'w';
	const kingOffsets = [
		[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
	];

	for (const [dr, dc] of kingOffsets) {
		const nextR = r + dr;
		const nextC = c + dc;
		if (nextR >= 0 && nextR < 8 && nextC >= 0 && nextC < 8) {
			const pieceAtTarget = board[nextR][nextC];
			if (!pieceAtTarget || pieceAtTarget.charAt(0) === opponent) {
				currentMoves.push([nextR, nextC]);
			}
		}
	}

    const kingStartRow = (player === 'w') ? 7 : 0;
    const kingStartCol = 4;
    const cr = castlingRights || {};

    if (r === kingStartRow && c === kingStartCol) {
        const canCastleKingSide = (player === 'w' && cr.wK) || (player === 'b' && cr.bK);
        if (canCastleKingSide) {
            // console.log(`[getKingMoves] Checking Kingside Castle for ${player}`);
            if (board[r][kingStartCol + 1] === null && board[r][kingStartCol + 2] === null) {
                // console.log(`[getKingMoves] Path clear for Kingside`);
                if (!attacked(board, r, kingStartCol, opponent, `getKingMoves KS check current`) &&
                    !attacked(board, r, kingStartCol + 1, opponent, `getKingMoves KS check path1`) &&
                    !attacked(board, r, kingStartCol + 2, opponent, `getKingMoves KS check path2`)) {
                    // console.log(`[getKingMoves] Safety checks pass for Kingside`);
                    currentMoves.push([r, kingStartCol + 2]);
                } else {
                    // console.log(`[getKingMoves] Safety checks FAILED for Kingside`);
                }
            } else {
                // console.log(`[getKingMoves] Path NOT clear for Kingside`);
            }
        }

        const canCastleQueenSide = (player === 'w' && cr.wQ) || (player === 'b' && cr.bQ);
        if (canCastleQueenSide) {
            // console.log(`[getKingMoves] Checking Queenside Castle for ${player}`);
            if (board[r][kingStartCol - 1] === null &&
                board[r][kingStartCol - 2] === null &&
                board[r][kingStartCol - 3] === null) {
                // console.log(`[getKingMoves] Path clear for Queenside`);
                if (!attacked(board, r, kingStartCol, opponent, `getKingMoves QS check current`) &&
                    !attacked(board, r, kingStartCol - 1, opponent, `getKingMoves QS check path1`) &&
                    !attacked(board, r, kingStartCol - 2, opponent, `getKingMoves QS check path2`)) {
                    // console.log(`[getKingMoves] Safety checks pass for Queenside`);
                    currentMoves.push([r, kingStartCol - 2]);
                } else {
                    // console.log(`[getKingMoves] Safety checks FAILED for Queenside`);
                }
            } else {
                // console.log(`[getKingMoves] Path NOT clear for Queenside`);
            }
        }
    }
	// console.log(`[getKingMoves] Returning for ${player} at [${r},${c}]:`, JSON.stringify(currentMoves));
	return currentMoves;
}

function findKingPosition(boardToCheck, kingPieceString) {
    // console.log(`[findKingPosition] Searching for ${kingPieceString}`);
	for (let r_idx = 0; r_idx < 8; r_idx++) {
		for (let c_idx = 0; c_idx < 8; c_idx++) {
			if (boardToCheck[r_idx][c_idx] === kingPieceString) {
                // console.log(`[findKingPosition] Found ${kingPieceString} at [${r_idx},${c_idx}]`);
				return { row: r_idx, col: c_idx };
			}
		}
	}
    console.error(`[findKingPosition] KING ${kingPieceString} NOT FOUND!`);
	return null;
}

// --- Exported Functions ---

export function possibleMoves(board, fromRow, fromCol, currentPlayer, castlingRights, isForAttackCheckLogicOnly = false) {
	const pieceToMove = board[fromRow][fromCol];
    const logPrefix = isForAttackCheckLogicOnly ? "[PM ATTACK ONLY]" : "[possibleMoves]";

	const pseudoLegalMoves = [];

	if (!pieceToMove || pieceToMove.charAt(0) !== currentPlayer) {
		return pseudoLegalMoves;
	}

	const pieceType = pieceToMove.substring(1);
	const opponent = currentPlayer === 'w' ? 'b' : 'w';

	if (pieceType === 'P') {
		if (currentPlayer === 'w') {
			if (fromRow > 0 && !board[fromRow - 1][fromCol]) {
				pseudoLegalMoves.push([fromRow - 1, fromCol]);
				if (fromRow === 6 && !board[fromRow - 2][fromCol]) pseudoLegalMoves.push([fromRow - 2, fromCol]);
			}
			if (fromRow > 0 && fromCol > 0 && board[fromRow - 1][fromCol - 1] && board[fromRow - 1][fromCol - 1].charAt(0) === 'b') pseudoLegalMoves.push([fromRow - 1, fromCol - 1]);
			if (fromRow > 0 && fromCol < 7 && board[fromRow - 1][fromCol + 1] && board[fromRow - 1][fromCol + 1].charAt(0) === 'b') pseudoLegalMoves.push([fromRow - 1, fromCol + 1]);
		} else {
			if (fromRow < 7 && !board[fromRow + 1][fromCol]) {
				pseudoLegalMoves.push([fromRow + 1, fromCol]);
				if (fromRow === 1 && !board[fromRow + 2][fromCol]) pseudoLegalMoves.push([fromRow + 2, fromCol]);
			}
			if (fromRow < 7 && fromCol > 0 && board[fromRow + 1][fromCol - 1] && board[fromRow + 1][fromCol - 1].charAt(0) === 'w') pseudoLegalMoves.push([fromRow + 1, fromCol - 1]);
			if (fromRow < 7 && fromCol < 7 && board[fromRow + 1][fromCol + 1] && board[fromRow + 1][fromCol + 1].charAt(0) === 'w') pseudoLegalMoves.push([fromRow + 1, fromCol + 1]);
		}
	} else if (pieceType === 'R') {
		const rookDirections = [[0, 1], [0, -1], [1, 0], [-1, 0]];
		pseudoLegalMoves.push(...getSlidingMoves(board, fromRow, fromCol, currentPlayer, rookDirections));
	} else if (pieceType === 'N') {
		pseudoLegalMoves.push(...getKnightMoves(board, fromRow, fromCol, currentPlayer));
	} else if (pieceType === 'B') {
		const bishopDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
		pseudoLegalMoves.push(...getSlidingMoves(board, fromRow, fromCol, currentPlayer, bishopDirections));
	} else if (pieceType === 'Q') {
		const queenDirections = [[0, 1], [0, -1], [1, 0], [-1, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]];
		pseudoLegalMoves.push(...getSlidingMoves(board, fromRow, fromCol, currentPlayer, queenDirections));
	} else if (pieceType === 'K') {
        let kingCR = castlingRights;
        if (isForAttackCheckLogicOnly) {
            kingCR = { wK: false, wQ: false, bK: false, bQ: false };
        }
		pseudoLegalMoves.push(...getKingMoves(board, fromRow, fromCol, currentPlayer, kingCR));
	}


	if (isForAttackCheckLogicOnly) {
        const filteredPseudo = pseudoLegalMoves.filter(
			move => move[0] >= 0 && move[0] < 8 && move[1] >= 0 && move[1] < 8
		);
		return filteredPseudo;
	}

	const legalMoves = [];
	const playerKingPiece = currentPlayer + 'K';
    const kingStartCol = 4;

	for (const move of pseudoLegalMoves) {
		const [toRow, toCol] = move;
		const tempBoard = board.map(r => r.slice());

        if (pieceType === 'K' && Math.abs(fromCol - toCol) === 2) {
            tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
            tempBoard[fromRow][fromCol] = null;
            const rookStartCol = (toCol > fromCol) ? 7 : 0;
            const rookEndCol = (toCol > fromCol) ? kingStartCol + 1 : kingStartCol - 1;
            if (tempBoard[fromRow][rookStartCol]) {
                 tempBoard[fromRow][rookEndCol] = tempBoard[fromRow][rookStartCol];
                 tempBoard[fromRow][rookStartCol] = null;
            }
            
        } else {
            tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
            tempBoard[fromRow][fromCol] = null;
        }

		let kingPosOnTempBoard;
		if (pieceType === 'K') {
			kingPosOnTempBoard = { row: toRow, col: toCol };
		} else {
			kingPosOnTempBoard = findKingPosition(tempBoard, playerKingPiece);
		}

		if (!kingPosOnTempBoard) {
            continue;
        }

        const isKingAttacked = attacked(tempBoard, kingPosOnTempBoard.row, kingPosOnTempBoard.col, opponent, `PM Safety Check for ${pieceToMove} to [${toRow},${toCol}]`);

		if (!isKingAttacked) {
			legalMoves.push(move);
		} else {
        }
	}

    const finalFilteredMoves = legalMoves.filter(
		m => m[0] >= 0 && m[0] < 8 && m[1] >= 0 && m[1] < 8
	);
	return finalFilteredMoves;
}

export function isMoveValid(board, fromRow, fromCol, toRow, toCol, currentPlayer, castlingRights) {
    console.log(`[isMoveValid CALLED] For ${currentPlayer} from [${fromRow},${fromCol}] to [${toRow},${toCol}], CR:`, castlingRights);
	const piece = board[fromRow][fromCol];
	if (!piece || piece.charAt(0) !== currentPlayer) {
        return false;
    }
	const moves = possibleMoves(board, fromRow, fromCol, currentPlayer, castlingRights);
    const isValid = moves.some(move => move[0] === toRow && move[1] === toCol);
	return isValid;
}

export function allPossibleMoves(board, player, castlingRights) {
    const allMoves = [];
    const BOARD_SIZE = board.length;
    if (!board || BOARD_SIZE === 0 || board[0].length !== BOARD_SIZE) {
        console.error("[allPossibleMoves] Invalid board provided.");
        return allMoves;
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const pieceCode = board[r][c];
            if (pieceCode && pieceCode.charAt(0) === player) {
                // console.log(`[allPossibleMoves] Getting moves for ${pieceCode} at [${r},${c}]`);
                const fromSquare = [r, c];
                const movesForThisPiece = possibleMoves(board, r, c, player, castlingRights);
                for (const toSquare of movesForThisPiece) {
                    allMoves.push([fromSquare, toSquare]);
                }
            }
        }
    }
    return allMoves;
}

export function attacked(board, targetRow, targetCol, attackingPlayer, context = "N/A") {
	for (let pieceRow = 0; pieceRow < 8; pieceRow++) {
		for (let pieceCol = 0; pieceCol < 8; pieceCol++) {
			const pieceOnBoard = board[pieceRow][pieceCol];
			if (pieceOnBoard && pieceOnBoard.charAt(0) === attackingPlayer) {
                // console.log(`[ATTACKED] Found ${attackingPlayer} piece ${pieceOnBoard} at [${pieceRow},${pieceCol}]`);
				const pieceType = pieceOnBoard.charAt(1);
				if (pieceType === 'P') {
					const direction = attackingPlayer === 'w' ? -1 : 1;
					if (targetRow === pieceRow + direction) {
						if (targetCol === pieceCol - 1 || targetCol === pieceCol + 1) {
                            return true;
                        }
					}
				} else {
                    // console.log(`[ATTACKED] Getting raw moves for attacking piece ${pieceOnBoard} at [${pieceRow},${pieceCol}] (checking for [${targetRow},${targetCol}])`);
					const moves = possibleMoves(board, pieceRow, pieceCol, attackingPlayer, null, true); // CR is null, isForAttackCheckLogicOnly = true
					if (Array.isArray(moves) && moves.some(move => move[0] === targetRow && move[1] === targetCol)) {
						return true;
					}
				}
			}
		}
	}
	return false;
}