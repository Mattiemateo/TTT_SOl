// SolanaGame.js (browser version)
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@project-serum/anchor";

const NETWORK = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey('GX6NaiHgUE6bB4hncuUVFryAC2YRHG84Lh4G4zHBj7Du');

let provider, program, connection, wallet;

// At the top of SolanaGame.mjs
let idl = null;

async function loadIdl() {
  if (!idl) {
    const response = await fetch('./idl.json');
    idl = await response.json();
  }
  return idl;
}

// In connectWallet:
export async function connectWallet() {
  if (window.solana && window.solana.isPhantom) {
    await window.solana.connect();
    wallet = window.solana;
    connection = new Connection(NETWORK, "confirmed");
    provider = new AnchorProvider(connection, wallet, { preflightCommitment: "processed" });
    const idl = await loadIdl();
    program = new Program(idl, PROGRAM_ID, provider);
    return wallet.publicKey.toString();
  } else {
    throw new Error("Phantom wallet not found");
  }
}

// Helper to derive PDA for a given gameId and current wallet
async function getGamePDA(gameId) {
  return await PublicKey.findProgramAddress(
    [Buffer.from("ttt"), Buffer.from(gameId)],
    PROGRAM_ID
  );
}

import { SYSVAR_RENT_PUBKEY } from "@solana/web3.js";

export async function initializeGame(gameId) {
  if (!program) throw new Error("Program not initialized. Call connectWallet first.");
  const [gamePDA] = await getGamePDA(gameId);

  try {
    const accountInfo = await connection.getAccountInfo(gamePDA);
    if (accountInfo !== null) {
      console.log("Game already exists:", gamePDA.toBase58());
      return;
    }

  if (!wallet || !wallet.publicKey) {
    throw new Error("Wallet not connected");
  }

  const tx = await program.methods
    .initGame(
      wallet.publicKey, // player1
      wallet.publicKey, // player2 (or let user pick)
      gameId            // game_id as string
    )
    .accounts({
      owner: wallet.publicKey,
      game: gamePDA,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

    console.log("Game initialized! TX:", tx);
  } catch (err) {
    console.error("Failed to initialize game:", err);
  }
}

export async function playGame(gameId, player, position) {
  if (!program) throw new Error("Program not initialized. Call connectWallet first.");
  const [gamePDA] = await getGamePDA(gameId);

  try {
    const state = await fetchGameState(gameId);
    console.log("Current game state:", state);

    // Ensure the correct player is signing the transaction
    const tx = await program.methods
      .playGame(player, position)
      .accounts({
        player: wallet.publicKey, // Ensure this is the correct player
        gameData: gamePDA,
      })
      .rpc();

    console.log("Move made! TX:", tx);
    return await fetchGameState(gameId);
  } catch (err) {
    console.error("Failed to make a move:", err);
    if (err.logs) {
      console.error("Transaction logs:", err.logs);
    }
  }
}


export async function fetchGameState(gameId) {
  if (!program) throw new Error("Program not initialized. Call connectWallet first.");
  const [gamePDA] = await getGamePDA(gameId);

  try {
    const gameAccount = await program.account.game.fetch(gamePDA);
    return {
      grid: gameAccount.grid,
      status: gameAccount.gameStatus,
    };
  } catch (err) {
    console.error("Failed to fetch game state:", err);
  }
}