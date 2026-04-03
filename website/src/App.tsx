import { useCallback, useEffect, useState } from "react";

const THEME_KEY = "torqa-website-theme";

type BenchMetrics = {
  task_prompt_token_estimate?: number;
  torqa_source_token_estimate?: number;
  semantic_compression_ratio?: number;
};

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const s = localStorage.getItem(THEME_KEY);
    if (s === "light" || s === "dark") {
      setTheme(s);
      document.documentElement.setAttribute("data-theme", s);
      return;
    }
    const prefers =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    const t = prefers ? "light" : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
  }, [theme]);

  return { theme, toggle };
}

function BenchmarkLive() {
  const [metrics, setMetrics] = useState<BenchMetrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/demo/benchmark-report");
        const d = (await r.json()) as { ok?: boolean; report?: { metrics?: BenchMetrics } };
        if (cancelled) return;
        if (d.ok && d.report?.metrics) setMetrics(d.report.metrics);
        else setErr("Run torqa-console to load live metrics, or see the JSON in the repo.");
      } catch {
        if (!cancelled) setErr("Could not reach the API (open this site via torqa-console).");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const task = metrics?.task_prompt_token_estimate ?? 0;
  const tq = metrics?.torqa_source_token_estimate ?? 0;
  const ratio =
    typeof metrics?.semantic_compression_ratio === "number"
      ? metrics.semantic_compression_ratio
      : task > 0 && tq > 0
        ? task / Math.max(1, tq)
        : null;

  const nlPct = task > 0 ? 100 : 0;
  const tqPct = task > 0 ? Math.min(100, (tq / task) * 100) : 0;

  return (
    <div className="p70-bm-live">
      <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>Flagship baseline</h3>
      <p className="p70-sub" style={{ marginBottom: 0 }}>
        NL task vs <span className="p70-code">.tq</span> surface — same intent, measured token scale (deterministic
        estimate). From <span className="p70-code">/api/demo/benchmark-report</span> when the console is running.
      </p>
      {err && !metrics ? <p style={{ color: "var(--muted)" }}>{err}</p> : null}
      {metrics && task > 0 && tq > 0 ? (
        <>
          {ratio != null ? <div className="p70-bm-ratio">{ratio.toFixed(2)}×</div> : null}
          <p style={{ margin: "0 0 8px", fontSize: "14px", color: "var(--muted)" }}>NL / .tq compression</p>
          <div className="p70-bm-bars">
            <div className="p70-bm-row">
              <span>NL task</span>
              <div className="p70-bm-track">
                <div className="p70-bm-fill p70-bm-fill-nl" style={{ width: `${nlPct}%` }} />
              </div>
              <span>{Math.round(task)}</span>
            </div>
            <div className="p70-bm-row">
              <span>.tq</span>
              <div className="p70-bm-track">
                <div className="p70-bm-fill p70-bm-fill-tq" style={{ width: `${tqPct}%` }} />
              </div>
              <span>{Math.round(tq)}</span>
            </div>
          </div>
        </>
      ) : metrics ? (
        <p style={{ color: "var(--muted)" }}>Incomplete metrics in fixture.</p>
      ) : !err ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : null}
      <p style={{ margin: "16px 0 0", fontSize: "13px", color: "var(--muted)" }}>
        CLI: <span className="p70-code">torqa demo benchmark</span> ·{" "}
        <span className="p70-code">docs/BENCHMARK_COMPRESSION.md</span>
      </p>
    </div>
  );
}

const NL_SNIPPET = `Build a login flow: email + password form, validate input,
show error states, on success route to a minimal dashboard
with a welcome line and sign-out. Use React + Vite.`;

const TQ_SNIPPET = `intent "Login + dashboard shell"
requires email, password
result "SessionActive"

flow:
  when credentials_valid then show_dashboard
  when credentials_invalid then show_error`;

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <>
      <header className="p70-header">
        <div className="p70-header-inner">
          <a className="p70-logo" href="#hero">
            <span className="p70-logo-mark">TQ</span>
            <span>TORQA</span>
          </a>
          <nav className="p70-nav" aria-label="Primary">
            <a href="#solve">Problems</a>
            <a href="#ideas">Ideas</a>
            <a href="#demo">Demo</a>
            <a href="#benchmark">Benchmark</a>
            <a href="#how">How it works</a>
            <a href="#start">Get started</a>
            <a href="#desktop">Desktop</a>
          </nav>
          <div className="p70-header-cta">
            <button type="button" className="p70-btn" onClick={toggle} aria-label="Toggle color theme">
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <a className="p70-btn p70-btn-primary" href="/console">
              Open web console
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="p70-hero" id="hero">
          <div className="p70-wrap">
            <p className="p70-kicker">Semantic-first specification</p>
            <h1>Describe intent once. Validate it. Project everywhere.</h1>
            <p className="p70-tagline">
              Same software intent, fewer tokens, validated before execution.
            </p>
            <p className="p70-lead">
              <strong>TORQA</strong> is a compact surface and canonical IR for flows and guards — not a code editor
              and not a hosted IDE. You write checkable specs; the toolchain rejects bad intent before materializing web,
              SQL, and stubs.
            </p>
            <div className="p70-hero-cta">
              <a className="p70-btn p70-btn-primary" href="#start">
                Get started
              </a>
              <a className="p70-btn" href="/console">
                Try the IR lab
              </a>
              <a className="p70-btn" href="#demo">
                See the demo path
              </a>
            </div>
          </div>
        </section>

        <section className="p70-section" id="solve">
          <div className="p70-wrap">
            <h2>What it solves</h2>
            <p className="p70-sub">
              AI-assisted coding often burns tokens on long, fragile prompts and ships unverified structure. TORQA
              tightens the loop.
            </p>
            <div className="p70-grid3">
              <div className="p70-card">
                <h3>Too many tokens</h3>
                <p>
                  The same intent fits in a small <span className="p70-code">.tq</span> surface — measurable vs
                  natural-language task specs (see benchmark).
                </p>
              </div>
              <div className="p70-card">
                <h3>Unreliable outputs</h3>
                <p>
                  Generated previews are outputs of a <strong>validated</strong> model — not a substitute for checks.
                  Invalid bundles do not complete a clean build path.
                </p>
              </div>
              <div className="p70-card">
                <h3>No validation step</h3>
                <p>
                  Envelope, structural, and semantic phases run before projection. You get pass/fail and diagnostics,
                  not silent drift.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p70-section" id="ideas">
          <div className="p70-wrap">
            <h2>Core ideas</h2>
            <p className="p70-sub">Three pillars that stay true whether you author by hand or with AI assistance.</p>
            <div className="p70-grid3">
              <div className="p70-card">
                <h3>Semantic compression</h3>
                <p>Store durable intent in the smallest faithful spec — fewer tokens, clearer diffs, repeatable CI.</p>
              </div>
              <div className="p70-card">
                <h3>Validation gate</h3>
                <p>Parse and validate are explicit stages. Bad specs are rejected before projection touches disk.</p>
              </div>
              <div className="p70-card">
                <h3>Projection</h3>
                <p>One IR drives multiple surfaces (e.g. web preview, SQL-shaped artifacts, language stubs).</p>
              </div>
            </div>
          </div>
        </section>

        <section className="p70-section" id="demo">
          <div className="p70-wrap">
            <h2>From prompt to system output</h2>
            <p className="p70-sub">
              This site explains and links; it is not the toolchain. A typical flagship-shaped flow looks like this
              (abbreviated):
            </p>
            <div className="p70-demo-flow">
              <div className="p70-demo-box">
                <h4>Prompt (NL task)</h4>
                <pre className="p70-demo-pre">{NL_SNIPPET}</pre>
              </div>
              <div className="p70-demo-arrow" aria-hidden="true">
                →
              </div>
              <div className="p70-demo-box">
                <h4>TORQA surface (.tq)</h4>
                <pre className="p70-demo-pre">{TQ_SNIPPET}</pre>
              </div>
              <div className="p70-demo-arrow" aria-hidden="true">
                →
              </div>
              <div className="p70-demo-box">
                <h4>Output (after validate + build)</h4>
                <pre className="p70-demo-pre">
                  {`generated/webapp/   (Vite + React preview)
generated/sql/       (schema-shaped)
generated/python/    (stubs)
…`}
                </pre>
              </div>
            </div>
            <p style={{ marginTop: 24, color: "var(--muted)", fontSize: "15px" }}>
              Run <span className="p70-code">torqa demo</span> for the full command list, or open the{" "}
              <a href="/console">web console</a> / <a href="/desktop">browser desktop</a> surfaces.
            </p>
            <p style={{ marginTop: 12, color: "var(--muted)", fontSize: "15px" }}>
              <strong>Official desktop (P71):</strong> <span className="p70-code">torqa-desktop</span> (Electron in{" "}
              <span className="p70-code">desktop/</span>) — <span className="p70-code">npm install</span> once in that folder.
              Uses the <span className="p70-code">torqa</span> CLI only; no duplicated validation logic.
            </p>
          </div>
        </section>

        <section className="p70-section" id="benchmark">
          <div className="p70-wrap">
            <h2>Benchmark</h2>
            <p className="p70-sub">
              Flagship fixture compares NL task text vs <span className="p70-code">.tq</span> size — token estimates are
              deterministic (not live model tokenizer APIs).
            </p>
            <BenchmarkLive />
          </div>
        </section>

        <section className="p70-section" id="how">
          <div className="p70-wrap">
            <h2>How it works</h2>
            <p className="p70-sub">One pipeline shape, whether you use CLI, web UI, or desktop shell.</p>
            <div className="p70-flow">
              <span className="p70-flow-step">AI / human</span>
              <span className="p70-flow-glyph">→</span>
              <span className="p70-flow-step accent">TORQA surface</span>
              <span className="p70-flow-glyph">→</span>
              <span className="p70-flow-step">Validate</span>
              <span className="p70-flow-glyph">→</span>
              <span className="p70-flow-step">Project</span>
              <span className="p70-flow-glyph">→</span>
              <span className="p70-flow-step">Web · SQL · stubs</span>
            </div>
          </div>
        </section>

        <section className="p70-section" id="start">
          <div className="p70-wrap">
            <h2>Get started</h2>
            <p className="p70-sub">
              Install from the repository root (Python 3.10+). Trial expectations:{" "}
              <span className="p70-code">docs/TRIAL_READINESS.md</span>.
            </p>
            <div className="p70-grid3">
              <div className="p70-card">
                <h3>Install</h3>
                <p>
                  <span className="p70-code">pip install -e .</span>
                </p>
                <p style={{ marginTop: 10 }}>
                  Quick path: <span className="p70-code">docs/QUICKSTART.md</span>
                </p>
              </div>
              <div className="p70-card">
                <h3>Run the demo</h3>
                <p>
                  <span className="p70-code">torqa demo</span> then <span className="p70-code">torqa demo verify</span>{" "}
                  and <span className="p70-code">torqa build examples/benchmark_flagship/app.tq</span>
                </p>
              </div>
              <div className="p70-card">
                <h3>Open desktop</h3>
                <p>
                  Browser IDE: <span className="p70-code">/desktop</span> via <span className="p70-code">torqa-console</span>
                  . Native: <span className="p70-code">torqa-desktop</span> (see <span className="p70-code">desktop/README.md</span>
                  ). Legacy: <span className="p70-code">torqa-desktop-legacy --tk</span>
                </p>
                <p style={{ marginTop: 10 }}>
                  Electron source: <span className="p70-code">desktop/</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p70-section" id="desktop">
          <div className="p70-wrap">
            <h2>Desktop authoring</h2>
            <p className="p70-sub">
              The desktop is a <strong>surface</strong> for editing and running the toolchain — not the product website
              you are reading now.
            </p>
            <div className="p70-card" style={{ maxWidth: 640 }}>
              <h3>Choose your shell</h3>
              <p>
                <a href="/desktop">Web desktop</a> (embedded UI) · <span className="p70-code">torqa-desktop</span> ·{" "}
                <span className="p70-code">desktop/</span> (Electron, official)
              </p>
              <p style={{ marginTop: 12 }}>
                Details: <span className="p70-code">docs/DEMO_SURFACES.md</span> ·{" "}
                <span className="p70-code">docs/UI_SURFACE_RULES.md</span>
              </p>
            </div>
          </div>
        </section>

        <footer className="p70-footer">
          <div className="p70-wrap">
            <p>
              Local preview — follow <span className="p70-code">docs/WEBUI_SECURITY.md</span> before exposing{" "}
              <span className="p70-code">torqa-console</span> to untrusted networks.
            </p>
            <p style={{ marginTop: 8 }}>
              Docs hub: <span className="p70-code">docs/DOC_MAP.md</span> · This page is built from{" "}
              <span className="p70-code">website/</span> (official site; P72).
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
