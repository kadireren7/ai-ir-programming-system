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
        else setErr("Live figures appear when you preview this site through the local TORQA server.");
      } catch {
        if (!cancelled) setErr("Connect via the local server to load live benchmark figures.");
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
      <h3 className="p70-bm-title">Compression at a glance</h3>
      <p className="p70-bm-lead">
        Flagship intent expressed as a long natural-language brief versus the same intent in a compact Torqa surface —
        estimated token scale, deterministic benchmark.
      </p>
      {err && !metrics ? <p className="p70-bm-note">{err}</p> : null}
      {metrics && task > 0 && tq > 0 ? (
        <>
          {ratio != null ? <div className="p70-bm-ratio">{ratio.toFixed(2)}×</div> : null}
          <p className="p70-bm-caption">Natural language vs Torqa surface</p>
          <div className="p70-bm-bars">
            <div className="p70-bm-row">
              <span>NL brief</span>
              <div className="p70-bm-track">
                <div className="p70-bm-fill p70-bm-fill-nl" style={{ width: `${nlPct}%` }} />
              </div>
              <span>{Math.round(task)}</span>
            </div>
            <div className="p70-bm-row">
              <span>Torqa</span>
              <div className="p70-bm-track">
                <div className="p70-bm-fill p70-bm-fill-tq" style={{ width: `${tqPct}%` }} />
              </div>
              <span>{Math.round(tq)}</span>
            </div>
          </div>
        </>
      ) : metrics ? (
        <p className="p70-bm-note">Figures incomplete.</p>
      ) : !err ? (
        <p className="p70-bm-note">Loading…</p>
      ) : null}
    </div>
  );
}

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <>
      <div className="p70-bg-grid" aria-hidden="true" />
      <header className="p70-header">
        <div className="p70-header-inner">
          <a className="p70-logo" href="#hero">
            <span className="p70-logo-mark">TQ</span>
            <span className="p70-logo-text">TORQA</span>
          </a>
          <nav className="p70-nav" aria-label="Primary">
            <a href="#solve">Why</a>
            <a href="#ideas">Pillars</a>
            <a href="#demo">Journey</a>
            <a href="#benchmark">Proof</a>
            <a href="#how">Flow</a>
            <a href="#start">Developers</a>
            <a href="#desktop">Desktop</a>
          </nav>
          <div className="p70-header-cta">
            <button type="button" className="p70-btn p70-btn-ghost" onClick={toggle} aria-label="Toggle color theme">
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <a className="p70-btn p70-btn-primary" href="#desktop">
              Get the app
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="p70-hero" id="hero">
          <div className="p70-hero-glow" aria-hidden="true" />
          <div className="p70-wrap p70-hero-inner">
            <p className="p70-kicker">Specification that survives contact with reality</p>
            <h1>Intent you can trust. Validation before anything ships.</h1>
            <p className="p70-tagline">
              TORQA turns durable software intent into a tight, checkable form — then projects it to web, data, and code
              surfaces without guessing.
            </p>
            <p className="p70-lead">
              Built for teams who want <strong>semantic compression</strong> (say more with less), a <strong>hard gate</strong>{" "}
              that rejects bad specs early, and <strong>one source of truth</strong> that stays aligned across tools and AI
              assistance.
            </p>
            <div className="p70-hero-cta">
              <a className="p70-btn p70-btn-primary p70-btn-lg" href="#start">
                Start building
              </a>
              <a className="p70-btn p70-btn-lg" href="#demo">
                See the journey
              </a>
            </div>
          </div>
        </section>

        <section className="p70-section" id="solve">
          <div className="p70-wrap">
            <h2>Problems TORQA was built for</h2>
            <p className="p70-sub">
              Most delivery pain is not “more code” — it is unclear intent, unmeasured prompts, and specs that never
              faced a real validator.
            </p>
            <div className="p70-grid3">
              <div className="p70-card p70-card-elevated">
                <span className="p70-card-icon" aria-hidden="true">
                  ◇
                </span>
                <h3>Token and attention debt</h3>
                <p>
                  Long natural-language briefs rot fast. A compact Torqa surface holds the same intent with less noise and
                  clearer review.
                </p>
              </div>
              <div className="p70-card p70-card-elevated">
                <span className="p70-card-icon" aria-hidden="true">
                  ◆
                </span>
                <h3>Outputs without a gate</h3>
                <p>
                  Generated previews should be the fruit of a validated model — not wishful JSON. Invalid work stops before
                  it becomes files.
                </p>
              </div>
              <div className="p70-card p70-card-elevated">
                <span className="p70-card-icon" aria-hidden="true">
                  ◈
                </span>
                <h3>Silent drift</h3>
                <p>
                  Structural and semantic phases run up front. You get an explicit pass or fail — not surprises in
                  production.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p70-section p70-section-tint" id="ideas">
          <div className="p70-wrap">
            <h2>Three pillars</h2>
            <p className="p70-sub">How TORQA stays honest whether humans or models author the spec.</p>
            <div className="p70-grid3">
              <div className="p70-card">
                <h3>Semantic compression</h3>
                <p>Smallest faithful representation of intent — fewer tokens, sharper diffs, repeatable automation.</p>
              </div>
              <div className="p70-card">
                <h3>Validation gate</h3>
                <p>Parsing and validation are first-class. What fails never pretends to be “done.”</p>
              </div>
              <div className="p70-card">
                <h3>Projection</h3>
                <p>One canonical IR drives previews and artifacts across the surfaces you care about.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="p70-section" id="demo">
          <div className="p70-wrap">
            <h2>From idea to materialized output</h2>
            <p className="p70-sub">
              A flagship-shaped flow, expressed as a story — not a terminal session. The toolchain lives in your
              environment; this page is the narrative.
            </p>
            <div className="p70-journey">
              <div className="p70-journey-step">
                <span className="p70-journey-num">1</span>
                <div>
                  <h3>Natural-language brief</h3>
                  <p>
                    Product and engineering describe flows, guards, and outcomes in plain language — the kind of brief you
                    would hand to a senior engineer or a trusted model.
                  </p>
                </div>
              </div>
              <div className="p70-journey-connector" aria-hidden="true" />
              <div className="p70-journey-step">
                <span className="p70-journey-num">2</span>
                <div>
                  <h3>Torqa surface</h3>
                  <p>
                    That intent is captured in a compact, checkable spec: flows, requirements, and explicit results — ready
                    for validation and diff-friendly review.
                  </p>
                </div>
              </div>
              <div className="p70-journey-connector" aria-hidden="true" />
              <div className="p70-journey-step">
                <span className="p70-journey-num">3</span>
                <div>
                  <h3>Validated projection</h3>
                  <p>
                    After the gate passes, you get credible previews and artifacts — web experiences, data-shaped output,
                    and language stubs — aligned to the same IR.
                  </p>
                </div>
              </div>
            </div>
            <div className="p70-hero-cta p70-cta-row">
              <a className="p70-btn p70-btn-primary" href="#desktop">
                Try the desktop experience
              </a>
              <a className="p70-btn" href="#start">
                Developer onboarding
              </a>
            </div>
          </div>
        </section>

        <section className="p70-section" id="benchmark">
          <div className="p70-wrap">
            <h2>Measured compression</h2>
            <p className="p70-sub">
              The flagship benchmark compares the same intent as a long task brief versus a Torqa surface — so compression
              is visible, not hand-wavy.
            </p>
            <BenchmarkLive />
          </div>
        </section>

        <section className="p70-section p70-section-tint" id="how">
          <div className="p70-wrap">
            <h2>How the pipeline feels</h2>
            <p className="p70-sub">One shape from authoring to artifacts — CLI, desktop, or automation, same core.</p>
            <div className="p70-flow">
              <span className="p70-flow-step">Author</span>
              <span className="p70-flow-glyph">→</span>
              <span className="p70-flow-step accent">Torqa spec</span>
              <span className="p70-flow-glyph">→</span>
              <span className="p70-flow-step">Validate</span>
              <span className="p70-flow-glyph">→</span>
              <span className="p70-flow-step">Project</span>
              <span className="p70-flow-glyph">→</span>
              <span className="p70-flow-step">Artifacts</span>
            </div>
          </div>
        </section>

        <section className="p70-section" id="start">
          <div className="p70-wrap">
            <h2>For developers</h2>
            <p className="p70-sub">
              TORQA ships as an open codebase: install from the repository, run the bundled demos, and read the in-repo
              documentation for every command and contract.
            </p>
            <div className="p70-grid3">
              <div className="p70-card p70-card-elevated">
                <h3>Install</h3>
                <p>Python 3.10+ and an editable install from the repo root; optional Node setup for the desktop shell.</p>
                <p className="p70-card-foot">Full steps ship in the documentation bundle.</p>
              </div>
              <div className="p70-card p70-card-elevated">
                <h3>Demos</h3>
                <p>Verify flagship assets, run a sample build, and inspect compression and gate proof — all from the CLI.</p>
                <p className="p70-card-foot">The demo entrypoint prints the canonical path.</p>
              </div>
              <div className="p70-card p70-card-elevated">
                <h3>Desktop</h3>
                <p>Native app for folders and specs: open a workspace, load samples, validate and build with clear feedback.</p>
                <p className="p70-card-foot">
                  <a className="p70-inline-link" href="#desktop">
                    Desktop overview →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p70-section" id="desktop">
          <div className="p70-wrap">
            <h2>Desktop</h2>
            <p className="p70-sub">
              The TORQA desktop is a focused authoring shell: workspaces, editing, validate and build, diagnostics and IR
              preview. Core semantics stay in the engine — the app does not reinvent validation.
            </p>
            <div className="p70-card p70-card-wide p70-card-elevated">
              <h3>Run locally</h3>
              <p>
                Install desktop dependencies once, then launch the app from the same environment where TORQA is installed.
                First run offers guided samples so you are productive in minutes.
              </p>
            </div>
          </div>
        </section>

        <footer className="p70-footer">
          <div className="p70-wrap p70-footer-inner">
            <p className="p70-footer-brand">TORQA</p>
            <p className="p70-footer-copy">
              Open source. Run the local server only in trusted environments. Documentation ships with the repository.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
