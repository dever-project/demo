import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Folder,
  LayoutGrid,
  Moon,
  Sparkles,
  Sun,
  Wand2,
  Zap,
} from "lucide-react";
import { SiteLogo, getSiteConfig } from "@dever/front-plugin";
import { WorkProjectPage } from "../project/project-page";

type WorkPageKey = "project" | "tools" | "assets" | "skills";

type NavItem = {
  key: WorkPageKey;
  label: string;
  icon: typeof Bot;
};

const navItems: NavItem[] = [
  { key: "project", label: "创作", icon: Sparkles },
  { key: "tools", label: "工具", icon: LayoutGrid },
  { key: "assets", label: "资产", icon: Folder },
  { key: "skills", label: "技能", icon: Zap },
];

export function WorkHomeShell({ item }: { item?: any }) {
  const site = getSiteConfig();
  const pageValue =
    typeof item?.value === "string" ? item.value : item?.value?.page;
  const initialPage =
    pageValue === "assets" || pageValue === "tools" || pageValue === "skills"
      ? pageValue
      : "project";
  const [activePage, setActivePage] = useState<WorkPageKey>(initialPage);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(window.localStorage.getItem("work-theme") === "dark");
  }, []);

  function toggleTheme() {
    setDark((current) => {
      const next = !current;
      window.localStorage.setItem("work-theme", next ? "dark" : "light");
      return next;
    });
  }

  const content = useMemo(() => {
    if (activePage === "project") {
      return <WorkProjectPage />;
    }
    return (
      <ComingSoon
        title={
          activePage === "tools"
            ? "工具"
            : activePage === "assets"
              ? "资产"
              : "技能"
        }
      />
    );
  }, [activePage]);

  return (
    <main className={cx("hb-app", dark && "is-dark")}>
      <WorkHomeStyles />
      <aside className="hb-rail">
        <div className="hb-rail-top">
          <div className="hb-logo" aria-label={site.name || "工作台"}>
            <SiteLogo className="hb-logo-mark" />
          </div>
          <nav className="hb-nav" aria-label="工作台导航">
            {navItems.map((nav) => (
              <RailButton
                key={nav.key}
                active={activePage === nav.key}
                icon={nav.icon}
                label={nav.label}
                onClick={() => setActivePage(nav.key)}
              />
            ))}
          </nav>
        </div>

        <div className="hb-rail-bottom">
          <button
            type="button"
            className="hb-side-action"
            onClick={toggleTheme}
            aria-label={dark ? "切换亮色" : "切换暗色"}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div className="hb-avatar" aria-label="用户">
            P
            <span />
          </div>
          <button type="button" className="hb-more" aria-label="更多">
            <span>•••</span>
          </button>
        </div>
      </aside>

      <section className="hb-content">{content}</section>
    </main>
  );
}

function RailButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Bot;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cx("hb-nav-item", active && "is-active")}
      onClick={onClick}
    >
      <Icon
        size={20}
        strokeWidth={active ? 2.5 : 1.8}
        fill={active ? "currentColor" : "none"}
      />
      <span>{label}</span>
    </button>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="hb-soon">
      <div className="hb-soon-icon">
        <Sparkles size={30} />
      </div>
      <h2>{title}</h2>
      <p>页面正在准备中</p>
    </div>
  );
}

function WorkHomeStyles() {
  return (
    <style>{`
      .hb-app {
        --hb-bg: #f5f6f8;
        --hb-panel: #ffffff;
        --hb-panel-soft: #f8fafc;
        --hb-text: #080d1c;
        --hb-text-muted: #667085;
        --hb-border: #dce3ee;
        --hb-border-strong: #cfd8e6;
        --hb-primary: #090f22;
        --hb-primary-text: #ffffff;
        --hb-accent: #e8eef7;
        --hb-shadow: 0 22px 70px rgba(18, 27, 47, 0.08);
        --hb-card-shadow: 0 12px 36px rgba(15, 23, 42, 0.06);
        position: fixed;
        inset: 0;
        z-index: 1;
        display: flex;
        width: 100vw;
        min-width: 100vw;
        height: 100vh;
        min-height: 100vh;
        overflow: hidden;
        background: var(--hb-bg);
        color: var(--hb-text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
      }

      .hb-app.is-dark {
        --hb-bg: #0b0d12;
        --hb-panel: #141820;
        --hb-panel-soft: #10141b;
        --hb-text: #f6f8fb;
        --hb-text-muted: #98a2b3;
        --hb-border: #252b36;
        --hb-border-strong: #343b49;
        --hb-primary: #f8fafc;
        --hb-primary-text: #090f22;
        --hb-accent: #1c2430;
        --hb-shadow: 0 22px 70px rgba(0, 0, 0, 0.36);
        --hb-card-shadow: 0 12px 36px rgba(0, 0, 0, 0.24);
      }

      .hb-app * {
        box-sizing: border-box;
      }

      .hb-rail {
        position: relative;
        z-index: 2;
        display: flex;
        width: 84px;
        height: 100vh;
        flex: 0 0 84px;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        border-right: 1px solid var(--hb-border);
        background: var(--hb-panel);
        padding: 26px 8px 26px;
        box-shadow: 1px 0 0 rgba(15, 23, 42, 0.02);
      }

      .hb-rail-top,
      .hb-nav {
        display: flex;
        width: 100%;
        flex-direction: column;
        align-items: center;
      }

      .hb-logo {
        display: flex;
        width: 46px;
        height: 46px;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-radius: 15px;
        background: linear-gradient(145deg, #070a14 0%, #030511 100%);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 14px 26px rgba(3, 7, 18, 0.16);
      }

      .hb-logo-mark {
        width: 25px;
        height: 25px;
        object-fit: contain;
        filter: brightness(0) invert(1);
      }

      .hb-nav {
        gap: 8px;
        margin-top: 34px;
      }

      .hb-nav-item {
        position: relative;
        display: inline-flex;
        width: 62px;
        min-height: 60px;
        cursor: pointer;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        border: 1px solid transparent;
        border-radius: 16px;
        background: transparent;
        color: #94a3b8;
        font: inherit;
        font-size: 11px;
        font-weight: 760;
        line-height: 1;
        transition: background 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
      }

      .hb-nav-item:hover {
        color: #475569;
        transform: translateY(-1px);
      }

      .hb-nav-item.is-active {
        border-color: transparent;
        background: transparent;
        color: #090f22;
        font-weight: 900;
      }

      .hb-app.is-dark .hb-nav-item {
        color: #64748b;
      }

      .hb-app.is-dark .hb-nav-item:hover {
        color: #94a3b8;
      }

      .hb-app.is-dark .hb-nav-item.is-active {
        color: #f8fafc;
      }

      .hb-beta {
        position: absolute;
        top: 5px;
        right: 5px;
        border-radius: 5px;
        background: #8bdcff;
        color: #fff;
        padding: 1px 4px;
        font-size: 7px;
        font-weight: 900;
        line-height: 1.2;
      }

      .hb-rail-bottom {
        display: flex;
        width: 100%;
        flex-direction: column;
        align-items: center;
        gap: 18px;
      }

      .hb-side-action {
        display: inline-flex;
        width: 38px;
        height: 38px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--hb-text-muted);
        box-shadow: none;
        transition: transform 160ms ease, color 160ms ease;
      }

      .hb-side-action:hover {
        color: var(--hb-text);
        transform: translateY(-1px);
      }

      .hb-more {
        display: inline-flex;
        width: 38px;
        height: 24px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: #8b95a5;
        font: inherit;
        font-size: 18px;
        font-weight: 950;
        line-height: 1;
        letter-spacing: 1px;
        box-shadow: none;
        transition: color 160ms ease, transform 160ms ease;
      }

      .hb-more:hover {
        color: var(--hb-text);
        transform: translateY(-1px);
      }

      .hb-more span {
        display: block;
        transform: translateY(-2px);
      }

      .hb-avatar {
        position: relative;
        display: flex;
        width: 39px;
        height: 39px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #12c987;
        color: #fff;
        font-size: 13px;
        font-weight: 900;
        box-shadow: 0 8px 20px rgba(18, 201, 135, 0.18);
      }

      .hb-avatar span {
        position: absolute;
        right: 1px;
        bottom: 1px;
        width: 10px;
        height: 10px;
        border: 2px solid var(--hb-panel);
        border-radius: 999px;
        background: #34d399;
      }

      .hb-content {
        min-width: 0;
        flex: 1;
        width: calc(100vw - 84px);
        height: 100vh;
        overflow-x: hidden;
        overflow-y: auto;
        background: var(--hb-bg);
        background:
          radial-gradient(circle at 65% 18%, color-mix(in srgb, var(--hb-accent) 62%, transparent) 0, transparent 34%),
          var(--hb-bg);
      }

      .hb-soon {
        display: flex;
        min-height: 100vh;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        text-align: center;
      }

      .hb-soon-icon {
        display: flex;
        width: 76px;
        height: 76px;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--hb-border);
        border-radius: 26px;
        background: var(--hb-panel);
        color: var(--hb-text-muted);
        box-shadow: var(--hb-card-shadow);
      }

      .hb-soon h2 {
        margin: 24px 0 8px;
        font-size: 28px;
        line-height: 1.2;
      }

      .hb-soon p {
        margin: 0;
        color: var(--hb-text-muted);
      }

      @media (max-width: 760px) {
        .hb-app {
          overflow: auto;
        }

        .hb-rail {
          width: 76px;
          flex-basis: 76px;
          padding-inline: 6px;
        }

        .hb-content {
          width: calc(100vw - 76px);
        }

        .hb-nav-item {
          width: 60px;
          min-height: 64px;
          font-size: 12px;
        }
      }
    `}</style>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
