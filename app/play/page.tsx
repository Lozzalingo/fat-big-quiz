"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaGamepad, FaArrowRight } from "react-icons/fa";

export default function PlayJoin() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!gameCode.trim() || gameCode.length < 6) {
      setError("Enter a valid 6-character game code");
      return;
    }
    if (!playerName.trim()) {
      setError("Enter your name");
      return;
    }

    // Navigate to game room with query params
    router.push(
      `/play/${gameCode.toUpperCase().trim()}?name=${encodeURIComponent(playerName.trim())}`
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-gray-950 to-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <FaGamepad className="text-6xl text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl font-black text-white">
            Fat Big <span className="text-yellow-400">Quiz</span>
          </h1>
          <p className="text-gray-400 mt-2">Join a live quiz game</p>
        </div>

        <form
          onSubmit={handleJoin}
          className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Game Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={gameCode}
              onChange={(e) => {
                setGameCode(e.target.value.toUpperCase());
                setError("");
              }}
              className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-5 py-4 text-center text-3xl font-mono font-bold text-white tracking-[0.3em] uppercase placeholder-gray-600 focus:border-yellow-400 outline-none"
              placeholder="A B C D E F"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              maxLength={20}
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError("");
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-5 py-3 text-white text-lg placeholder-gray-500 focus:border-yellow-400 outline-none text-center"
              placeholder="Enter your name"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-black text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition"
            data-action="join_game"
          >
            JOIN GAME <FaArrowRight />
          </button>
        </form>

        <div className="mt-6">
          <a
            href="/play/host"
            className="text-gray-500 hover:text-yellow-400 text-sm transition"
            data-action="go_to_host"
          >
            Are you a host? Create a game &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
