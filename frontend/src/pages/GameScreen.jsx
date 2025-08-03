import { useEffect, useState } from 'react';
import { useGameContract } from '../hooks/useGameContract';
import CountdownTimer from '../components/CountdownTimer';
import GameBoard from '../components/GameBoard';

export default function GameScreen({ gameId }) {
  const { recordTap } = useGameContract();
  const [gameState, setGameState] = useState({
    startTime: 0,
    timeLeft: 0,
    lastTapper: null
  });

  const handleTap = async () => {
    try {
      await recordTap(gameId);
      // Visual feedback
    } catch (error) {
      console.error('Tap failed:', error);
    }
  };

  return (
    <div className="game-container">
      <CountdownTimer endTime={gameState.endTime} />
      
      <GameBoard onTap={handleTap}>
        {gameState.lastTapper && (
          <div className="last-tap-indicator">
            Last tap: {shortenAddress(gameState.lastTapper)}
          </div>
        )}
      </GameBoard>
      
      <div className="pot-display">
        Pot: {formatEther(gameState.pot)} MATIC
      </div>
    </div>
  );
}