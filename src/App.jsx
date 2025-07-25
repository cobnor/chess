import React, {useState,useEffect} from 'react';
import ChessBoard from './components/Board';
import ThemeToggler from './components/ThemeToggler'; // Import the toggler

const startingPosition = [
	['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
	['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
	[null, null, null, null, null, null, null, null],
	[null, null, null, null, null, null, null, null],
	[null, null, null, null, null, null, null, null],
	[null, null, null, null, null, null, null, null],
	['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
	['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
];

/*
const startingPosition = [
	[null, null, null, null, null, "bP", null, null],
	[null, null, null, null, null, null, null, null],
	[null, null, null, null, null, null, null, null],
	["wK", null, null, null, null, null, null, null],
	[null, null, null, null, null, null, null, null],
	["bK", null, null, null, null, null, null, null],
	[null, null, null, null, null, null, null, null],
	[null, null, null, null, null, null, null, "wP"]
];
*/



export default function App() {

  const [isDarkMode, setIsDarkMode] = useState(
      () => typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  );
	const dotColor = isDarkMode
    ? 'rgba(255, 255, 255, 0.125)'
    : 'rgba(0, 0, 0, 0.1)';

	const dotSize = '1px';
	const dotSpacing = '20px';

    useEffect(() => {
        // Ensure this only runs in the browser
        if (typeof window === 'undefined') {
            return;
        }

        const rootHtmlElement = document.documentElement;

        // Function to update state based on class
        const updateTheme = () => {
            setIsDarkMode(rootHtmlElement.classList.contains('dark'));
        };

        // Create an observer instance linked to a callback function
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateTheme();
                    break; // Found class change, no need to check further
                }
            }
        });

        observer.observe(rootHtmlElement, { attributes: true, attributeFilter: ['class'] });
        updateTheme();

        return () => {
            observer.disconnect();
        };
    }, []); 

	return (
		<>

			<div
				className="fixed inset-0 z-[-2] bg-gradient-to-br from-sky-200 to-indigo-300 dark:from-darkGradient1 dark:to-darkGradient2 transition-colors duration-1000"
			/>
			<div
				className="fixed inset-0 z-[-1]"
				style={{
					backgroundImage: `radial-gradient(${dotColor} ${dotSize}, transparent 0)`,
					backgroundSize: `${dotSpacing} ${dotSpacing}`,
					backgroundRepeat: 'repeat',
				}}
			/>

			<p className="font-sans fixed top-2 left-2 z-10 text-white/50 dark:text-white/70 text-4xl drop-shadow-lg font-bold select-none transition-colors duration-1000">
				Chess
			</p>

			<div className="min-h-screen flex items-center justify-center">
				<ChessBoard initialBoard={startingPosition} />
			</div>

			<ThemeToggler />
		</>
	);
}