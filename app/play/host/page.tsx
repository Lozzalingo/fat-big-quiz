"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FaPlay, FaForward, FaStop, FaCopy, FaCheck, FaUsers, FaTrophy } from "react-icons/fa";
import { io, Socket } from "socket.io-client";

type GamePhase = "SETUP" | "LOBBY" | "COUNTDOWN" | "QUESTION" | "ANSWER_REVEAL" | "SCORING" | "FINISHED";

type Player = { id: string; name: string; score: number; connected: boolean };
type LeaderboardEntry = { rank: number; id: string; name: string; score: number };

type QuestionDisplay = {
  id: string;
  text: string;
  options: string[];
  timeLimit: number;
  round: number;
  totalRounds: number;
};

export default function HostPage() {
  const [phase, setPhase] = useState<GamePhase>("SETUP");
  const [gameCode, setGameCode] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<QuestionDisplay | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState<any>(null);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Connect socket
  useEffect(() => {
    const socket = io(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}/game`,
      { transports: ["websocket"] }
    );

    socketRef.current = socket;

    socket.on("game:state-update", (state: any) => {
      setPlayers(state.players || []);
      if (state.answeredCount !== undefined) setAnsweredCount(state.answeredCount);
      if (state.leaderboard) setLeaderboard(state.leaderboard);
    });

    socket.on("game:question", (q: QuestionDisplay) => {
      setPhase("QUESTION");
      setQuestion(q);
      setCorrectIndex(null);
      setAnsweredCount(0);
      setTimer(q.timeLimit);

      // Start countdown
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    });

    socket.on("game:answer-reveal", (data: any) => {
      setPhase("ANSWER_REVEAL");
      setCorrectIndex(data.correctIndex);
      setLeaderboard(data.leaderboard || []);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on("game:results", (data: any) => {
      setPhase("FINISHED");
      setResults(data);
      setLeaderboard(data.leaderboard || []);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on("game:player-joined", (data: any) => {
      setPlayers((prev) => {
        const exists = prev.find((p) => p.id === data.player.id);
        if (exists) return prev;
        return [...prev, { ...data.player, score: 0, connected: true }];
      });
    });

    socket.on("game:player-left", (data: any) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === data.playerId ? { ...p, connected: false } : p))
      );
    });

    return () => {
      socket.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const createGame = useCallback(() => {
    if (!socketRef.current) return;

    // Demo questions — in production these come from the product's quiz data
    const demoQuestions = [
      { id: "q1", text: "What year was the first iPhone released?", options: ["2005", "2006", "2007", "2008"], correctIndex: 2, timeLimit: 20, points: 1000, category: "Tech" },
      { id: "q2", text: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctIndex: 1, timeLimit: 20, points: 1000, category: "Science" },
      { id: "q3", text: "Who painted the Mona Lisa?", options: ["Michelangelo", "Van Gogh", "Da Vinci", "Picasso"], correctIndex: 2, timeLimit: 20, points: 1000, category: "Art" },
      { id: "q4", text: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correctIndex: 2, timeLimit: 20, points: 1000, category: "Geography" },
      { id: "q5", text: "In what year did the Titanic sink?", options: ["1910", "1912", "1914", "1916"], correctIndex: 1, timeLimit: 20, points: 1000, category: "History" },
    ];

    socketRef.current.emit(
      "game:create",
      { hostId: socketRef.current.id, config: { mode: "QUIZ", roundTimeLimit: 20 }, questions: demoQuestions },
      (res: any) => {
        if (res.success) {
          setGameCode(res.gameCode);
          setPhase("LOBBY");
          console.log("[Host] Game created:", res.gameCode);
        }
      }
    );
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit("game:start", {}, (res: any) => {
      if (res.success) setPhase("COUNTDOWN");
    });
  }, []);

  const nextRound = useCallback(() => {
    socketRef.current?.emit("game:next-round", {});
  }, []);

  const endGame = useCallback(() => {
    socketRef.current?.emit("game:end", {});
  }, []);

  function copyCode() {
    navigator.clipboard.writeText(gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const OPTION_COLORS = [
    "bg-red-600",
    "bg-blue-600",
    "bg-yellow-600",
    "bg-green-600",
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* SETUP */}
      {phase === "SETUP" && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-5xl font-black mb-2">
              Fat Big <span className="text-yellow-400">Quiz</span>
            </h1>
            <p className="text-gray-400 mb-8">Host Dashboard</p>
            <button
              onClick={createGame}
              className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-black text-xl px-10 py-5 rounded-2xl transition"
              data-action="create_game"
            >
              <FaPlay className="inline mr-3" /> CREATE GAME
            </button>
          </div>
        </div>
      )}

      {/* LOBBY */}
      {phase === "LOBBY" && (
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center w-full max-w-2xl">
            <p className="text-gray-400 mb-2 text-sm uppercase tracking-widest">
              Game Code
            </p>
            <div className="flex items-center justify-center gap-3 mb-8">
              <h2 className="text-7xl font-black tracking-[0.3em] text-yellow-400">
                {gameCode}
              </h2>
              <button
                onClick={copyCode}
                className="text-gray-500 hover:text-white p-2"
                data-action="copy_code"
              >
                {copied ? <FaCheck className="text-green-400" /> : <FaCopy />}
              </button>
            </div>

            <p className="text-gray-400 mb-2">
              Players join at <strong className="text-white">fatbigquiz.com/play</strong>
            </p>

            <div className="flex items-center justify-center gap-2 text-lg mb-8">
              <FaUsers className="text-yellow-400" />
              <span>{players.length} player{players.length !== 1 ? "s" : ""} joined</span>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {players.map((p) => (
                <span
                  key={p.id}
                  className="bg-gray-800 border border-gray-700 rounded-full px-4 py-1.5 text-sm font-medium"
                >
                  {p.name}
                </span>
              ))}
            </div>

            <button
              onClick={startGame}
              disabled={players.length === 0}
              className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-black text-xl px-10 py-5 rounded-2xl transition"
              data-action="start_game"
            >
              <FaPlay className="inline mr-3" /> START QUIZ
            </button>
          </div>
        </div>
      )}

      {/* QUESTION */}
      {(phase === "QUESTION" || phase === "ANSWER_REVEAL") && question && (
        <div className="min-h-screen flex flex-col p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-gray-400 text-sm">
              Round {question.round}/{question.totalRounds}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">
                {answeredCount}/{players.length} answered
              </span>
              <span className={`text-2xl font-bold ${timer <= 5 ? "text-red-400 animate-pulse" : "text-yellow-400"}`}>
                {timer}s
              </span>
            </div>
          </div>

          {/* Question */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <h2 className="text-4xl font-black text-center mb-12 max-w-3xl">
              {question.text}
            </h2>

            <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
              {question.options.map((opt, i) => (
                <div
                  key={i}
                  className={`${OPTION_COLORS[i]} rounded-2xl p-8 text-center text-2xl font-bold relative ${
                    correctIndex !== null
                      ? i === correctIndex
                        ? "ring-4 ring-white scale-105"
                        : "opacity-40"
                      : ""
                  } transition-all duration-300`}
                >
                  {opt}
                  {correctIndex === i && (
                    <FaCheck className="absolute top-3 right-3 text-3xl" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          {phase === "ANSWER_REVEAL" && (
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={nextRound}
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-black px-8 py-4 rounded-xl flex items-center gap-2 transition"
                data-action="next_round"
              >
                <FaForward /> NEXT QUESTION
              </button>
              <button
                onClick={endGame}
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-6 py-4 rounded-xl flex items-center gap-2 transition"
                data-action="end_game_early"
              >
                <FaStop /> END
              </button>
            </div>
          )}
        </div>
      )}

      {/* RESULTS */}
      {phase === "FINISHED" && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center w-full max-w-xl">
            <FaTrophy className="text-6xl text-yellow-400 mx-auto mb-4" />
            <h1 className="text-4xl font-black mb-2">Game Over!</h1>

            {leaderboard[0] && (
              <p className="text-2xl text-yellow-400 font-bold mb-8">
                Winner: {leaderboard[0].name} ({leaderboard[0].score} pts)
              </p>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-8">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-6 py-4 ${
                    i < leaderboard.length - 1 ? "border-b border-gray-800" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0
                          ? "bg-yellow-500 text-gray-900"
                          : i === 1
                          ? "bg-gray-400 text-gray-900"
                          : i === 2
                          ? "bg-amber-700 text-white"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <span className="font-semibold">{entry.name}</span>
                  </div>
                  <span className="font-bold text-yellow-400">
                    {entry.score} pts
                  </span>
                </div>
              ))}
            </div>

            {results?.stats && (
              <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-gray-400">Players</p>
                  <p className="text-xl font-bold">{results.stats.totalPlayers}</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-gray-400">Rounds</p>
                  <p className="text-xl font-bold">{results.stats.totalRounds}</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-gray-400">Duration</p>
                  <p className="text-xl font-bold">
                    {Math.round(results.stats.duration / 1000)}s
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setPhase("SETUP");
                setGameCode("");
                setPlayers([]);
                setQuestion(null);
                setLeaderboard([]);
                setResults(null);
              }}
              className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-black px-8 py-4 rounded-xl transition"
              data-action="play_again"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
