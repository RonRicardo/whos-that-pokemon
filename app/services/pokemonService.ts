const POKEMON_API_BASE_URL = 'https://pokeapi.co/api/v2';
const MAX_POKEMON_ID = 1025;
const CLASSIC_MAX_POKEMON_ID = 151;
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheEntry {
  data: Pokemon;
  timestamp: number;
}

function getCachedPokemon(id: number): Pokemon | null {
  try {
    const cacheKey = `pokemon_${id}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();
    
    if (now - entry.timestamp > CACHE_EXPIRATION) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.warn('Error reading from cache:', error);
    return null;
  }
}

function clearOldestCacheEntries(requiredSpace: number = 1): void {
  try {
    // Get all Pokemon cache entries
    const cacheEntries: { key: string; timestamp: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pokemon_')) {
        const item = localStorage.getItem(key);
        if (item) {
          const entry: CacheEntry = JSON.parse(item);
          cacheEntries.push({ key, timestamp: entry.timestamp });
        }
      }
    }

    // Sort by timestamp (oldest first)
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries until we've cleared enough space
    for (let i = 0; i < Math.min(requiredSpace, cacheEntries.length); i++) {
      localStorage.removeItem(cacheEntries[i].key);
    }
  } catch (error) {
    console.warn('Error clearing cache:', error);
  }
}

function cachePokemon(id: number, data: Pokemon): void {
  try {
    const cacheKey = `pokemon_${id}`;
    const entry: CacheEntry = {
      data,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Clear some space and try again
        clearOldestCacheEntries(5); // Clear 5 oldest entries
        try {
          localStorage.setItem(cacheKey, JSON.stringify(entry));
        } catch (retryError) {
          console.warn('Failed to cache Pokemon even after clearing space:', retryError);
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.warn('Error writing to cache:', error);
  }
}

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

export const getRandomPokemonIds = (mode: GameMode, count: number, excludeIds: Set<number> = new Set()): number[] => {
  const maxId = mode === 'classic' ? CLASSIC_MAX_POKEMON_ID : MAX_POKEMON_ID;
  const ids = new Set<number>();
  let attempts = 0;
  const MAX_ATTEMPTS = 25; // Prevent infinite loops
  
  while (ids.size < count && attempts < MAX_ATTEMPTS) {
    const newId = Math.floor(Math.random() * maxId) + 1;
    if (!ids.has(newId) && !excludeIds.has(newId)) {
      ids.add(newId);
    }
    attempts++;
  }

  if (ids.size < count) {
    throw new Error('Could not find enough unique Pokemon IDs');
  }
  
  return Array.from(ids);
};

export const fetchPokemon = async (id: number): Promise<Pokemon> => {
  try {
    // Check cache first
    const cached = getCachedPokemon(id);
    if (cached) {
      console.log(`Using cached data for Pokemon #${id}`);
      return cached;
    }

    // If not in cache, fetch from API
    console.log(`Fetching Pokemon #${id} from API`);
    const response = await fetch(`${POKEMON_API_BASE_URL}/pokemon/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokemon: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the result
    cachePokemon(id, data);
    
    return data;
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    throw error;
  }
};

export const fetchMultiplePokemon = async (ids: number[]): Promise<Pokemon[]> => {
  try {
    const pokemons = await Promise.all(ids.map(id => fetchPokemon(id)));
    return pokemons;
  } catch (error) {
    console.error('Error fetching multiple Pokemon:', error);
    throw error;
  }
};

export const fetchRandomPokemon = async (mode: GameMode = 'modern'): Promise<Pokemon> => {
  const randomId = getRandomPokemonId(mode);
  return fetchPokemon(randomId);
};

export const fetchRandomPokemonWithChoices = async (
  mode: GameMode = 'modern',
  choiceCount: number = 3,
  excludeIds: Set<number> = new Set()
): Promise<{ correct: Pokemon; choices: Pokemon[] }> => {
  try {
    // Get random IDs for all choices
    const ids = getRandomPokemonIds(mode, choiceCount, excludeIds);
    
    // Fetch all Pokemon
    const pokemons = await fetchMultiplePokemon(ids);
    
    // Randomly select one as the correct answer
    const correctIndex = Math.floor(Math.random() * pokemons.length);
    const correct = pokemons[correctIndex];

    // Ensure the correct Pokemon is included in the choices
    const choices = [...pokemons];
    
    console.log('Fetched Pokemon choices:', {
      ids,
      correctIndex,
      correctPokemon: correct.name,
      allChoices: choices.map(p => p.name)
    });

    return {
      correct,
      choices
    };
  } catch (error) {
    console.error('Error in fetchRandomPokemonWithChoices:', error);
    throw error;
  }
}; 