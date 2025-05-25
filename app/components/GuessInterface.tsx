import { useState } from 'react';
import { type Pokemon, type Difficulty } from '../services/pokemonService';

interface GuessInterfaceProps {
  difficulty: Difficulty;
  choices: Pokemon[];
  disabledChoices: Set<string>;
  guessesLeft: number;
  isRevealed: boolean;
  shakingGuess: string | null;
  onGuess: (guess: string) => void;
  isLoading: boolean;
}

function EasyModeGuess({
  choices,
  disabledChoices,
  guessesLeft,
  isRevealed,
  shakingGuess,
  onGuess
}: Omit<GuessInterfaceProps, 'difficulty' | 'isLoading'>) {
  const formatPokemonName = (name: string): string => {
    return name.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('-');
  };

  return (
    <div className="grid grid-cols-1 gap-4 w-full max-w-md">
      {choices.length === 0 ? (
        <div className="text-center text-custom-brown">Loading choices...</div>
      ) : (
        choices.map((choice) => {
          const isDisabled = disabledChoices.has(choice.name) || 
                            guessesLeft <= 0 ||
                            isRevealed;
          const isShaking = choice.name === shakingGuess;

          return (
            <button
              key={choice.id}
              onClick={() => onGuess(choice.name)}
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
  );
}

function NormalModeGuess({
  isLoading,
  onGuess
}: Pick<GuessInterfaceProps, 'isLoading' | 'onGuess'>) {
  const [userGuess, setUserGuess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onGuess(userGuess);
      setUserGuess('');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="flex flex-col items-center gap-4 w-full max-w-md"
    >
      <input
        type="text"
        value={userGuess}
        onChange={(e) => setUserGuess(e.target.value)}
        placeholder="Who's that Pokemon?"
        className="w-full px-4 py-2 border-2 border-custom-teal rounded-lg focus:outline-none focus:border-custom-brown transition-all"
        disabled={isLoading}
        autoFocus
        maxLength={20}
      />
      <button
        type="submit"
        className={`w-full bg-custom-teal hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-full transition-all ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        disabled={isLoading}
      >
        Guess!
      </button>
    </form>
  );
}

export default function GuessInterface(props: GuessInterfaceProps) {
  if (props.difficulty === 'easy') {
    return <EasyModeGuess {...props} />;
  }
  return <NormalModeGuess isLoading={props.isLoading} onGuess={props.onGuess} />;
} 