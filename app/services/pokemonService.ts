const POKEMON_API_BASE_URL = 'https://pokeapi.co/api/v2';
const MAX_POKEMON_ID = 1025;

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

export const getRandomPokemonId = (): number => {
  return Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
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

export const fetchRandomPokemon = async (): Promise<Pokemon> => {
  const randomId = getRandomPokemonId();
  return fetchPokemon(randomId);
}; 