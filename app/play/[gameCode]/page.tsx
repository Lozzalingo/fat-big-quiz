"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { FaCheck, FaTimes, FaTrophy, FaSpinner } from "react-icons/fa";
import { io, Socket } from "socket.io-client";

type GamePhase = "JOINING" | "LOBBY" | "QUESTION" | "ANSWERED" | "RESULT" | "LEADERBOARD" | "FINISHED";

type QuestionDisplay = {
  id: string;
  text: string;
  options: string[];
  timeLimit: number;
  round: number;
  totalRounds: number;
};

type AnswerResult = {
  correct: boolean;
  points: number;
  newScore: number;
};

type LeaderboardEntry = { rank: number; name: string; score: number };

export default function PlayerGamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameCode = params?.gameCode as string;
  const playerName = searchParams?.get("name") || "Player";

  const [phase, setPhase] = useState<GamePhase>("JOINING");
  const [error, setError] = useState("");
  const [question, setQuestion] = useState<QuestionDisplay | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerCount, setPlayerCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = io(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}/game`,
      { transports: ["websocket"] }
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Player] Connected, joining game:", gameCode);
      socket.emit(
        "game:join",
        { gameCode: gameCode.toUpperCase(), playerName },
        (res: any) => {
          if (res.success) {
            setPhase("LOBBY");
            setPlayerCount(res.state?.playerCount || 1);
          } else {
            setError(res.error || "Failed to join game");
          }
        }
      );
    });

    socket.on("game:state-update", (state: any) => {
      setPlayerCount(state.playerCount || state.players?.length || 0);
    });

    socket.on("game:question", (q: QuestionDisplay) => {
      setPhase("QUESTION");
      setQuestion(q);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setCorrectIndex(null);
      setTimer(q.timeLimit);

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
      setCorrectIndex(data.correctIndex);
      setPhase("RESULT");
      setLeaderboard(data.leaderboard || []);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on("game:results", (data: any) => {
      setPhase("FINISHED");
      setLeaderboard(data.leaderboard || []);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on("game:player-joined", (data: any) => {
      setPlayerCount(data.playerCount);
    });

    return () => {
      socket.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameCode, playerName]);

  const submitAnswer = useCallback(
    (index: number) => {
      if (selectedAnswer !== null || !socketRef.current) return;
      setSelectedAnswer(index);
      setPhase("ANSWERED");

      socketRef.current.emit(
        "game:answer",
        { answerIndex: index },
        (res: AnswerResult) => {
          setAnswerResult(res);
          if (res.newScore !== undefined) setScore(res.newScore);
        }
      );
    },
    [selectedAnswer]
  );

  const OPTION_COLORS = [
    { bg: "bg-red-600", active: "bg-red-500", ring: "ring-red-400" },
    { bg: "bg-blue-600", active: "bg-blue-500", ring: "ring-blue-400" },
    { bg: "bg-yellow-600", active: "bg-yellow-500", ring: "ring-yellow-400" },
    { bg: "bg-green-600", active: "bg-green-500", ring: "ring-green-400" },
  ];

  // ── ERROR / JOINING ────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center p-4">
        <div>
          <FaTimes className="text-4xl text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
          <p className="text-gray-400">{error}</p>
          <a
            href="/play"
            className="inline-block mt-6 bg-yellow-500 text-gray-900 font-bold px-6 py-3 rounded-xl"
            data-action="back_to_join"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  if (phase === "JOINING") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <FaSpinner className="text-3xl text-yellow-400 animate-spin" />
      </div>
    );
  }

  // ── LOBBY ──────────────────────────────────────────────────────

  if (phase === "LOBBY") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center p-4">
        <div>
          <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCheck className="text-3xl text-yellow-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">You&apos;re in!</h1>
          <p className="text-gray-400 mb-1">
            Playing as <strong className="text-white">{playerName}</strong>
          </p>
          <p className="text-gray-500 text-sm">
            {playerCount} player{playerCount !== 1 ? "s" : ""} waiting...
          </p>
          <div className="mt-8 animate-pulse text-gray-500 text-sm">
            Waiting for host to start the quiz
          </div>
        </div>
      </div>
    );
  }

  // ── QUESTION / ANSWERED ────────────────────────────────────────

  if ((phase === "QUESTION" || phase === "ANSWERED") && question) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col p-4">
        {/* Timer + Score */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-400 text-sm">
            Q{question.round}/{question.totalRounds}
          </span>
          <span className={`text-xl font-bold ${timer <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}>
            {timer}s
          </span>
          <span className="text-yellow-400 font-bold">{score} pts</span>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white text-center">
            {question.text}
          </h2>
        </div>

        {/* Answer buttons */}
        <div className="flex-1 grid grid-cols-1 gap-3">
          {question.options.map((opt, i) => {
            const color = OPTION_COLORS[i];
            const isSelected = selectedAnswer === i;

            return (
              <button
                key={i}
                onClick={() => submitAnswer(i)}
                disabled={selectedAnswer !== null}
                className={`${
                  isSelected
                    ? `${color.active} ring-4 ${color.ring}`
                    : selectedAnswer !== null
                    ? `${color.bg} opacity-40`
                    : `${color.bg} active:scale-95`
                } rounded-xl p-5 text-lg font-bold text-white transition-all duration-200`}
                data-action={`answer_${i}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Waiting indicator */}
        {phase === "ANSWERED" && (
          <div className="mt-4 text-center">
            {answerResult?.correct ? (
              <div className="text-green-400 font-bold text-lg">
                <FaCheck className="inline mr-2" />
                Correct! +{answerResult.points} pts
              </div>
            ) : answerResult ? (
              <div className="text-red-400 font-bold text-lg">
                <FaTimes className="inline mr-2" />
                Wrong!
              </div>
            ) : (
              <div className="text-gray-400 animate-pulse">
                Waiting for results...
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── RESULT (between rounds) ────────────────────────────────────

  if (phase === "RESULT") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center w-full max-w-sm">
          {answerResult?.correct ? (
            <div className="text-green-400 text-5xl font-black mb-4">
              <FaCheck className="inline" />
            </div>
          ) : (
            <div className="text-red-400 text-5xl font-black mb-4">
              <FaTimes className="inline" />
            </div>
          )}
          <p className="text-2xl font-bold text-white mb-1">
            {answerResult?.correct ? `+${answerResult.points}` : "0"} pts
          </p>
          <p className="text-yellow-400 font-bold text-lg mb-6">
            Total: {score}
          </p>

          <div className="text-gray-400 text-sm animate-pulse">
            Next question coming up...
          </div>
        </div>
      </div>
    );
  }

  // ── FINISHED ───────────────────────────────────────────────────

  if (phase === "FINISHED") {
    const myRank = leaderboard.find(
      (e) => e.name === playerName
    );

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center w-full max-w-sm">
          <FaTrophy className="text-5xl text-yellow-400 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-white mb-2">Game Over!</h1>
          <p className="text-yellow-400 text-xl font-bold mb-1">
            You scored {score} pts
          </p>
          {myRank && (
            <p className="text-gray-400 mb-6">
              Rank: #{myRank.rank} of {leaderboard.length}
            </p>
          )}

          <div className="bg-gray-900 rounded-xl overflow-hidden mb-6">
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-3 ${
                  entry.name === playerName ? "bg-yellow-500/10" : ""
                } ${i < 4 ? "border-b border-gray-800" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-bold w-6">
                    #{entry.rank}
                  </span>
                  <span className={`font-medium ${entry.name === playerName ? "text-yellow-400" : "text-white"}`}>
                    {entry.name}
                  </span>
                </div>
                <span className="text-gray-400 font-bold">{entry.score}</span>
              </div>
            ))}
          </div>

          <a
            href="/play"
            className="inline-block bg-yellow-500 text-gray-900 font-bold px-6 py-3 rounded-xl"
            data-action="play_again"
          >
            Play Again
          </a>
        </div>
      </div>
    );
  }

  return null;
}
