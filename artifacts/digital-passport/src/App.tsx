import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Lock, X, AlertCircle, Trophy, User, IdCard, Loader2, RefreshCw } from "lucide-react";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz6d_vrgxFcqGpxMqrYieueh8vN41lXHXxkjTO04A4EJ5iUlg2Dln_J_JoWOFaZrBw/exec";

const boothMap = {
  "People Culture":                    "culture1",
  "Digital Think Tank":                "dtt2",
  "Quality Management":                "quality3",
  "Manpower Transformation":           "manpower4",
  "Appropriate and Value-Based Care":  "avbc5",
  "Enterprise Risk Management":        "erm6",
};

const BOOTHS = [
  { id: 1, name: "People Culture",                   sheetId: "booth1", color: "#E53E3E", accent: "#FC8181", password: boothMap["People Culture"]                   },
  { id: 2, name: "Digital Think Tank",               sheetId: "booth2", color: "#3182CE", accent: "#63B3ED", password: boothMap["Digital Think Tank"]               },
  { id: 3, name: "Quality Management",               sheetId: "booth3", color: "#38A169", accent: "#68D391", password: boothMap["Quality Management"]               },
  { id: 4, name: "Manpower Transformation",          sheetId: "booth4", color: "#DD6B20", accent: "#F6AD55", password: boothMap["Manpower Transformation"]          },
  { id: 5, name: "Appropriate and Value-Based Care", sheetId: "booth5", color: "#805AD5", accent: "#B794F4", password: boothMap["Appropriate and Value-Based Care"] },
  { id: 6, name: "Enterprise Risk Management",       sheetId: "booth6", color: "#0694A2", accent: "#76E4F7", password: boothMap["Enterprise Risk Management"]       },
];

const STORAGE_KEY = "passport-progress";
const VISITOR_KEY  = "passport-visitor";

interface Visitor {
  nickname: string;
  staffId: string;
}

interface ModalState {
  boothId: number | null;
  open: boolean;
}

function loadProgress(): Record<number, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(progress: Record<number, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function loadVisitor(): Visitor | null {
  try {
    const raw = localStorage.getItem(VISITOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveVisitor(v: Visitor) {
  localStorage.setItem(VISITOR_KEY, JSON.stringify(v));
}

async function logToSheet(visitor: Visitor, boothName: string, sheetId: string) {
  const params = new URLSearchParams({
    nickname:  visitor.nickname,
    staffId:   visitor.staffId,
    boothId:   sheetId,
    boothName,
    status:    "done",
    timestamp: new Date().toISOString(),
  });
  try {
    await fetch(`${SCRIPT_URL}?${params.toString()}`, { method: "GET", mode: "no-cors" });
  } catch {
    // no-cors means we can't read the response; fire-and-forget is fine
  }
}

export default function App() {
  const [visitor, setVisitor]           = useState<Visitor | null>(loadVisitor);
  const [nickname, setNickname]         = useState("");
  const [staffId, setStaffId]           = useState("");
  const [onboardError, setOnboardError] = useState("");

  const [progress, setProgress]         = useState<Record<number, boolean>>(loadProgress);
  const [modal, setModal]               = useState<ModalState>({ boothId: null, open: false });
  const [password, setPassword]         = useState("");
  const [pwError, setPwError]           = useState("");
  const [stampedId, setStampedId]       = useState<number | null>(null);
  const [logging, setLogging]           = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);

  const completedCount = Object.values(progress).filter(Boolean).length;
  const allDone        = completedCount === BOOTHS.length;

  useEffect(() => {
    if (allDone && completedCount > 0) setShowCelebration(true);
  }, [allDone, completedCount]);

  useEffect(() => {
    if (modal.open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [modal.open]);

  useEffect(() => {
    if (!visitor) setTimeout(() => nicknameRef.current?.focus(), 100);
  }, [visitor]);

  function resetPassport() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VISITOR_KEY);
    setProgress({});
    setVisitor(null);
    setNickname("");
    setStaffId("");
    setShowCelebration(false);
    setConfirmReset(false);
  }

  function startPassport() {
    if (!nickname.trim()) { setOnboardError("Please enter your nickname"); return; }
    if (!staffId.trim())  { setOnboardError("Please enter your Staff ID"); return; }
    const v = { nickname: nickname.trim(), staffId: staffId.trim() };
    saveVisitor(v);
    setVisitor(v);
  }

  function openBooth(id: number) {
    setModal({ boothId: id, open: true });
    setPassword("");
    setPwError("");
  }

  function closeModal() {
    setModal({ boothId: null, open: false });
    setPassword("");
    setPwError("");
  }

  async function submitPassword() {
    if (!modal.boothId || !visitor) return;
    const booth = BOOTHS.find((b) => b.id === modal.boothId);
    if (!booth) return;

    if (password.trim().toLowerCase() === booth.password.toLowerCase()) {
      const newProgress = { ...progress, [booth.id]: true };
      setProgress(newProgress);
      saveProgress(newProgress);
      setStampedId(booth.id);
      setTimeout(() => setStampedId(null), 1200);
      closeModal();

      // Log to Google Sheet (fire-and-forget)
      setLogging(true);
      await logToSheet(visitor, booth.name, booth.sheetId);
      setLogging(false);
    } else {
      setPwError("Wrong password, try again");
      setPassword("");
      inputRef.current?.focus();
    }
  }

  function handlePwKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") submitPassword();
    if (e.key === "Escape") closeModal();
  }

  function handleOnboardKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") startPassport();
  }

  const activeBooth  = BOOTHS.find((b) => b.id === modal.boothId);
  const isCompleted  = modal.boothId ? !!progress[modal.boothId] : false;

  // ── Onboarding screen ────────────────────────────────────────────────────
  if (!visitor) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, type: "spring", damping: 22 }}
          className="w-full max-w-sm"
        >
          {/* Badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm text-white/70 font-medium mb-4 border border-white/10">
              QuEST 2026
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Booth Explorer</h1>
            <p className="text-white/50 text-sm">Enter your details to start collecting stamps</p>
          </div>

          {/* Card */}
          <div
            className="rounded-3xl p-7 border border-white/10 space-y-4"
            style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            {/* Nickname */}
            <div>
              <label className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={12} /> Nickname
              </label>
              <input
                ref={nicknameRef}
                type="text"
                placeholder="e.g. Alex"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setOnboardError(""); }}
                onKeyDown={handleOnboardKeyDown}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                style={{ background: "rgba(255,255,255,0.07)" }}
                data-testid="input-nickname"
              />
            </div>

            {/* Staff ID */}
            <div>
              <label className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <IdCard size={12} /> Staff ID
              </label>
              <input
                type="text"
                placeholder="e.g. S12345"
                value={staffId}
                onChange={(e) => { setStaffId(e.target.value); setOnboardError(""); }}
                onKeyDown={handleOnboardKeyDown}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                style={{ background: "rgba(255,255,255,0.07)" }}
                data-testid="input-staff-id"
              />
            </div>

            <AnimatePresence>
              {onboardError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-red-400 text-xs"
                  data-testid="onboard-error"
                >
                  <AlertCircle size={13} /> {onboardError}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={startPassport}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}
              data-testid="button-start"
            >
              Start My Passport
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main passport view ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full text-sm text-white/70 font-medium mb-4 border border-white/10">
            QuEST 2026
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Booth Explorer</h1>
          <p className="text-white/50 text-sm">
            Welcome, <span className="text-white font-semibold">{visitor.nickname}</span>
            <span className="text-white/30 mx-1">·</span>
            <span className="text-white/40 text-xs">{visitor.staffId}</span>
          </p>

          {/* Reset */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <AnimatePresence mode="wait">
              {!confirmReset ? (
                <motion.button
                  key="reset-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
                  data-testid="button-reset"
                >
                  <RefreshCw size={11} /> Reset passport
                </motion.button>
              ) : (
                <motion.div
                  key="reset-confirm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5"
                >
                  <span className="text-xs text-red-300">Clear all progress?</span>
                  <button
                    onClick={resetPassport}
                    className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                    data-testid="button-confirm-reset"
                  >
                    Yes, reset
                  </button>
                  <span className="text-white/20 text-xs">·</span>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors"
                    data-testid="button-cancel-reset"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8 rounded-2xl p-5 border border-white/10"
          style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)" }}
          data-testid="progress-container"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold text-sm">Progress</span>
            <span className="text-white font-bold text-lg" data-testid="progress-count">
              {completedCount} / {BOOTHS.length} Completed
            </span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #60a5fa, #a78bfa, #34d399)" }}
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / BOOTHS.length) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              data-testid="progress-bar"
            />
          </div>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-center text-green-400 font-semibold text-sm"
              data-testid="all-done-message"
            >
              🎉 All booths visited!
            </motion.div>
          )}
          {logging && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-white/30 text-xs">
              <Loader2 size={11} className="animate-spin" /> Saving to sheet…
            </div>
          )}
        </motion.div>

        {/* Booth Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" data-testid="booth-grid">
          {BOOTHS.map((booth, i) => {
            const done       = !!progress[booth.id];
            const isStamping = stampedId === booth.id;
            return (
              <motion.button
                key={booth.id}
                data-testid={`booth-flag-${booth.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.07 }}
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openBooth(booth.id)}
                className="relative flex flex-col items-center justify-center rounded-2xl p-5 min-h-[140px] border-2 cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 transition-all"
                style={{
                  background: done
                    ? `linear-gradient(135deg, ${booth.color}cc, ${booth.color}88)`
                    : `linear-gradient(135deg, ${booth.color}, ${booth.accent}55)`,
                  borderColor: done ? "#4ade80" : `${booth.color}66`,
                  boxShadow: done
                    ? `0 0 24px ${booth.color}66, 0 4px 16px rgba(0,0,0,0.4)`
                    : `0 4px 16px rgba(0,0,0,0.4)`,
                }}
              >
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px),
                                       radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
                    backgroundSize: "30px 30px",
                  }}
                />
                <AnimatePresence>
                  {isStamping && (
                    <motion.div
                      initial={{ scale: 2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center rounded-2xl z-20"
                      style={{ background: "rgba(74,222,128,0.3)" }}
                    >
                      <CheckCircle2 size={56} color="#4ade80" strokeWidth={2.5} />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}>
                    {done
                      ? <CheckCircle2 size={22} color="#4ade80" strokeWidth={2.5} />
                      : <Lock size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                    }
                  </div>
                  <span className="text-white font-bold text-center leading-tight text-sm" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                    {booth.name}
                  </span>
                  {done && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(74,222,128,0.25)", color: "#4ade80" }}
                    >
                      Stamped
                    </motion.span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Celebration Banner */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="mt-8 rounded-2xl p-6 text-center border border-yellow-400/30 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.2), rgba(251,191,36,0.1))" }}
              data-testid="celebration-banner"
            >
              <button
                onClick={() => setShowCelebration(false)}
                className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors"
                data-testid="button-close-celebration"
              >
                <X size={16} />
              </button>
              <Trophy size={40} className="mx-auto mb-3 text-yellow-400" />
              <h2 className="text-xl font-extrabold text-yellow-300 mb-1">Passport Complete!</h2>
              <p className="text-white/70 text-sm">🎉 You've visited all 6 booths. Amazing explorer!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Password Modal */}
      <AnimatePresence>
        {modal.open && activeBooth && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
              onClick={closeModal}
              data-testid="modal-backdrop"
            />
            <motion.div
              key="dialog"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              data-testid="password-modal"
            >
              <div
                className="w-full max-w-sm rounded-3xl p-7 border border-white/10 relative"
                style={{
                  background: "linear-gradient(135deg, #1e293b, #0f172a)",
                  boxShadow: `0 0 60px ${activeBooth.color}44, 0 20px 60px rgba(0,0,0,0.8)`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
                  data-testid="button-close-modal"
                >
                  <X size={16} />
                </button>

                <div className="w-12 h-1 rounded-full mb-5 mx-auto" style={{ background: activeBooth.color }} />

                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
                  style={{ background: `linear-gradient(135deg, ${activeBooth.color}, ${activeBooth.accent}88)`, boxShadow: `0 8px 24px ${activeBooth.color}55` }}
                >
                  {isCompleted
                    ? <CheckCircle2 size={32} color="#4ade80" strokeWidth={2.5} />
                    : <Lock size={28} color="white" strokeWidth={2} />
                  }
                </div>

                <h2 className="text-xl font-extrabold text-white text-center mb-1">{activeBooth.name}</h2>

                {isCompleted ? (
                  <div className="text-center mt-4" data-testid="already-completed-message">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>
                      <CheckCircle2 size={16} /> Already completed!
                    </div>
                    <p className="text-white/40 text-xs mt-2">You've already stamped this booth.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-white/50 text-sm text-center mb-5">Enter the booth password to collect your stamp</p>
                    <div className="space-y-3">
                      <input
                        ref={inputRef}
                        type="password"
                        placeholder="Enter password..."
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setPwError(""); }}
                        onKeyDown={handlePwKeyDown}
                        className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 border focus:outline-none focus:ring-2 transition-all text-sm"
                        style={{ background: "rgba(255,255,255,0.07)", borderColor: pwError ? "#f87171" : "rgba(255,255,255,0.12)" }}
                        data-testid="input-password"
                      />
                      <AnimatePresence>
                        {pwError && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 text-red-400 text-xs px-1"
                            data-testid="error-message"
                          >
                            <AlertCircle size={14} /> {pwError}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <button
                        onClick={submitPassword}
                        disabled={!password.trim()}
                        className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: password.trim() ? `linear-gradient(135deg, ${activeBooth.color}, ${activeBooth.accent})` : "rgba(255,255,255,0.1)",
                          boxShadow: password.trim() ? `0 4px 20px ${activeBooth.color}55` : "none",
                        }}
                        data-testid="button-submit-password"
                      >
                        Collect Stamp
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
