import PokemonGame from './components/PokemonGame';

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full max-w-2xl bg-custom-teal rounded-lg p-6 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Welcome to Who&apos;s That Pokemon!</h2>
        <p className="text-lg">Test your Pokemon knowledge by guessing the Pokemon from their silhouette.</p>
      </div>

      <PokemonGame />

      <div className="w-full max-w-2xl bg-custom-brown rounded-lg p-6 text-custom-sand">
        <h3 className="text-xl font-bold mb-4 text-center">How to Play</h3>
        <ul className="list-disc list-inside space-y-2">
          <li>A Pokemon silhouette will appear on screen</li>
          <li>Type your guess in the input field</li>
          <li>Press enter or click the button to submit</li>
          <li>Score points for correct guesses - the faster you guess, the more points you get!</li>
          <li>You have 30 seconds for each Pokemon</li>
        </ul>
      </div>
    </div>
  );
}
