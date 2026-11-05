import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ROUNDS,
  ANSWER_KEY,
  HINTS,
  SCORING,
  RULES,
  ROMAN,
  STEPS,
  Team,
  QuestionEdit,
  AppState,
  Question
} from './data/quizData';
import { sfx } from './utils/sound';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { FxCanvas } from './components/FxCanvas';
import {
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Sparkles,
  HelpCircle,
  Trophy,
  X,
  Sliders,
  Key
} from 'lucide-react';

const STORAGE_KEY = 'hidden-truth-v1';

function defaultTeams(): Team[] {
  return [
    { id: 1, name: 'Team 1', adj: 0 },
    { id: 2, name: 'Team 2', adj: 0 },
    { id: 3, name: 'Team 3', adj: 0 },
    { id: 4, name: 'Team 4', adj: 0 }
  ];
}

function getInitialState(): AppState {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.teams) && parsed.teams.length >= 2) {
          return {
            page: parsed.page || 'home',
            step: typeof parsed.step === 'number' ? Math.max(0, Math.min(STEPS.length - 1, parsed.step)) : 0,
            teams: parsed.teams,
            nextId: parsed.nextId || 5,
            awards: parsed.awards || {},
            revealed: parsed.revealed || {},
            hint: parsed.hint || {},
            clues: parsed.clues || {},
            bonus: parsed.bonus || {},
            edits: parsed.edits || {},
            timers: parsed.timers || {},
            muted: !!parsed.muted,
            panel: parsed.panel !== false
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  return {
    page: 'home',
    step: 0,
    teams: defaultTeams(),
    nextId: 5,
    awards: {},
    revealed: {},
    hint: {},
    clues: {},
    bonus: {},
    edits: {},
    timers: {},
    muted: false,
    panel: true
  };
}

export default function App() {
  const [state, setState] = useState<AppState>(getInitialState);
  const [overlay, setOverlay] = useState<'board' | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [againArmed, setAgainArmed] = useState(false);

  // Edit question modal fields
  const [editFields, setEditFields] = useState<{ text: string; answer: string; hint: string; time: number }>({
    text: '',
    answer: '',
    hint: '',
    time: 30
  });

  // Current Step and Question helpers
  const currentStep = STEPS[state.step];
  const isQuestionStep = state.page === 'play' && currentStep.t === 'q' && !overlay;

  const currentQuestionData = useMemo(() => {
    if (currentStep.t !== 'q' || currentStep.r === undefined || currentStep.q === undefined) return null;
    const round = ROUNDS[currentStep.r];
    const q: Question = round.questions[currentStep.q];
    const edit: QuestionEdit = state.edits[q.id] || {};

    return {
      id: q.id,
      round,
      ri: currentStep.r,
      qi: currentStep.q,
      optional: !!q.optional,
      text: edit.text !== undefined ? edit.text : q.text,
      answer: edit.answer !== undefined ? edit.answer : ANSWER_KEY[q.id],
      hint: edit.hint !== undefined ? edit.hint : HINTS[q.id],
      time: edit.time !== undefined ? edit.time : round.time,
      clues: q.clues || null
    };
  }, [currentStep, state.edits]);

  // Scoring calculator
  const getQuestionPoints = useCallback(
    (qid: string) => {
      const isBonus = !!state.bonus[qid];
      const hasHint = !!state.hint[qid];
      return (isBonus ? SCORING.bonus : SCORING.base) - (hasHint ? SCORING.hintPenalty : 0);
    },
    [state.bonus, state.hint]
  );

  const getTeamScore = useCallback(
    (tid: number) => {
      let total = 0;
      Object.keys(state.awards).forEach((qid) => {
        if (state.awards[qid]?.[tid]) {
          total += getQuestionPoints(qid);
        }
      });
      const team = state.teams.find((t) => t.id === tid);
      return total + (team ? team.adj : 0);
    },
    [state.awards, state.teams, getQuestionPoints]
  );

  const rankedTeams = useMemo(() => {
    return state.teams
      .map((t) => ({ id: t.id, name: t.name, score: getTeamScore(t.id), adj: t.adj }))
      .sort((a, b) => b.score - a.score);
  }, [state.teams, getTeamScore]);

  // Timer State
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<number>(30);
  const [timerTotal, setTimerTotal] = useState<number>(30);
  const timerLastRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevWholeSecondRef = useRef<number>(30);

  // Sync Timer when question changes
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimerRunning(false);

    if (currentQuestionData) {
      const qid = currentQuestionData.id;
      const total = currentQuestionData.time;
      const saved = state.timers[qid];
      const initial = saved !== undefined ? saved : total;
      setTimerTotal(total);
      setTimerRemaining(initial);
      prevWholeSecondRef.current = Math.ceil(initial);
    } else {
      setTimerTotal(0);
      setTimerRemaining(0);
    }
  }, [currentQuestionData?.id, currentQuestionData?.time]);

  // Persist State to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  // Handle Fullscreen tracking & body class
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('playing', state.page === 'play');
    document.body.classList.toggle('panel-open', state.page === 'play' && state.panel);
  }, [state.page, state.panel]);

  // Timer ticks and sounds
  useEffect(() => {
    if (!timerRunning) return;

    timerLastRef.current = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = (now - timerLastRef.current) / 1000;
      timerLastRef.current = now;

      setTimerRemaining((prev) => {
        const next = Math.max(0, prev - dt);
        const whole = Math.ceil(next);

        if (whole !== prevWholeSecondRef.current) {
          prevWholeSecondRef.current = whole;
          if (whole > 0 && whole <= 5) {
            sfx.urgent(state.muted);
          } else if (whole > 0 && whole <= 10) {
            sfx.tick(state.muted);
          }
        }

        if (next <= 0) {
          setTimerRunning(false);
          sfx.buzzer(state.muted);
          if (currentQuestionData) {
            setState((s) => ({
              ...s,
              timers: { ...s.timers, [currentQuestionData.id]: 0 }
            }));
          }
        }
        return next;
      });
    }, 150);

    timerIntervalRef.current = interval;

    return () => {
      clearInterval(interval);
      timerIntervalRef.current = null;
    };
  }, [timerRunning, state.muted, currentQuestionData]);

  // Timer Control Handlers
  const startTimer = useCallback(() => {
    if (!currentQuestionData || timerRemaining <= 0 || timerRunning) return;
    sfx.resume();
    setTimerRunning(true);
    sfx.start(state.muted);
  }, [currentQuestionData, timerRemaining, timerRunning, state.muted]);

  const pauseTimer = useCallback(() => {
    if (!timerRunning) return;
    setTimerRunning(false);
    if (currentQuestionData) {
      setState((s) => ({
        ...s,
        timers: { ...s.timers, [currentQuestionData.id]: timerRemaining }
      }));
    }
  }, [timerRunning, currentQuestionData, timerRemaining]);

  const resetTimer = useCallback(() => {
    if (!currentQuestionData) return;
    setTimerRunning(false);
    const qid = currentQuestionData.id;
    const total = currentQuestionData.time;
    setTimerTotal(total);
    setTimerRemaining(total);
    prevWholeSecondRef.current = total;
    setState((s) => {
      const timers = { ...s.timers };
      delete timers[qid];
      return { ...s, timers };
    });
  }, [currentQuestionData]);

  const adjustTimer = useCallback(
    (delta: number) => {
      if (!currentQuestionData) return;
      setTimerRemaining((prev) => {
        const next = Math.max(0, Math.min(599, prev + delta));
        if (next > timerTotal) setTimerTotal(next);
        prevWholeSecondRef.current = Math.ceil(next);
        setState((s) => ({
          ...s,
          timers: { ...s.timers, [currentQuestionData.id]: next }
        }));
        return next;
      });
    },
    [currentQuestionData, timerTotal]
  );

  // Navigation Handlers
  const goToStep = useCallback(
    (n: number) => {
      const clamped = Math.max(0, Math.min(STEPS.length - 1, n));
      // Save current timer
      if (currentQuestionData && timerRunning) {
        setTimerRunning(false);
        setState((s) => ({
          ...s,
          timers: { ...s.timers, [currentQuestionData.id]: timerRemaining }
        }));
      }
      setOverlay(null);
      setState((s) => ({ ...s, step: clamped }));
      sfx.nav(state.muted);

      if (STEPS[clamped].t === 'winner') {
        sfx.fanfare(state.muted);
      }
    },
    [currentQuestionData, timerRunning, timerRemaining, state.muted]
  );

  const toggleReveal = useCallback(() => {
    if (!currentQuestionData) return;
    const qid = currentQuestionData.id;
    const willReveal = !state.revealed[qid];
    if (willReveal) {
      pauseTimer();
      sfx.reveal(state.muted);
    }
    setState((s) => ({
      ...s,
      revealed: { ...s.revealed, [qid]: willReveal }
    }));
  }, [currentQuestionData, state.revealed, state.muted, pauseTimer]);

  const showHint = useCallback(() => {
    if (!currentQuestionData || state.hint[currentQuestionData.id]) return;
    sfx.hint(state.muted);
    setState((s) => ({
      ...s,
      hint: { ...s.hint, [currentQuestionData.id]: true }
    }));
  }, [currentQuestionData, state.hint, state.muted]);

  const nextClue = useCallback(() => {
    if (!currentQuestionData || !currentQuestionData.clues) return;
    const qid = currentQuestionData.id;
    const currentCount = state.clues[qid] || 1;
    if (currentCount < currentQuestionData.clues.length) {
      sfx.hint(state.muted);
      setState((s) => ({
        ...s,
        clues: { ...s.clues, [qid]: currentCount + 1 }
      }));
    }
  }, [currentQuestionData, state.clues, state.muted]);

  const toggleBonus = useCallback(() => {
    if (!currentQuestionData) return;
    const qid = currentQuestionData.id;
    setState((s) => ({
      ...s,
      bonus: { ...s.bonus, [qid]: !s.bonus[qid] }
    }));
  }, [currentQuestionData]);

  const awardTeam = useCallback(
    (tid: number) => {
      if (!currentQuestionData) return;
      const qid = currentQuestionData.id;
      const isAwarded = !!state.awards[qid]?.[tid];

      if (!isAwarded) {
        sfx.point(state.muted);
      }

      setState((s) => {
        const awards = { ...s.awards };
        const qAwards = { ...(awards[qid] || {}) };
        if (isAwarded) {
          delete qAwards[tid];
        } else {
          qAwards[tid] = true;
        }
        awards[qid] = qAwards;
        return { ...s, awards };
      });
    },
    [currentQuestionData, state.awards, state.muted]
  );

  const toggleFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleMute = useCallback(() => {
    setState((s) => {
      const nextMuted = !s.muted;
      if (!nextMuted) sfx.start(false);
      return { ...s, muted: nextMuted };
    });
  }, []);

  const togglePanel = useCallback(() => {
    setState((s) => ({ ...s, panel: !s.panel }));
  }, []);

  const toggleBoard = useCallback(() => {
    if (state.page !== 'play') return;
    setOverlay((prev) => (prev ? null : 'board'));
    sfx.nav(state.muted);
  }, [state.page, state.muted]);

  const startNewGame = useCallback((targetPage: 'home' | 'play') => {
    setTimerRunning(false);
    setOverlay(null);
    setState((s) => ({
      page: targetPage,
      step: 0,
      teams: s.teams.map((t) => ({ id: t.id, name: t.name, adj: 0 })),
      nextId: s.nextId,
      awards: {},
      revealed: {},
      hint: {},
      clues: {},
      bonus: {},
      edits: {},
      timers: {},
      muted: s.muted,
      panel: true
    }));
  }, []);

  const addTeam = useCallback(() => {
    if (state.teams.length >= 6) return;
    setState((s) => ({
      ...s,
      teams: [...s.teams, { id: s.nextId, name: `Team ${s.teams.length + 1}`, adj: 0 }],
      nextId: s.nextId + 1
    }));
  }, [state.teams.length]);

  const removeTeam = useCallback(() => {
    if (state.teams.length <= 4) return;
    setState((s) => {
      const newTeams = [...s.teams];
      const removed = newTeams.pop();
      const awards = { ...s.awards };
      if (removed) {
        Object.keys(awards).forEach((k) => {
          if (awards[k]) {
            const copy = { ...awards[k] };
            delete copy[removed.id];
            awards[k] = copy;
          }
        });
      }
      return { ...s, teams: newTeams, awards };
    });
  }, [state.teams.length]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editModalOpen || keyModalOpen) {
        if (e.key === 'Escape') {
          setEditModalOpen(false);
          setKeyModalOpen(false);
        }
        return;
      }
      if (adminOpen) {
        if (e.key === 'Escape') {
          setAdminOpen(false);
        }
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const k = e.key.toLowerCase();
      let handled = false;

      if (k === 'f') {
        toggleFullscreen();
        handled = true;
      } else if (k === 'm') {
        toggleMute();
        handled = true;
      } else if (state.page === 'play') {
        if (k === 'arrowright') {
          goToStep(state.step + 1);
          handled = true;
        } else if (k === 'arrowleft') {
          goToStep(state.step - 1);
          handled = true;
        } else if (k === ' ') {
          if (isQuestionStep) {
            if (timerRunning) pauseTimer();
            else startTimer();
            handled = true;
          }
        } else if (k === 'r') {
          toggleReveal();
          handled = true;
        } else if (k === 'c') {
          nextClue();
          handled = true;
        } else if (k === 's') {
          toggleBoard();
          handled = true;
        } else if (k === 'h') {
          togglePanel();
          handled = true;
        }
      }

      if (handled) {
        e.preventDefault();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editModalOpen,
    keyModalOpen,
    adminOpen,
    state.page,
    state.step,
    isQuestionStep,
    timerRunning,
    toggleFullscreen,
    toggleMute,
    goToStep,
    pauseTimer,
    startTimer,
    toggleReveal,
    nextClue,
    toggleBoard,
    togglePanel
  ]);

  // Open Edit Modal
  const openEditModal = () => {
    if (!currentQuestionData) return;
    setEditFields({
      text: currentQuestionData.text,
      answer: currentQuestionData.answer,
      hint: currentQuestionData.hint,
      time: currentQuestionData.time
    });
    setEditModalOpen(true);
  };

  const saveQuestionEdit = () => {
    if (!currentQuestionData) return;
    const qid = currentQuestionData.id;
    setState((s) => ({
      ...s,
      edits: {
        ...s.edits,
        [qid]: {
          text: editFields.text.trim() || currentQuestionData.text,
          answer: editFields.answer.trim() || currentQuestionData.answer,
          hint: editFields.hint.trim() || currentQuestionData.hint,
          time: editFields.time >= 5 && editFields.time <= 599 ? editFields.time : currentQuestionData.time
        }
      }
    }));
    setEditModalOpen(false);
  };

  const restoreDefaultQuestion = () => {
    if (!currentQuestionData) return;
    const qid = currentQuestionData.id;
    setState((s) => {
      const edits = { ...s.edits };
      delete edits[qid];
      return { ...s, edits };
    });
    setEditModalOpen(false);
  };

  // Helper for displaying mm:ss
  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.ceil(sec));
    const mins = Math.floor(s / 60);
    const remainder = s % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  // Progress check for home screen
  const hasGameProgress =
    state.step > 0 ||
    Object.keys(state.awards).length > 0 ||
    state.teams.some((t) => t.adj !== 0) ||
    Object.keys(state.revealed).length > 0;

  // Question worth
  const currentWorth = currentQuestionData ? getQuestionPoints(currentQuestionData.id) : 10;

  // Timer Circle calculation
  const circleRadius = 46;
  const circumference = 2 * Math.PI * circleRadius;
  const timerFraction = timerTotal > 0 ? Math.max(0, Math.min(1, timerRemaining / timerTotal)) : 0;
  const strokeDashoffset = circumference * (1 - timerFraction);
  const isTimerLow = timerRemaining <= 10 && timerTotal > 0;

  return (
    <div id="app" className="relative h-full w-full overflow-hidden select-none" onClick={() => sfx.resume()}>
      {/* Background ambient motes & glow */}
      <BackgroundCanvas />

      {/* Main Stage Wrapper */}
      <div className="stage-wrap">
        <div className="stage" id="stage">
          {/* Ornate Golden Frame */}
          <div className="frame" aria-hidden="true" />

          {/* Top HUD (Sound & Fullscreen) */}
          <div className="absolute top-[calc(var(--u)*2.2)] right-[calc(var(--u)*3)] flex gap-2 z-30">
            <button
              onClick={toggleMute}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--line)] bg-[#08080b]/60 text-[var(--gold-hi)] hover:bg-[var(--gold)]/20 hover:shadow-[0_0_12px_rgba(214,178,94,0.4)] transition-all cursor-pointer"
              title={state.muted ? 'Unmute Sound (M)' : 'Mute Sound (M)'}
              aria-label="Toggle Sound"
            >
              {state.muted ? <VolumeX className="w-4 h-4 text-red-300" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--line)] bg-[#08080b]/60 text-[var(--gold-hi)] hover:bg-[var(--gold)]/20 hover:shadow-[0_0_12px_rgba(214,178,94,0.4)] transition-all cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>

          {/* Main Stage View Content */}
          <main className="stage-view">
            {/* VIEW 1: HOME */}
            {state.page === 'home' && (
              <div className="home enter">
                <svg className="keyhole" viewBox="0 0 50 64" aria-hidden="true">
                  <circle cx="25" cy="22" r="14" fill="rgba(214,178,94,.12)" stroke="#d6b25e" strokeWidth="2" />
                  <path
                    d="M19 34 L31 34 L36 62 L14 62 Z"
                    fill="rgba(214,178,94,.12)"
                    stroke="#d6b25e"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <circle cx="25" cy="22" r="4" fill="#f3dc9a" />
                </svg>

                <h1 className="display title">
                  <span className="gold">The Hidden Truth</span>
                </h1>
                <p className="tagline">Nothing Is as It Seems</p>

                <div className="flex gap-[calc(var(--u)*1.4)] flex-wrap justify-center mt-2">
                  <button
                    className="btn solid big"
                    onClick={() => {
                      sfx.nav(state.muted);
                      setState((s) => ({ ...s, page: 'setup' }));
                    }}
                  >
                    Start the Mystery
                  </button>
                  <button
                    className="btn big"
                    onClick={() => {
                      sfx.nav(state.muted);
                      setState((s) => ({ ...s, page: 'how' }));
                    }}
                  >
                    How to Play
                  </button>
                  {hasGameProgress && (
                    <button
                      className="btn ghost big"
                      onClick={() => {
                        sfx.nav(state.muted);
                        setState((s) => ({ ...s, page: 'play' }));
                      }}
                    >
                      Resume Game
                    </button>
                  )}
                </div>

                <div className="text-[var(--fog)] text-[calc(var(--u)*0.95)] tracking-wide mt-3 text-center">
                  Quizmaster: a control bar appears at the bottom during the game (press <kbd className="px-1 py-0.5 bg-[var(--ink-3)] border border-[var(--line)] rounded text-xs">H</kbd> to hide or show)
                </div>
              </div>
            )}

            {/* VIEW 2: HOW TO PLAY */}
            {state.page === 'how' && (
              <div className="enter flex flex-col flex-1 min-h-0">
                <div className="flex items-baseline justify-between gap-4 mb-[calc(var(--u)*1.6)]">
                  <div>
                    <div className="eyebrow">The rules of the night</div>
                    <h2 className="display gold text-[calc(var(--u)*4.2)]">How to Play</h2>
                  </div>
                  <div className="flex gap-2">
                    <span className="chip">Correct · {SCORING.base} pts</span>
                    <span className="chip bonus">Bonus · {SCORING.bonus} pts</span>
                    <span className="chip warn">Hint · −{SCORING.hintPenalty}</span>
                  </div>
                </div>

                <ol className="rules">
                  {RULES.map((rule, idx) => (
                    <li key={idx} style={{ animationDelay: `${idx * 80}ms` }}>
                      <span className="ic">{idx + 1}</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ol>

                <div className="flex justify-center gap-4 mt-[calc(var(--u)*1.6)]">
                  <button
                    className="btn ghost"
                    onClick={() => {
                      sfx.nav(state.muted);
                      setState((s) => ({ ...s, page: 'home' }));
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    className="btn solid"
                    onClick={() => {
                      sfx.nav(state.muted);
                      setState((s) => ({ ...s, page: 'setup' }));
                    }}
                  >
                    Start the Mystery
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 3: TEAM SETUP */}
            {state.page === 'setup' && (
              <div className="setup enter">
                <div className="eyebrow text-center">Gather your teams</div>
                <h2 className="display gold text-center text-[calc(var(--u)*3.6)]">Choose Team Names</h2>

                <div className="flex items-center justify-center gap-4 my-2">
                  <button
                    className="btn sm"
                    disabled={state.teams.length <= 4}
                    onClick={removeTeam}
                  >
                    −
                  </button>
                  <b className="font-['Cormorant_Garamond',serif] text-[calc(var(--u)*3.2)] min-w-[2ch] text-center">
                    {state.teams.length}
                  </b>
                  <span className="text-[var(--fog)] text-sm tracking-wide">teams (4 to 6)</span>
                  <button
                    className="btn sm"
                    disabled={state.teams.length >= 6}
                    onClick={addTeam}
                  >
                    +
                  </button>
                </div>

                <div className="team-in">
                  {state.teams.map((t, i) => (
                    <label key={t.id} className="flex flex-col gap-1 text-xs tracking-wider uppercase text-[var(--gold)]">
                      Team {i + 1}
                      <input
                        className="inp"
                        maxLength={24}
                        value={t.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setState((s) => ({
                            ...s,
                            teams: s.teams.map((team) =>
                              team.id === t.id ? { ...team, name: val.slice(0, 24) } : team
                            )
                          }));
                        }}
                      />
                    </label>
                  ))}
                </div>

                <div className="flex justify-center gap-4 mt-4">
                  <button
                    className="btn ghost"
                    onClick={() => {
                      sfx.nav(state.muted);
                      setState((s) => ({ ...s, page: 'home' }));
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    className="btn solid big"
                    onClick={() => {
                      startNewGame('play');
                      sfx.nav(state.muted);
                    }}
                  >
                    Begin the Mystery
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 4: SCOREBOARD OVERLAY */}
            {state.page === 'play' && overlay === 'board' && (
              <div className="board enter">
                <div className="eyebrow text-center">The Standings</div>
                <h2 className="display gold text-[calc(var(--u)*3.8)] text-center mb-[calc(var(--u)*1.6)]">
                  Scoreboard
                </h2>
                <div className="rows">
                  {rankedTeams.map((t, i) => {
                    const topScore = Math.max(1, rankedTeams[0]?.score || 1);
                    const widthPct = Math.max(0, Math.round((t.score / topScore) * 100));
                    return (
                      <div
                        key={t.id}
                        className={`rw ${i === 0 && t.score > 0 ? 'first' : ''}`}
                        style={{ animationDelay: `${i * 90}ms` }}
                      >
                        <span className="rk">{i + 1}</span>
                        <span className="nm">{t.name}</span>
                        <span className="tr">
                          <span className="fl" style={{ width: `${widthPct}%` }} />
                        </span>
                        <span className="sc mono">{t.score}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center mt-6">
                  <button className="btn solid" onClick={toggleBoard}>
                    Return to Question (S)
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 5: ROUND INTRO */}
            {state.page === 'play' && !overlay && currentStep.t === 'intro' && currentStep.r !== undefined && (
              <div className="intro enter">
                <div className="num">ROUND {ROMAN[currentStep.r]}</div>
                <h2 className="display gold text-[calc(var(--u)*7)]">{ROUNDS[currentStep.r].title}</h2>
                <div className="rule" />
                <p>{ROUNDS[currentStep.r].tag}</p>
                <div className="flex gap-[calc(var(--u)*1.2)] justify-center flex-wrap mt-2">
                  <span className="chip">{ROUNDS[currentStep.r].questions.length} questions</span>
                  <span className="chip">{ROUNDS[currentStep.r].time} seconds each</span>
                  <span className="chip">{SCORING.base} pts per answer</span>
                </div>
              </div>
            )}

            {/* VIEW 6: QUESTION VIEW */}
            {state.page === 'play' && !overlay && currentStep.t === 'q' && currentQuestionData && (
              <div className="q enter">
                <div className="q-top">
                  <span className="eyebrow">
                    Round {ROMAN[currentQuestionData.ri]} · {currentQuestionData.round.title}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <span className="chip">
                      Question {currentQuestionData.qi + 1} / {currentQuestionData.round.questions.length}
                    </span>
                    {currentQuestionData.optional && <span className="chip">Optional question</span>}
                    {state.bonus[currentQuestionData.id] && <span className="chip bonus">★ Bonus Question</span>}
                    {state.hint[currentQuestionData.id] && (
                      <span className="chip warn">Hint used · −{SCORING.hintPenalty}</span>
                    )}
                  </div>
                </div>

                <div className="q-main">
                  <h2
                    className={`qtext ${
                      currentQuestionData.text.length > 70 ? 'long text-[calc(var(--u)*3.8)]' : 'text-[calc(var(--u)*4.6)]'
                    }`}
                  >
                    {currentQuestionData.text}
                  </h2>

                  {currentQuestionData.clues && (
                    <ul className="clues">
                      {currentQuestionData.clues
                        .slice(0, state.clues[currentQuestionData.id] || 1)
                        .map((clue, idx) => (
                          <li key={idx}>
                            <small>Clue {idx + 1}</small>
                            {clue}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                <div className="q-side">
                  <div className={`ring ${isTimerLow ? 'low' : ''}`}>
                    <svg viewBox="0 0 100 100">
                      <circle className="trk" cx="50" cy="50" r={circleRadius} fill="none" strokeWidth="3" />
                      <circle
                        className="bar"
                        cx="50"
                        cy="50"
                        r={circleRadius}
                        fill="none"
                        strokeWidth="4"
                        style={{
                          strokeDasharray: circumference,
                          strokeDashoffset: strokeDashoffset
                        }}
                      />
                    </svg>
                    <div className="digits mono">{formatTime(timerRemaining)}</div>
                  </div>

                  <div className="pts">
                    <b>{currentWorth}</b>
                    <span>points</span>
                  </div>
                </div>

                <div className="q-foot">
                  {state.hint[currentQuestionData.id] && (
                    <div className="box hint">
                      <span className="lab">Hint</span>
                      <span className="txt">{currentQuestionData.hint}</span>
                    </div>
                  )}

                  {state.revealed[currentQuestionData.id] && (
                    <div className="box answer">
                      <span className="lab">Answer</span>
                      <span className="txt">{currentQuestionData.answer}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 7: POST-ROUND SCOREBOARD */}
            {state.page === 'play' && !overlay && currentStep.t === 'board' && currentStep.r !== undefined && (
              <div className="board enter">
                <div className="eyebrow text-center">Standings Update</div>
                <h2 className="display gold text-[calc(var(--u)*3.8)] text-center mb-[calc(var(--u)*1.6)]">
                  After Round {ROMAN[currentStep.r]} · {ROUNDS[currentStep.r].title}
                </h2>
                <div className="rows">
                  {rankedTeams.map((t, i) => {
                    const topScore = Math.max(1, rankedTeams[0]?.score || 1);
                    const widthPct = Math.max(0, Math.round((t.score / topScore) * 100));
                    return (
                      <div
                        key={t.id}
                        className={`rw ${i === 0 && t.score > 0 ? 'first' : ''}`}
                        style={{ animationDelay: `${i * 90}ms` }}
                      >
                        <span className="rk">{i + 1}</span>
                        <span className="nm">{t.name}</span>
                        <span className="tr">
                          <span className="fl" style={{ width: `${widthPct}%` }} />
                        </span>
                        <span className="sc mono">{t.score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 8: WINNER CEREMONY */}
            {state.page === 'play' && !overlay && currentStep.t === 'winner' && (
              <div className="winner enter">
                <div className="crown" aria-hidden="true">♛</div>
                <div className="eyebrow">
                  {rankedTeams[0]?.score <= 0
                    ? 'No Winner Yet'
                    : rankedTeams.filter((t) => t.score === rankedTeams[0].score).length > 1
                    ? 'It’s a Tie'
                    : 'The Winner'}
                </div>
                <h2 className="display gold text-[calc(var(--u)*7.5)]">
                  {rankedTeams[0]?.score <= 0
                    ? 'The Truth Remains Hidden'
                    : rankedTeams
                        .filter((t) => t.score === rankedTeams[0].score)
                        .map((t) => t.name)
                        .join(' & ')}
                </h2>
                <div className="sc mono">
                  {rankedTeams[0]?.score <= 0 ? 'NO POINTS SCORED' : `${rankedTeams[0].score} POINTS`}
                </div>
                <div className="flex gap-2 justify-center flex-wrap mt-3">
                  {rankedTeams.slice(0, 6).map((t, i) => (
                    <span
                      key={t.id}
                      className={`chip ${t.score === rankedTeams[0]?.score && t.score > 0 ? 'bonus' : ''}`}
                    >
                      {i + 1}. {t.name} · {t.score}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 9: FINAL EPILOGUE */}
            {state.page === 'play' && !overlay && currentStep.t === 'final' && (
              <div className="final">
                <h2 className="display gold l1">
                  The truth was hidden
                  <br />
                  in every question.
                </h2>
                <div className="l2">
                  <div className="eyebrow">Thank you for playing</div>
                  <div className="display gold big-t">The Hidden Truth</div>
                  <div className="display text-[var(--ivory)] text-[calc(var(--u)*3.4)]">
                    Nothing Is as It Seems
                  </div>
                  <button
                    className="btn solid big mt-4"
                    onClick={() => {
                      if (againArmed) {
                        startNewGame('home');
                        setAgainArmed(false);
                      } else {
                        setAgainArmed(true);
                        setTimeout(() => setAgainArmed(false), 3500);
                      }
                    }}
                  >
                    {againArmed ? 'Tap Again to Restart' : 'Play Again'}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Floating Toggle for Host Controls (when hidden) */}
      {state.page === 'play' && !state.panel && (
        <button
          onClick={togglePanel}
          className="fixed right-4 bottom-4 z-40 btn solid sm shadow-lg flex items-center gap-1.5"
          title="Show Quizmaster Controls (H)"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Controls (H)</span>
        </button>
      )}

      {/* Bottom Host Control Bar */}
      {state.page === 'play' && state.panel && (
        <div id="bar" role="toolbar" aria-label="Quizmaster Controls">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            {/* Screen Navigation */}
            <div className="flex items-center gap-2">
              <button
                className="btn sm"
                disabled={state.step === 0}
                onClick={() => goToStep(state.step - 1)}
                title="Previous Screen (Left Arrow)"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <div className="text-xs text-[var(--fog)] min-w-[200px]">
                <b className="text-[var(--ivory)]">
                  {currentStep.t === 'intro'
                    ? `Round ${ROMAN[currentStep.r || 0]} Intro`
                    : currentStep.t === 'q'
                    ? `Round ${ROMAN[currentStep.r || 0]} · Q${(currentStep.q || 0) + 1} of ${
                        ROUNDS[currentStep.r || 0].questions.length
                      }`
                    : currentStep.t === 'board'
                    ? `Scoreboard R${ROMAN[currentStep.r || 0]}`
                    : currentStep.t === 'winner'
                    ? 'Winner Ceremony'
                    : 'Final Epilogue'}
                </b>{' '}
                · Screen {state.step + 1}/{STEPS.length}
              </div>
              <button
                className="btn sm solid"
                disabled={state.step === STEPS.length - 1}
                onClick={() => goToStep(state.step + 1)}
                title="Next Screen (Right Arrow)"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Actions & Timer */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="btn sm solid"
                disabled={!isQuestionStep}
                onClick={toggleReveal}
                title="Reveal / Hide Answer (R)"
              >
                <Eye className="w-3.5 h-3.5" />
                {currentQuestionData && state.revealed[currentQuestionData.id]
                  ? 'Hide Answer (R)'
                  : 'Reveal Answer (R)'}
              </button>

              <div className="font-['Cormorant_Garamond',serif] text-2xl font-bold text-[var(--gold-hi)] min-w-[4ch] text-center mx-1 mono">
                {formatTime(timerRemaining)}
              </div>

              <button
                className={`btn sm solid ${timerRunning ? 'on' : ''}`}
                disabled={!isQuestionStep || timerRemaining <= 0}
                onClick={timerRunning ? pauseTimer : startTimer}
                title="Start/Pause Timer (Space)"
              >
                {timerRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Start
                  </>
                )}
              </button>

              <button
                className="btn sm ghost"
                onClick={() => setAdminOpen(true)}
                title="Open Host Settings & Adjustments"
              >
                <Settings className="w-3.5 h-3.5" /> Admin
              </button>

              <button className="btn sm ghost" onClick={togglePanel} title="Hide Host Bar (H)">
                Hide (H)
              </button>
            </div>
          </div>

          {/* Quick Team Award Chips */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-[0.66rem] tracking-[0.24em] uppercase text-[var(--gold)] font-extrabold flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Mark Correct (+{currentWorth} pts):
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {state.teams.map((t) => {
                const awarded = !!(
                  currentQuestionData && state.awards[currentQuestionData.id]?.[t.id]
                );
                return (
                  <button
                    key={t.id}
                    disabled={!isQuestionStep}
                    onClick={() => awardTeam(t.id)}
                    className={`tchip ${awarded ? 'done' : ''}`}
                    title={awarded ? 'Undo Points' : 'Award Points'}
                  >
                    <span>{t.name}</span>
                    <b>✓</b>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Admin Dialog Modal */}
      {adminOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setAdminOpen(false)}
        >
          <div
            className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto bg-[#0b0b10] border border-[var(--gold)] shadow-[0_0_40px_rgba(214,178,94,0.25)] p-5 flex flex-col gap-4 text-sm"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Admin Panel"
          >
            <div className="flex justify-between items-center border-b border-[var(--line)] pb-3">
              <h3 className="font-['Cormorant_Garamond',serif] text-2xl font-bold tracking-wider uppercase text-[var(--gold-hi)] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[var(--gold)]" /> Admin Panel
              </h3>
              <button className="btn sm ghost" onClick={() => setAdminOpen(false)}>
                Close (Esc)
              </button>
            </div>

            {/* Question Actions */}
            <section className="border border-[var(--line)] p-3 bg-white/[0.015] rounded flex flex-col gap-2">
              <h4 className="text-[0.68rem] tracking-[0.28em] uppercase text-[var(--gold)] font-extrabold flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" /> Question Controls
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn sm"
                  disabled={!isQuestionStep || !!state.hint[currentQuestionData?.id || '']}
                  onClick={showHint}
                >
                  {state.hint[currentQuestionData?.id || '']
                    ? 'Hint Shown'
                    : `Show Hint (−${SCORING.hintPenalty} pts)`}
                </button>
                <button
                  className={`btn sm ghost ${
                    currentQuestionData && state.bonus[currentQuestionData.id] ? 'on' : ''
                  }`}
                  disabled={!isQuestionStep}
                  onClick={toggleBonus}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Bonus {SCORING.bonus} pts:{' '}
                  {currentQuestionData && state.bonus[currentQuestionData.id] ? 'ON' : 'OFF'}
                </button>
              </div>

              {currentQuestionData?.clues && (
                <button
                  className="btn sm mt-1"
                  disabled={
                    !isQuestionStep ||
                    (state.clues[currentQuestionData.id] || 1) >= currentQuestionData.clues.length
                  }
                  onClick={nextClue}
                >
                  Show Next Clue ({state.clues[currentQuestionData.id] || 1}/
                  {currentQuestionData.clues.length}) (C)
                </button>
              )}

              <button
                className="btn sm ghost mt-1"
                disabled={!isQuestionStep}
                onClick={() => {
                  setAdminOpen(false);
                  openEditModal();
                }}
              >
                Edit Current Question Text/Time
              </button>

              <div className="text-xs text-[var(--fog)] mt-1">
                {isQuestionStep
                  ? `Worth ${currentWorth} points now ${
                      currentQuestionData?.optional ? '· (Optional question)' : ''
                    }`
                  : 'Navigate to a question to modify its clues, hints, or score.'}
              </div>
            </section>

            {/* Timer Actions */}
            <section className="border border-[var(--line)] p-3 bg-white/[0.015] rounded flex flex-col gap-2">
              <h4 className="text-[0.68rem] tracking-[0.28em] uppercase text-[var(--gold)] font-extrabold">
                Timer Quick Adjust
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <button className="btn sm" disabled={!isQuestionStep} onClick={resetTimer}>
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
                <button className="btn sm" disabled={!isQuestionStep} onClick={() => adjustTimer(-10)}>
                  <Minus className="w-3.5 h-3.5" /> −10s
                </button>
                <button className="btn sm" disabled={!isQuestionStep} onClick={() => adjustTimer(10)}>
                  <Plus className="w-3.5 h-3.5" /> +10s
                </button>
              </div>
            </section>

            {/* Team Roster & Score Adjustments */}
            <section className="border border-[var(--line)] p-3 bg-white/[0.015] rounded flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <h4 className="text-[0.68rem] tracking-[0.28em] uppercase text-[var(--gold)] font-extrabold">
                  Teams & Manual Score Adjustments
                </h4>
                <div className="flex gap-1.5">
                  <button
                    className="btn sm ghost text-xs py-0.5 px-2"
                    disabled={state.teams.length >= 6}
                    onClick={addTeam}
                  >
                    + Add
                  </button>
                  <button
                    className="btn sm ghost text-xs py-0.5 px-2"
                    disabled={state.teams.length <= 4}
                    onClick={removeTeam}
                  >
                    − Remove
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {state.teams.map((t) => {
                  const currentScore = getTeamScore(t.id);
                  return (
                    <div key={t.id} className="flex items-center gap-2 text-xs">
                      <input
                        className="inp py-1 px-2 flex-1"
                        value={t.name}
                        maxLength={24}
                        onChange={(e) => {
                          const val = e.target.value.slice(0, 24);
                          setState((s) => ({
                            ...s,
                            teams: s.teams.map((item) =>
                              item.id === t.id ? { ...item, name: val } : item
                            )
                          }));
                        }}
                      />
                      <span className="font-['Cormorant_Garamond',serif] text-lg font-bold text-[var(--gold-hi)] min-w-[3ch] text-center">
                        {currentScore}
                      </span>
                      <button
                        className="btn sm ghost px-2"
                        title="Deduct 5 points"
                        onClick={() => {
                          setState((s) => ({
                            ...s,
                            teams: s.teams.map((item) =>
                              item.id === t.id ? { ...item, adj: item.adj - 5 } : item
                            )
                          }));
                        }}
                      >
                        −5
                      </button>
                      <button
                        className="btn sm solid px-2"
                        title="Add 5 points"
                        onClick={() => {
                          sfx.point(state.muted);
                          setState((s) => ({
                            ...s,
                            teams: s.teams.map((item) =>
                              item.id === t.id ? { ...item, adj: item.adj + 5 } : item
                            )
                          }));
                        }}
                      >
                        +5
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Screens & Views */}
            <section className="border border-[var(--line)] p-3 bg-white/[0.015] rounded flex flex-col gap-2">
              <h4 className="text-[0.68rem] tracking-[0.28em] uppercase text-[var(--gold)] font-extrabold">
                Navigation & Display
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn sm"
                  onClick={() => {
                    setAdminOpen(false);
                    toggleBoard();
                  }}
                >
                  <Trophy className="w-3.5 h-3.5" /> Toggle Scoreboard (S)
                </button>
                <button
                  className="btn sm"
                  onClick={() => {
                    setAdminOpen(false);
                    setKeyModalOpen(true);
                  }}
                >
                  <Key className="w-3.5 h-3.5" /> Answer Key (Host)
                </button>
                <button className="btn sm" onClick={toggleFullscreen}>
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'}
                </button>
                <button className={`btn sm ${!state.muted ? 'on' : ''}`} onClick={toggleMute}>
                  {state.muted ? 'Sound Muted' : 'Sound Active'}
                </button>
                <button
                  className="btn sm ghost"
                  onClick={() => {
                    setAdminOpen(false);
                    setState((s) => ({ ...s, page: 'home' }));
                  }}
                >
                  Go to Home Screen
                </button>
                <button
                  className="btn sm danger"
                  onClick={() => {
                    if (resetArmed) {
                      startNewGame('home');
                      setResetArmed(false);
                      setAdminOpen(false);
                    } else {
                      setResetArmed(true);
                      setTimeout(() => setResetArmed(false), 3500);
                    }
                  }}
                >
                  {resetArmed ? 'Confirm Reset Game' : 'Reset All Scores'}
                </button>
              </div>
            </section>

            {/* Shortcuts Cheat Sheet */}
            <div className="text-[0.72rem] text-[var(--fog)] leading-relaxed bg-[var(--ink-2)] p-2.5 rounded border border-[var(--line)]">
              <b className="text-[var(--gold)] block mb-1">Keyboard Shortcuts:</b>
              <kbd className="px-1 py-0.5 bg-[var(--ink-3)] border border-[var(--line)] rounded">Space</kbd> Start/Pause Timer ·{' '}
              <kbd className="px-1 py-0.5 bg-[var(--ink-3)] border border-[var(--line)] rounded">→</kbd> Next ·{' '}
              <kbd className="px-1 py-0.5 bg-[var(--ink-3)] border border-[var(--line)] rounded">←</kbd> Prev ·{' '}
              <kbd className="px-1 py-0.5 bg-[var(--ink-3)] border border-[var(--line)] rounded">R</kbd> Reveal Answer ·{' '}
              <kbd className="px-1 py-0.5 bg-[var(--ink-3)] border border-[var(--line)] rounded">C</kbd> Next Clue ·{' '}
              <kbd className="px-1 py-0.5 bg-[var(--ink-3)] border border-[var(--line)] rounded">S</kbd> Scoreboard ·{' '}
              <kbd className="px-1 py-0.5 bg-[var(--ink-3)] border border-[var(--line)] rounded">H</kbd> Hide/Show Controls ·{' '}
              <kbd className="px-1 py-0.5 bg-[var(--ink-3)] border border-[var(--line)] rounded">F</kbd> Fullscreen ·{' '}
              <kbd className="px-1 py-0.5 bg-[var(--ink-3)] border border-[var(--line)] rounded">M</kbd> Mute
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editModalOpen && currentQuestionData && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setEditModalOpen(false)}
        >
          <div
            className="w-full max-w-[600px] bg-[#0d0d13] border border-[var(--gold)] shadow-[0_0_40px_rgba(214,178,94,0.25)] p-5 flex flex-col gap-3 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[var(--line)] pb-2">
              <h3 className="font-['Cormorant_Garamond',serif] text-xl font-bold uppercase text-[var(--gold-hi)]">
                Edit Question ({currentQuestionData.id})
              </h3>
              <button
                className="text-[var(--fog)] hover:text-white"
                onClick={() => setEditModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-wider text-[var(--gold)]">
              Question Text
              <textarea
                className="inp"
                rows={2}
                value={editFields.text}
                onChange={(e) => setEditFields({ ...editFields, text: e.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-wider text-[var(--gold)]">
              Answer (Host Only)
              <textarea
                className="inp"
                rows={2}
                value={editFields.answer}
                onChange={(e) => setEditFields({ ...editFields, answer: e.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-wider text-[var(--gold)]">
              Hint
              <textarea
                className="inp"
                rows={2}
                value={editFields.hint}
                onChange={(e) => setEditFields({ ...editFields, hint: e.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs uppercase tracking-wider text-[var(--gold)]">
              Time Limit (Seconds)
              <input
                type="number"
                min={5}
                max={599}
                className="inp"
                value={editFields.time}
                onChange={(e) => setEditFields({ ...editFields, time: parseInt(e.target.value, 10) || 30 })}
              />
            </label>

            <div className="flex justify-end gap-3 mt-2">
              <button className="btn ghost sm" onClick={() => setEditModalOpen(false)}>
                Cancel
              </button>
              <button className="btn ghost sm" onClick={restoreDefaultQuestion}>
                Restore Default
              </button>
              <button className="btn solid sm" onClick={saveQuestionEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Answer Key Host Modal */}
      {keyModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setKeyModalOpen(false)}
        >
          <div
            className="w-full max-w-[640px] max-h-[85vh] overflow-y-auto bg-[#0d0d13] border border-[var(--gold)] shadow-[0_0_40px_rgba(214,178,94,0.25)] p-5 flex flex-col gap-3 rounded text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[var(--line)] pb-2">
              <div>
                <h3 className="font-['Cormorant_Garamond',serif] text-xl font-bold uppercase text-[var(--gold-hi)]">
                  Answer Key (Quizmaster Only)
                </h3>
                <span className="text-[var(--fog)] text-[0.7rem]">
                  Keep this hidden while projecting to the audience.
                </span>
              </div>
              <button className="btn sm ghost" onClick={() => setKeyModalOpen(false)}>
                Close (Esc)
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              {ROUNDS.map((r, ri) => (
                <div key={r.id} className="border border-[var(--line)] p-2.5 rounded bg-white/[0.01]">
                  <h5 className="font-['Cormorant_Garamond',serif] text-base font-bold text-[var(--gold)] mb-1">
                    Round {ROMAN[ri]} · {r.title}
                  </h5>
                  <div className="flex flex-col gap-1.5 divide-y divide-[rgba(214,178,94,0.1)]">
                    {r.questions.map((q, qi) => {
                      const edit = state.edits[q.id] || {};
                      const a = edit.answer !== undefined ? edit.answer : ANSWER_KEY[q.id];
                      const t = edit.text !== undefined ? edit.text : q.text;
                      return (
                        <div key={q.id} className="pt-1.5">
                          <span className="text-[var(--fog)] italic mr-1">{qi + 1}.</span>
                          <span className="text-[var(--ivory)]">
                            {q.clues ? q.clues.join(' · ') : t}
                          </span>
                          <div className="font-bold text-[var(--gold-hi)] mt-0.5">
                            → {a} {q.optional && <span className="text-yellow-400 font-normal italic">(optional)</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--line)]">
              <button className="btn solid sm" onClick={() => setKeyModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Golden Celebration Firework & Confetti Canvas (Winner Screen) */}
      <FxCanvas active={state.page === 'play' && !overlay && currentStep.t === 'winner'} />
    </div>
  );
}
