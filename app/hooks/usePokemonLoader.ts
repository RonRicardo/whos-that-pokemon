import { useState, useCallback, useEffect } from 'react';
import { 
  fetchRandomPokemon, 
  fetchRandomPokemonWithChoices,
  type Pokemon, 
  type GameMode,
  type Difficulty 
} from '../services/pokemonService';

interface PrefetchedRound {
  pokemon: Pokemon;
  choices: Pokemon[];
}

interface LoaderState {
  isLoading: boolean;
  error: Error | null;
  prefetchedPokemon: PrefetchedRound[];
  usedPokemonIds: Set<number>;
}

const isPokemonValid = (pokemon: Pokemon | undefined): pokemon is Pokemon => {
  return !!pokemon && 
    !!pokemon.sprites && 
    !!pokemon.sprites.front_default && 
    !!pokemon.sprites.back_default &&
    !!pokemon.sprites.other?.['official-artwork']?.front_default;
};

export const usePokemonLoader = (
  mode: GameMode,
  difficulty: Difficulty,
  roundsToLoad: number
) => {
  const [state, setState] = useState<LoaderState>({
    isLoading: true,
    error: null,
    prefetchedPokemon: [],
    usedPokemonIds: new Set()
  });

  const loadPokemon = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const prefetchedData: PrefetchedRound[] = [];
      let retryCount = 0;
      const MAX_RETRIES = 3;
      const usedIds = new Set<number>();

      while (prefetchedData.length < roundsToLoad && retryCount < MAX_RETRIES) {
        try {
          if (difficulty === 'easy') {
            const result = await fetchRandomPokemonWithChoices(mode, 3, usedIds);
            // Validate all Pokemon have required sprites
            const allPokemonValid = isPokemonValid(result.correct) && 
              result.choices.every(pokemon => isPokemonValid(pokemon));

            if (allPokemonValid) {
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
            if (isPokemonValid(pokemon) && !usedIds.has(pokemon.id)) {
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

      if (prefetchedData.length < roundsToLoad) {
        throw new Error('Failed to fetch valid Pokemon data for all rounds');
      }

      setState({
        isLoading: false,
        error: null,
        prefetchedPokemon: prefetchedData,
        usedPokemonIds: usedIds
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load Pokemon')
      }));
    }
  }, [mode, difficulty, roundsToLoad]);

  useEffect(() => {
    loadPokemon();
  }, [loadPokemon]);

  return {
    ...state,
    reload: loadPokemon
  };
}; 