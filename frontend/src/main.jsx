import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BrowserRouter,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL ?? "";

const tracks = [
  { id: "dsa", icon: "⌘", name: "DSA Practice", detail: "Algorithms and coding patterns", tone: "violet" },
  { id: "sql", icon: "▣", name: "SQL Practice", detail: "Queries, joins, and databases", tone: "blue" },
  { id: "technical", icon: "◈", name: "Technical Interview", detail: "Core CS mock interviews", tone: "pink" },
  { id: "hr", icon: "✦", name: "HR Interview", detail: "Behavioral answers with STAR", tone: "green" },
];

const defaultProfile = {
  name: "Student",
  preferred_language: "Python",
  skill_level: "beginner",
  target_role: "Software Engineer",
  interests: "",
  goals: "",
};

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

async function readApiPayload(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `The server returned HTTP ${response.status}.`);
  }
}

function getApiError(payload, fallback) {
  if (typeof payload?.detail === "string") return payload.detail;
  if (Array.isArray(payload?.detail)) {
    return payload.detail
      .map((item) => item?.msg || item?.message)
      .filter(Boolean)
      .join(" ");
  }
  if (payload?.detail && typeof payload.detail === "object") {
    return payload.detail.message || fallback;
  }
  return fallback;
}

function ResponseText({ text }) {
  return (
    <div className="response-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="response-table-wrap">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

async function downloadResumePdf(resume) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  function writeText(text, { size = 10, style = "normal", color = [35, 48, 65], after = 5 } = {}) {
    if (!text?.trim()) return;
    document.setFont("helvetica", style);
    document.setFontSize(size);
    document.setTextColor(...color);
    const lines = document.splitTextToSize(text, pageWidth - margin * 2);
    const lineHeight = size * 1.35;
    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        document.addPage();
        y = margin;
      }
      document.text(line, margin, y);
      y += lineHeight;
    }
    y += after;
  }

  function writeSection(title, entries) {
    if (!entries.length) return;
    if (y > margin) y += 6;
    writeText(title, { size: 12, style: "bold", color: [23, 59, 100], after: 7 });
    entries.forEach((entry) => writeText(entry, { after: 4 }));
  }

  writeText(resume.contact.name || "Resume", { size: 20, style: "bold", color: [23, 59, 100], after: 6 });
  writeText(
    [resume.contact.email, resume.contact.phone, resume.contact.location, resume.contact.website, resume.contact.linkedin, resume.contact.github]
      .filter(Boolean)
      .join(" | "),
    { size: 9, color: [85, 100, 118], after: 12 },
  );
  writeSection("CAREER OBJECTIVE / PROFESSIONAL SUMMARY", resume.summary ? [resume.summary] : []);
  writeSection(
    "TECHNICAL SKILLS",
    resume.technical_skills
      .filter((group) => group.skills.length)
      .map((group) => `${group.category}: ${group.skills.join(", ")}`),
  );
  for (const [title, items] of [
    ["EDUCATION", resume.education],
    ["PROJECTS", resume.projects],
    ["INTERNSHIPS / EXPERIENCE", resume.experience],
  ]) {
    writeSection(title, items.flatMap((item) => [
      [item.title, item.organization, item.location, item.dates].filter(Boolean).join(" | "),
      ...item.details.map((detail) => `- ${detail}`),
    ]));
  }
  writeSection("CERTIFICATIONS", resume.certifications.map((item) => `- ${item}`));
  writeSection("ACHIEVEMENTS", resume.achievements.map((item) => `- ${item}`));
  document.save("CareerForge-Resume.pdf");
}

const pageRoutes = {
  overview: "/overview",
  practice: "/practice",
  interviews: "/mock-interviews",
  resume: "/resume-review",
  progress: "/progress",
};

function AuthPage({ mode, onAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const registering = mode === "register";

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          registering ? { name, email, password } : { email, password },
        ),
      });
      const payload = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(getApiError(payload, "Authentication failed."));
      }
      onAuthenticated(payload);
      navigate(location.state?.from || "/overview", { replace: true });
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand"><span className="brand-mark">C</span><strong>CareerForge</strong></div>
        <p className="eyebrow">{registering ? "Create your account" : "Welcome back"}</p>
        <h1>{registering ? "Start preparing with confidence" : "Sign in to continue"}</h1>
        <p className="muted">{registering ? "Create an account to access your preparation workspace." : "Your interview preparation workspace is ready."}</p>
        {registering && <label>Your name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></label>}
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Password<input type="password" autoComplete={registering ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={registering ? 8 : 1} maxLength={128} /></label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="primary-button auth-submit" disabled={busy}>{busy ? "Please wait..." : registering ? "Create account" : "Log in"}</button>
        <p className="auth-switch">
          {registering ? "Already have an account?" : "New to CareerForge?"}{" "}
          <button type="button" onClick={() => navigate(registering ? "/login" : "/register", { replace: true })}>
            {registering ? "Log in" : "Create account"}
          </button>
        </p>
      </form>
    </main>
  );
}

function App() {
  return <BrowserRouter><AppContent /></BrowserRouter>;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authRetry, setAuthRetry] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [request, setRequest] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = Object.entries(pageRoutes).find(([, path]) => path === location.pathname)?.[0] || "overview";
  const [profile, setProfile] = useState(() => readStored("careerforge-profile", defaultProfile));
  const [progress, setProgress] = useState(() => readStored("careerforge-progress", { attempted: 0, score: 0, streak: 0, completed: [] }));
  const [chat, setChat] = useState(() => readStored("careerforge-chat", []));
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("careerforge-theme") === "dark" ? "dark" : "professional");
  const [toast, setToast] = useState("");
  const [resumeText, setResumeText] = useState(() => localStorage.getItem("careerforge-resume-text") || "");
  const [resumeName, setResumeName] = useState(() => localStorage.getItem("careerforge-resume-name") || "");
  const [resumeQuestion, setResumeQuestion] = useState("");
  const [resumeAnswer, setResumeAnswer] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [targetJobRole, setTargetJobRole] = useState(() => profile.target_role || "");
  const [generatedResume, setGeneratedResume] = useState(null);
  const [latexSource, setLatexSource] = useState("");
  const [showLatex, setShowLatex] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("careerforge-access-token");
    if (!token) {
      setAuthLoading(false);
      return;
    }
    let cancelled = false;
    setAuthLoading(true);
    setAuthError("");

    async function restoreSession() {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(`${API_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const payload = await readApiPayload(response);
          if (cancelled) return;
          if (response.status === 401) {
            localStorage.removeItem("careerforge-access-token");
            setCurrentUser(null);
            return;
          }
          if (!response.ok) {
            throw new Error(getApiError(payload, "Could not verify your saved session."));
          }
          setCurrentUser(payload);
          if (payload.profile) {
            setProfile((stored) => ({ ...stored, ...payload.profile }));
          }
          return;
        } catch (sessionError) {
          if (cancelled) return;
          if (attempt === 2) {
            setAuthError(sessionError instanceof Error ? sessionError.message : "Could not verify your saved session.");
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
        }
      }
    }

    restoreSession().finally(() => {
      if (!cancelled) setAuthLoading(false);
    });
    return () => { cancelled = true; };
  }, [authRetry]);

  useEffect(() => localStorage.setItem("careerforge-profile", JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem("careerforge-progress", JSON.stringify(progress)), [progress]);
  useEffect(() => localStorage.setItem("careerforge-chat", JSON.stringify(chat)), [chat]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("careerforge-theme", theme);
  }, [theme]);
  useEffect(() => localStorage.setItem("careerforge-resume-text", resumeText), [resumeText]);
  useEffect(() => localStorage.setItem("careerforge-resume-name", resumeName), [resumeName]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const profileFields = ["name", "preferred_language", "skill_level", "target_role", "interests", "goals"];
  const profileCompletion = Math.round((profileFields.filter((key) => String(profile[key] || "").trim()).length / profileFields.length) * 100);
  const average = progress.attempted ? Math.round(progress.score / progress.attempted) : 0;

  function navigateToPage(id) {
    navigate(pageRoutes[id] || "/overview");
  }

  function acceptAuthentication(payload) {
    localStorage.setItem("careerforge-access-token", payload.access_token);
    setCurrentUser(payload.user);
    if (payload.user.profile) {
      setProfile((stored) => ({ ...stored, ...payload.user.profile }));
    }
  }

  function logout() {
    localStorage.removeItem("careerforge-access-token");
    setCurrentUser(null);
    setProfileMenuOpen(false);
    navigate("/login", { replace: true });
  }

  async function askCareerForge(event) {
    event?.preventDefault();
    if (!request.trim()) return;
    setLoading(true);
    setError("");
    setAnswer(null);
    const message = request.trim();
    try {
      const response = await fetch(`${API_URL}/api/v1/practice/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: message,
          context: JSON.stringify({
            profile,
            recent_chat: chat.slice(-10),
          }),
        }),
      });
      const payload = await readApiPayload(response);
      if (!response.ok) throw new Error(getApiError(payload, "The assistant could not respond."));
      setAnswer(payload);
      setChat((items) => [...items, { role: "user", text: message }, { role: "assistant", text: payload.response, agent: payload.agent }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The assistant could not respond.");
    } finally {
      setLoading(false);
      setProgress((old) => ({ ...old, attempted: old.attempted + 1, streak: old.streak + 1 }));
    }
  }

  function startTrack(track) {
    const prompt = `Give me a beginner ${track.name.toLowerCase()} question.`;
    setRequest(prompt);
    navigateToPage("practice");
  }

  async function saveProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updatedProfile = Object.fromEntries(profileFields.map((key) => [key, form.get(key)?.toString().trim() ?? ""]));
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("careerforge-access-token")}`,
        },
        body: JSON.stringify(updatedProfile),
      });
      const payload = await readApiPayload(response);
      if (!response.ok) throw new Error(getApiError(payload, "Could not save your profile."));
      setProfile({ ...updatedProfile, ...payload.profile });
      setCurrentUser(payload);
      setModal(null);
      setToast("Profile saved");
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Could not save your profile.");
    }
  }

  function markCompleted(id) {
    setProgress((old) => {
      const completed = old.completed.includes(id) ? old.completed : [...old.completed, id];
      return { ...old, completed, score: old.score + 75 };
    });
    setToast("Session marked complete");
  }

  function clearChat() {
    setChat([]);
    setAnswer(null);
    setToast("Chat cleared");
  }

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setResumeLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API_URL}/api/v1/assistant/resume/upload`, {
        method: "POST",
        body: form,
      });
      const payload = await readApiPayload(response);
      if (!response.ok) throw new Error(getApiError(payload, "Could not read the resume."));
      setResumeText(payload.resume_text);
      setResumeName(payload.filename);
      setResumeAnswer("");
      setGeneratedResume(null);
      setLatexSource("");
      setToast("Resume uploaded");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload resume.");
    } finally {
      setResumeLoading(false);
      event.target.value = "";
    }
  }

  async function askAboutResume(event, requestedMessage) {
    event?.preventDefault();
    if (!resumeText) {
      setToast("Upload or paste a resume first");
      return;
    }
    const message = requestedMessage || resumeQuestion.trim() || "Review this resume and give specific, prioritized suggestions.";
    setResumeLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/assistant/resume/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, message }),
      });
      const payload = await readApiPayload(response);
      if (!response.ok) throw new Error(getApiError(payload, "Could not review the resume."));
      setResumeAnswer(payload.message);
      setChat((items) => [...items,
        { role: "user", text: `[Resume] ${message}` },
        { role: "assistant", text: payload.message, agent: "resume" },
      ]);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Could not review the resume.");
    } finally {
      setResumeLoading(false);
    }
  }

  async function generateResume() {
    if (!resumeText.trim()) {
      setToast("Upload or paste a resume first");
      return;
    }
    if (!targetJobRole.trim()) {
      setError("Enter a target job role to tailor the resume.");
      return;
    }
    setResumeLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/assistant/resume/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, target_job_role: targetJobRole.trim() }),
      });
      const payload = await readApiPayload(response);
      if (!response.ok) throw new Error(getApiError(payload, "Could not generate the resume."));
      setGeneratedResume(payload.resume);
      setLatexSource(payload.latex_source);
      setShowLatex(false);
      setToast("Improved resume generated");
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Could not generate the resume.");
    } finally {
      setResumeLoading(false);
    }
  }

  async function copyLatex() {
    try {
      await navigator.clipboard.writeText(latexSource);
      setToast("LaTeX source copied");
    } catch (copyError) {
      setError(copyError instanceof Error ? "Clipboard access was denied. Select and copy the code manually." : "Could not copy the LaTeX source.");
    }
  }

  async function exportResumePdf() {
    try {
      await downloadResumePdf(generatedResume);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? `Could not create the PDF: ${pdfError.message}` : "Could not create the PDF.");
    }
  }

  function downloadLatex() {
    const blob = new Blob([latexSource], { type: "application/x-tex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "CareerForge-Resume.tex";
    link.click();
    URL.revokeObjectURL(url);
  }

  const nav = [
    ["overview", "01", "Overview"],
    ["practice", "02", "Practice"],
    ["interviews", "03", "Mock interviews"],
    ["resume", "04", "Resume review"],
    ["progress", "05", "Progress"],
  ];

  const authRoute = location.pathname === "/login" || location.pathname === "/register";
  if (authLoading) {
    return <main className="auth-page"><p>Loading your CareerForge session...</p></main>;
  }
  if (!currentUser && authError && localStorage.getItem("careerforge-access-token")) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand"><span className="brand-mark">C</span><strong>CareerForge</strong></div>
          <h1>Could not verify your session</h1>
          <p className="muted">Your saved session is still here. Check that the server is available, then retry.</p>
          <p className="error-message" role="alert">{authError}</p>
          <button className="primary-button auth-submit" onClick={() => setAuthRetry((count) => count + 1)}>Retry</button>
          <button className="text-button auth-sign-in" onClick={logout}>Sign in again</button>
        </section>
      </main>
    );
  }
  if (!currentUser && !authRoute) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (currentUser && authRoute) {
    return <Navigate to="/overview" replace />;
  }
  if (authRoute) {
    return (
      <AuthPage
        mode={location.pathname === "/register" ? "register" : "login"}
        onAuthenticated={acceptAuthentication}
      />
    );
  }
  if (!Object.values(pageRoutes).includes(location.pathname)) {
    return <Navigate to="/overview" replace />;
  }

  return (
    <div className="app-shell">
      {toast && <div className="toast" role="status">{toast}</div>}
      <aside className="sidebar">
        <button className="brand" onClick={() => navigateToPage("overview")}><span className="brand-mark">C</span><span>CareerForge</span></button>
        <nav>
          {nav.map(([id, number, label]) => (
            <button key={id} className={`nav-item ${active === id ? "active" : ""}`} onClick={() => navigateToPage(id)}>
              <span className="nav-symbol">{number}</span><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => { navigateToPage("overview"); window.setTimeout(() => document.getElementById("settings")?.scrollIntoView({ behavior: "smooth" }), 50); }}><span className="nav-symbol">06</span><span>Settings</span></button>
          <button className="profile" onClick={() => setModal("profile")}><div className="avatar">{profile.name.charAt(0).toUpperCase()}</div><div><strong>{profile.name}</strong><small>{profile.skill_level}</small></div><span>•••</span></button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => navigateToPage("overview")}><span className="brand-mark">C</span><strong>CareerForge</strong></button>
          <div className="top-actions">
            <button className="icon-button" aria-label="Search" onClick={() => setModal("search")}>⌕</button>
            <button className="icon-button" aria-label="Toggle theme" onClick={() => setTheme(theme === "dark" ? "professional" : "dark")}>{theme === "dark" ? "☀" : "◐"}</button>
            <div className="user-menu">
              <button className="mini-avatar" aria-label="Open account menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}>{profile.name.charAt(0).toUpperCase()}</button>
              {profileMenuOpen && <div className="user-menu-dropdown"><strong>{currentUser.email}</strong><button onClick={() => { setProfileMenuOpen(false); setModal("profile"); }}>Edit profile</button><button onClick={logout}>Log out</button></div>}
            </div>
          </div>
        </header>

        {active === "overview" && <section className="welcome" id="overview">
          <div><p className="eyebrow">Your preparation workspace</p><h1>Good to see you, <span>{profile.name}.</span></h1><p className="muted">Your next opportunity is built one focused session at a time.</p></div>
          <button className="primary-button" onClick={() => navigateToPage("practice")}>Start practice <span>→</span></button>
        </section>}

        {active === "overview" && <section className="stats-grid">
          <div className="stat-card"><div className="stat-label">Questions attempted <span className="stat-icon violet">⌘</span></div><strong>{progress.attempted}</strong><small>{progress.attempted ? "Keep the momentum" : "Start your first session"}</small></div>
          <div className="stat-card"><div className="stat-label">Average score <span className="stat-icon blue">◒</span></div><strong>{progress.attempted ? `${average}%` : "—"}</strong><small>{progress.attempted ? "Across completed practice" : "No attempts yet"}</small></div>
          <div className="stat-card"><div className="stat-label">Practice streak <span className="stat-icon orange">♨</span></div><strong>{progress.streak} <em>sessions</em></strong><small>Build your momentum</small></div>
          <div className="stat-card progress-card"><div className="stat-label">Profile completion <span className="stat-icon green">✓</span></div><strong>{profileCompletion}%</strong><div className="progress-track"><div className="progress-value" style={{ width: `${profileCompletion}%` }} /></div><small>Complete your profile to personalize AI</small></div>
        </section>}

        {active === "practice" && <section className="section-heading"><div><h2>Your preparation tracks</h2><p className="muted">Build confidence across the skills companies assess.</p></div><button className="text-button" onClick={() => navigateToPage("practice")}>View all <span>→</span></button></section>}
        {active === "practice" && <section className="agent-grid" id="practice">
          {tracks.map((track) => <button className="agent-card" key={track.id} onClick={() => startTrack(track)}><span className={`agent-icon ${track.tone}`}>{track.icon}</span><strong>{track.name}</strong><span>{track.detail}</span><b>→</b></button>)}
        </section>}

        {active === "practice" && <section className="assistant-panel">
          <div className="assistant-copy"><span className="prompt-mark">?</span><div><p className="eyebrow">Practice assistant</p><h2>What would you like to work on?</h2><p className="muted">Describe a topic, question, or interview goal to get started.</p></div></div>
          <form onSubmit={askCareerForge} className="ask-form"><input value={request} onChange={(event) => setRequest(event.target.value)} placeholder="e.g. Give me five Java array questions" aria-label="Practice request" /><button className="primary-button" disabled={loading}>{loading ? "Thinking..." : "Ask coach"}</button></form>
          {error && <p className="error-message">{error}</p>}
          {answer && <div className="answer"><span className="route-label">{answer.agent} coach</span><ResponseText text={answer.response} /><button className="text-button" onClick={() => markCompleted(answer.agent)}>Mark this session complete</button></div>}
          {chat.length > 0 && <div className="chat-history"><div className="chat-heading"><strong>Recent chat</strong><button onClick={clearChat}>Clear</button></div>{chat.slice(-6).map((item, index) => <div className={`chat-message ${item.role}`} key={index}><span>{item.role === "assistant" ? "Coach" : "You"}</span>{item.role === "assistant" ? <ResponseText text={item.text} /> : <p>{item.text}</p>}</div>)}</div>}
        </section>}

        {active === "interviews" && <section className="feature-section" id="interviews">
          <div className="section-heading"><div><h2>Mock interview rooms</h2><p className="muted">Choose a focus and practice with guided prompts.</p></div></div>
          <div className="feature-grid">
            {["Technical fundamentals", "Behavioral interview", "System design"].map((name) => <button className="feature-card" key={name} onClick={() => { setRequest(`Start a ${name.toLowerCase()} mock interview and ask me one question.`); navigateToPage("practice"); }}><span>◉</span><strong>{name}</strong><small>Start guided session →</small></button>)}
          </div>
        </section>}

        {active === "resume" && <section className="feature-section" id="resume">
          <div className="resume-panel">
            <div>
              <p className="eyebrow">Resume review</p>
              <h2>Turn experience into interview evidence</h2>
              <p className="muted">Upload a PDF, DOCX, or TXT resume, then ask focused questions about it.</p>
            </div>
            <label className="upload-button">
              <input type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain" onChange={uploadResume} />
              {resumeLoading ? "Reading..." : resumeName ? "Replace resume" : "Upload resume"}
            </label>
          </div>
          {resumeName && <div className="resume-status"><span>✓</span><div><strong>{resumeName}</strong><small>Resume text loaded for review</small></div><button onClick={() => { setResumeText(""); setResumeName(""); setResumeAnswer(""); setResumeQuestion(""); setGeneratedResume(null); setLatexSource(""); }}>Remove</button></div>}
          {!resumeName && <textarea className="resume-source" value={resumeText} onChange={(event) => { setResumeText(event.target.value); setGeneratedResume(null); setLatexSource(""); }} placeholder="Or paste your resume text here..." aria-label="Resume text" />}
          {resumeText && !resumeName && <button className="text-button resume-clear" onClick={() => { setResumeText(""); setResumeAnswer(""); setGeneratedResume(null); setLatexSource(""); }}>Clear pasted resume</button>}
          <label className="resume-role">Target job role<input value={targetJobRole} onChange={(event) => { setTargetJobRole(event.target.value); setGeneratedResume(null); setLatexSource(""); }} placeholder="e.g. Frontend Developer" maxLength={160} /></label>
          <div className="resume-actions">
            <button className="primary-button" disabled={resumeLoading || !resumeText.trim()} onClick={() => askAboutResume(null, `Analyze this resume for the target role "${targetJobRole.trim()}". Give prioritized, practical feedback on missing role-relevant skills, weak descriptions, formatting, and improvements. Clearly distinguish suggestions from qualifications the candidate actually has.`)}>{resumeLoading ? "Analyzing..." : "Analyze Resume"}</button>
            <button className="secondary-button" disabled={resumeLoading || !resumeText.trim()} onClick={generateResume}>{resumeLoading ? "Generating..." : "Generate Improved Resume"}</button>
          </div>
          <form className="resume-chat" onSubmit={askAboutResume}>
            {resumeText && <textarea className="resume-question" value={resumeQuestion} onChange={(event) => setResumeQuestion(event.target.value)} placeholder="Ask: Which projects should I improve? Rewrite my strongest bullet..." aria-label="Resume question" />}
            <button className="primary-button" disabled={resumeLoading}>{resumeLoading ? "Analyzing..." : "Review with AI"}</button>
          </form>
          {error && <p className="error-message" role="alert">{error}</p>}
          {resumeAnswer && <div className="answer resume-answer"><span className="route-label">Resume coach</span><ResponseText text={resumeAnswer} /></div>}
          {generatedResume && <section className="generated-resume">
            <div className="generated-resume-heading"><div><p className="eyebrow">Generated from your resume</p><h3>Resume preview</h3></div><button className="secondary-button" onClick={exportResumePdf}>Download PDF</button></div>
            <article className="resume-preview">
              <header>
                <h2>{generatedResume.contact.name || "Resume"}</h2>
                <p>{[generatedResume.contact.email, generatedResume.contact.phone, generatedResume.contact.location, generatedResume.contact.website, generatedResume.contact.linkedin, generatedResume.contact.github].filter(Boolean).join(" · ")}</p>
              </header>
              {generatedResume.summary && <section><h4>Career Objective / Professional Summary</h4><p>{generatedResume.summary}</p></section>}
              {!!generatedResume.technical_skills.length && <section><h4>Technical Skills</h4>{generatedResume.technical_skills.filter((group) => group.skills.length).map((group) => <p key={group.category}><strong>{group.category}:</strong> {group.skills.join(", ")}</p>)}</section>}
              {[
                ["Education", generatedResume.education],
                ["Projects", generatedResume.projects],
                ["Internships / Experience", generatedResume.experience],
              ].map(([title, items]) => items.length > 0 && <section key={title}><h4>{title}</h4>{items.map((item, index) => <div className="resume-preview-item" key={`${title}-${index}`}><div><strong>{item.title}</strong>{item.organization && <span> | {item.organization}</span>}{item.dates && <span className="resume-preview-dates"> {item.dates}</span>}</div>{item.location && <small>{item.location}</small>}{!!item.details.length && <ul>{item.details.map((detail, detailIndex) => <li key={detailIndex}>{detail}</li>)}</ul>}</div>)}</section>)}
              {[
                ["Certifications", generatedResume.certifications],
                ["Achievements", generatedResume.achievements],
              ].map(([title, items]) => items.length > 0 && <section key={title}><h4>{title}</h4><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></section>)}
            </article>
            <div className="latex-toolbar">
              <button className="secondary-button" onClick={() => setShowLatex((visible) => !visible)}>{showLatex ? "Hide LaTeX Code" : "View LaTeX Code"}</button>
              <button className="secondary-button" onClick={copyLatex}>Copy LaTeX Code</button>
              <button className="secondary-button" onClick={downloadLatex}>Download .tex</button>
            </div>
            {showLatex && <label className="latex-editor-label">Editable LaTeX source<textarea className="latex-editor" spellCheck="false" value={latexSource} onChange={(event) => setLatexSource(event.target.value)} aria-label="Editable LaTeX source" /></label>}
            <p className="resume-disclaimer">Review all details for accuracy before using. Generated content is based on the resume text you provided; no missing qualifications are intentionally filled in.</p>
          </section>}
        </section>}

        {active === "progress" && <section className="feature-section" id="progress">
          <div className="section-heading"><div><h2>Preparation progress</h2><p className="muted">Your locally saved practice activity.</p></div></div>
          <div className="progress-grid">{tracks.map((track) => { const done = progress.completed.includes(track.id); return <div className="progress-row" key={track.id}><span className={`agent-icon ${track.tone}`}>{track.icon}</span><div><strong>{track.name}</strong><small>{done ? "Completed session" : "Ready to practice"}</small></div><button onClick={() => done ? navigateToPage("practice") : startTrack(track)}>{done ? "Review" : "Start"}</button></div>; })}</div>
        </section>}

        {active === "overview" && <section className="feature-section" id="settings">
          <div className="settings-panel"><div><p className="eyebrow">Settings</p><h2>Personalize CareerForge</h2></div><label><span>Dark appearance</span><input type="checkbox" checked={theme === "dark"} onChange={(event) => setTheme(event.target.checked ? "dark" : "professional")} /></label><button className="primary-button" onClick={() => setModal("profile")}>Edit profile</button></div>
        </section>}
      </main>

      {modal === "profile" && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><form className="modal" onSubmit={saveProfile}><div className="modal-heading"><div><p className="eyebrow">Your profile</p><h2>Personal details</h2></div><button type="button" onClick={() => setModal(null)} aria-label="Close">×</button></div><div className="form-grid"><label>Name<input name="name" defaultValue={profile.name} required /></label><label>Preferred language<select name="preferred_language" defaultValue={profile.preferred_language}><option>Python</option><option>Java</option><option>JavaScript</option><option>C++</option></select></label><label>Skill level<select name="skill_level" defaultValue={profile.skill_level}><option>beginner</option><option>intermediate</option><option>advanced</option></select></label><label>Target role<input name="target_role" defaultValue={profile.target_role} /></label><label className="full">Interests<textarea name="interests" defaultValue={profile.interests} /></label><label className="full">Goals<textarea name="goals" defaultValue={profile.goals} /></label></div><button className="primary-button modal-save">Save profile</button></form></div>}

      {modal === "search" && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><div className="modal search-modal"><div className="modal-heading"><div><p className="eyebrow">Search</p><h2>Find preparation tools</h2></div><button onClick={() => setModal(null)} aria-label="Close">×</button></div><input className="search-input" autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tracks, interviews, progress..." /><div className="search-results">{[...tracks.map((track) => ({ label: track.name, id: "practice" })), { label: "Mock interviews", id: "interviews" }, { label: "Resume review", id: "resume" }, { label: "Progress", id: "progress" }].filter((item) => item.label.toLowerCase().includes(search.toLowerCase())).map((item) => <button key={item.label} onClick={() => { setModal(null); navigateToPage(item.id); }}><strong>{item.label}</strong><span>→</span></button>)}</div></div></div>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
