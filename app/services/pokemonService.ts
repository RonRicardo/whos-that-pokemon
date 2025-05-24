const POKEMON_API_BASE_URL = 'https://pokeapi.co/api/v2';
const MAX_POKEMON_ID = 1025;
const CLASSIC_MAX_POKEMON_ID = 151;

export interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    back_default: string;
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
}

export type GameMode = 'classic' | 'modern';
export type Difficulty = 'easy' | 'normal';

export const getRandomPokemonId = (mode: GameMode): number => {
  const maxId = mode === 'classic' ? CLASSIC_MAX_POKEMON_ID : MAX_POKEMON_ID;
  return Math.floor(Math.random() * maxId) + 1;
};

export const getRandomPokemonIds = (mode: GameMode, count: number): number[] => {
  const maxId = mode === 'classic' ? CLASSIC_MAX_POKEMON_ID : MAX_POKEMON_ID;
  const ids = new Set<number>();
  
  while (ids.size < count) {
    ids.add(Math.floor(Math.random() * maxId) + 1);
  }
  
  return Array.from(ids);
};

export const fetchPokemon = async (id: number): Promise<Pokemon> => {
  try {
    const response = await fetch(`${POKEMON_API_BASE_URL}/pokemon/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokemon: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    throw error;
  }
};

export const fetchMultiplePokemon = async (ids: number[]): Promise<Pokemon[]> => {
  return Promise.all(ids.map(id => fetchPokemon(id)));
};

export const fetchRandomPokemon = async (mode: GameMode = 'modern'): Promise<Pokemon> => {
  const randomId = getRandomPokemonId(mode);
  return fetchPokemon(randomId);
};

export const fetchRandomPokemonWithChoices = async (
  mode: GameMode = 'modern',
  choiceCount: number = 3
): Promise<{ correct: Pokemon; choices: Pokemon[] }> => {
  // Get random IDs for all choices
  const ids = getRandomPokemonIds(mode, choiceCount);
  const pokemons = await fetchMultiplePokemon(ids);
  
  // Randomly select one as the correct answer
  const correctIndex = Math.floor(Math.random() * pokemons.length);
  const correct = pokemons[correctIndex];
  
  return {
    correct,
    choices: pokemons
  };
}; 