'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import ReactConfetti from 'react-confetti';
import { 
  fetchRandomPokemon, 
  fetchRandomPokemonWithChoices,
  type Pokemon, 
  type GameMode,
  type Difficulty 
} from '../services/pokemonService';
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
  difficulty: Difficulty;
  showConfetti: boolean;
  choices: Pokemon[];
  incorrectGuesses: Set<string>;
  shakingGuess: string | null;
}

interface ModeSwitchModal {
  isOpen: boolean;
  targetMode: GameMode | null;
  targetDifficulty: Difficulty | null;
}

const GAME_DURATION = 30; // seconds
const NORMAL_MODE_GUESSES = 3;
const EASY_MODE_GUESSES = 2;

export default function PokemonGame() {
  const getInitialGuesses = (difficulty: Difficulty) => {
    return difficulty === 'easy' ? EASY_MODE_GUESSES : NORMAL_MODE_GUESSES;
  };

  const [gameState, setGameState] = useState<GameState>({
    pokemon: null,
    isLoading: true,
    isRevealed: false,
    userGuess: '',
    timeLeft: GAME_DURATION,
    score: 0,
    guessesLeft: NORMAL_MODE_GUESSES,
    isWrongGuess: false,
    hint: '',
    mode: 'modern',
    difficulty: 'normal',
    showConfetti: false,
    choices: [],
    incorrectGuesses: new Set(),
    shakingGuess: null
  });

  const [modeSwitchModal, setModeSwitchModal] = useState<ModeSwitchModal>({
    isOpen: false,
    targetMode: null,
    targetDifficulty: null
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

  const formatPokemonName = (name: string): string => {
    // Handle hyphenated names
    return name.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('-');
  };

  const loadNewPokemon = async () => {
    try {
      if (gameState.difficulty === 'easy') {
        let result;
        do {
          result = await fetchRandomPokemonWithChoices(gameState.mode);
        } while (!result.correct.sprites.front_default || !result.correct.sprites.back_default);

        console.log('Loaded Pokemon with choices:', result);

        setGameState(prev => ({
          ...prev,
          pokemon: result.correct,
          choices: result.choices,
          isLoading: false,
          isRevealed: false,
          userGuess: '',
          timeLeft: GAME_DURATION,
          guessesLeft: EASY_MODE_GUESSES,
          hint: '',
          isWrongGuess: false,
          incorrectGuesses: new Set(),
          shakingGuess: null
        }));
      } else {
        let pokemon = await fetchRandomPokemon(gameState.mode);
        while (!pokemon.sprites.front_default || !pokemon.sprites.back_default) {
          pokemon = await fetchRandomPokemon(gameState.mode);
        }
        
        setGameState(prev => ({
          ...prev,
          pokemon,
          choices: [],
          isLoading: false,
          isRevealed: false,
          userGuess: '',
          timeLeft: GAME_DURATION,
          guessesLeft: NORMAL_MODE_GUESSES,
          hint: '',
          isWrongGuess: false,
          incorrectGuesses: new Set(),
          shakingGuess: null
        }));
      }
    } catch (error) {
      console.error('Failed to load Pokemon:', error);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleGuess = (guess: string) => {
    if (!gameState.pokemon) return;

    const isCorrect = guess.toLowerCase() === gameState.pokemon.name.toLowerCase();
    
    if (isCorrect) {
      setGameState(prev => ({
        ...prev,
        isRevealed: true,
        score: prev.score + Math.ceil((prev.timeLeft + prev.guessesLeft * 5) / 2),
        showConfetti: true,
        shakingGuess: null
      }));

      setTimeout(() => {
        setGameState(prev => ({ ...prev, showConfetti: false }));
      }, 5000);
    } else {
      const newGuessesLeft = gameState.guessesLeft - 1;
      const newIncorrectGuesses = new Set(gameState.incorrectGuesses);
      newIncorrectGuesses.add(guess);

      setGameState(prev => ({
        ...prev,
        guessesLeft: newGuessesLeft,
        isWrongGuess: true,
        userGuess: '',
        hint: newGuessesLeft === 1 ? getHint(gameState.pokemon!.name) : '',
        isRevealed: newGuessesLeft === 0,
        incorrectGuesses: newIncorrectGuesses,
        shakingGuess: guess
      }));

      setTimeout(() => {
        setGameState(prev => ({ ...prev, shakingGuess: null }));
      }, 500);
    }
  };

  const handleModeSwitch = (newMode: GameMode, newDifficulty: Difficulty) => {
    console.log('Handling mode switch:', { newMode, newDifficulty, currentMode: gameState.mode });
    if (gameState.mode === newMode && gameState.difficulty === newDifficulty) return;

    if (isGameInProgress()) {
      console.log('Opening modal for mode switch');
      setModeSwitchModal({
        isOpen: true,
        targetMode: newMode,
        targetDifficulty: newDifficulty
      });
    } else {
      console.log('Switching mode immediately');
      resetGameState(newMode, newDifficulty);
      loadNewPokemon();
    }
  };

  const confirmModeSwitch = () => {
    console.log('Confirming mode switch to:', modeSwitchModal.targetMode);
    if (modeSwitchModal.targetMode && modeSwitchModal.targetDifficulty) {
      resetGameState(modeSwitchModal.targetMode, modeSwitchModal.targetDifficulty);
      loadNewPokemon();
    }
  };

  const resetGameState = (newMode: GameMode, newDifficulty: Difficulty) => {
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
      guessesLeft: getInitialGuesses(newDifficulty),
      isWrongGuess: false,
      hint: '',
      mode: newMode,
      difficulty: newDifficulty,
      showConfetti: false,
      choices: [],
      incorrectGuesses: new Set(),
      shakingGuess: null
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
          setModeSwitchModal({ isOpen: false, targetMode: null, targetDifficulty: null });
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
        
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleModeSwitch('classic', gameState.difficulty)}
              className={`px-4 py-2 rounded-full transition-all ${
                gameState.mode === 'classic'
                  ? 'bg-custom-rose text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Classic Mode (Gen 1)
            </button>
            <button
              onClick={() => handleModeSwitch('modern', gameState.difficulty)}
              className={`px-4 py-2 rounded-full transition-all ${
                gameState.mode === 'modern'
                  ? 'bg-custom-teal text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Modern Mode (All Gens)
            </button>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleModeSwitch(gameState.mode, 'easy')}
              className={`px-4 py-2 rounded-full transition-all ${
                gameState.difficulty === 'easy'
                  ? 'bg-custom-green text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Easy Mode
            </button>
            <button
              onClick={() => handleModeSwitch(gameState.mode, 'normal')}
              className={`px-4 py-2 rounded-full transition-all ${
                gameState.difficulty === 'normal'
                  ? 'bg-custom-brown text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Normal Mode
            </button>
          </div>
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
              It&apos;s {formatPokemonName(gameState.pokemon.name)}!
            </div>
            <button
              onClick={loadNewPokemon}
              className="bg-custom-teal hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-full transition-all"
            >
              Next Pokemon
            </button>
          </div>
        ) : gameState.difficulty === 'easy' ? (
          <div className="grid grid-cols-1 gap-4 w-full max-w-md">
            {gameState.choices.map((choice) => {
              const isIncorrect = gameState.incorrectGuesses.has(choice.name);
              const isShaking = choice.name === gameState.shakingGuess;
              return (
                <button
                  key={choice.id}
                  onClick={() => handleGuess(choice.name)}
                  className={`w-full px-6 py-3 rounded-full transition-all text-lg font-bold
                    ${isIncorrect ? 'bg-gray-400 hover:bg-gray-400 text-gray-600' : 'bg-custom-teal hover:bg-opacity-90 text-white'}
                    ${isShaking ? 'animate-shake' : ''}
                  `}
                  disabled={isIncorrect}
                >
                  {formatPokemonName(choice.name)}
                </button>
              );
            })}
          </div>
        ) : (
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              handleGuess(gameState.userGuess); 
            }} 
            className="flex flex-col items-center gap-4 w-full max-w-md"
          >
            <input
              type="text"
              value={gameState.userGuess}
              onChange={(e) => setGameState(prev => ({ ...prev, userGuess: e.target.value }))}
              placeholder="Who's that Pokemon?"
              className={`w-full px-4 py-2 border-2 border-custom-teal rounded-lg focus:outline-none focus:border-custom-brown transition-all ${
                gameState.isWrongGuess ? 'animate-shake' : ''
              }`}
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-custom-teal hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-full transition-all"
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