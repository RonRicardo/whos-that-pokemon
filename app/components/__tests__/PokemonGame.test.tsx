import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import '@testing-library/jest-dom';
import PokemonGame from '../PokemonGame';
import { fetchRandomPokemon, fetchRandomPokemonWithChoices } from '../../services/pokemonService';

// Mock modules
jest.mock('next/image', () => ({
  __esModule: true,
  default: function Image({ src, alt }: { src: string; alt: string }) {
    return <img src={src} alt={alt} data-testid="next-image" />;
  }
}));

jest.mock('react-confetti', () => ({
  __esModule: true,
  default: () => null
}));

// Create mock Pokemon data
const createMockPokemon = (id: number, name: string) => ({
  id,
  name,
  sprites: {
    front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
    back_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${id}.png`
  }
});

const mockPokemonList = [
  createMockPokemon(1, 'bulbasaur'),
  createMockPokemon(2, 'ivysaur'),
  createMockPokemon(3, 'venusaur'),
  createMockPokemon(4, 'charmander'),
  createMockPokemon(5, 'charmeleon')
];

// Mock Pokemon service with proper type annotations
jest.mock('../../services/pokemonService', () => ({
  __esModule: true,
  fetchRandomPokemon: jest.fn(),
  fetchRandomPokemonWithChoices: jest.fn()
}));

describe('PokemonGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
    // Set default game mode and difficulty
    localStorage.setItem('pokemon_game_mode', 'modern');
    localStorage.setItem('pokemon_game_difficulty', 'normal');
  });

  it('shows loading state initially', async () => {
    // Mock the Pokemon service to return after a delay
    (fetchRandomPokemon as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockPokemonList[0]), 100))
    );

    render(<PokemonGame />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('loads Pokemon data in normal mode', async () => {
    // Mock successful Pokemon fetches for all rounds
    mockPokemonList.forEach((pokemon) => {
      (fetchRandomPokemon as jest.Mock).mockResolvedValueOnce(pokemon);
    });

    render(<PokemonGame />);
    
    // Wait for loading state to disappear
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));
    
    // Game elements should be visible
    expect(screen.getByPlaceholderText("Who's that Pokemon?")).toBeInTheDocument();
    expect(screen.getByText('Time Left: 30s')).toBeInTheDocument();
    expect(screen.getByText('Guesses Left: 3')).toBeInTheDocument();
  });

  it('loads Pokemon data in easy mode', async () => {
    // Set easy mode in localStorage
    localStorage.setItem('pokemon_game_difficulty', 'easy');
    
    // Mock successful Pokemon fetches for all rounds
    mockPokemonList.forEach((pokemon, index) => {
      const choices = mockPokemonList.slice(index, index + 3);
      (fetchRandomPokemonWithChoices as jest.Mock).mockResolvedValueOnce({
        correct: pokemon,
        choices
      });
    });

    render(<PokemonGame />);
    
    // Wait for loading state to disappear
    await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));
    
    // Choice buttons should be visible
    expect(screen.getByText('Bulbasaur')).toBeInTheDocument();
    expect(screen.getByText('Ivysaur')).toBeInTheDocument();
    expect(screen.getByText('Venusaur')).toBeInTheDocument();
  });
}); 