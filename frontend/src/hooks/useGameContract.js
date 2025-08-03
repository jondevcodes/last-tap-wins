import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractABI from '../utils/contractABI.json';

export default function useGameContract() {
  const [contract, setContract] = useState(null);
  
  useEffect(() => {
    const initContract = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const gameContract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contractABI,
        signer
      );
      setContract(gameContract);
    };
    
    initContract();
  }, []);

  const joinGame = async (gameId, entryFee) => {
    return contract.joinGame(gameId, { value: entryFee });
  };

  const recordTap = async (gameId) => {
    // Send tap to backend for verification first
    const response = await fetch(`/api/game/${gameId}/tap`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Tap verification failed');
    
    return contract.recordTap(gameId);
  };

  return { contract, joinGame, recordTap };
}