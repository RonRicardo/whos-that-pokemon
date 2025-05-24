'use client';

import { useState, useEffect, useCallback } from 'react';
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
import GameSummaryModal from './GameSummaryModal';

interface PrefetchedRound {
  pokemon: Pokemon;
  choices: Pokemon[];
}

interface GameState {
  pokemon: Pokemon | null;
  isLoading: boolean;
  isRevealed: boolean;
  userGuess: string;
  timeLeft: number;
  score: number;
  highScore: number;
  guessesLeft: number;
  isWrongGuess: boolean;
  hint: string;
  mode: GameMode;
  difficulty: Difficulty;
  showConfetti: boolean;
  choices: Pokemon[];
  incorrectGuesses: Set<string>;
  shakingGuess: string | null;
  correctGuesses: Pokemon[];
  roundsPlayed: number;
  prefetchedPokemon: PrefetchedRound[];
  currentRoundIndex: number;
  usedPokemonIds: Set<number>;
  disabledChoices: Set<string>;
}

interface ModeSwitchModal {
  isOpen: boolean;
  targetMode: GameMode | null;
  targetDifficulty: Difficulty | null;
}

const GAME_DURATION = 30; // seconds
const NORMAL_MODE_GUESSES = 3;
const EASY_MODE_GUESSES = 2;
const ROUNDS_PER_GAME = 5;
const REVEAL_DURATION = 2500; // 2.5 seconds to show the revealed Pokemon
const CONFETTI_DURATION = 2000; // 2 seconds for confetti

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
    highScore: 0,
    guessesLeft: NORMAL_MODE_GUESSES,
    isWrongGuess: false,
    hint: '',
    mode: 'modern',
    difficulty: 'normal',
    showConfetti: false,
    choices: [],
    incorrectGuesses: new Set(),
    shakingGuess: null,
    correctGuesses: [],
    roundsPlayed: 0,
    prefetchedPokemon: [],
    currentRoundIndex: 0,
    usedPokemonIds: new Set(),
    disabledChoices: new Set()
  });

  const [modeSwitchModal, setModeSwitchModal] = useState<ModeSwitchModal>({
    isOpen: false,
    targetMode: null,
    targetDifficulty: null
  });

  const [showSummary, setShowSummary] = useState(false);

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

  const prefetchPokemonForGame = useCallback(async (mode: GameMode, difficulty: Difficulty) => {
    setGameState(prev => ({ ...prev, isLoading: true }));
    try {
      const prefetchedData: PrefetchedRound[] = [];
      let retryCount = 0;
      const MAX_RETRIES = 3;
      const usedIds = new Set<number>();

      while (prefetchedData.length < ROUNDS_PER_GAME && retryCount < MAX_RETRIES) {
        try {
          if (difficulty === 'easy') {
            const result = await fetchRandomPokemonWithChoices(mode, 3, usedIds);
            // Validate all Pokemon have required sprites
            const allSpritesValid = [result.correct, ...result.choices].every(pokemon => 
              pokemon.sprites.front_default && pokemon.sprites.back_default
            );
            if (allSpritesValid) {
              // Add all Pokemon IDs to used set to prevent duplicates
              [result.correct, ...result.choices].forEach(pokemon => {
                usedIds.add(pokemon.id);
              });
              prefetchedData.push({
                pokemon: result.correct,
                choices: result.choices
              });
            }
          } else {
            const pokemon = await fetchRandomPokemon(mode);
            if (pokemon.sprites.front_default && pokemon.sprites.back_default && !usedIds.has(pokemon.id)) {
              usedIds.add(pokemon.id);
              prefetchedData.push({
                pokemon,
                choices: []
              });
            }
          }
        } catch (error) {
          console.error(`Retry ${retryCount + 1} failed:`, error);
          retryCount++;
        }
      }

      if (prefetchedData.length < ROUNDS_PER_GAME) {
        throw new Error('Failed to fetch valid Pokemon data for all rounds');
      }

      // Set the first round's data
      const firstRound = prefetchedData[0];
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        pokemon: firstRound.pokemon,
        choices: firstRound.choices,
        prefetchedPokemon: prefetchedData,
        currentRoundIndex: 0,
        timeLeft: GAME_DURATION,
        guessesLeft: getInitialGuesses(difficulty),
        isRevealed: false,
        userGuess: '',
        hint: '',
        isWrongGuess: false,
        incorrectGuesses: new Set(),
        shakingGuess: null,
        usedPokemonIds: usedIds,
        disabledChoices: new Set()
      }));

    } catch (error) {
      console.error('Failed to prefetch Pokemon:', error);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loadNextRound = useCallback(() => {
    const nextIndex = gameState.currentRoundIndex + 1;
    if (nextIndex >= gameState.prefetchedPokemon.length) return;

    const nextRound = gameState.prefetchedPokemon[nextIndex];
    setGameState(prev => ({
      ...prev,
      pokemon: nextRound.pokemon,
      choices: nextRound.choices,
      currentRoundIndex: nextIndex,
      isLoading: false,
      isRevealed: false,
      userGuess: '',
      timeLeft: GAME_DURATION,
      guessesLeft: getInitialGuesses(prev.difficulty),
      hint: '',
      isWrongGuess: false,
      incorrectGuesses: new Set(),
      shakingGuess: null,
      disabledChoices: new Set()
    }));
  }, [gameState.currentRoundIndex, gameState.prefetchedPokemon]);

  // Initial game setup
  useEffect(() => {
    prefetchPokemonForGame(gameState.mode, gameState.difficulty);
  }, [prefetchPokemonForGame, gameState.mode, gameState.difficulty]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (!gameState.isRevealed && gameState.timeLeft > 0 && !gameState.isLoading) {
      timer = setInterval(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          const timeIsUp = newTimeLeft <= 0;
          
          if (timeIsUp) {
            setTimeout(() => {
              if (prev.roundsPlayed + 1 === ROUNDS_PER_GAME) {
                setShowSummary(true);
              } else {
                loadNextRound();
              }
            }, REVEAL_DURATION);
          }
          
          return {
            ...prev,
            timeLeft: newTimeLeft,
            isRevealed: timeIsUp,
            ...(timeIsUp && {
              roundsPlayed: prev.roundsPlayed + 1
            })
          };
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState.isRevealed, gameState.timeLeft, gameState.isLoading, loadNextRound]);

  const getHint = (name: string): string => {
    return `Hint: This Pokemon's name ${name.length > 6 ? 'has ' + name.length + ' letters' : 'starts with ' + name[0].toUpperCase()}`;
  };

  const formatPokemonName = (name: string): string => {
    // Handle hyphenated names
    return name.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('-');
  };

  const handleGuess = (guess: string) => {
    if (!gameState.pokemon) return;

    const isCorrect = guess.toLowerCase() === gameState.pokemon.name.toLowerCase();
    
    if (isCorrect) {
      const newScore = gameState.score + Math.ceil((gameState.timeLeft + gameState.guessesLeft * 5) / 2);
      const newHighScore = Math.max(newScore, gameState.highScore);
      const newCorrectGuesses = [...gameState.correctGuesses, gameState.pokemon];
      const newRoundsPlayed = gameState.roundsPlayed + 1;

      setGameState(prev => ({
        ...prev,
        isRevealed: true,
        score: newScore,
        highScore: newHighScore,
        showConfetti: true,
        shakingGuess: null,
        correctGuesses: newCorrectGuesses,
        roundsPlayed: newRoundsPlayed
      }));

      setTimeout(() => {
        setGameState(prev => ({ ...prev, showConfetti: false }));
      }, CONFETTI_DURATION);

      setTimeout(() => {
        if (newRoundsPlayed === ROUNDS_PER_GAME) {
          setShowSummary(true);
        } else {
          loadNextRound();
        }
      }, REVEAL_DURATION);
    } else {
      const newGuessesLeft = gameState.guessesLeft - 1;
      const newIncorrectGuesses = new Set(gameState.incorrectGuesses);
      newIncorrectGuesses.add(guess);
      
      // Add the incorrect guess to disabled choices
      const newDisabledChoices = new Set(gameState.disabledChoices);
      newDisabledChoices.add(guess);

      if (newGuessesLeft === 0) {
        setGameState(prev => ({
          ...prev,
          guessesLeft: newGuessesLeft,
          isWrongGuess: true,
          userGuess: '',
          hint: '',
          isRevealed: true,
          incorrectGuesses: newIncorrectGuesses,
          disabledChoices: newDisabledChoices,
          shakingGuess: null,
          roundsPlayed: prev.roundsPlayed + 1
        }));

        setTimeout(() => {
          if (gameState.roundsPlayed + 1 === ROUNDS_PER_GAME) {
            setShowSummary(true);
          } else {
            loadNextRound();
          }
        }, REVEAL_DURATION);
      } else {
        setGameState(prev => ({
          ...prev,
          guessesLeft: newGuessesLeft,
          isWrongGuess: true,
          userGuess: '',
          hint: newGuessesLeft === 1 ? getHint(gameState.pokemon!.name) : '',
          incorrectGuesses: newIncorrectGuesses,
          disabledChoices: newDisabledChoices,
          shakingGuess: guess
        }));

        setTimeout(() => {
          setGameState(prev => ({ ...prev, shakingGuess: null }));
        }, 500);
      }
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
      prefetchPokemonForGame(newMode, newDifficulty);
    }
  };

  const confirmModeSwitch = () => {
    console.log('Confirming mode switch to:', modeSwitchModal.targetMode);
    if (modeSwitchModal.targetMode && modeSwitchModal.targetDifficulty) {
      resetGameState(modeSwitchModal.targetMode, modeSwitchModal.targetDifficulty);
      prefetchPokemonForGame(modeSwitchModal.targetMode, modeSwitchModal.targetDifficulty);
    }
  };

  const resetGameState = (newMode: GameMode, newDifficulty: Difficulty) => {
    setGameState({
      pokemon: null,
      isLoading: true,
      isRevealed: false,
      userGuess: '',
      timeLeft: GAME_DURATION,
      score: 0,
      highScore: gameState.highScore,
      guessesLeft: getInitialGuesses(newDifficulty),
      isWrongGuess: false,
      hint: '',
      mode: newMode,
      difficulty: newDifficulty,
      showConfetti: false,
      choices: [],
      incorrectGuesses: new Set(),
      shakingGuess: null,
      correctGuesses: [],
      roundsPlayed: 0,
      prefetchedPokemon: [],
      currentRoundIndex: 0,
      usedPokemonIds: new Set(),
      disabledChoices: new Set()
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

  const handleShare = (username: string) => {
    // Create a sharable text summary
    const summary = `
🎮 Pokemon Guessing Game Results 🎮
Trainer: ${username}
High Score: ${gameState.highScore}
Mode: ${gameState.mode === 'classic' ? 'Classic (Gen 1)' : 'Modern'} - ${gameState.difficulty === 'easy' ? 'Easy' : 'Normal'}
Correctly Guessed Pokemon (${gameState.correctGuesses.length}/${ROUNDS_PER_GAME}):
${gameState.correctGuesses.map(p => p.name.charAt(0).toUpperCase() + p.name.slice(1)).join(', ')}
Try to beat my score at https://whos-that-pokemon-gold.vercel.app/ !
    `.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(summary).then(() => {
      alert('Summary copied to clipboard! Share it with your friends!');
    }).catch(() => {
      alert('Failed to copy to clipboard. Please copy the text manually.');
      console.log(summary);
    });
  };

  if (gameState.isLoading || !gameState.pokemon || (gameState.difficulty === 'easy' && gameState.choices.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-2xl text-custom-brown">Loading...</div>
      </div>
    );
  }

  console.log('Current game state:', {
    difficulty: gameState.difficulty,
    mode: gameState.mode,
    hasChoices: gameState.choices.length > 0,
    choiceNames: gameState.choices.map(c => c.name)
  });

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

      <GameSummaryModal
        isOpen={showSummary}
        onClose={() => {
          setShowSummary(false);
          resetGameState(gameState.mode, gameState.difficulty);
          prefetchPokemonForGame(gameState.mode, gameState.difficulty);
        }}
        correctGuesses={gameState.correctGuesses}
        highScore={gameState.highScore}
        onShare={handleShare}
        totalRounds={ROUNDS_PER_GAME}
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
          <div className="text-lg font-bold text-custom-brown">
            Round: {gameState.roundsPlayed + 1}/{ROUNDS_PER_GAME}
          </div>
        </div>

        {gameState.hint && (
          <div className="text-lg text-custom-brown italic">
            {gameState.hint}
          </div>
        )}

        {gameState.isRevealed || gameState.guessesLeft === 0 || gameState.timeLeft === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-2xl font-bold text-custom-brown">
              It&apos;s {formatPokemonName(gameState.pokemon.name)}!
            </div>
            {gameState.roundsPlayed < ROUNDS_PER_GAME ? (
              <button
                onClick={() => {
                  setTimeout(() => {
                    loadNextRound();
                  }, REVEAL_DURATION);
                }}
                className="bg-custom-teal hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-full transition-all"
              >
                Next Pokemon
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="text-lg text-custom-brown">
                  Game Complete! Check your summary to see how well you did.
                </div>
                <button
                  onClick={() => setShowSummary(true)}
                  className="bg-custom-rose hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-full transition-all"
                >
                  View Summary
                </button>
              </div>
            )}
          </div>
        ) : gameState.difficulty === 'easy' ? (
          <div className="grid grid-cols-1 gap-4 w-full max-w-md">
            {gameState.choices.map((choice) => {
              const isDisabled = gameState.disabledChoices.has(choice.name);
              const isShaking = choice.name === gameState.shakingGuess;
              return (
                <button
                  key={choice.id}
                  onClick={() => handleGuess(choice.name)}
                  className={`w-full px-6 py-3 rounded-full transition-all text-lg font-bold
                    ${isDisabled ? 'bg-gray-400 hover:bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-custom-teal hover:bg-opacity-90 text-white'}
                    ${isShaking ? 'animate-shake' : ''}
                  `}
                  disabled={isDisabled || gameState.isLoading}
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
              if (!gameState.isLoading) {
                handleGuess(gameState.userGuess); 
              }
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
              disabled={gameState.isLoading}
              autoFocus
            />
            <button
              type="submit"
              className={`w-full bg-custom-teal hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-full transition-all ${
                gameState.isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={gameState.isLoading}
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