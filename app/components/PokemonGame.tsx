'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import ReactConfetti from 'react-confetti';
import { fetchRandomPokemon, type Pokemon, type GameMode } from '../services/pokemonService';
import Modal from './Modal';

interface GameState {
  pokemon: Pokemon | null;
  isLoading: boolean;
  isRevealed: boolean;
  userGuess: string;
  timeLeft: number;
  score: number;
  guessesLeft: number;
  isWrongGuess: boolean;
  hint: string;
  mode: GameMode;
  showConfetti: boolean;
}

interface ModeSwitchModal {
  isOpen: boolean;
  targetMode: GameMode | null;
}

export default function PokemonGame() {
  const GAME_DURATION = 30; // seconds
  const [gameState, setGameState] = useState<GameState>({
    pokemon: null,
    isLoading: true,
    isRevealed: false,
    userGuess: '',
    timeLeft: GAME_DURATION,
    score: 0,
    guessesLeft: 3,
    isWrongGuess: false,
    hint: '',
    mode: 'modern',
    showConfetti: false
  });

  const [modeSwitchModal, setModeSwitchModal] = useState<ModeSwitchModal>({
    isOpen: false,
    targetMode: null
  });

  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadNewPokemon();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (!gameState.isRevealed && gameState.timeLeft > 0 && !gameState.isLoading) {
      timer = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeLeft: prev.timeLeft - 1,
          isRevealed: prev.timeLeft - 1 <= 0
        }));
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState.isRevealed, gameState.timeLeft, gameState.isLoading]);

  const getHint = (name: string): string => {
    return `Hint: This Pokemon's name ${name.length > 6 ? 'has ' + name.length + ' letters' : 'starts with ' + name[0].toUpperCase()}`;
  };

  const loadNewPokemon = async () => {
    try {
      let pokemon = await fetchRandomPokemon(gameState.mode);
      // Keep trying until we find a Pokemon with both sprites
      while (!pokemon.sprites.front_default || !pokemon.sprites.back_default) {
        pokemon = await fetchRandomPokemon(gameState.mode);
      }
      
      setGameState(prev => ({
        ...prev,
        pokemon,
        isLoading: false,
        isRevealed: false,
        userGuess: '',
        timeLeft: GAME_DURATION,
        guessesLeft: 3,
        hint: '',
        isWrongGuess: false
      }));
    } catch (error) {
      console.error('Failed to load Pokemon:', error);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameState.pokemon) return;

    const isCorrect = gameState.userGuess.toLowerCase() === gameState.pokemon.name.toLowerCase();
    
    if (isCorrect) {
      setGameState(prev => ({
        ...prev,
        isRevealed: true,
        score: prev.score + Math.ceil((prev.timeLeft + prev.guessesLeft * 5) / 2),
        showConfetti: true
      }));

      // Stop confetti after 5 seconds
      setTimeout(() => {
        setGameState(prev => ({ ...prev, showConfetti: false }));
      }, 5000);
    } else {
      const newGuessesLeft = gameState.guessesLeft - 1;
      setGameState(prev => ({
        ...prev,
        guessesLeft: newGuessesLeft,
        isWrongGuess: true,
        userGuess: '',
        hint: newGuessesLeft === 1 ? getHint(gameState.pokemon!.name) : '',
        isRevealed: newGuessesLeft === 0
      }));

      // Reset shake animation after a short delay
      setTimeout(() => {
        setGameState(prev => ({ ...prev, isWrongGuess: false }));
      }, 500);
    }
  };

  const handleNextPokemon = () => {
    setGameState(prev => ({ ...prev, showConfetti: false }));
    loadNewPokemon();
  };

  const resetGameState = (newMode: GameMode) => {
    // First clear any existing timers by setting isRevealed to true
    setGameState(prev => ({ ...prev, isRevealed: true }));

    // Then reset the entire game state
    setGameState({
      pokemon: null,
      isLoading: true,
      isRevealed: false,
      userGuess: '',
      timeLeft: GAME_DURATION,
      score: 0,
      guessesLeft: 3,
      isWrongGuess: false,
      hint: '',
      mode: newMode,
      showConfetti: false
    });
  };

  const isGameInProgress = (): boolean => {
    const inProgress = !gameState.isRevealed && 
           gameState.timeLeft < GAME_DURATION && 
           gameState.timeLeft > 0;
    console.log('Game in progress check:', inProgress, {
      isRevealed: gameState.isRevealed,
      timeLeft: gameState.timeLeft,
      GAME_DURATION
    });
    return inProgress;
  };

  const handleModeSwitch = (newMode: GameMode) => {
    console.log('Handling mode switch:', { newMode, currentMode: gameState.mode });
    if (gameState.mode === newMode) return;

    if (isGameInProgress()) {
      console.log('Opening modal for mode switch');
      setModeSwitchModal({
        isOpen: true,
        targetMode: newMode
      });
    } else {
      console.log('Switching mode immediately');
      resetGameState(newMode);
      loadNewPokemon();
    }
  };

  const confirmModeSwitch = () => {
    console.log('Confirming mode switch to:', modeSwitchModal.targetMode);
    if (modeSwitchModal.targetMode) {
      resetGameState(modeSwitchModal.targetMode);
      loadNewPokemon();
    }
  };

  if (gameState.isLoading || !gameState.pokemon) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-2xl text-custom-brown">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Modal
        isOpen={modeSwitchModal.isOpen}
        onClose={() => {
          console.log('Closing modal');
          setModeSwitchModal({ isOpen: false, targetMode: null });
        }}
        onConfirm={confirmModeSwitch}
        title="Switch Game Mode?"
        message="Switching game modes will reset your current score and start a new game. Are you sure you want to continue?"
        confirmText="Switch Mode"
        cancelText="Keep Playing"
      />

      <div className="flex flex-col items-center gap-6">
        {gameState.showConfetti && (
          <ReactConfetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.3}
            colors={['#48a4a8', '#d56373', '#d5c17c', '#775948', '#3eb95e']}
          />
        )}
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => handleModeSwitch('classic')}
            className={`px-4 py-2 rounded-full transition-all ${
              gameState.mode === 'classic'
                ? 'bg-custom-rose text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Classic Mode (Gen 1)
          </button>
          <button
            onClick={() => handleModeSwitch('modern')}
            className={`px-4 py-2 rounded-full transition-all ${
              gameState.mode === 'modern'
                ? 'bg-custom-teal text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Modern Mode (All Gens)
          </button>
        </div>

        <div className="relative w-64 h-64 bg-gray-100 rounded-lg overflow-hidden">
          {gameState.pokemon.sprites.front_default && (
            <Image
              src={gameState.pokemon.sprites.front_default}
              alt="Pokemon front view"
              fill
              className={`object-contain transition-opacity duration-500 ${
                gameState.isRevealed ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
          {gameState.pokemon.sprites.back_default && (
            <Image
              src={gameState.pokemon.sprites.back_default}
              alt="Pokemon back view"
              fill
              className={`object-contain transition-opacity duration-500 ${
                gameState.isRevealed ? 'opacity-0' : 'opacity-100'
              } filter brightness-0`}
            />
          )}
        </div>

        <div className="flex gap-4 items-center">
          <div className="text-xl font-bold text-custom-teal">
            Time Left: {gameState.timeLeft}s
          </div>
          <div className="text-lg font-bold text-custom-rose">
            Guesses Left: {gameState.guessesLeft}
          </div>
        </div>

        {gameState.hint && (
          <div className="text-lg text-custom-brown italic">
            {gameState.hint}
          </div>
        )}

        {gameState.isRevealed ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-2xl font-bold text-custom-brown">
              It&apos;s {gameState.pokemon.name.toUpperCase()}!
            </div>
            <button
              onClick={handleNextPokemon}
              className="bg-custom-teal hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-full transition-all"
            >
              Next Pokemon
            </button>
          </div>
        ) : (
          <form onSubmit={handleGuess} className="flex flex-col items-center gap-4">
            <input
              type="text"
              value={gameState.userGuess}
              onChange={(e) => setGameState(prev => ({ ...prev, userGuess: e.target.value }))}
              placeholder="Who's that Pokemon?"
              className={`px-4 py-2 border-2 border-custom-teal rounded-lg focus:outline-none focus:border-custom-brown transition-all ${
                gameState.isWrongGuess ? 'animate-shake' : ''
              }`}
              autoFocus
            />
            <button
              type="submit"
              className="bg-custom-teal hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-full transition-all"
            >
              Guess!
            </button>
          </form>
        )}

        <div className="text-xl font-bold text-custom-rose">
          Score: {gameState.score}
        </div>
      </div>
    </>
  );
} 