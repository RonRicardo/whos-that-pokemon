import { useState, useCallback } from 'react';
import type { Pokemon, GameMode, Difficulty } from '../services/pokemonService';

interface GameState {
  pokemon: Pokemon | null;
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
  currentRoundIndex: number;
  disabledChoices: Set<string>;
  wasCorrect: boolean;
  isQuickGuess: boolean;
  isTransitioning: boolean;
  timeExpired: boolean;
}

interface GameStateConfig {
  mode: GameMode;
  difficulty: Difficulty;
  gameDuration: number;
  maxGuesses: number;
}

export const useGameState = (config: GameStateConfig) => {
  const [state, setState] = useState<GameState>({
    pokemon: null,
    isRevealed: false,
    userGuess: '',
    timeLeft: config.gameDuration,
    score: 0,
    highScore: 0,
    guessesLeft: config.maxGuesses,
    isWrongGuess: false,
    hint: '',
    mode: config.mode,
    difficulty: config.difficulty,
    showConfetti: false,
    choices: [],
    incorrectGuesses: new Set(),
    shakingGuess: null,
    correctGuesses: [],
    roundsPlayed: 0,
    currentRoundIndex: 0,
    disabledChoices: new Set(),
    wasCorrect: false,
    isQuickGuess: false,
    isTransitioning: false,
    timeExpired: false
  });

  const resetState = useCallback((newMode: GameMode, newDifficulty: Difficulty) => {
    setState(prev => ({
      ...prev,
      pokemon: null,
      isRevealed: false,
      userGuess: '',
      timeLeft: config.gameDuration,
      score: 0,
      guessesLeft: config.maxGuesses,
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
      currentRoundIndex: 0,
      disabledChoices: new Set(),
      wasCorrect: false,
      isQuickGuess: false,
      isTransitioning: false,
      timeExpired: false
    }));
  }, [config.gameDuration, config.maxGuesses]);

  const setRoundData = useCallback((
    pokemon: Pokemon, 
    choices: Pokemon[],
    updates: Partial<GameState> = {}
  ) => {
    setState(prev => ({
      ...prev,
      pokemon,
      choices,
      isRevealed: false,
      userGuess: '',
      timeLeft: config.gameDuration,
      guessesLeft: config.maxGuesses,
      hint: '',
      isWrongGuess: false,
      shakingGuess: null,
      disabledChoices: new Set(),
      isQuickGuess: false,
      isTransitioning: false,
      timeExpired: false,
      ...updates
    }));
  }, [config.gameDuration, config.maxGuesses]);

  const updateTimeLeft = useCallback((newTimeLeft: number) => {
    setState(prev => {
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
  }, []);

  const handleCorrectGuess = useCallback((pokemon: Pokemon, timeLeft: number, isQuick: boolean) => {
    setState(prev => {
      const timeBonus = isQuick ? 15 : 0;
      const newScore = prev.score + Math.ceil((timeLeft + prev.guessesLeft * 5) / 2) + timeBonus;
      const newHighScore = Math.max(newScore, prev.highScore);

      return {
        ...prev,
        isRevealed: true,
        score: newScore,
        highScore: newHighScore,
        showConfetti: true,
        correctGuesses: [...prev.correctGuesses, pokemon],
        wasCorrect: true,
        guessesLeft: 0,
        isQuickGuess: isQuick,
        disabledChoices: new Set(prev.choices.map(c => c.name)),
        userGuess: '',
        hint: ''
      };
    });
  }, []);

  const handleWrongGuess = useCallback((guess: string, newGuessesLeft: number, hint: string) => {
    setState(prev => ({
      ...prev,
      guessesLeft: newGuessesLeft,
      isWrongGuess: true,
      userGuess: '',
      hint,
      disabledChoices: new Set([...prev.disabledChoices, guess]),
      shakingGuess: guess
    }));

    // Clear shake animation after delay
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        shakingGuess: null,
        isWrongGuess: false
      }));
    }, 500);
  }, []);

  const setTransitioning = useCallback((isTransitioning: boolean) => {
    setState(prev => ({ ...prev, isTransitioning }));
  }, []);

  const clearConfetti = useCallback(() => {
    setState(prev => ({ ...prev, showConfetti: false }));
  }, []);

  return {
    state,
    resetState,
    setRoundData,
    updateTimeLeft,
    handleCorrectGuess,
    handleWrongGuess,
    setTransitioning,
    clearConfetti
  };
}; 