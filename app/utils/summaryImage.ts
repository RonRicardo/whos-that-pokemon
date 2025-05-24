import type { Pokemon, GameMode, Difficulty } from '../services/pokemonService';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const POKEMON_SIZE = 96;
const PADDING = 40;
const HEADER_HEIGHT = 120;
const FOOTER_HEIGHT = 80;

export const generateSummaryImage = async (
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
    `Correctly Guessed Pokemon (${correctGuesses.length}/5):`,
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