export function WorkSpaceStyles() {
  return (
    <style>{`
	      .ws-page {
	        --ws-canvas: #050608;
	        --ws-panel: rgba(24, 27, 34, 0.88);
	        --ws-panel-strong: rgba(18, 21, 27, 0.94);
        --ws-border: rgba(255,255,255,0.12);
        --ws-border-strong: rgba(255,255,255,0.2);
        --ws-text: #f7fafc;
        --ws-muted: rgba(255,255,255,0.58);
        --ws-green: #23f0a5;
        --ws-blue: #5aa7ff;
	        --ws-amber: #f5b544;
	        --ws-rose: #ff6b8a;
	        --ws-violet: #a78bfa;
	        --ws-edge: rgba(255,255,255,0.32);
	        --ws-edge-active: rgba(35,196,131,0.75);
	        --ws-flow-dot: rgba(255,255,255,0.18);
        position: fixed;
        inset: 0;
        min-width: 100vw;
        min-height: 100vh;
        overflow: hidden;
        background:
          radial-gradient(circle at 78% 72%, rgba(35,240,165,0.12), transparent 18%),
          radial-gradient(circle at 12% 18%, rgba(90,167,255,0.12), transparent 21%),
          var(--ws-canvas);
        color: var(--ws-text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	        letter-spacing: 0;
	      }

	      .ws-page.is-light {
	        --ws-canvas: #edf2f7;
	        --ws-panel: rgba(255, 255, 255, 0.84);
	        --ws-panel-strong: rgba(255, 255, 255, 0.95);
	        --ws-border: rgba(15, 23, 42, 0.14);
	        --ws-border-strong: rgba(15, 23, 42, 0.26);
	        --ws-text: #07111f;
	        --ws-muted: rgba(15, 23, 42, 0.56);
	        --ws-green: #10b981;
	        --ws-blue: #2563eb;
	        --ws-amber: #d97706;
	        --ws-rose: #e11d48;
	        --ws-violet: #7c3aed;
	        --ws-edge: rgba(15,23,42,0.26);
	        --ws-edge-active: rgba(16,185,129,0.78);
	        --ws-flow-dot: rgba(15,23,42,0.14);
	        background:
	          radial-gradient(circle at 78% 72%, rgba(16,185,129,0.16), transparent 18%),
	          radial-gradient(circle at 12% 18%, rgba(37,99,235,0.12), transparent 21%),
	          var(--ws-canvas);
	      }

	      .ws-page * {
	        box-sizing: border-box;
	      }

      .ws-canvas-wrap {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }

	      .ws-canvas-wrap::before {
	        content: "";
	        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-image:
          radial-gradient(circle, rgba(255,255,255,0.13) 1px, transparent 1px),
          linear-gradient(120deg, rgba(35,240,165,0.04), rgba(90,167,255,0.04), rgba(255,107,138,0.025));
	        background-size: 18px 18px, 100% 100%;
	      }

	      .ws-page.is-light .ws-canvas-wrap::before {
	        background-image:
	          radial-gradient(circle, rgba(15,23,42,0.16) 1px, transparent 1px),
	          linear-gradient(120deg, rgba(16,185,129,0.06), rgba(37,99,235,0.05), rgba(225,29,72,0.035));
	      }

      .ws-canvas-wrap .react-flow {
        position: relative;
        z-index: 1;
        background: transparent;
      }

      .ws-canvas-wrap .react-flow__node {
        border: 0;
        background: transparent;
        box-shadow: none;
      }

      .ws-canvas-wrap .react-flow__attribution {
        display: none;
      }

      .ws-canvas-wrap .react-flow__minimap {
        overflow: hidden;
        border: 1px solid var(--ws-border);
        border-radius: 14px;
        background: rgba(11,14,19,0.84);
      }

      .ws-canvas-wrap .react-flow__controls {
        overflow: hidden;
        border: 1px solid var(--ws-border);
        border-radius: 14px;
        background: rgba(11,14,19,0.84);
        box-shadow: 0 12px 34px rgba(0,0,0,0.34);
      }

	      .ws-canvas-wrap .react-flow__controls-button {
	        border-bottom-color: rgba(255,255,255,0.1);
	        background: transparent;
	        color: rgba(255,255,255,0.72);
	      }

	      .ws-page.is-light .ws-canvas-wrap .react-flow__minimap,
	      .ws-page.is-light .ws-canvas-wrap .react-flow__controls {
	        background: rgba(255,255,255,0.86);
	        box-shadow: 0 12px 34px rgba(15,23,42,0.12);
	      }

	      .ws-page.is-light .ws-canvas-wrap .react-flow__controls-button {
	        border-bottom-color: rgba(15,23,42,0.1);
	        color: rgba(15,23,42,0.68);
	      }

      .ws-topbar {
        position: absolute;
        top: 18px;
        left: 20px;
        right: 20px;
        z-index: 20;
        display: grid;
        grid-template-columns: minmax(220px, 340px) minmax(280px, 1fr) auto;
        align-items: center;
        gap: 14px;
        pointer-events: none;
      }

      .ws-top-left,
      .ws-top-actions,
      .ws-cate-strip {
        pointer-events: auto;
      }

      .ws-top-left,
      .ws-top-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .ws-back,
      .ws-action,
      .ws-team-pill,
	      .ws-cate,
	      .ws-dock,
	      .ws-bottom-bar,
	      .ws-floating-panel,
	      .ws-add-menu,
	      .ws-assistant-ball {
	        backdrop-filter: blur(18px);
	      }

      .ws-back {
        display: inline-flex;
        width: 42px;
        height: 42px;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--ws-border);
        border-radius: 14px;
        background: var(--ws-panel);
        color: var(--ws-text);
        cursor: pointer;
      }

	      .ws-back:hover,
	      .ws-action:hover,
	      .ws-cate:hover {
	        border-color: var(--ws-border-strong);
	        background: rgba(36,40,49,0.92);
	      }

	      .ws-page.is-light .ws-back:hover,
	      .ws-page.is-light .ws-action:hover,
	      .ws-page.is-light .ws-cate:hover {
	        background: rgba(255,255,255,0.96);
	      }

      .ws-project-meta {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 3px;
        border: 1px solid var(--ws-border);
        border-radius: 16px;
        background: var(--ws-panel);
        padding: 8px 14px;
      }

      .ws-project-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ws-text);
        font-size: 15px;
        font-weight: 820;
      }

      .ws-project-subtitle {
        display: flex;
        gap: 8px;
        color: var(--ws-muted);
        font-size: 11px;
        font-weight: 700;
      }

	      .ws-cate-strip {
	        display: flex;
        min-width: 0;
        justify-content: center;
        gap: 8px;
        overflow-x: auto;
        border: 1px solid var(--ws-border);
        border-radius: 18px;
        background: rgba(14,17,22,0.78);
	        padding: 7px;
	      }

	      .ws-page.is-light .ws-cate-strip {
	        background: rgba(255,255,255,0.72);
	      }

	      .ws-cate {
        display: inline-flex;
        min-width: 92px;
        height: 34px;
        align-items: center;
        justify-content: space-between;
        gap: 9px;
        border: 1px solid transparent;
        border-radius: 12px;
        background: transparent;
        color: rgba(255,255,255,0.66);
        padding: 0 10px;
	        cursor: pointer;
	      }

	      .ws-page.is-light .ws-cate {
	        color: rgba(15,23,42,0.62);
	      }

	      .ws-cate.is-active {
	        border-color: rgba(35,240,165,0.38);
	        background: rgba(35,240,165,0.12);
	        color: #dffdf1;
	      }

	      .ws-page.is-light .ws-cate.is-active {
	        border-color: rgba(16,185,129,0.32);
	        background: rgba(16,185,129,0.12);
	        color: #064e3b;
	      }

      .ws-cate-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
        font-weight: 820;
      }

	      .ws-cate-count {
        display: inline-flex;
        min-width: 20px;
        height: 20px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.76);
        font-size: 11px;
	        font-weight: 900;
	      }

	      .ws-page.is-light .ws-cate-count {
	        background: rgba(15,23,42,0.08);
	        color: rgba(15,23,42,0.66);
	      }

      .ws-top-actions {
        justify-content: flex-end;
      }

	      .ws-team-pill,
	      .ws-action {
        display: inline-flex;
        height: 42px;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 1px solid var(--ws-border);
        border-radius: 14px;
        background: var(--ws-panel);
        color: rgba(255,255,255,0.78);
        padding: 0 13px;
        font-size: 12px;
	        font-weight: 820;
	      }

	      .ws-page.is-light .ws-team-pill,
	      .ws-page.is-light .ws-action {
	        color: rgba(15,23,42,0.72);
	      }

      .ws-action {
        cursor: pointer;
      }

	      .ws-dock {
	        position: absolute;
        left: 22px;
        top: 50%;
        z-index: 18;
        display: flex;
        width: 68px;
        transform: translateY(-50%);
        flex-direction: column;
        align-items: center;
        gap: 18px;
        border: 1px solid var(--ws-border);
        border-radius: 34px;
        background: rgba(18,21,27,0.84);
        padding: 16px 8px;
	        box-shadow: 0 20px 70px rgba(0,0,0,0.42);
	      }

	      .ws-page.is-light .ws-dock {
	        background: rgba(255,255,255,0.78);
	        box-shadow: 0 20px 70px rgba(15,23,42,0.16);
	      }

      .ws-dock-add {
        display: inline-flex;
        width: 48px;
        height: 48px;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: #f8fafc;
        color: #0b1020;
        cursor: pointer;
        box-shadow: 0 10px 28px rgba(35,240,165,0.18);
      }

	      .ws-dock-button {
        display: flex;
        width: 100%;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        border: 0;
        background: transparent;
        color: rgba(255,255,255,0.58);
	        cursor: pointer;
	      }

	      .ws-page.is-light .ws-dock-button {
	        color: rgba(15,23,42,0.58);
	      }

      .ws-dock-button:hover,
      .ws-dock-button.is-active {
        color: var(--ws-green);
      }

      .ws-dock-button span {
        font-size: 11px;
        font-weight: 800;
      }

	      .ws-bottom-bar {
        position: absolute;
        left: 22px;
        bottom: 20px;
        z-index: 16;
        display: flex;
        max-width: calc(100vw - 160px);
        align-items: center;
        gap: 8px;
        border: 1px solid var(--ws-border);
        border-radius: 18px;
        background: rgba(18,21,27,0.82);
        padding: 8px 10px;
        color: rgba(255,255,255,0.66);
        font-size: 12px;
        font-weight: 780;
	        box-shadow: 0 16px 44px rgba(0,0,0,0.3);
	      }

	      .ws-page.is-light .ws-bottom-bar {
	        background: rgba(255,255,255,0.78);
	        color: rgba(15,23,42,0.64);
	        box-shadow: 0 16px 44px rgba(15,23,42,0.12);
	      }

	      .ws-bottom-bar span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        background: rgba(255,255,255,0.06);
	        padding: 6px 9px;
	      }

	      .ws-page.is-light .ws-bottom-bar span {
	        background: rgba(15,23,42,0.06);
	      }

      .ws-assistant-ball {
        position: absolute;
        right: 32px;
        bottom: 34px;
        z-index: 22;
        display: inline-flex;
        width: 72px;
        height: 72px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(35,240,165,0.36);
        border-radius: 999px;
        background: radial-gradient(circle at 50% 35%, #cbffe9, #48ffc0 42%, rgba(35,240,165,0.25) 70%);
        color: #07140f;
        cursor: pointer;
        box-shadow: 0 0 34px rgba(35,240,165,0.58), 0 16px 60px rgba(0,0,0,0.36);
      }

	      .ws-floating-panel {
        position: absolute;
        top: 88px;
        z-index: 24;
        display: flex;
        width: min(380px, calc(100vw - 126px));
        max-height: calc(100vh - 132px);
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--ws-border);
        border-radius: 22px;
        background: rgba(18,21,27,0.9);
        color: var(--ws-text);
	        box-shadow: 0 24px 90px rgba(0,0,0,0.48);
	      }

	      .ws-page.is-light .ws-floating-panel {
	        background: rgba(255,255,255,0.9);
	        box-shadow: 0 24px 90px rgba(15,23,42,0.16);
	      }

      .ws-floating-panel.is-left {
        left: 102px;
      }

      .ws-floating-panel.is-right {
        right: 24px;
      }

      .ws-floating-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid var(--ws-border);
        padding: 14px 16px;
      }

      .ws-floating-head h3 {
        margin: 0 0 3px;
        font-size: 14px;
        font-weight: 860;
      }

      .ws-floating-head span {
        color: var(--ws-muted);
        font-size: 12px;
        font-weight: 700;
      }

	      .ws-floating-head button {
        display: inline-flex;
        width: 30px;
        height: 30px;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--ws-border);
        border-radius: 10px;
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.72);
	        cursor: pointer;
	      }

	      .ws-page.is-light .ws-floating-head button {
	        background: rgba(15,23,42,0.06);
	        color: rgba(15,23,42,0.72);
	      }

      .ws-asset-tree,
      .ws-flow-list,
      .ws-selected,
      .ws-chat-box {
        overflow-y: auto;
        padding: 14px;
      }

      .ws-tree-group {
        border-radius: 14px;
      }

	      .ws-tree-head {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        border: 1px solid transparent;
        border-radius: 12px;
        background: transparent;
        color: rgba(255,255,255,0.66);
        padding: 10px 11px;
        cursor: pointer;
	        text-align: left;
	      }

	      .ws-page.is-light .ws-tree-head {
	        color: rgba(15,23,42,0.64);
	      }

	      .ws-tree-head:hover,
	      .ws-tree-head.is-active {
	        border-color: rgba(35,240,165,0.26);
	        background: rgba(35,240,165,0.1);
	        color: #dffdf1;
	      }

	      .ws-page.is-light .ws-tree-head:hover,
	      .ws-page.is-light .ws-tree-head.is-active {
	        border-color: rgba(16,185,129,0.24);
	        background: rgba(16,185,129,0.1);
	        color: #064e3b;
	      }

      .ws-tree-label {
        display: inline-flex;
        min-width: 0;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 820;
      }

      .ws-tree-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 3px 8px 8px 34px;
      }

	      .ws-tree-asset {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        border: 0;
        border-radius: 9px;
        background: transparent;
        color: rgba(255,255,255,0.54);
        padding: 7px 8px;
        text-align: left;
	        font-size: 12px;
	      }

	      .ws-page.is-light .ws-tree-asset {
	        color: rgba(15,23,42,0.56);
	      }

	      .ws-tree-empty {
        color: rgba(255,255,255,0.46);
        font-size: 12px;
        line-height: 1.5;
	        padding: 8px;
	      }

	      .ws-page.is-light .ws-tree-empty {
	        color: rgba(15,23,42,0.48);
	      }

      .ws-panel-divider {
        height: 1px;
        background: var(--ws-border);
      }

      .ws-node-palette {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        padding: 14px;
      }

	      .ws-palette-button {
        display: flex;
        min-width: 0;
        height: 74px;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        gap: 5px;
        border: 1px solid var(--ws-border);
        border-radius: 14px;
        background: rgba(255,255,255,0.055);
        color: rgba(255,255,255,0.78);
        padding: 10px;
	        cursor: pointer;
	      }

	      .ws-page.is-light .ws-palette-button {
	        background: rgba(15,23,42,0.045);
	        color: rgba(15,23,42,0.76);
	      }

      .ws-palette-button:hover {
        border-color: rgba(35,240,165,0.3);
        background: rgba(35,240,165,0.1);
      }

      .ws-palette-button span,
      .ws-palette-button small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }

      .ws-palette-button span {
        font-size: 12px;
        font-weight: 850;
      }

	      .ws-palette-button small {
	        color: rgba(255,255,255,0.48);
	        font-size: 10px;
	        font-weight: 680;
	      }

	      .ws-page.is-light .ws-palette-button small {
	        color: rgba(15,23,42,0.48);
	      }

	      .ws-add-menu-backdrop {
	        position: absolute;
	        inset: 0;
	        z-index: 34;
	        pointer-events: auto;
	      }

	      .ws-add-menu {
	        position: absolute;
	        z-index: 35;
	        width: 270px;
	        max-height: min(520px, calc(100vh - 72px));
	        overflow-y: auto;
	        border: 1px solid var(--ws-border);
	        border-radius: 18px;
	        background: rgba(18,21,27,0.92);
	        color: var(--ws-text);
	        padding: 10px;
	        box-shadow: 0 20px 70px rgba(0,0,0,0.5);
	        pointer-events: auto;
	        user-select: none;
	      }

	      .ws-add-menu-head {
	        display: flex;
	        flex-direction: column;
	        gap: 3px;
	        padding: 8px 10px 10px;
	      }

	      .ws-add-menu-head strong {
	        font-size: 13px;
	        font-weight: 900;
	      }

	      .ws-add-menu-head span {
	        color: var(--ws-muted);
	        font-size: 11px;
	        font-weight: 720;
	      }

	      .ws-add-menu-list {
	        display: flex;
	        flex-direction: column;
	        gap: 4px;
	      }

	      .ws-add-item {
	        display: flex;
	        width: 100%;
	        align-items: center;
	        gap: 10px;
	        border: 1px solid transparent;
	        border-radius: 14px;
	        background: transparent;
	        color: rgba(255,255,255,0.82);
	        padding: 9px;
	        cursor: pointer;
	        text-align: left;
	        transition: background 140ms, border-color 140ms, transform 140ms;
	      }

	      .ws-add-item:hover {
	        border-color: var(--ws-border-strong);
	        background: rgba(255,255,255,0.07);
	        transform: translateY(-1px);
	      }

	      .ws-add-icon {
	        display: inline-flex;
	        width: 34px;
	        height: 34px;
	        flex: 0 0 auto;
	        align-items: center;
	        justify-content: center;
	        border: 1px solid rgba(255,255,255,0.08);
	        border-radius: 12px;
	        background: rgba(255,255,255,0.06);
	      }

	      .ws-add-item.is-asset .ws-add-icon {
	        color: var(--ws-green);
	      }

	      .ws-add-item.is-power .ws-add-icon {
	        color: var(--ws-violet);
	      }

	      .ws-add-item.is-agent .ws-add-icon {
	        color: var(--ws-amber);
	      }

	      .ws-add-item.is-flow .ws-add-icon {
	        color: var(--ws-blue);
	      }

	      .ws-add-item.is-function .ws-add-icon {
	        color: var(--ws-rose);
	      }

	      .ws-add-copy {
	        display: flex;
	        min-width: 0;
	        flex-direction: column;
	        gap: 2px;
	      }

	      .ws-add-copy strong,
	      .ws-add-copy small {
	        overflow: hidden;
	        text-overflow: ellipsis;
	        white-space: nowrap;
	      }

	      .ws-add-copy strong {
	        font-size: 13px;
	        font-weight: 860;
	      }

	      .ws-add-copy small {
	        color: rgba(255,255,255,0.48);
	        font-size: 11px;
	        font-weight: 680;
	      }

	      .ws-page.is-light .ws-add-menu {
	        background: rgba(255,255,255,0.95);
	        box-shadow: 0 20px 70px rgba(15,23,42,0.18);
	      }

	      .ws-page.is-light .ws-add-item {
	        color: rgba(15,23,42,0.82);
	      }

	      .ws-page.is-light .ws-add-item:hover {
	        background: rgba(15,23,42,0.06);
	      }

	      .ws-page.is-light .ws-add-icon {
	        border-color: rgba(15,23,42,0.08);
	        background: rgba(15,23,42,0.05);
	      }

	      .ws-page.is-light .ws-add-copy small {
	        color: rgba(15,23,42,0.5);
	      }

	      .ws-flow-list {
	        display: flex;
        flex-direction: column;
        gap: 10px;
      }

	      .ws-flow-card {
        display: flex;
        flex-direction: column;
        gap: 9px;
        border: 1px solid var(--ws-border);
        border-radius: 16px;
        background: rgba(255,255,255,0.055);
	        padding: 13px;
	      }

	      .ws-page.is-light .ws-flow-card {
	        background: rgba(15,23,42,0.045);
	      }

      .ws-flow-card h4 {
        margin: 0;
        font-size: 13px;
        font-weight: 850;
      }

	      .ws-flow-card p,
	      .ws-selected p {
	        margin: 0;
	        color: rgba(255,255,255,0.58);
        font-size: 12px;
	        line-height: 1.55;
	      }

	      .ws-page.is-light .ws-flow-card p,
	      .ws-page.is-light .ws-selected p {
	        color: rgba(15,23,42,0.58);
	      }

	      .ws-flow-card button,
	      .ws-panel-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        align-self: flex-start;
        border: 1px solid rgba(35,240,165,0.32);
        border-radius: 11px;
        background: rgba(35,240,165,0.14);
        color: #dffdf1;
        padding: 8px 11px;
        font-size: 12px;
        font-weight: 850;
	        cursor: pointer;
	      }

	      .ws-page.is-light .ws-flow-card button,
	      .ws-page.is-light .ws-panel-button {
	        color: #064e3b;
	      }

      .ws-flow-card button:disabled,
      .ws-panel-button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .ws-chat-box {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

	      .ws-chat-box textarea {
        width: 100%;
        min-height: 138px;
        resize: vertical;
        border: 1px solid var(--ws-border);
        border-radius: 16px;
        background: rgba(5,7,10,0.58);
        color: var(--ws-text);
        padding: 12px;
        font: inherit;
        font-size: 13px;
        line-height: 1.55;
	        outline: none;
	      }

	      .ws-page.is-light .ws-chat-box textarea {
	        background: rgba(255,255,255,0.72);
	        color: var(--ws-text);
	      }

      .ws-chat-box textarea:focus {
        border-color: rgba(35,240,165,0.42);
        box-shadow: 0 0 0 3px rgba(35,240,165,0.08);
      }

	      .ws-run-status {
        border-radius: 13px;
        background: rgba(35,240,165,0.12);
        color: #dffdf1;
        padding: 10px 12px;
        font-size: 12px;
	        font-weight: 760;
	      }

	      .ws-page.is-light .ws-run-status {
	        color: #064e3b;
	      }

      .ws-selected {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

	      .ws-empty-note {
        position: absolute;
        left: 112px;
        bottom: 82px;
        z-index: 12;
        display: flex;
        max-width: 560px;
        align-items: center;
        gap: 10px;
        border: 1px solid var(--ws-border);
        border-radius: 18px;
        background: rgba(18,21,27,0.82);
        color: rgba(255,255,255,0.68);
        padding: 12px 14px;
        font-size: 12px;
        line-height: 1.5;
        backdrop-filter: blur(18px);
	        box-shadow: 0 16px 44px rgba(0,0,0,0.3);
	      }

	      .ws-page.is-light .ws-empty-note {
	        background: rgba(255,255,255,0.8);
	        color: rgba(15,23,42,0.64);
	        box-shadow: 0 16px 44px rgba(15,23,42,0.12);
	      }

      .ws-node {
        position: relative;
        display: flex;
        width: 100%;
        height: 100%;
        flex-direction: column;
        justify-content: center;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(22, 27, 36, 0.92);
        color: #f8fafc;
        padding: 16px;
        box-shadow: 0 24px 70px rgba(0,0,0,0.34);
        cursor: grab;
        transition: border-color 160ms, box-shadow 160ms, transform 160ms;
      }

      .ws-node:hover,
      .ws-node.is-selected {
        border-color: rgba(35,240,165,0.74);
        box-shadow: 0 0 0 1px rgba(35,240,165,0.22), 0 26px 76px rgba(0,0,0,0.42);
      }

      .ws-node--asset {
        border-radius: 18px;
      }

      .ws-node--power {
        align-items: center;
        border-radius: 18px;
        background: linear-gradient(160deg, rgba(42,33,63,0.95), rgba(21,25,36,0.95));
        text-align: center;
      }

      .ws-node--agent {
        align-items: center;
        border-radius: 999px;
        background: radial-gradient(circle at 50% 20%, rgba(245,181,68,0.34), rgba(18,22,30,0.94) 62%);
        text-align: center;
      }

	      .ws-node--flow {
	        align-items: center;
	        isolation: isolate;
	        overflow: visible;
	        border-color: transparent;
	        background: transparent;
	        text-align: center;
	      }

	      .ws-node--flow::before {
	        content: "";
	        position: absolute;
	        inset: 0;
	        z-index: -1;
	        border: 1px solid rgba(255,255,255,0.1);
	        background: linear-gradient(160deg, rgba(27,73,122,0.96), rgba(18,22,30,0.94));
	        clip-path: polygon(17% 0, 83% 0, 100% 50%, 83% 100%, 17% 100%, 0 50%);
	      }

	      .ws-node--function {
	        align-items: center;
	        isolation: isolate;
	        overflow: visible;
	        border-color: transparent;
	        background: transparent;
	        padding-top: 30px;
	        text-align: center;
	      }

	      .ws-node--function::before {
	        content: "";
	        position: absolute;
	        inset: 0;
	        z-index: -1;
	        border: 1px solid rgba(255,255,255,0.1);
	        background: linear-gradient(170deg, rgba(20,83,65,0.95), rgba(18,22,30,0.94));
	        clip-path: polygon(50% 0, 100% 92%, 0 92%);
	      }

      .ws-node-kicker {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        margin-bottom: 8px;
        color: rgba(255,255,255,0.54);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .ws-node-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
        font-size: 15px;
        font-weight: 860;
      }

      .ws-node-desc {
        display: -webkit-box;
        overflow: hidden;
        margin-top: 8px;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        color: rgba(255,255,255,0.62);
        font-size: 12px;
        line-height: 1.5;
      }

      .ws-node-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
      }

	      .ws-node-chip {
	        border-radius: 999px;
	        background: rgba(255,255,255,0.08);
	        color: rgba(255,255,255,0.74);
        padding: 4px 8px;
	        font-size: 11px;
	        font-weight: 800;
	      }

	      .ws-page.is-light .ws-node {
	        border-color: rgba(15,23,42,0.1);
	        background: rgba(255,255,255,0.92);
	        color: #07111f;
	        box-shadow: 0 24px 70px rgba(15,23,42,0.14);
	      }

	      .ws-page.is-light .ws-node:hover,
	      .ws-page.is-light .ws-node.is-selected {
	        box-shadow: 0 0 0 1px rgba(16,185,129,0.22), 0 26px 76px rgba(15,23,42,0.2);
	      }

	      .ws-page.is-light .ws-node--power {
	        background: linear-gradient(160deg, rgba(245,240,255,0.96), rgba(255,255,255,0.94));
	      }

	      .ws-page.is-light .ws-node--agent {
	        background: radial-gradient(circle at 50% 20%, rgba(217,119,6,0.22), rgba(255,255,255,0.95) 62%);
	      }

	      .ws-page.is-light .ws-node--flow,
	      .ws-page.is-light .ws-node--function {
	        background: transparent;
	      }

	      .ws-page.is-light .ws-node--flow::before {
	        border-color: rgba(15,23,42,0.1);
	        background: linear-gradient(160deg, rgba(219,234,254,0.98), rgba(255,255,255,0.94));
	      }

	      .ws-page.is-light .ws-node--function::before {
	        border-color: rgba(15,23,42,0.1);
	        background: linear-gradient(170deg, rgba(209,250,229,0.96), rgba(255,255,255,0.94));
	      }

	      .ws-page.is-light .ws-node-kicker {
	        color: rgba(15,23,42,0.48);
	      }

	      .ws-page.is-light .ws-node-desc {
	        color: rgba(15,23,42,0.62);
	      }

	      .ws-page.is-light .ws-node-chip {
	        background: rgba(15,23,42,0.07);
	        color: rgba(15,23,42,0.68);
	      }

	      .ws-rf-handle {
	        width: 13px;
	        height: 13px;
	        border: 2px solid #07090d;
	        background: var(--ws-green);
	      }

	      .ws-page.is-light .ws-rf-handle {
	        border-color: #fff;
	      }

      .ws-rf-handle.is-in {
        left: -7px;
      }

      .ws-rf-handle.is-out {
        right: -7px;
      }

      .ws-loading,
      .ws-error {
        display: flex;
        min-height: 100vh;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: #050608;
        color: rgba(255,255,255,0.7);
        font-size: 14px;
      }

      .ws-error {
        color: #ff9ba9;
      }

      .ws-spin {
        animation: ws-spin 800ms linear infinite;
      }

      @keyframes ws-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 1080px) {
        .ws-topbar {
          grid-template-columns: minmax(180px, 260px) 1fr;
        }

        .ws-top-actions {
          display: none;
        }

        .ws-cate-strip {
          justify-content: flex-start;
        }
      }

      @media (max-width: 760px) {
        .ws-topbar {
          left: 12px;
          right: 12px;
          grid-template-columns: 1fr;
        }

        .ws-top-left {
          min-width: 0;
        }

        .ws-cate-strip {
          display: none;
        }

        .ws-dock {
          left: 12px;
          width: 58px;
        }

	        .ws-floating-panel {
	          left: 78px !important;
	          right: 12px !important;
	          width: auto;
	        }

	        .ws-add-menu {
	          width: min(270px, calc(100vw - 24px));
	        }

	        .ws-bottom-bar {
	          display: none;
        }
      }
    `}</style>
  );
}
