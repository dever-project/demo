import React from "react";

export function WorkSpaceStyles() {
  return (
    <style>{`
	      .ws-page {
	        --ws-canvas: oklch(0.145 0.005 285.823);
	        --ws-panel: rgba(24, 27, 34, 0.82);
	        --ws-panel-strong: rgba(18, 21, 27, 0.9);
	        --ws-border: rgba(255, 255, 255, 0.08);
	        --ws-border-strong: rgba(255, 255, 255, 0.16);
	        --ws-text: oklch(0.95 0.005 285.823);
	        --ws-muted: oklch(0.55 0.015 285.823);
	        --ws-green: #10b981;
	        --ws-blue: #3b82f6;
	        --ws-amber: #f59e0b;
	        --ws-rose: #f43f5e;
	        --ws-violet: #8b5cf6;
	        --ws-edge: rgba(255, 255, 255, 0.15);
	        --ws-edge-active: #10b981;
	        --ws-flow-dot: rgba(255, 255, 255, 0.05);
	        position: fixed;
	        inset: 0;
	        min-width: 100vw;
	        min-height: 100vh;
	        overflow: hidden;
	        background:
	          radial-gradient(circle at 78% 72%, rgba(16,185,129,0.08), transparent 25%),
	          radial-gradient(circle at 12% 18%, rgba(59,130,246,0.08), transparent 25%),
	          var(--ws-canvas);
	        color: var(--ws-text);
	        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	        letter-spacing: 0;
	      }

	      .ws-page.is-light {
	        --ws-canvas: oklch(0.98 0.005 285.823);
	        --ws-panel: rgba(255, 255, 255, 0.72);
	        --ws-panel-strong: rgba(255, 255, 255, 0.85);
	        --ws-border: rgba(15, 23, 42, 0.08);
	        --ws-border-strong: rgba(15, 23, 42, 0.14);
	        --ws-text: oklch(0.15 0.01 285.823);
	        --ws-muted: oklch(0.45 0.01 285.823);
	        --ws-green: #10b981;
	        --ws-blue: #2563eb;
	        --ws-amber: #d97706;
	        --ws-rose: #e11d48;
	        --ws-violet: #7c3aed;
	        --ws-edge: rgba(15, 23, 42, 0.14);
	        --ws-edge-active: #10b981;
	        --ws-flow-dot: rgba(15, 23, 42, 0.05);
	        background:
	          radial-gradient(circle at 78% 72%, rgba(16,185,129,0.12), transparent 25%),
	          radial-gradient(circle at 12% 18%, rgba(37,99,235,0.08), transparent 25%),
	          var(--ws-canvas);
	      }

	      .ws-page * {
	        box-sizing: border-box;
	      }

        .ws-glass-panel {
          background: rgba(15, 15, 17, 0.82) !important;
          backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.45) !important;
          transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .ws-page.is-light .ws-glass-panel {
          background: rgba(255, 255, 255, 0.72) !important;
          border: 1px solid rgba(0, 0, 0, 0.06) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.08) !important;
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

      .ws-canvas-wrap .react-flow__viewport,
      .ws-canvas-wrap .react-flow__nodes {
        z-index: 2;
      }

      .ws-canvas-wrap .react-flow__node {
        border: 0;
        background: transparent;
        box-shadow: none;
      }

      .ws-canvas-wrap .react-flow__node-workSpace {
        overflow: visible;
        opacity: 1;
        visibility: visible;
        z-index: 3;
      }

      .ws-canvas-wrap .react-flow__node-workSpace.selected {
        z-index: 4;
      }

      .ws-canvas-wrap .react-flow__attribution {
        display: none;
      }

      .ws-canvas-wrap .react-flow__minimap {
        position: absolute !important;
        bottom: 80px !important;
        left: 20px !important;
        margin: 0 !important;
        overflow: hidden;
        border: 1px solid var(--ws-border);
        border-radius: 14px;
        background: rgba(11,14,19,0.5) !important;
        backdrop-filter: blur(10px);
        opacity: 0.62;
        transition: opacity 0.3s ease, background-color 0.3s ease;
      }
      .ws-canvas-wrap .react-flow__minimap:hover {
        opacity: 0.95;
        background: rgba(11,14,19,0.84) !important;
      }

      .ws-canvas-wrap .react-flow__controls {
        position: absolute !important;
        bottom: 20px !important;
        left: 20px !important;
        margin: 0 !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        padding: 4px !important;
        gap: 6px !important;
        border: 1px solid var(--ws-border) !important;
        border-radius: 12px !important;
        background: rgba(24, 28, 37, 0.9) !important;
        backdrop-filter: blur(12px) !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
      }
      .ws-canvas-wrap .react-flow__controls-button {
        width: 30px !important;
        height: 30px !important;
        border: none !important;
        border-radius: 8px !important;
        background: transparent !important;
        color: rgba(255, 255, 255, 0.72) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.2s ease !important;
        cursor: pointer !important;
      }
      .ws-canvas-wrap .react-flow__controls-button:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        color: #fff !important;
        transform: translateY(-1px) !important;
      }
      .ws-canvas-wrap .react-flow__controls-button svg {
        width: 14px !important;
        height: 14px !important;
        fill: currentColor !important;
      }

      .ws-page.is-light .ws-canvas-wrap .react-flow__minimap {
        background: rgba(255, 255, 255, 0.4) !important;
        box-shadow: 0 12px 34px rgba(15,23,42,0.08);
      }
      .ws-page.is-light .ws-canvas-wrap .react-flow__minimap:hover {
        background: rgba(255, 255, 255, 0.86) !important;
      }
      .ws-page.is-light .ws-canvas-wrap .react-flow__controls {
        background: rgba(255, 255, 255, 0.9) !important;
        border: 1px solid rgba(0, 0, 0, 0.06) !important;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08) !important;
      }
      .ws-page.is-light .ws-canvas-wrap .react-flow__controls-button {
        color: rgba(15, 23, 42, 0.65) !important;
        border: none !important;
      }
      .ws-page.is-light .ws-canvas-wrap .react-flow__controls-button:hover {
        background: rgba(15, 23, 42, 0.06) !important;
        color: #000 !important;
      }

      .ws-topbar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 60px;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: transparent;
        backdrop-filter: none;
        border-bottom: none;
        padding: 0 20px;
        pointer-events: auto;
      }
      .ws-page.is-light .ws-topbar {
        background: transparent;
        border-bottom: none;
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
        gap: 12px;
        min-width: 0;
      }

      .ws-back,
      .ws-action,
      .ws-team-pill,
      .ws-cate,
      .ws-dock,
      .ws-floating-panel,
      .ws-add-menu,
      .ws-assistant-ball {
        backdrop-filter: blur(18px);
      }

      .ws-back {
        display: inline-flex;
        width: 36px;
        height: 36px;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--ws-border);
        border-radius: 8px;
        background: transparent;
        color: var(--ws-text);
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
      }
      .ws-back:hover {
        border-color: var(--ws-border-strong);
        background: rgba(255, 255, 255, 0.05);
      }
      .ws-page.is-light .ws-back:hover {
        background: rgba(0, 0, 0, 0.03);
      }

      .ws-project-meta {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 1px;
        border: none;
        background: transparent;
        padding: 0;
        min-width: 0;
      }
      .ws-project-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ws-text);
        font-size: 14px;
        font-weight: 700;
        line-height: 1.2;
      }
      .ws-project-subtitle {
        display: flex;
        gap: 6px;
        color: var(--ws-muted);
        font-size: 11px;
        line-height: 1;
      }

      .ws-cate-strip {
        display: flex;
        align-items: center;
        gap: 4px;
        height: 100%;
        border: none;
        background: transparent;
        padding: 0;
        margin: 0;
        overflow: visible;
      }

      .ws-cate {
        display: inline-flex;
        align-items: center;
        height: 60px;
        gap: 6px;
        border: none;
        border-bottom: 2px solid transparent;
        background: transparent;
        color: var(--ws-muted);
        padding: 0 16px;
        cursor: pointer;
        transition: color 0.2s, border-color 0.2s;
        border-radius: 0;
      }
      .ws-cate:hover {
        color: var(--ws-text);
        background: transparent;
      }
      .ws-cate.is-active {
        color: var(--ws-text);
        border-bottom: 2px solid var(--ws-blue);
        background: transparent;
      }

      .ws-cate-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
        font-weight: 800;
      }

      .ws-cate-count {
        display: inline-flex;
        min-width: 16px;
        height: 16px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
        color: var(--ws-muted);
        font-size: 10px;
        font-weight: 700;
        padding: 0 4px;
      }
      .ws-cate.is-active .ws-cate-count {
        background: rgba(59, 130, 246, 0.15);
        color: var(--ws-blue);
      }
      .ws-page.is-light .ws-cate-count {
        background: rgba(15,23,42,0.06);
      }

      .ws-top-actions {
        justify-content: flex-end;
      }

      .ws-team-pill,
      .ws-action {
        display: inline-flex;
        height: 34px;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px solid var(--ws-border);
        border-radius: 8px;
        background: transparent;
        color: var(--ws-text);
        padding: 0 12px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
      }
      .ws-team-pill {
        cursor: default;
        border-color: transparent;
        color: var(--ws-muted);
      }
      .ws-action:hover {
        border-color: var(--ws-border-strong);
        background: rgba(255, 255, 255, 0.05);
      }
      .ws-page.is-light .ws-action:hover {
        background: rgba(0, 0, 0, 0.03);
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
	        width: 260px;
	        max-height: min(520px, calc(100vh - 72px));
	        border: 1px solid var(--ws-border);
	        border-radius: 16px;
	        background: rgba(24, 28, 37, 0.96);
	        color: var(--ws-text);
	        padding: 12px 14px;
	        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
	        pointer-events: auto;
	        user-select: none;
	        backdrop-filter: blur(16px);
	        display: flex;
	        flex-direction: column;
	        gap: 8px;
	      }

	      .ws-add-menu-head {
	        padding: 4px 6px 8px;
	        border-bottom: 1px solid var(--ws-border);
	      }

	      .ws-add-menu-head strong {
	        font-size: 14px;
	        font-weight: 700;
	        color: var(--ws-text);
	      }

	      .ws-add-menu-body {
	        display: flex;
	        flex-direction: column;
	        gap: 10px;
	        margin-top: 6px;
	        overflow-y: auto;
	        max-height: 420px;
	      }

	      .ws-add-section {
	        display: flex;
	        flex-direction: column;
	        gap: 4px;
	      }

	      .ws-add-section-title {
	        padding: 2px 6px;
	        color: rgba(255, 255, 255, 0.38);
	        font-size: 10px;
	        font-weight: 700;
	        text-transform: uppercase;
	        letter-spacing: 0.05em;
	      }

	      .ws-add-divider {
	        height: 1px;
	        background: var(--ws-border);
	        margin: 4px 6px;
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
	        gap: 12px;
	        border: none;
	        border-radius: 10px;
	        background: transparent;
	        color: var(--ws-text);
	        padding: 6px 8px;
	        cursor: pointer;
	        text-align: left;
	        transition: background 0.15s ease, transform 0.15s ease;
	      }

	      .ws-add-item:hover {
	        background: rgba(255, 255, 255, 0.06);
	        transform: translateY(-1px);
	      }

	      .ws-add-icon {
	        display: inline-flex;
	        width: 32px;
	        height: 32px;
	        flex: 0 0 auto;
	        align-items: center;
	        justify-content: center;
	        border-radius: 8px;
	        transition: background 0.15s ease, color 0.15s ease;
	      }

	      .ws-add-item.is-power .ws-add-icon {
	        background: rgba(139, 92, 246, 0.15);
	        color: #a78bfa;
	      }

	      .ws-add-item.is-agent .ws-add-icon {
	        background: rgba(245, 158, 11, 0.15);
	        color: #fbbf24;
	      }

	      .ws-add-item.is-flow .ws-add-icon {
	        background: rgba(59, 130, 246, 0.15);
	        color: #60a5fa;
	      }

	      .ws-add-item.is-function .ws-add-icon {
	        background: rgba(244, 63, 94, 0.15);
	        color: #fb7185;
	      }

	      .ws-add-label {
	        font-size: 13px;
	        font-weight: 500;
	        overflow: hidden;
	        text-overflow: ellipsis;
	        white-space: nowrap;
	      }

	      .ws-page.is-light .ws-add-menu {
	        background: rgba(255, 255, 255, 0.96);
	        border: 1px solid rgba(0, 0, 0, 0.06);
	        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
	      }

	      .ws-page.is-light .ws-add-item:hover {
	        background: rgba(15, 23, 42, 0.04);
	      }

	      .ws-page.is-light .ws-add-section-title {
	        color: rgba(15, 23, 42, 0.4);
	      }

	      .ws-page.is-light .ws-add-item.is-power .ws-add-icon {
	        background: rgba(139, 92, 246, 0.08);
	        color: #7c3aed;
	      }

	      .ws-page.is-light .ws-add-item.is-agent .ws-add-icon {
	        background: rgba(245, 158, 11, 0.08);
	        color: #d97706;
	      }

	      .ws-page.is-light .ws-add-item.is-flow .ws-add-icon {
	        background: rgba(59, 130, 246, 0.08);
	        color: #2563eb;
	      }

	      .ws-page.is-light .ws-add-item.is-function .ws-add-icon {
	        background: rgba(244, 63, 94, 0.08);
	        color: #e11d48;
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
	        display: flex;
	        width: 24px;
	        height: 24px;
	        align-items: center;
	        justify-content: center;
	        border: 1px solid rgba(35,240,165,0.42);
	        background: rgba(255,255,255,0.96);
	        color: #0f172a;
	        box-shadow: 0 0 12px rgba(35,240,165,0.28);
	        cursor: crosshair;
	        transition: transform 140ms, box-shadow 140ms, border-color 140ms;
	      }

	      .ws-page.is-light .ws-rf-handle {
	        border-color: rgba(16,185,129,0.36);
	        background: rgba(255,255,255,0.98);
	        box-shadow: 0 0 12px rgba(16,185,129,0.22);
	      }

	      .ws-rf-handle:hover {
	        border-color: var(--ws-green);
	        box-shadow: 0 0 18px rgba(35,240,165,0.42);
	        transform: scale(1.08);
	      }

	      .ws-rf-handle span {
	        display: inline-flex;
	        transform: translateY(-1px);
	        color: currentColor;
	        font-size: 16px;
	        font-weight: 900;
	        line-height: 1;
	        pointer-events: none;
	      }

	      .ws-rf-handle.is-in {
	        left: 0px;
	      }

	      .ws-rf-handle.is-out {
	        right: 0px;
	      }

      .ws-loading-screen {
        display: flex;
        align-items: center;
        justify-content: center;
        position: fixed;
        inset: 0;
        z-index: 9999;
      }
      .ws-loading-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 24px;
        background: var(--ws-panel);
        border: 1px solid var(--ws-border);
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
        color: var(--ws-text);
        font-size: 14px;
        font-weight: 500;
        backdrop-filter: blur(16px);
      }
      .ws-loading-card.ws-error-card {
        color: var(--ws-rose);
        border-color: rgba(244, 63, 94, 0.25);
      }
      .ws-page.is-light .ws-loading-card {
        box-shadow: 0 12px 40px rgba(15, 23, 42, 0.06);
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
        .ws-top-actions {
          display: none;
        }
        .ws-cate-strip {
          margin-left: 20px;
        }
      }

      @media (max-width: 760px) {
        .ws-topbar {
          height: auto;
          flex-direction: column;
          padding: 10px;
          gap: 8px;
        }
        .ws-top-left {
          width: 100%;
          justify-content: space-between;
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
          width: min(250px, calc(100vw - 24px));
        }
      }

      /* ==========================================
         NEW HIGH-QUALITY DESIGNS FROM HUABU
         ========================================== */
      .ws-node-agent-wrap {
        position: relative;
        width: 128px;
        height: 128px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ws-node-circle {
        width: 120px;
        height: 120px;
        border-radius: 999px;
        background: var(--ws-panel);
        border: 2px solid var(--ws-border);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-shadow: 0 8px 24px rgba(0,0,0,0.45);
        transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
      }
      .ws-node-agent-wrap.is-selected .ws-node-circle,
      .ws-node-circle:hover {
        border-color: var(--ws-amber);
        box-shadow: 0 0 20px rgba(245,181,68,0.45);
        transform: scale(1.03);
      }
      .ws-node-circle-avatar {
        width: 48px;
        height: 48px;
        border-radius: 999px;
        background: rgba(245,181,68,0.1);
        border: 1px solid rgba(245,181,68,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 4px;
      }
      .ws-node-circle-title {
        font-size: 11px;
        font-weight: 800;
        color: var(--ws-text);
        max-width: 90px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ws-node-circle-status {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 8px;
        color: var(--ws-muted);
        font-weight: 800;
        margin-top: 2px;
      }
      .ws-ping-dot {
        width: 6px;
        height: 6px;
        background: #10b981;
        border-radius: 999px;
        display: inline-block;
        animation: ws-ping 1.5s infinite;
      }
      @keyframes ws-ping {
        0% { transform: scale(0.85); opacity: 0.5; }
        50% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(0.85); opacity: 0.5; }
      }
      .ws-agent-result-card {
        position: absolute;
        top: 132px;
        left: 50%;
        transform: translateX(-50%);
        width: 180px;
        background: var(--ws-panel-strong);
        border: 1px solid var(--ws-border);
        border-radius: 12px;
        padding: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        z-index: 10;
        text-align: left;
      }
      .ws-result-header {
        font-size: 8px;
        color: var(--ws-amber);
        font-weight: 800;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 4px;
      }
      .ws-result-text {
        font-size: 9px;
        color: var(--ws-muted);
        margin: 0;
        line-height: 1.4;
      }

      /* Flow Nodes Hexagon */
      .ws-node-flow-wrap {
        position: relative;
        width: 160px;
        height: 160px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      }
      .ws-node-flow-wrap.is-selected,
      .ws-node-flow-wrap:hover {
        transform: scale(1.03);
      }
      .ws-hexagon-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        color: var(--ws-panel);
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
        transition: filter 0.2s ease, color 0.2s ease;
      }
      .ws-hexagon-svg polygon {
        stroke: var(--ws-border) !important;
        stroke-width: 1.5 !important;
        transition: stroke 0.2s ease, stroke-width 0.2s ease;
      }
      .ws-node-flow-wrap.is-selected .ws-hexagon-svg,
      .ws-node-flow-wrap:hover .ws-hexagon-svg {
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25)) drop-shadow(0 0 15px rgba(90,167,255,0.45));
      }
      .ws-node-flow-wrap.is-selected .ws-hexagon-svg polygon,
      .ws-node-flow-wrap:hover .ws-hexagon-svg polygon {
        stroke: var(--ws-blue) !important;
        stroke-width: 1.5 !important;
      }
      .ws-node-flow-content {
        position: absolute;
        inset: 12%;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 0;
      }
      .ws-node-flow-avatar {
        display: flex;
        width: 40px;
        height: 40px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(59,130,246,0.3);
        border-radius: 999px;
        background: rgba(59,130,246,0.1);
        box-shadow: 0 0 12px rgba(59,130,246,0.1);
      }
      .ws-node-flow-title {
        font-size: 11px;
        font-weight: 800;
        margin-top: 6px;
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ws-node-flow-subtitle {
        font-size: 9px;
        color: var(--ws-muted);
        margin-top: 2px;
      }
      .ws-node-flow-step {
        margin-top: 6px;
        border: 1px solid rgba(59,130,246,0.2);
        border-radius: 6px;
        background: rgba(59,130,246,0.1);
        color: #3b82f6;
        padding: 2px 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 8px;
        font-weight: 900;
      }

      /* Function Nodes Triangle */
      .ws-node-function-wrap {
        position: relative;
        width: 120px;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      }
      .ws-node-function-wrap.is-selected,
      .ws-node-function-wrap:hover {
        transform: scale(1.03);
      }
      .ws-triangle-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        color: var(--ws-panel);
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
        transition: filter 0.2s ease, color 0.2s ease;
      }
      .ws-triangle-svg polygon {
        stroke: var(--ws-border) !important;
        stroke-width: 1.6 !important;
        transition: stroke 0.2s ease, stroke-width 0.2s ease;
      }
      .ws-node-function-wrap.is-selected .ws-triangle-svg,
      .ws-node-function-wrap:hover .ws-triangle-svg {
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25)) drop-shadow(0 0 15px rgba(255,107,138,0.45));
      }
      .ws-node-function-wrap.is-selected .ws-triangle-svg polygon,
      .ws-node-function-wrap:hover .ws-triangle-svg polygon {
        stroke: var(--ws-rose) !important;
        stroke-width: 1.6 !important;
      }
      .ws-node-function-content {
        position: absolute;
        inset: 32% 10% 8%;
        bottom: auto;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .ws-node-function-icon {
        display: flex;
        width: 34px;
        height: 34px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(244,63,94,0.28);
        border-radius: 999px;
        background: rgba(244,63,94,0.1);
        box-shadow: 0 0 15px rgba(244,63,94,0.18);
      }
      .ws-node-function-title {
        font-size: 10px;
        font-weight: 800;
        margin-top: 4px;
      }

      /* Assets Nodes */
      .ws-node-image-wrap,
      .ws-node-video-wrap,
      .ws-node-text-wrap,
      .ws-node-power-wrap {
        position: relative;
        width: 100%;
        height: 100%;
      }
      .ws-node-floating-label {
        position: absolute;
        bottom: calc(100% + 8px);
        left: 0;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
        font-weight: 800;
        color: var(--ws-muted);
        text-transform: uppercase;
        letter-spacing: 0;
      }
      .ws-node-image-container,
      .ws-node-video-container {
        width: 100%;
        height: 100%;
        border-radius: 16px;
        overflow: hidden;
        border: 2px solid transparent;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .ws-node-image-wrap.is-selected .ws-node-image-container,
      .ws-node-image-wrap:hover .ws-node-image-container,
      .ws-node-video-wrap.is-selected .ws-node-video-container,
      .ws-node-video-wrap:hover .ws-node-video-container {
        border-color: var(--ws-green);
        box-shadow: 0 0 20px rgba(35,240,165,0.45);
      }
      .ws-node-image-raw,
      .ws-node-video-raw {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .ws-node-video-play {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ws-node-video-play > div {
        width: 36px;
        height: 36px;
        border-radius: 99px;
        background: rgba(0,0,0,0.6);
        border: 1px solid rgba(255,255,255,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ws-green);
      }

      .ws-node-text-card,
      .ws-node-power-card {
        width: 100%;
        height: 100%;
        background: var(--ws-panel);
        border: 1px solid var(--ws-border);
        border-radius: 16px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-shadow: 0 8px 24px rgba(0,0,0,0.45);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .ws-node-text-card {
        min-height: 140px;
        padding: 16px;
      }
      .ws-node-power-card {
        animation: ws-soft-pulse 2.2s ease-in-out infinite;
      }
      .ws-node-text-wrap.is-selected .ws-node-text-card,
      .ws-node-text-wrap:hover .ws-node-text-card {
        border-color: var(--ws-green);
        box-shadow: 0 0 20px rgba(35,240,165,0.25);
      }
      .ws-node-power-wrap.is-selected .ws-node-power-card,
      .ws-node-power-wrap:hover .ws-node-power-card {
        border-color: var(--ws-violet);
        box-shadow: 0 0 20px rgba(167,139,250,0.25);
      }
      .ws-node-text-content,
      .ws-node-power-desc {
        font-size: 11px;
        line-height: 1.5;
        margin: 0;
        color: var(--ws-text);
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .ws-node-power-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      .ws-node-power-badge {
        font-size: 8px;
        font-weight: 800;
        color: var(--ws-violet);
        background: rgba(167,139,250,0.12);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid rgba(167,139,250,0.25);
      }
      .ws-node-power-status {
        font-size: 8px;
        color: var(--ws-muted);
        font-weight: 800;
      }

      .ws-page {
        --ws-card: rgba(255,255,255,0.95);
        --ws-card-muted: rgba(245,247,250,0.72);
        --ws-card-border: rgba(15,23,42,0.1);
        --ws-toolbar: rgba(255,255,255,0.95);
        --ws-toolbar-text: #27272a;
      }

      .ws-page.is-dark {
        --ws-card: rgba(24,24,27,0.92);
        --ws-card-muted: rgba(255,255,255,0.045);
        --ws-card-border: rgba(255,255,255,0.08);
        --ws-toolbar: rgba(9,9,11,0.82);
        --ws-toolbar-text: rgba(255,255,255,0.9);
      }

      @keyframes ws-dashdraw {
        from { stroke-dashoffset: 0; }
        to { stroke-dashoffset: -20; }
      }

      .ws-canvas-wrap .react-flow__node-workSpace {
        background: transparent !important;
        border: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
      }

      .ws-canvas-wrap .react-flow__node:active {
        cursor: grabbing;
      }

      .ws-canvas-wrap .react-flow__edge-path {
        stroke: var(--ws-edge);
        stroke-width: 1.5px;
      }

      .ws-node-agent-wrap,
      .ws-node-flow-wrap,
      .ws-node-function-wrap,
      .ws-node-image-wrap,
      .ws-node-video-wrap,
      .ws-node-text-wrap,
      .ws-node-power-wrap {
        cursor: grab;
        user-select: none;
      }

      .ws-node-agent-wrap:active,
      .ws-node-flow-wrap:active,
      .ws-node-function-wrap:active,
      .ws-node-image-wrap:active,
      .ws-node-video-wrap:active,
      .ws-node-text-wrap:active,
      .ws-node-power-wrap:active {
        cursor: grabbing;
      }

      @keyframes ws-soft-pulse {
        0%, 100% { box-shadow: 0 10px 28px rgba(0,0,0,0.14); }
        50% { box-shadow: 0 10px 32px rgba(139,92,246,0.16); }
      }

      .ws-canvas-wrap .react-flow__node .ws-rf-handle {
        width: 1px !important;
        height: 1px !important;
        overflow: visible !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        z-index: 50 !important;
      }

      .ws-canvas-wrap .react-flow__node .ws-rf-handle span {
        display: none !important;
      }

      .ws-canvas-wrap .react-flow__node .ws-rf-handle::after {
        position: absolute;
        display: flex;
        width: 24px;
        height: 24px;
        align-items: center;
        justify-content: center;
        border: 2px solid #10b981;
        border-radius: 999px;
        background: #fff;
        color: #18181b;
        font-size: 16px;
        font-weight: 900;
        line-height: 1;
        opacity: 0;
        pointer-events: all;
        box-shadow: 0 4px 10px rgba(0,0,0,0.28);
        transition: opacity 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s ease;
      }

      .ws-canvas-wrap .react-flow__node .ws-rf-handle.is-in::after {
        content: "\\2212";
        left: -32px;
        top: 50%;
        transform: translate(0, -50%) scale(0.82);
      }

      .ws-canvas-wrap .react-flow__node .ws-rf-handle.is-out::after {
        content: "+";
        right: -32px;
        top: 50%;
        transform: translate(0, -50%) scale(0.82);
      }

      .ws-canvas-wrap .react-flow__node:hover .ws-rf-handle::after,
      .ws-canvas-wrap .react-flow__node.selected .ws-rf-handle::after,
      .ws-canvas-wrap .react-flow__node .react-flow__handle-connecting::after,
      .ws-canvas-wrap .react-flow__node .react-flow__handle-valid::after {
        opacity: 0.68;
        transform: translate(0, -50%) scale(1);
      }

      .ws-canvas-wrap .react-flow__node .ws-rf-handle:hover::after {
        opacity: 1;
        transform: translate(0, -50%) scale(1.15);
        border-color: #34d399;
        box-shadow: 0 0 12px rgba(255,255,255,0.65), 0 4px 10px rgba(0,0,0,0.35);
      }

      .ws-node-top-toolbar {
        position: absolute;
        bottom: calc(100% + 16px);
        left: 50%;
        z-index: 40;
        display: flex;
        width: max-content;
        max-width: 900px;
        transform: translateX(-50%);
        align-items: center;
        gap: 10px;
        border: 1px solid var(--ws-card-border);
        border-radius: 999px;
        background: var(--ws-toolbar);
        color: var(--ws-toolbar-text);
        padding: 6px 18px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        backdrop-filter: blur(18px);
        pointer-events: auto;
        animation: ws-toolbar-in 180ms ease-out;
        white-space: nowrap;
      }

      @keyframes ws-toolbar-in {
        from { opacity: 0; transform: translateX(-50%) scale(0.96); }
        to { opacity: 1; transform: translateX(-50%) scale(1); }
      }

      .ws-node-tool-item,
      .ws-node-tool-icons {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .ws-node-tool,
      .ws-node-tool-icons button,
      .ws-node-agent-join {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 0;
        background: transparent;
        color: inherit;
        padding: 0;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
      }

      .ws-node-tool svg,
      .ws-node-tool-icons svg {
        color: rgba(113,113,122,0.86);
      }

      .ws-node-tool.is-green svg,
      .ws-node-agent-join svg {
        color: #10b981;
      }

      .ws-node-tool-divider {
        display: inline-block;
        width: 1px;
        height: 14px;
        background: var(--ws-card-border);
      }

      .ws-node-agent-join {
        border: 1px solid var(--ws-card-border);
        border-radius: 999px;
        background: rgba(113,113,122,0.1);
        padding: 4px 12px;
        font-size: 10px;
      }

      .ws-node-bottom-settings {
        position: absolute;
        top: calc(100% + 16px);
        left: 50%;
        z-index: 50;
        display: flex;
        width: 720px;
        max-width: min(720px, calc(100vw - 48px));
        transform: translateX(-50%);
        flex-direction: column;
        border: 1px solid var(--ws-card-border);
        border-radius: 18px;
        background: var(--ws-toolbar);
        color: var(--ws-toolbar-text);
        padding: 16px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.16);
        backdrop-filter: blur(20px);
        pointer-events: auto;
        animation: ws-settings-in 200ms ease-out;
      }

      @keyframes ws-settings-in {
        from { opacity: 0; transform: translate(-50%, -8px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }

      .ws-node-settings-head {
        display: flex;
        align-items: flex-start;
        gap: 14px;
      }

      .ws-node-settings-icon {
        display: flex;
        width: 56px;
        height: 56px;
        flex-shrink: 0;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--ws-card-border);
        border-radius: 14px;
        background: var(--ws-card-muted);
        color: rgba(113,113,122,0.86);
        font-size: 10px;
        font-weight: 800;
      }

      .ws-node-settings-copy {
        min-width: 0;
        flex: 1;
        text-align: left;
      }

      .ws-node-settings-copy > div {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ws-node-settings-copy strong,
      .ws-node-settings-flow-copy strong {
        overflow: hidden;
        color: var(--ws-toolbar-text);
        font-size: 14px;
        font-weight: 900;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-node-settings-copy span {
        border: 1px solid var(--ws-card-border);
        border-radius: 5px;
        background: var(--ws-card-muted);
        color: var(--ws-muted);
        padding: 2px 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .ws-node-settings-copy p {
        overflow: hidden;
        margin: 4px 0 0;
        color: var(--ws-muted);
        font-size: 12px;
        line-height: 1.5;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-node-settings-line {
        height: 1px;
        margin: 12px 0 10px;
        background: var(--ws-card-border);
      }

      .ws-node-settings-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .ws-node-settings-stack {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .ws-node-settings-stack textarea {
        width: 100%;
        height: 52px;
        resize: none;
        border: 1px solid var(--ws-card-border);
        border-radius: 10px;
        background: var(--ws-card-muted);
        color: var(--ws-toolbar-text);
        padding: 8px 10px;
        font: inherit;
        font-size: 12px;
        line-height: 1.45;
        outline: none;
      }

      .ws-node-settings-actions {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 8px;
        overflow-x: auto;
      }

      .ws-node-setting-button,
      .ws-node-flow-run,
      .ws-node-save-run,
      .ws-node-agent-run {
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
        gap: 6px;
        border: 1px solid var(--ws-card-border);
        border-radius: 9px;
        background: var(--ws-card-muted);
        color: var(--ws-toolbar-text);
        padding: 7px 11px;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: transform 120ms, background 120ms, border-color 120ms;
      }

      .ws-node-setting-button:hover,
      .ws-node-flow-run:hover,
      .ws-node-save-run:hover,
      .ws-node-agent-run:hover {
        transform: translateY(-1px);
        border-color: rgba(16,185,129,0.34);
      }

      .ws-node-setting-button.is-green svg {
        color: #10b981;
      }

      .ws-node-settings-state,
      .ws-node-settings-flow-copy span {
        color: var(--ws-muted);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 10px;
        font-weight: 800;
        white-space: nowrap;
      }

      .ws-node-settings-flow-copy {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 3px;
        text-align: left;
      }

      .ws-node-run-cluster {
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
        gap: 12px;
      }

      .ws-node-run-cluster b {
        color: #10b981;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 14px;
      }

      .ws-node-run-button,
      .ws-node-agent-run {
        border: 0;
        background: #10b981;
        color: #020617;
        box-shadow: 0 12px 24px rgba(16,185,129,0.18);
      }

      .ws-node-run-button {
        display: inline-flex;
        width: 32px;
        height: 32px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        cursor: pointer;
      }

      .ws-node-agent-run {
        background: #f59e0b;
      }

      .ws-node-flow-run {
        border-color: transparent;
        background: #3b82f6;
        color: #020617;
      }

      .ws-node-save-run {
        border-color: transparent;
        background: #10b981;
        color: #020617;
      }

      .ws-canvas-wrap.is-dragging .ws-node-top-toolbar,
      .ws-canvas-wrap.is-dragging .ws-node-bottom-settings {
        display: none;
      }

      .ws-canvas-wrap.is-dragging .ws-node-power-card,
      .ws-canvas-wrap.is-dragging .ws-node-flow-wrap,
      .ws-canvas-wrap.is-dragging .ws-node-circle,
      .ws-canvas-wrap.is-dragging .ws-node-image-container,
      .ws-canvas-wrap.is-dragging .ws-node-video-container,
      .ws-canvas-wrap.is-dragging .ws-node-text-card,
      .ws-canvas-wrap.is-dragging .ws-hexagon-svg,
      .ws-canvas-wrap.is-dragging .ws-triangle-svg {
        animation: none !important;
        transition: none !important;
      }

      /* Color helper classes */
      .ws-icon-green { color: var(--ws-green) !important; }
      .ws-icon-blue { color: var(--ws-blue) !important; }
      .ws-icon-amber { color: var(--ws-amber) !important; }
      .ws-icon-rose { color: var(--ws-rose) !important; }
      .ws-icon-violet { color: var(--ws-violet) !important; }
    `}</style>
  );
}
