'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { fetchRandomPokemon, type Pokemon } from '../services/pokemonService';

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
    hint: ''
  });

  useEffect(() => {
    loadNewPokemon();
  }, []);

  useEffect(() => {
    if (!gameState.isRevealed && gameState.timeLeft > 0) {
      const timer = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeLeft: prev.timeLeft - 1,
          isRevealed: prev.timeLeft - 1 <= 0
        }));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState.isRevealed, gameState.timeLeft]);

  const getHint = (name: string): string => {
    return `Hint: This Pokemon's name ${name.length > 6 ? 'has ' + name.length + ' letters' : 'starts with ' + name[0].toUpperCase()}`;
  };

  const loadNewPokemon = async () => {
    setGameState(prev => ({ ...prev, isLoading: true }));
    try {
      let pokemon = await fetchRandomPokemon();
      // Keep trying until we find a Pokemon with both sprites
      while (!pokemon.sprites.front_default || !pokemon.sprites.back_default) {
        pokemon = await fetchRandomPokemon();
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
        score: prev.score + Math.ceil((prev.timeLeft + prev.guessesLeft * 5) / 2)
      }));
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
    loadNewPokemon();
  };

  if (gameState.isLoading || !gameState.pokemon) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-2xl text-custom-brown">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
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
  );
} 