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
  wasCorrect: boolean;
  isQuickGuess: boolean;
  isTransitioning: boolean;
  timeExpired: boolean;
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
const REVEAL_DURATION = 1500; // 1.5 seconds to show the revealed Pokemon (reduced from 2.5s)
const CONFETTI_DURATION = 2000; // 2 seconds for confetti
const STORAGE_KEY_MODE = 'pokemon_game_mode';
const STORAGE_KEY_DIFFICULTY = 'pokemon_game_difficulty';
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const POKEMON_SIZE = 96;
const PADDING = 40;
const HEADER_HEIGHT = 120;
const FOOTER_HEIGHT = 80;

const generateSummaryImage = async (
  username: string,
  highScore: number,
  mode: GameMode,
  difficulty: Difficulty,
  correctGuesses: Pokemon[]
): Promise<string> => {
  // Create canvas
  const canvas = document.createElement('canvas') as HTMLCanvasElement;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Add gradient header with game theme colors
  const headerGradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, HEADER_HEIGHT);
  headerGradient.addColorStop(0, '#48a4a8');  // custom-teal
  headerGradient.addColorStop(0.5, '#d5c17c'); // custom-sand
  headerGradient.addColorStop(1, '#d56373');  // custom-rose
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, HEADER_HEIGHT);

  // Add decorative Pokeball pattern in header
  ctx.save();
  ctx.globalAlpha = 0.1;
  for (let x = -20; x < CANVAS_WIDTH + 20; x += 40) {
    ctx.beginPath();
    ctx.arc(x, HEADER_HEIGHT / 2, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();

  // Add title with shadow
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.font = 'bold 40px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText("🎮 Who's That Pokemon? 🎮", CANVAS_WIDTH / 2, 70);
  ctx.shadowBlur = 0;

  // Add trainer info
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`Trainer: ${username}`, PADDING, HEADER_HEIGHT + 50);
  ctx.fillText(`High Score: ${highScore}`, PADDING, HEADER_HEIGHT + 90);

  // Add game mode info with custom styling
  const modeText = `${mode === 'classic' ? 'Classic (Gen 1)' : 'Modern'} - ${difficulty === 'easy' ? 'Easy' : 'Normal'}`;
  ctx.font = '24px system-ui';
  ctx.fillStyle = mode === 'classic' ? '#d56373' : '#48a4a8';
  ctx.fillText(`Mode: ${modeText}`, PADDING, HEADER_HEIGHT + 130);

  // Add Pokemon results header
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 24px system-ui';
  ctx.fillText(
    `Correctly Guessed Pokemon (${correctGuesses.length}/${ROUNDS_PER_GAME}):`,
    PADDING,
    HEADER_HEIGHT + 180
  );

  // Load and draw Pokemon sprites
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  };

  // Draw Pokemon in a grid with more space
  const startY = HEADER_HEIGHT + 200;
  const pokemonPerRow = 3;
  const promises = correctGuesses.map(async (pokemon, index) => {
    try {
      const row = Math.floor(index / pokemonPerRow);
      const col = index % pokemonPerRow;
      const x = PADDING + col * (POKEMON_SIZE + PADDING * 1.5);
      const y = startY + row * (POKEMON_SIZE + PADDING);

      // Draw Pokemon card background
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath();
      ctx.roundRect(x - 10, y - 10, POKEMON_SIZE + 20, POKEMON_SIZE + 40, 10);
      ctx.fill();

      // Draw Pokemon sprite
      if (pokemon.sprites.front_default) {
        const img = await loadImage(pokemon.sprites.front_default);
        ctx.drawImage(img, x, y, POKEMON_SIZE, POKEMON_SIZE);
      }

      // Draw Pokemon name with background
      ctx.font = 'bold 16px system-ui';
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'center';
      const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
      ctx.fillText(name, x + POKEMON_SIZE / 2, y + POKEMON_SIZE + 20);
    } catch (error) {
      console.error('Error loading Pokemon sprite:', error);
    }
  });

  await Promise.all(promises);

  // Add footer with gradient background
  const footerGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - FOOTER_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT);
  footerGradient.addColorStop(0, '#f5f5f5');
  footerGradient.addColorStop(1, '#e5e5e5');
  ctx.fillStyle = footerGradient;
  ctx.fillRect(0, CANVAS_HEIGHT - FOOTER_HEIGHT, CANVAS_WIDTH, FOOTER_HEIGHT);

  // Add footer text with game URL
  ctx.font = 'bold 18px system-ui';
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Try to beat my score at:',
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT - FOOTER_HEIGHT + 30
  );
  ctx.font = 'bold 20px system-ui';
  ctx.fillStyle = '#48a4a8';
  ctx.fillText(
    'https://whos-that-pokemon-gold.vercel.app/',
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT - FOOTER_HEIGHT + 60
  );

  return canvas.toDataURL('image/png');
};

export default function PokemonGame() {
  const getInitialGuesses = (difficulty: Difficulty) => {
    return difficulty === 'easy' ? EASY_MODE_GUESSES : NORMAL_MODE_GUESSES;
  };

  const getStoredMode = (): GameMode => {
    if (typeof window === 'undefined') return 'modern';
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MODE);
      return (stored === 'classic' || stored === 'modern') ? stored : 'modern';
    } catch (error) {
      console.warn('Error reading stored mode:', error);
      return 'modern';
    }
  };

  const getStoredDifficulty = (): Difficulty => {
    if (typeof window === 'undefined') return 'normal';
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DIFFICULTY);
      return (stored === 'easy' || stored === 'normal') ? stored : 'normal';
    } catch (error) {
      console.warn('Error reading stored difficulty:', error);
      return 'normal';
    }
  };

  const [gameState, setGameState] = useState<GameState>({
    pokemon: null,
    isLoading: true,
    isRevealed: false,
    userGuess: '',
    timeLeft: GAME_DURATION,
    score: 0,
    highScore: 0,
    guessesLeft: getInitialGuesses(getStoredDifficulty()),
    isWrongGuess: false,
    hint: '',
    mode: getStoredMode(),
    difficulty: getStoredDifficulty(),
    showConfetti: false,
    choices: [],
    incorrectGuesses: new Set(),
    shakingGuess: null,
    correctGuesses: [],
    roundsPlayed: 0,
    prefetchedPokemon: [],
    currentRoundIndex: 0,
    usedPokemonIds: new Set(),
    disabledChoices: new Set(),
    wasCorrect: false,
    isQuickGuess: false,
    isTransitioning: false,
    timeExpired: false
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
        disabledChoices: new Set(),
        isQuickGuess: false
      }));

    } catch (error) {
      console.error('Failed to prefetch Pokemon:', error);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loadNextRound = useCallback(() => {
    const nextIndex = gameState.currentRoundIndex + 1;
    
    // If we're done with all rounds, show summary
    if (nextIndex >= ROUNDS_PER_GAME) {
      setShowSummary(true);
      return;
    }

    const nextRound = gameState.prefetchedPokemon[nextIndex];
    if (!nextRound) {
      console.error('No data for next round:', nextIndex);
      setShowSummary(true);
      return;
    }

    // Set new round data immediately without setTimeout
    setGameState(prev => ({
      ...prev,
      pokemon: nextRound.pokemon,
      choices: nextRound.choices || [],
      currentRoundIndex: nextIndex,
      isLoading: false,
      isRevealed: false,
      userGuess: '',
      timeLeft: GAME_DURATION,
      guessesLeft: getInitialGuesses(prev.difficulty),
      hint: '',
      isWrongGuess: false,
      shakingGuess: null,
      disabledChoices: new Set(),
      isQuickGuess: false,
      isTransitioning: false,
      timeExpired: false
    }));
  }, [gameState.currentRoundIndex, gameState.prefetchedPokemon]);

  const finishRound = useCallback(() => {
    const isLastRound = gameState.currentRoundIndex === ROUNDS_PER_GAME - 1;
    
    // Set transitioning state immediately
    setGameState(prev => ({
      ...prev,
      isTransitioning: true
    }));

    if (isLastRound) {
      setTimeout(() => {
        setShowSummary(true);
      }, REVEAL_DURATION);
    } else {
      setTimeout(() => {
        loadNextRound();
      }, REVEAL_DURATION);
    }
  }, [gameState.currentRoundIndex, loadNextRound]);

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
          if (newTimeLeft <= 0) {
            return {
              ...prev,
              timeLeft: 0,
              isRevealed: true,
              timeExpired: true,
              wasCorrect: false
            };
          }
          return { ...prev, timeLeft: newTimeLeft };
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState.isRevealed, gameState.timeLeft, gameState.isLoading]);

  // When time runs out, trigger round finish
  useEffect(() => {
    if (gameState.timeLeft === 0 && gameState.isRevealed) {
      finishRound();
    }
  }, [gameState.timeLeft, gameState.isRevealed, finishRound]);

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
    // Early returns for invalid states
    if (!gameState.pokemon || 
        gameState.isLoading || 
        gameState.isRevealed || 
        gameState.guessesLeft <= 0 ||
        gameState.disabledChoices.has(guess)) {
      return;
    }

    const isCorrect = guess.toLowerCase() === gameState.pokemon.name.toLowerCase();
    
    if (isCorrect) {
      const isQuickGuess = gameState.timeLeft > GAME_DURATION - 10;
      const timeBonus = isQuickGuess ? 15 : 0;
      const newScore = gameState.score + Math.ceil((gameState.timeLeft + gameState.guessesLeft * 5) / 2) + timeBonus;
      const newHighScore = Math.max(newScore, gameState.highScore);
      const newCorrectGuesses = [...gameState.correctGuesses, gameState.pokemon];

      // Disable all choices when correct
      const allDisabled = new Set(gameState.choices.map(choice => choice.name));

      // First set the revealed state
      setGameState(prev => ({
        ...prev,
        isRevealed: true,
        score: newScore,
        highScore: newHighScore,
        showConfetti: true,
        shakingGuess: null,
        correctGuesses: newCorrectGuesses,
        wasCorrect: true,
        guessesLeft: 0,
        isQuickGuess: isQuickGuess,
        disabledChoices: allDisabled,
        userGuess: '',
        hint: ''
      }));

      // Start confetti and schedule its cleanup
      setTimeout(() => {
        setGameState(prev => ({ 
          ...prev, 
          showConfetti: false 
        }));
      }, CONFETTI_DURATION);

      // Schedule the transition to next round
      setTimeout(() => {
        finishRound();
      }, REVEAL_DURATION);
    } else {
      const newGuessesLeft = gameState.guessesLeft - 1;
      const newDisabledChoices = new Set([...gameState.disabledChoices, guess]);
      const newHint = newGuessesLeft === 1 ? getHint(gameState.pokemon.name) : gameState.hint;

      if (newGuessesLeft <= 0) {
        // Disable all choices when out of guesses
        const allDisabled = new Set(gameState.choices.map(choice => choice.name));
        
        setGameState(prev => ({
          ...prev,
          guessesLeft: 0,
          isRevealed: true,
          disabledChoices: allDisabled,
          userGuess: '',
          wasCorrect: false,
          hint: '',
          timeExpired: false
        }));
      } else {
        // Set the wrong guess state
        setGameState(prev => ({
          ...prev,
          guessesLeft: newGuessesLeft,
          isWrongGuess: true,
          userGuess: '',
          hint: newHint,
          disabledChoices: newDisabledChoices,
          shakingGuess: guess
        }));

        // Only remove the shake animation after timeout, preserve other state
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            shakingGuess: null,
            isWrongGuess: false,
            // Explicitly maintain these states
            hint: newHint,
            disabledChoices: newDisabledChoices,
            guessesLeft: newGuessesLeft
          }));
        }, 500);
      }
    }
  };

  const saveGameMode = useCallback((mode: GameMode, difficulty: Difficulty) => {
    try {
      localStorage.setItem(STORAGE_KEY_MODE, mode);
      localStorage.setItem(STORAGE_KEY_DIFFICULTY, difficulty);
    } catch (error) {
      console.warn('Error saving game mode:', error);
    }
  }, []);

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
      saveGameMode(newMode, newDifficulty);
      resetGameState(newMode, newDifficulty);
      prefetchPokemonForGame(newMode, newDifficulty);
    }
  };

  const confirmModeSwitch = () => {
    console.log('Confirming mode switch to:', modeSwitchModal.targetMode);
    if (modeSwitchModal.targetMode && modeSwitchModal.targetDifficulty) {
      saveGameMode(modeSwitchModal.targetMode, modeSwitchModal.targetDifficulty);
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
      disabledChoices: new Set(),
      wasCorrect: false,
      isQuickGuess: false,
      isTransitioning: false,
      timeExpired: false
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

  const handleShare = async (username: string) => {
    try {
      const finalUsername = username || 'Anonymous Trainer';
      const imageUrl = await generateSummaryImage(
        finalUsername,
        gameState.highScore,
        gameState.mode,
        gameState.difficulty,
        gameState.correctGuesses
      );

      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'pokemon-game-results.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating summary image:', error);
      // Fallback to text summary
      const summary = `
🎮 Pokemon Guessing Game Results 🎮
Trainer: ${username || 'Anonymous Trainer'}
High Score: ${gameState.highScore}
Mode: ${gameState.mode === 'classic' ? 'Classic (Gen 1)' : 'Modern'} - ${gameState.difficulty === 'easy' ? 'Easy' : 'Normal'}
Correctly Guessed Pokemon (${gameState.correctGuesses.length}/${ROUNDS_PER_GAME}):
${gameState.correctGuesses.map(p => p.name.charAt(0).toUpperCase() + p.name.slice(1)).join(', ')}
Try to beat my score at https://whos-that-pokemon-gold.vercel.app/ !
      `.trim();

      // Try to copy to clipboard as fallback
      navigator.clipboard.writeText(summary).then(() => {
        alert('Could not generate image. Summary copied to clipboard instead!');
      }).catch(() => {
        alert('Could not generate image or copy to clipboard. Please copy the text manually.');
        console.log(summary);
      });
    }
  };

  if (gameState.isLoading || !gameState.pokemon || (gameState.difficulty === 'easy' && !gameState.choices.length)) {
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
                gameState.isRevealed ? 'opacity-100 brightness-100' : 'opacity-0'
              }`}
            />
          )}
          {gameState.pokemon.sprites.back_default && (
            <Image
              src={gameState.pokemon.sprites.back_default}
              alt="Pokemon back view"
              fill
              className={`object-contain transition-opacity duration-500 ${
                gameState.isRevealed ? 'opacity-0' : 'opacity-100 brightness-0'
              }`}
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
            Round: {gameState.currentRoundIndex + 1}/{ROUNDS_PER_GAME}
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
              {gameState.wasCorrect ? (
                <>
                  You got it right! It&apos;s {formatPokemonName(gameState.pokemon.name)}!
                  {gameState.isQuickGuess && (
                    <div className="text-lg text-custom-green mt-2">
                      Speed bonus! +15 points for guessing within 10 seconds! 🚀
                    </div>
                  )}
                </>
              ) : gameState.timeExpired ? (
                `Time's up! The Pokemon was ${formatPokemonName(gameState.pokemon.name)}!`
              ) : (
                `Out of guesses! The Pokemon was ${formatPokemonName(gameState.pokemon.name)}!`
              )}
            </div>
            {gameState.currentRoundIndex < ROUNDS_PER_GAME - 1 ? (
              <button
                onClick={() => finishRound()}
                disabled={gameState.isTransitioning}
                className={`px-6 py-2 rounded-full transition-all font-bold
                  ${gameState.isTransitioning 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-custom-teal hover:bg-opacity-90 text-white'
                  }`}
              >
                {gameState.isTransitioning ? 'Loading Next Pokemon...' : 'Next Pokemon'}
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
            {gameState.choices.length === 0 ? (
              <div className="text-center text-custom-brown">Loading choices...</div>
            ) : (
              gameState.choices.map((choice) => {
                const isDisabled = gameState.disabledChoices.has(choice.name) || 
                                  gameState.guessesLeft <= 0 ||
                                  gameState.isRevealed;
                const isShaking = choice.name === gameState.shakingGuess;

                // Add debug logging
                console.log('Choice state:', {
                  name: choice.name,
                  isDisabled,
                  inDisabledSet: gameState.disabledChoices.has(choice.name),
                  guessesLeft: gameState.guessesLeft,
                  isRevealed: gameState.isRevealed,
                  disabledChoices: Array.from(gameState.disabledChoices)
                });

                return (
                  <button
                    key={choice.id}
                    onClick={() => handleGuess(choice.name)}
                    className={`w-full px-6 py-3 rounded-full transition-all text-lg font-bold
                      ${isDisabled ? 'bg-gray-400 hover:bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-custom-teal hover:bg-opacity-90 text-white'}
                      ${isShaking ? 'animate-shake' : ''}
                    `}
                    disabled={isDisabled}
                  >
                    {formatPokemonName(choice.name)}
                  </button>
                );
              })
            )}
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