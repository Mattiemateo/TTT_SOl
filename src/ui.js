import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { connectWallet, initializeGame, playGame, fetchGameState } from './SolanaGame.mjs';

let currentGameId = null;
let currentPlayer = 1; // You can improve this logic later

async function tryAutoConnect() {
  const status = document.getElementById('status');
  if (window.solana && window.solana.isPhantom) {
    try {
      // Try to connect silently if already approved
      await window.solana.connect({ onlyIfTrusted: true });
      if (window.solana.isConnected) {
        const pubkey = window.solana.publicKey.toString();
        status.textContent = `Wallet auto-connected: ${pubkey}`;
        await connectWallet(); // Set up your program/provider
      }
    } catch (e) {
      // Not yet connected, wait for user action
      status.textContent = "Please connect your wallet.";
    }
  }
}

document.getElementById('connect-btn').onclick = async () => {
  const status = document.getElementById('status');
  try {
    if (!window.solana || !window.solana.isPhantom) {
      status.textContent = "Phantom wallet not found. Please install it!";
      window.open("https://phantom.app/", "_blank");
      return;
    }
    await window.solana.connect();
    if (window.solana.isConnected) {
      const pubkey = window.solana.publicKey.toString();
      status.textContent = `Wallet connected: ${pubkey}`;
      await connectWallet(); // Set up your program/provider
    }
  } catch (e) {
    status.textContent = 'Wallet connection failed! ' + (e.message || e);
  }
};

// Try auto-connect on page load
tryAutoConnect();

// Create or join a game
document.getElementById('init-btn').onclick = async () => {
  const gameId = document.getElementById('game-id-input').value.trim();
  if (!gameId) {
    alert('Please enter a game ID!');
    return;
  }
  currentGameId = gameId;
  console.log(gameId);

  await initializeGame(gameId);
  await updateBoard();
  document.getElementById('status').textContent = `Game ready: ${gameId}`;
};

// Handle cell clicks
document.querySelectorAll('.cell').forEach(cell => {
  cell.onclick = async () => {
    if (!currentGameId) {
      alert('Please create or join a game first!');
      return;
    }
    const pos = parseInt(cell.dataset.index, 10);
    // Ensure currentPlayer is set correctly
    await playGame(currentGameId, currentPlayer, pos);
    await updateBoard();
    // Optionally switch player (for local testing)
    currentPlayer = currentPlayer === 1 ? 2 : 1; // Example logic to switch players
  };
});

// Update the board UI
async function updateBoard() {
  if (!currentGameId) return;
  const state = await fetchGameState(currentGameId);
  if (!state) return;
  const { grid, status } = state;
  document.querySelectorAll('.cell').forEach((cell, i) => {
    cell.textContent = grid[i] === 1 ? 'X' : grid[i] === 2 ? 'O' : '';
  });
  let statusText = '';
  switch (status) {
    case 0: statusText = 'Game in progress'; break;
    case 1: statusText = 'Player 1 wins!'; break;
    case 2: statusText = 'Player 2 wins!'; break;
    case 3: statusText = 'Draw!'; break;
    default: statusText = 'Unknown game state';
  }
  document.getElementById('status').textContent = statusText;
}

// Optionally, poll for updates every few seconds
setInterval(updateBoard, 3000);