# 🎮 Who's That Pokemon?

A fun and nostalgic Pokemon guessing game built with Next.js! Test your Pokemon knowledge by identifying Pokemon from their silhouettes.

*This README was written by Cursor, powered by Claude 3.5 Sonnet* 🤖

## ✨ Features

- **Multiple Game Modes**:
  - 🌟 Classic Mode (Gen 1 Pokemon only)
  - 🌍 Modern Mode (All Pokemon generations)

- **Difficulty Levels**:
  - 🎯 Easy Mode: Multiple choice with 3 options and 2 guesses
  - 💪 Normal Mode: Type your answer with 3 guesses

- **Game Mechanics**:
  - ⏱️ 30-second timer per Pokemon
  - 🎯 5 rounds per game
  - 💯 Score based on speed and remaining guesses
  - 🎉 Confetti celebration for correct guesses
  - 💭 Helpful hints on last guess

- **User Experience**:
  - 🔄 Mode switching with confirmation
  - 🎨 Beautiful silhouette animations
  - 📱 Responsive design
  - ❌ Visual feedback for incorrect guesses
  - 🌟 High score tracking

- **Social Features**:
  - 📊 End-of-game summary
  - 📋 Sharable results with username
  - 🔗 Easy sharing with friends

## 🏗️ App Structure

```
app/
├── components/
│   ├── PokemonGame.tsx       # Main game component
│   ├── GameSummaryModal.tsx  # End-game summary modal
│   └── Modal.tsx             # Reusable modal component
├── services/
│   └── pokemonService.ts     # Pokemon API integration & caching
├── page.tsx                  # Main page layout
└── layout.tsx               # App layout with navigation
```

## 🛠️ Technical Details

- Built with Next.js and TypeScript
- Uses TailwindCSS for styling
- Integrates with PokeAPI
- Implements local storage caching
- Responsive design for all devices
- Modern animation effects

## 🚀 Performance Optimizations

- Image optimization with Next.js Image component
- API response caching to reduce PokeAPI load
- Efficient state management
- Optimized sprite loading
- Smooth transitions and animations

## 🎮 How to Play

1. Choose your preferred mode (Classic/Modern) and difficulty (Easy/Normal)
2. A Pokemon silhouette will appear
3. In Easy Mode:
   - Select from 3 multiple choice options
   - You get 2 attempts to guess correctly
4. In Normal Mode:
   - Type your guess in the input field
   - You get 3 attempts to guess correctly
5. Score points based on:
   - Speed of correct guess
   - Number of remaining guesses
6. After 5 rounds:
   - View your game summary
   - Share your results with friends
   - Try to beat your high score!

## 🌐 Live Demo

Try it out at: [https://whos-that-pokemon-gold.vercel.app/](https://whos-that-pokemon-gold.vercel.app/)

## 💝 Credits

- Pokemon data provided by [PokeAPI](https://pokeapi.co/)
- Created with ❤️ using Next.js and TailwindCSS
- Deployed on Vercel
