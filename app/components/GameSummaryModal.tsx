import { useState } from 'react';
import { Pokemon } from '../services/pokemonService';

interface GameSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  correctGuesses: Pokemon[];
  highScore: number;
  onShare: (username: string) => void;
  totalRounds: number;
}

export default function GameSummaryModal({
  isOpen,
  onClose,
  correctGuesses,
  highScore,
  onShare,
  totalRounds
}: GameSummaryModalProps) {
  const [username, setUsername] = useState('');

  if (!isOpen) return null;

  const handleShare = () => {
    onShare(username || 'Anonymous Trainer');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl relative"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-custom-brown mb-6 text-center">
          Game Summary
        </h2>

        <div className="mb-6">
          <div className="text-xl font-bold text-custom-teal mb-2">
            High Score: {highScore}
          </div>
          <div className="text-lg text-custom-brown mb-4">
            You correctly identified {correctGuesses.length} out of {totalRounds} Pokemon!
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
          {correctGuesses.map((pokemon) => (
            <div 
              key={pokemon.id} 
              className="flex flex-col items-center bg-gray-100 rounded-lg p-2"
            >
              {pokemon.sprites.front_default && (
                <img 
                  src={pokemon.sprites.front_default}
                  alt={pokemon.name}
                  className="w-16 h-16 object-contain"
                />
              )}
              <span className="text-sm font-medium text-custom-brown mt-1">
                {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
              </span>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-custom-brown mb-2">
            Enter your username to share:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Anonymous Trainer"
            className="w-full px-4 py-2 border-2 border-custom-teal rounded-lg focus:outline-none focus:border-custom-brown transition-all"
          />
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
          >
            Close
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-2 rounded-full bg-custom-teal text-white hover:bg-opacity-90 transition-all"
          >
            Share Results
          </button>
        </div>
      </div>
    </div>
  );
} 