import React, { useState, useEffect, useRef } from 'react';
import { isMoveValid, possibleMoves, attacked } from '../chessLogic';
import { doMove } from '../aiLogic';

const PIECE_IMAGES = {
	wK: '/pieces/king-w.svg', wQ: '/pieces/queen-w.svg', wR: '/pieces/rook-w.svg', wB: '/pieces/bishop-w.svg', wN: '/pieces/knight-w.svg', wP: '/pieces/pawn-w.svg',
	bK: '/pieces/king-b.svg', bQ: '/pieces/queen-b.svg', bR: '/pieces/rook-b.svg', bB: '/pieces/bishop-b.svg', bN: '/pieces/knight-b.svg', bP: '/pieces/pawn-b.svg',
};
const BOARD_SIZE = 8;
const INITIAL_CASTLING_RIGHTS = {
    wK: true, wQ: true, bK: true, bQ: true
};

function updateCastlingRightsAfterMove(currentRights, move, pieceMoved, boardBeforeMove) {
    const newRights = { ...currentRights };
    const [[fromRow, fromCol], [toRow, toCol]] = move;
    const player = pieceMoved.charAt(0);

    if (pieceMoved.endsWith('K')) {
        if (player === 'w') {
            newRights.wK = false;
            newRights.wQ = false;
        } else {
            newRights.bK = false;
            newRights.bQ = false;
        }
    }

    if (fromRow === 7 && fromCol === 7 && boardBeforeMove[7][7] === 'wR') newRights.wK = false;
    if (fromRow === 7 && fromCol === 0 && boardBeforeMove[7][0] === 'wR') newRights.wQ = false;
    if (fromRow === 0 && fromCol === 7 && boardBeforeMove[0][7] === 'bR') newRights.bK = false;
    if (fromRow === 0 && fromCol === 0 && boardBeforeMove[0][0] === 'bR') newRights.bQ = false;

    if (toRow === 7 && toCol === 7 && boardBeforeMove[7][7] === 'wR') newRights.wK = false;
    if (toRow === 7 && toCol === 0 && boardBeforeMove[7][0] === 'wR') newRights.wQ = false;
    if (toRow === 0 && toCol === 7 && boardBeforeMove[0][7] === 'bR') newRights.bK = false;
    if (toRow === 0 && toCol === 0 && boardBeforeMove[0][0] === 'bR') newRights.bQ = false;

    return newRights;
}


export default function ChessBoard({ initialBoard }) {
	const [board, setBoard] = useState(initialBoard);
	const [currentPlayer, setCurrentPlayer] = useState('w');
	const [selectedPiece, setSelectedPiece] = useState(null);
	const [highlightedMoves, setHighlightedMoves] = useState([]);
	const [opponentAttackedSquares, setOpponentAttackedSquares] = useState([]);
	const [aiPlayer, setAiPlayer] = useState(null);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [castlingRights, setCastlingRights] = useState(INITIAL_CASTLING_RIGHTS);

    const aiWorkerRef = useRef(null);

    useEffect(() => {
        const worker = new Worker(new URL('../aiWorker.js', import.meta.url), { type: 'module' });
        aiWorkerRef.current = worker;

        worker.onmessage = (event) => {
            const { type, move, error } = event.data;
            setIsAiThinking(false);

            if (type === 'AIMOVES_CALCULATED') {
                if (move) {
                    console.log("[Main] AI Worker returned move:", move);
                    const pieceMoved = board[move[0][0]][move[0][1]]; 
                    const newBoard = doMove(board, move); 
                    const newCastlingRights = updateCastlingRightsAfterMove(castlingRights, move, pieceMoved, board);

                    setBoard(newBoard);
                    setCastlingRights(newCastlingRights);
                    setCurrentPlayer(prevPlayer => (prevPlayer === 'w' ? 'b' : 'w'));
                } else {
                    console.log("[Main] AI returned no move (checkmate/stalemate or error).");
                }
            } else if (type === 'AIMOVES_ERROR') {
                console.error("[Main] AI Worker Error:", error);
            }
        };

        worker.onerror = (error) => {
            console.error("[Main] AI Worker encountered an unhandled error:", error);
            setIsAiThinking(false);
        };

        return () => {
            console.log("[Main] Terminating AI worker");
            if (aiWorkerRef.current) {
                aiWorkerRef.current.terminate();
                aiWorkerRef.current = null;
            }
        };
    }, [board, castlingRights]); 

	function calculateAndSetHighlights(row, col) {
		const piece = board[row][col];
		if (piece && piece.charAt(0) === currentPlayer) {
			setSelectedPiece({ row, col });
			const moves = possibleMoves(board, row, col, currentPlayer, castlingRights);
			setHighlightedMoves(Array.isArray(moves) ? moves : []);
		} else {
			setSelectedPiece(null);
			setHighlightedMoves([]);
		}
	}

	function handleSquareClick(clickedRow, clickedCol) {
        if (isAiThinking && currentPlayer === aiPlayer) return;

		const pieceAtClicked = board[clickedRow][clickedCol];

		if (selectedPiece) {
			const { row: fromRow, col: fromCol } = selectedPiece;
			const isTargetHighlighted = highlightedMoves.some(
				move => move[0] === clickedRow && move[1] === clickedCol
			);

			if (isTargetHighlighted) {
                // Pass current castlingRights to isMoveValid
				if (isMoveValid(board, fromRow, fromCol, clickedRow, clickedCol, currentPlayer, castlingRights)) {
                    const moveArray = [[fromRow, fromCol], [clickedRow, clickedCol]];
                    const pieceToMove = board[fromRow][fromCol];

                    const newBoard = doMove(board, moveArray); // aiLogic.doMove
                    const newCastlingRights = updateCastlingRightsAfterMove(castlingRights, moveArray, pieceToMove, board);

					setBoard(newBoard);
                    setCastlingRights(newCastlingRights);
					setCurrentPlayer(prevPlayer => (prevPlayer === 'w' ? 'b' : 'w'));
					setSelectedPiece(null);
					setHighlightedMoves([]);
				} else {
					console.warn("Clicked highlighted move was deemed invalid by isMoveValid. Deselecting.");
					setSelectedPiece(null);
					setHighlightedMoves([]);
				}
			} else {
				if (pieceAtClicked && pieceAtClicked.charAt(0) === currentPlayer) {
					calculateAndSetHighlights(clickedRow, clickedCol);
				} else {
					setSelectedPiece(null);
					setHighlightedMoves([]);
				}
			}
		} else {
			if (pieceAtClicked && pieceAtClicked.charAt(0) === currentPlayer) {
				calculateAndSetHighlights(clickedRow, clickedCol);
			}
		}
	}

	function handleDragStart(e, row, col) {
        if (isAiThinking && currentPlayer === aiPlayer) {
             e.preventDefault(); return;
        }
		const piece = board[row][col];
		if (!piece || piece.charAt(0) !== currentPlayer) {
			e.preventDefault(); return;
		}
		calculateAndSetHighlights(row, col); 
		e.dataTransfer.setData('application/json', JSON.stringify({ fromRow: row, fromCol: col }));
	}

	function handleDragOver(e) {
		e.preventDefault();
	}

	function handleDrop(e, toRow, toCol) {
		e.preventDefault();
        if (isAiThinking && currentPlayer === aiPlayer) return;

		const data = JSON.parse(e.dataTransfer.getData('application/json'));
		const { fromRow, fromCol } = data;

		setSelectedPiece(null);
		setHighlightedMoves([]);

		if (fromRow === toRow && fromCol === toCol) return;
		const pieceToMove = board[fromRow][fromCol];
		if (!pieceToMove || pieceToMove.charAt(0) !== currentPlayer) return;

		if (isMoveValid(board, fromRow, fromCol, toRow, toCol, currentPlayer, castlingRights)) {
            const moveArray = [[fromRow, fromCol], [toRow, toCol]];
            
            const newBoard = doMove(board, moveArray); 
            const newCastlingRights = updateCastlingRightsAfterMove(castlingRights, moveArray, pieceToMove, board);

			setBoard(newBoard);
            setCastlingRights(newCastlingRights);
			setCurrentPlayer(prevPlayer => (prevPlayer === 'w' ? 'b' : 'w'));
		} else {
			console.log(`Invalid move from [${fromRow},${fromCol}] to [${toRow},${toCol}] (drop).`);
		}
	}

	useEffect(() => {
        if (aiPlayer && currentPlayer === aiPlayer && aiWorkerRef.current && !isAiThinking) {
            setIsAiThinking(true);
            console.log(`[Main] Posting task to AI worker for player: ${aiPlayer}`);
            const boardCopy = JSON.parse(JSON.stringify(board));
            // Send current castlingRights to AI worker
            const castlingRightsCopy = JSON.parse(JSON.stringify(castlingRights));
            aiWorkerRef.current.postMessage({ board: boardCopy, player: aiPlayer, castlingRights: castlingRightsCopy });
        }

		const opponent = currentPlayer === 'w' ? 'b' : 'w';
		const newAttackedSquares = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (attacked(board, r, c, opponent)) { 
                    newAttackedSquares.push([r, c]);
                }
            }
        }
		setOpponentAttackedSquares(newAttackedSquares);

	}, [board, currentPlayer, aiPlayer, isAiThinking, castlingRights]); 
    function handleAiPlayerCheckboxChange(event) {
        const isChecked = event.target.checked;
        setAiPlayer(isChecked ? 'b' : null);
    }

	if (!Array.isArray(board) || board.length !== BOARD_SIZE || !board.every(row => Array.isArray(row) && row.length === BOARD_SIZE)) {
		console.error('`initialBoard` prop must be an 8x8 array.');
		return <div>Error: Invalid board data provided.</div>;
	}

	return (
		<div className="w-full h-full flex flex-col items-center justify-center">
			<div className="mb-4 text-xl font-bold dark:text-white/80 drop-shadow-md">
				{isAiThinking && currentPlayer === aiPlayer
                    ? `AI (${aiPlayer === 'w' ? 'White' : 'Black'}) is thinking...`
                    : `${currentPlayer === 'w' ? 'White' : 'Black'}'s turn`}
			</div>
            {/* Display Castling Rights (for debugging)
            <div className="text-xs dark:text-white/60 mb-2">
                CR: wK:{castlingRights.wK.toString()} wQ:{castlingRights.wQ.toString()} bK:{castlingRights.bK.toString()} bQ:{castlingRights.bQ.toString()}
            </div>
            */}
			<div className={`w-[80vmin] h-[80vmin] bg-white/20 backdrop-blur-lg rounded-3xl shadow-2xl p-8 flex items-center justify-center ${isAiThinking && currentPlayer === aiPlayer ? 'opacity-70 cursor-wait' : ''}`}>
				<div
					className={`
						grid grid-cols-8 grid-rows-8 w-full h-full gap-0
						rounded-2xl overflow-hidden shadow-lg backdrop-blur-md bg-white/30
                        ${isAiThinking && currentPlayer === aiPlayer ? 'pointer-events-none' : ''}
					`}
				>
					{board.map((rowArr, r_idx) =>
						rowArr.map((pieceCode, c_idx) => {
							const isLight = (r_idx + c_idx) % 2 === 0;
							const imgSrc = pieceCode ? PIECE_IMAGES[pieceCode] : null;
							const canDrag = pieceCode && pieceCode.charAt(0) === currentPlayer && !(isAiThinking && currentPlayer === aiPlayer);

							const isCurrentlySelected = selectedPiece && selectedPiece.row === r_idx && selectedPiece.col === c_idx;
							const isMoveHighlighted = highlightedMoves.some(move => move[0] === r_idx && move[1] === c_idx);
							// const isOpponentAttacked = opponentAttackedSquares.some(sq => sq[0] === r_idx && sq[1] === c_idx);

							const squareClasses = ['relative', 'aspect-square', 'flex', 'items-center', 'justify-center'];

							// let attackDisplayEnabled = false; // Keep this false unless debugging attacks
                            // if (isOpponentAttacked && attackDisplayEnabled) {
							// 	squareClasses.push(isLight ? 'bg-red-600/30' : 'bg-red-500/30');
							// } else {
                                squareClasses.push(isLight ? 'bg-white/30' : 'bg-black/20');
                            // }

							if (isCurrentlySelected) {
								squareClasses.push('ring-2', 'ring-yellow-400/80', 'ring-inset');
							} else if (isMoveHighlighted) {
								if (pieceCode && pieceCode.charAt(0) !== currentPlayer) { // Capturable piece
									squareClasses.push('ring-2', 'ring-red-400', 'ring-inset');
								}
							}

							return (
								<div
									key={`${r_idx}-${c_idx}`}
									className={squareClasses.join(' ')}
									onClick={() => handleSquareClick(r_idx, c_idx)}
									onDragOver={handleDragOver}
									onDrop={e => handleDrop(e, r_idx, c_idx)}
								>
									{isMoveHighlighted && !pieceCode && !isCurrentlySelected && (
										<div className="absolute w-1/3 h-1/3 bg-neutral-900/40 rounded-full pointer-events-none"></div>
									)}
									{imgSrc && (
										<img
											src={imgSrc}
											alt={pieceCode || ''}
											draggable={canDrag}
											onDragStart={e => handleDragStart(e, r_idx, c_idx)}
											className={`w-full h-full object-contain drop-shadow-md select-none ${canDrag ? 'cursor-grab' : 'cursor-default'}`}
										/>
									)}
								</div>
							);
						})
					)}
				</div>
			</div>

            <div className="mt-4 inline-flex items-center">
                <label className="flex items-center cursor-pointer relative">
                    <input
                        type="checkbox"
                        id="aiPlayerCheckbox"
                        checked={!!aiPlayer}
                        onChange={handleAiPlayerCheckboxChange}
                        disabled={isAiThinking && currentPlayer === aiPlayer}
                        className="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded shadow hover:shadow-md border-2 border-slate-800 dark:border-white/50  checked:bg-slate-800 checked:border-slate-800"
                    />
                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                    </span>
                </label>
                <label htmlFor="aiPlayerCheckbox" className={`ml-2 text-sm dark:text-white/80 ${(isAiThinking && currentPlayer === aiPlayer) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                    AI Player (plays Black)
                </label>
            </div>
		</div>
	);
}