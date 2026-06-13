import React from "react";

export function WorkSpaceStyles() {
  return (
    <style>{`
	      .ws-page {
	        --ws-canvas: #f8f9fb;
	        --ws-panel: rgba(255, 255, 255, 0.76);
	        --ws-panel-strong: rgba(255, 255, 255, 0.9);
	        --ws-border: rgba(0, 0, 0, 0.04);
	        --ws-border-strong: rgba(0, 0, 0, 0.08);
	        --ws-text: #1f2937;
	        --ws-muted: #6b7280;
	        --ws-green: #10b981;
	        --ws-blue: #2563eb;
	        --ws-amber: #d97706;
	        --ws-rose: #e11d48;
	        --ws-violet: #7c3aed;
	        --ws-edge: rgba(0, 0, 0, 0.08);
	        --ws-edge-active: #10b981;
	        --ws-edge-selected: #111827;
	        --ws-flow-dot: rgba(0, 0, 0, 0.04);
	        position: fixed;
	        inset: 0;
	        min-width: 100vw;
	        min-height: 100vh;
	        overflow: hidden;
	        background:
	          radial-gradient(circle at 78% 72%, rgba(16,185,129,0.02), transparent 30%),
	          radial-gradient(circle at 12% 18%, rgba(37,99,235,0.02), transparent 30%),
	          var(--ws-canvas);
	        color: var(--ws-text);
	        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
	        letter-spacing: -0.01em;
	        -webkit-font-smoothing: antialiased;
	        -moz-osx-font-smoothing: grayscale;
	      }

	      .ws-page.is-light {
	        --ws-canvas: #f8f9fb;
	        --ws-panel: rgba(255, 255, 255, 0.76);
	        --ws-panel-strong: rgba(255, 255, 255, 0.9);
	        --ws-border: rgba(0, 0, 0, 0.04);
	        --ws-border-strong: rgba(0, 0, 0, 0.08);
	        --ws-text: #1f2937;
	        --ws-muted: #6b7280;
	        --ws-green: #10b981;
	        --ws-blue: #2563eb;
	        --ws-amber: #d97706;
	        --ws-rose: #e11d48;
	        --ws-violet: #7c3aed;
	        --ws-edge: rgba(0, 0, 0, 0.08);
	        --ws-edge-active: #10b981;
	        --ws-edge-selected: #111827;
	        --ws-flow-dot: rgba(0, 0, 0, 0.04);
	        background:
	          radial-gradient(circle at 78% 72%, rgba(16,185,129,0.02), transparent 30%),
	          radial-gradient(circle at 12% 18%, rgba(37,99,235,0.02), transparent 30%),
	          var(--ws-canvas);
	      }

	      .ws-page.is-dark {
	        --ws-canvas: #0b0c0f;
	        --ws-panel: rgba(20, 22, 26, 0.72);
	        --ws-panel-strong: rgba(16, 18, 21, 0.88);
	        --ws-border: rgba(255, 255, 255, 0.06);
	        --ws-border-strong: rgba(255, 255, 255, 0.12);
	        --ws-text: #f3f4f6;
	        --ws-muted: #9ca3af;
	        --ws-green: #10b981;
	        --ws-blue: #2563eb;
	        --ws-amber: #d97706;
	        --ws-rose: #e11d48;
	        --ws-violet: #7c3aed;
	        --ws-edge: rgba(255, 255, 255, 0.08);
	        --ws-edge-active: #10b981;
	        --ws-edge-selected: #f3f4f6;
	        --ws-flow-dot: rgba(255, 255, 255, 0.03);
	        background:
	          radial-gradient(circle at 78% 72%, rgba(16,185,129,0.04), transparent 30%),
	          radial-gradient(circle at 12% 18%, rgba(37,99,235,0.04), transparent 30%),
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

      .ws-canvas-wrap.is-passive {
        pointer-events: none;
      }

      .ws-canvas-wrap.is-interactive {
        pointer-events: auto;
      }

      .ws-canvas-wrap.is-result-mode .react-flow__node:not(.ws-flow-node-asset),
      .ws-canvas-wrap.is-result-mode .react-flow__edge {
        opacity: 0.18;
      }

      .ws-canvas-wrap.is-result-mode .react-flow__node.ws-flow-node-asset {
        opacity: 1;
        filter: drop-shadow(0 16px 34px rgba(16, 185, 129, 0.12));
      }

      .ws-canvas-wrap .react-flow {
        direction: ltr;
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        background: transparent;
      }

      .ws-canvas-wrap .react-flow__container {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      .ws-canvas-wrap .react-flow__viewport {
        transform-origin: 0 0;
        z-index: 2;
        pointer-events: none;
      }

      .ws-canvas-wrap .react-flow__renderer {
        z-index: 4;
      }

      .ws-canvas-wrap .react-flow__pane {
        z-index: 1;
        touch-action: none;
      }

      .ws-canvas-wrap .react-flow__pane.draggable {
        cursor: grab;
      }

      .ws-canvas-wrap .react-flow__pane.dragging {
        cursor: grabbing;
      }

      .ws-canvas-wrap .react-flow__nodes {
        pointer-events: none;
        transform-origin: 0 0;
        z-index: 2;
      }

      .ws-canvas-wrap .react-flow__node {
        position: absolute;
        transform-origin: 0 0;
        box-sizing: border-box;
        cursor: default;
        user-select: none;
        pointer-events: all;
      }

      .ws-canvas-wrap .react-flow__edges {
        position: absolute;
      }

      .ws-canvas-wrap .react-flow__edges svg {
        position: absolute;
        overflow: visible;
        pointer-events: none;
      }

      .ws-canvas-wrap .react-flow__edge {
        pointer-events: visibleStroke;
      }

      .ws-canvas-wrap .react-flow__edge-path,
      .ws-canvas-wrap .react-flow__connection-path {
        fill: none;
      }

      .ws-canvas-wrap .react-flow__connection {
        z-index: 3;
        pointer-events: none;
      }

      .ws-canvas-wrap .react-flow__connection-path {
        stroke: var(--ws-green);
        stroke-width: 2.5px;
        stroke-linecap: round;
        stroke-dasharray: 8 6;
        filter: drop-shadow(0 0 8px rgba(35, 240, 165, 0.45));
        animation: ws-dashdraw 0.6s linear infinite;
      }

      .ws-canvas-wrap .react-flow__edge.animated path {
        stroke-dasharray: 5;
        animation: ws-dashdraw 0.5s linear infinite;
      }

      .ws-canvas-wrap .react-flow__handle {
        position: absolute;
        pointer-events: all;
      }

      .ws-canvas-wrap .react-flow__handle.connectingfrom,
      .ws-canvas-wrap .react-flow__handle.connectionindicator {
        pointer-events: all;
      }

      .ws-canvas-wrap .react-flow__handle-bottom {
        top: auto;
        left: 50%;
        bottom: 0;
        transform: translate(-50%, 50%);
      }

      .ws-canvas-wrap .react-flow__handle-top {
        top: 0;
        left: 50%;
        transform: translate(-50%, -50%);
      }

      .ws-canvas-wrap .react-flow__handle-left {
        top: 50%;
        left: 0;
        transform: translate(-50%, -50%);
      }

      .ws-canvas-wrap .react-flow__handle-right {
        top: 50%;
        right: 0;
        transform: translate(50%, -50%);
      }

      .ws-canvas-wrap .react-flow__panel {
        position: absolute;
        z-index: 5;
        margin: 15px;
      }

      .ws-canvas-wrap .react-flow__panel.top {
        top: 0;
      }

      .ws-canvas-wrap .react-flow__panel.bottom {
        bottom: 0;
      }

      .ws-canvas-wrap .react-flow__panel.left {
        left: 0;
      }

      .ws-canvas-wrap .react-flow__panel.right {
        right: 0;
      }

      .ws-canvas-wrap .react-flow__edgelabel-renderer,
      .ws-canvas-wrap .react-flow__viewport-portal {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        user-select: none;
      }

      .ws-canvas-wrap .react-flow__minimap-svg {
        display: block;
      }

      .ws-edge-delete {
        position: absolute;
        z-index: 9;
        display: inline-flex;
        width: 34px;
        height: 34px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(148, 163, 184, 0.38);
        border-radius: 999px;
        background: rgba(17, 24, 39, 0.9);
        color: #fff;
        cursor: pointer;
        pointer-events: all;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22);
        backdrop-filter: blur(12px);
        transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
      }

      .ws-edge-delete:hover {
        background: #111827;
        border-color: rgba(255, 255, 255, 0.28);
      }

      .ws-page.is-light .ws-edge-delete {
        background: rgba(255, 255, 255, 0.96);
        color: #111827;
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

      .ws-view-controls {
        position: absolute;
        left: 20px;
        bottom: 20px;
        z-index: 28;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        background: rgba(24, 28, 37, 0.9);
        padding: 6px;
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.24);
        backdrop-filter: blur(14px);
      }

      .ws-page.is-light .ws-view-controls {
        border-color: rgba(15, 23, 42, 0.08);
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
      }

      .ws-view-controls button {
        display: inline-flex;
        width: 32px;
        height: 32px;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: rgba(255, 255, 255, 0.68);
        cursor: pointer;
        transition: background 120ms ease, color 120ms ease, transform 120ms ease;
      }

      .ws-page.is-light .ws-view-controls button {
        color: rgba(15, 23, 42, 0.62);
      }

      .ws-view-controls button:hover,
      .ws-view-controls button.is-active {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        transform: translateY(-1px);
      }

      .ws-page.is-light .ws-view-controls button:hover,
      .ws-page.is-light .ws-view-controls button.is-active {
        background: rgba(15, 23, 42, 0.07);
        color: #0f172a;
      }

      .ws-view-controls button.is-active {
        color: var(--ws-green);
      }

      .ws-view-zoom {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: 2px;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        padding-left: 8px;
      }

      .ws-page.is-light .ws-view-zoom {
        border-left-color: rgba(15, 23, 42, 0.08);
      }

      .ws-view-zoom input {
        width: 96px;
        accent-color: var(--ws-green);
        cursor: pointer;
      }

      .ws-topbar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 64px;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: transparent;
        padding: 0 24px;
        pointer-events: none;
      }

      .ws-top-actions,
      .ws-cate-strip,
      .ws-project-head {
        pointer-events: auto;
      }

      .ws-project-head {
        display: flex;
        min-width: 180px;
        align-items: center;
        gap: 10px;
      }

      .ws-back-button {
        display: inline-flex;
        width: 38px;
        height: 38px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--ws-border);
        border-radius: 12px;
        background: var(--ws-panel);
        color: var(--ws-text);
        cursor: pointer;
        backdrop-filter: blur(12px);
        transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
      }

      .ws-back-button:hover {
        border-color: var(--ws-border-strong);
        background: var(--ws-panel-strong);
        transform: translateY(-1px);
      }

      .ws-project-copy {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 2px;
      }

      .ws-project-copy strong,
      .ws-project-copy span {
        max-width: 168px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-project-copy strong {
        color: var(--ws-text);
        font-size: 15px;
        font-weight: 720;
      }

      .ws-project-copy span {
        color: var(--ws-muted);
        font-size: 12px;
        font-weight: 560;
      }

      .ws-cate-strip {
        position: absolute;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        width: min(640px, calc(100vw - 560px));
        min-width: 260px;
        height: 36px;
        border: 1px solid var(--ws-border);
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.52);
        padding: 2px;
        overflow: hidden;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
        backdrop-filter: blur(18px);
      }

      .ws-page.is-dark .ws-cate-strip {
        background: rgba(255, 255, 255, 0.03);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.26);
      }

      .ws-cate-indicator {
        position: absolute;
        left: 2px;
        top: 2px;
        z-index: 0;
        width: calc((100% - 4px) / var(--ws-cate-total, 1));
        height: calc(100% - 4px);
        border-radius: 9999px;
        background: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        transform: translateX(calc(var(--ws-cate-active, 0) * 100%));
        transition: transform 300ms cubic-bezier(0.25, 1, 0.5, 1);
      }

      .ws-page.is-dark .ws-cate-indicator {
        background: rgba(255, 255, 255, 0.08);
        box-shadow: none;
      }

      .ws-cate {
        position: relative;
        z-index: 1;
        display: inline-flex;
        width: calc((100% - 4px) / var(--ws-cate-total, 1));
        height: 32px;
        flex: 0 0 calc((100% - 4px) / var(--ws-cate-total, 1));
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 9999px;
        background: transparent;
        color: var(--ws-muted);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: color 200ms ease;
        min-width: 0;
      }

      .ws-cate:hover,
      .ws-cate.is-active {
        color: var(--ws-text);
      }

      .ws-cate-name {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-top-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
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
        border-radius: 9999px;
        background: var(--ws-panel);
        backdrop-filter: blur(12px);
        color: var(--ws-text);
        padding: 0 16px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.01);
        transition: background-color 0.2s, border-color 0.2s, color 0.2s;
      }
      .ws-team-pill {
        cursor: default;
        background: transparent;
        border-color: transparent;
        color: var(--ws-muted);
        box-shadow: none;
      }

      .ws-action:hover {
        border-color: var(--ws-border-strong);
        background: rgba(0, 0, 0, 0.01);
      }
      .ws-page.is-dark .ws-action:hover {
        background: rgba(255, 255, 255, 0.04);
      }

      .ws-dock {
        position: absolute;
        left: 28px;
        top: 50%;
        z-index: 22;
        display: flex;
        width: 76px;
        transform: translateY(-50%);
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        border: 1px solid var(--ws-border);
        border-radius: 24px;
        background: var(--ws-panel);
        padding: 10px;
        box-shadow: 0 18px 56px rgba(15, 23, 42, 0.1);
        backdrop-filter: blur(24px);
        pointer-events: auto;
      }

      .ws-dock-button {
        display: flex;
        width: 100%;
        min-height: 58px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        border: 0;
        border-radius: 18px;
        background: transparent;
        color: var(--ws-muted);
        cursor: pointer;
        font-size: 12px;
        font-weight: 680;
        transition: background 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
      }

      .ws-dock-button:hover {
        color: var(--ws-text);
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-1px);
      }

      .ws-page.is-light .ws-dock-button:hover {
        background: rgba(15, 23, 42, 0.05);
      }

      .ws-dock-button.is-active {
        color: var(--ws-text);
        background: var(--ws-panel-strong);
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
      }

      .ws-page.is-dark .ws-dock-button.is-active {
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32);
      }

      .ws-workspace-overlay {
        position: absolute;
        inset: 72px 24px 24px 112px;
        z-index: 23;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        pointer-events: auto;
      }

      .ws-asset-editor-shell {
        position: relative;
        display: grid;
        width: min(100%, 1200px);
        height: 100%;
        overflow: hidden;
        border: 1px solid var(--ws-border);
        border-radius: 16px;
        background: var(--ws-panel);
        backdrop-filter: blur(24px);
        box-shadow: var(--ws-shadow);
        color: var(--ws-text);
        transition: background-color 0.3s ease, border-color 0.3s ease;
      }

      .ws-workspace-close,
      .ws-chat-close {
        position: absolute;
        right: 14px;
        top: 14px;
        z-index: 4;
        display: inline-flex;
        width: 34px;
        height: 34px;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--ws-border);
        border-radius: 999px;
        background: var(--ws-panel-strong);
        color: var(--ws-text);
        cursor: pointer;
        backdrop-filter: blur(12px);
        transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
      }

      .ws-workspace-close:hover,
      .ws-chat-close:hover {
        border-color: var(--ws-border-strong);
        transform: translateY(-1px);
      }

      .ws-asset-editor-shell.has-list {
        grid-template-columns: 260px minmax(0, 1fr);
      }

      .ws-asset-editor-shell.is-single {
        width: min(100%, 900px);
      }

      .ws-asset-editor-shell.is-viewer {
        width: min(100%, 1180px);
      }

      .ws-node-asset-detail-shell {
        width: min(1180px, calc(100vw - 64px));
        height: min(760px, calc(100vh - 64px));
      }

      .ws-node-asset-detail-shell .ws-workspace-overlay {
        position: static;
        width: 100%;
        height: 100%;
        padding: 0;
        background: transparent;
      }

      .ws-node-asset-detail-shell .ws-asset-editor-shell {
        width: 100%;
        height: 100%;
      }

      .ws-asset-list-pane {
        display: flex;
        min-width: 0;
        flex-direction: column;
        border-right: 1px solid var(--ws-border);
        background: rgba(0, 0, 0, 0.01);
        padding: 20px 12px;
      }

      .ws-asset-tree-pane {
        padding: 18px 10px;
      }
      .ws-page.is-dark .ws-asset-list-pane {
        background: rgba(255, 255, 255, 0.005);
      }

      .ws-asset-list-title {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 0 12px 16px;
        color: var(--ws-text);
      }

      .ws-asset-list-title strong {
        font-size: 14px;
        font-weight: 780;
      }

      .ws-asset-list-title span {
        color: var(--ws-muted);
        font-size: 11px;
        font-weight: 700;
      }

      .ws-asset-list {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: 4px;
        overflow-y: auto;
      }

      .ws-asset-list-item {
        display: flex;
        min-height: 48px;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        gap: 2px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--ws-muted);
        padding: 8px 12px;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .ws-asset-list-item:hover {
        background: rgba(0, 0, 0, 0.02);
        color: var(--ws-text);
      }
      .ws-page.is-dark .ws-asset-list-item:hover {
        background: rgba(255, 255, 255, 0.03);
      }

      .ws-asset-list-item.is-active {
        background: rgba(0, 0, 0, 0.04) !important;
        color: var(--ws-text) !important;
      }
      .ws-page.is-dark .ws-asset-list-item.is-active {
        background: rgba(255, 255, 255, 0.08) !important;
      }

      .ws-asset-list-item span {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        font-weight: 500;
      }

      .ws-asset-list-item small,
      .ws-asset-list-empty {
        color: var(--ws-muted);
        font-size: 10px;
        opacity: 0.8;
      }

      .ws-asset-list-empty {
        padding: 12px;
      }

      .ws-asset-tree {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        padding: 0 2px 10px;
      }

      .ws-asset-tree .ws-tree-head {
        cursor: default;
      }

      .ws-asset-tree .ws-tree-head.is-open {
        border-color: transparent;
        background: transparent;
        color: var(--ws-muted);
      }

      .ws-asset-tree .ws-tree-head small {
        color: var(--ws-muted);
        font-size: 10px;
        font-weight: 760;
      }

      .ws-asset-tree .ws-tree-list {
        padding-left: 24px;
      }

      .ws-asset-tree .ws-tree-asset {
        display: flex;
        width: 100%;
        min-height: 40px;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        gap: 2px;
        cursor: pointer;
      }

      .ws-asset-tree .ws-tree-asset.is-active {
        background: rgba(16, 185, 129, 0.1);
        color: var(--ws-text);
      }

      .ws-asset-tree .ws-tree-asset span,
      .ws-asset-tree .ws-tree-asset small {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-asset-tree .ws-tree-asset small {
        color: var(--ws-muted);
        font-size: 10px;
      }

      .ws-asset-editor {
        display: flex;
        min-width: 0;
        min-height: 0;
        flex-direction: column;
        background: transparent;
        align-items: center;
        overflow-y: auto;
      }

      .ws-asset-editor-head {
        display: flex;
        height: 58px;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        border-bottom: 1px solid var(--ws-border);
        padding: 0 28px;
        flex-shrink: 0;
      }

      .ws-asset-editor-head > div {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 8px;
      }

      .ws-asset-editor-head span {
        color: var(--ws-muted);
        font-size: 13px;
      }

      .ws-asset-editor-head strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ws-text);
        font-size: 14px;
        font-weight: 600;
      }

      .ws-asset-editor-actions {
        flex-shrink: 0;
      }

      .ws-asset-editor-actions button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid var(--ws-border);
        border-radius: 999px;
        background: var(--ws-panel-strong);
        color: var(--ws-text);
        padding: 7px 11px;
        font-size: 12px;
        font-weight: 760;
        cursor: pointer;
      }

      .ws-asset-editor-actions button:disabled {
        cursor: default;
        opacity: 0.72;
      }

      .ws-asset-editor-body {
        width: 100%;
        min-height: 0;
        flex: 1;
        overflow-y: auto;
      }

      .ws-asset-editor textarea {
        width: min(100%, 800px);
        margin: 40px auto;
        min-height: 600px;
        flex: 1;
        resize: none;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--ws-text);
        padding: 24px;
        font-family: Georgia, "Nimbus Roman No9 L", "Songti SC", "STSong", serif;
        font-size: 16px;
        line-height: 1.8;
      }

      .ws-asset-rich-detail,
      .ws-asset-energon-detail {
        width: min(100%, 820px);
        margin: 36px auto;
        padding: 24px 28px;
        color: var(--ws-text);
        font-size: 16px;
        line-height: 1.8;
      }

      .ws-asset-media-detail {
        display: flex;
        min-height: 100%;
        align-items: center;
        justify-content: center;
        padding: 36px;
      }

      .ws-asset-media-detail img,
      .ws-asset-media-detail video {
        max-width: min(100%, 900px);
        max-height: 620px;
        border-radius: 14px;
        object-fit: contain;
        box-shadow: 0 16px 42px rgba(15, 23, 42, 0.14);
      }

      .ws-asset-file-detail,
      .ws-asset-empty-detail {
        display: flex;
        min-height: 100%;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: var(--ws-muted);
        padding: 40px;
        text-align: center;
      }

      .ws-asset-file-detail strong {
        color: var(--ws-text);
        font-size: 16px;
      }

      .ws-asset-file-detail span {
        max-width: 680px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-asset-file-detail a {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        border-radius: 999px;
        background: #101827;
        color: white;
        padding: 9px 14px;
        text-decoration: none;
        font-size: 12px;
        font-weight: 780;
      }

      .ws-communication-workspace {
        inset: auto 28px 108px auto;
        width: min(520px, calc(100vw - 56px));
        height: min(620px, calc(100vh - 148px));
        align-items: stretch;
        justify-content: stretch;
        padding: 0;
      }

      .ws-chat-stage {
        position: relative;
        display: grid;
        width: 100%;
        min-height: 0;
        height: 100%;
        grid-template-rows: minmax(0, 1fr) auto;
        gap: 18px;
        overflow: hidden;
        border: 1px solid var(--ws-border);
        border-radius: 22px;
        background: var(--ws-panel-strong);
        color: #111827;
        padding: 20px;
        box-shadow: 0 24px 76px rgba(15, 23, 42, 0.18);
        backdrop-filter: blur(24px);
      }

      .ws-page.is-dark .ws-chat-stage {
        color: #f8fafc;
        box-shadow: 0 24px 86px rgba(0, 0, 0, 0.42);
      }

      .ws-chat-thread {
        display: flex;
        min-height: 0;
        flex-direction: column;
        gap: 28px;
        overflow-y: auto;
        padding: 24px 0;
      }

      .ws-chat-message {
        display: flex;
        max-width: 68%;
        gap: 12px;
        color: inherit;
      }

      .ws-chat-message.is-user {
        align-self: flex-end;
        border-radius: 16px;
        background: rgba(125,196,255,0.28);
        padding: 12px 16px;
      }

      .ws-chat-avatar {
        display: inline-flex;
        width: 34px;
        height: 34px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.08);
        font-size: 11px;
        font-weight: 850;
      }

      .ws-page.is-dark .ws-chat-avatar {
        background: rgba(255,255,255,0.12);
      }

      .ws-chat-message p {
        margin: 8px 0 0;
        line-height: 1.65;
      }

      .ws-chat-composer {
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 22px;
        background: rgba(255,255,255,0.92);
        padding: 18px 20px;
        box-shadow: 0 18px 52px rgba(15,23,42,0.12);
      }

      .ws-page.is-dark .ws-chat-composer {
        border-color: rgba(255, 255, 255, 0.08);
        background: rgba(248, 250, 252, 0.92);
      }

      .ws-chat-composer textarea {
        width: 100%;
        min-height: 72px;
        resize: none;
        border: 0;
        outline: none;
        background: transparent;
        color: #111827;
        font: inherit;
        font-size: 14px;
        line-height: 1.6;
      }

      .ws-chat-composer-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .ws-chat-composer-actions button {
        display: inline-flex;
        min-width: 42px;
        height: 38px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(15,23,42,0.08);
        border-radius: 12px;
        background: #fff;
        color: #111827;
        cursor: pointer;
        font-weight: 760;
      }

      .ws-chat-composer-actions .is-send {
        margin-left: auto;
        width: 42px;
        border-radius: 999px;
        background: #c9d2dd;
        color: #fff;
      }

      .ws-assistant-ball {
        position: absolute;
        right: 36px;
        bottom: 34px;
        z-index: 30;
        display: inline-flex;
        width: 64px;
        height: 64px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(16, 185, 129, 0.34);
        border-radius: 22px;
        background: #34f5ae;
        color: #07111f;
        cursor: pointer;
        box-shadow: 0 18px 46px rgba(16,185,129,0.36);
        transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
      }

      .ws-assistant-ball:hover,
      .ws-assistant-ball.is-open {
        transform: translateY(-2px);
        background: #54ffc0;
        box-shadow: 0 22px 54px rgba(16,185,129,0.44);
      }

      .ws-page.is-dark .ws-assistant-ball {
        color: #06130f;
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

      .ws-asset-tree-pane .ws-asset-tree {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        padding: 0 2px 10px;
      }

      .ws-asset-tree-pane .ws-tree-list {
        padding-left: 24px;
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
	        width: min(292px, calc(100vw - 28px));
	        max-height: min(520px, calc(100vh - 76px));
	        border: 1px solid var(--ws-border);
	        border-radius: 18px;
	        background: rgba(24, 28, 37, 0.96);
	        color: var(--ws-text);
	        padding: 14px;
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
	        min-height: 0;
	        flex: 1;
	        flex-direction: column;
	        gap: 10px;
	        margin-top: 6px;
	        overflow-y: auto;
	        padding-right: 2px;
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
	        gap: 10px;
	        border: none;
	        border-radius: 10px;
	        background: transparent;
	        color: var(--ws-text);
	        padding: 6px 7px;
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
	        width: 30px;
	        height: 30px;
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

	      .ws-add-item.is-import .ws-add-icon {
	        background: rgba(244, 63, 94, 0.15);
	        color: #fb7185;
	      }

	      .ws-add-copy {
	        display: flex;
	        min-width: 0;
	        flex: 1;
	        flex-direction: column;
	        gap: 2px;
	      }

	      .ws-add-label {
	        font-size: 13px;
	        font-weight: 500;
	        overflow: hidden;
	        text-overflow: ellipsis;
	        white-space: nowrap;
	      }

	      .ws-add-desc {
	        display: -webkit-box;
	        overflow: hidden;
	        color: rgba(255, 255, 255, 0.36);
	        font-size: 11px;
	        font-weight: 600;
	        line-height: 1.25;
	        -webkit-box-orient: vertical;
	        -webkit-line-clamp: 1;
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

	      .ws-page.is-light .ws-add-item.is-import .ws-add-icon {
	        background: rgba(244, 63, 94, 0.08);
	        color: #e11d48;
	      }

	      .ws-page.is-light .ws-add-desc {
	        color: rgba(15, 23, 42, 0.44);
	      }

      .ws-import-composer-host {
        position: fixed;
        left: -9999px;
        top: -9999px;
        width: 1px;
        height: 1px;
        overflow: hidden;
        pointer-events: none;
      }

      .ws-import-composer-host .ws-prompt-composer {
        display: none;
      }

      .ws-node-action-backdrop {
        position: fixed;
        inset: 0;
        z-index: 70;
        pointer-events: auto;
      }

      .ws-node-action-menu {
        position: fixed;
        z-index: 71;
        width: 138px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        background: rgba(24, 24, 27, 0.96);
        color: rgba(255, 255, 255, 0.92);
        padding: 6px;
        box-shadow: 0 22px 50px rgba(0, 0, 0, 0.38);
        backdrop-filter: blur(16px);
      }

      .ws-node-action-menu button {
        display: flex;
        width: 100%;
        align-items: center;
        gap: 10px;
        border: 0;
        border-radius: 9px;
        background: transparent;
        color: inherit;
        padding: 11px 10px;
        text-align: left;
        font-size: 14px;
        font-weight: 780;
        cursor: pointer;
      }

      .ws-node-action-menu button + button {
        margin-top: 2px;
      }

      .ws-node-action-menu button:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .ws-node-action-menu button.is-danger {
        color: #fca5a5;
      }

      .ws-page.is-light .ws-node-action-menu {
        border-color: rgba(15, 23, 42, 0.1);
        background: rgba(255, 255, 255, 0.96);
        color: #111827;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.14);
      }

      .ws-page.is-light .ws-node-action-menu button:hover {
        background: rgba(15, 23, 42, 0.055);
      }

      .ws-page.is-light .ws-node-action-menu button.is-danger {
        color: #e11d48;
      }

      .ws-node-detail-backdrop {
        position: fixed;
        inset: 0;
        z-index: 90;
        display: flex;
        flex-direction: column;
        background: #f8fafc;
        color: #111827;
        font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif;
      }

      .ws-node-detail-modal {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: 46px minmax(0, 1fr);
        min-height: 0;
        flex: 1;
      }

      .ws-node-detail-modal.has-version-sidebar {
        grid-template-columns: minmax(0, 1fr) 340px;
        grid-template-rows: 46px minmax(0, 1fr);
      }

      .ws-node-detail-head {
        display: flex;
        min-height: 46px;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(255, 255, 255, 0.86);
        padding: 0 14px;
      }

      .ws-node-detail-modal .ws-node-detail-head,
      .ws-node-detail-modal.has-version-sidebar .ws-node-detail-head {
        grid-column: 1 / -1;
      }

      .ws-node-detail-title {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 9px;
        overflow: hidden;
      }

      .ws-node-detail-title strong {
        overflow: hidden;
        min-width: 0;
        max-width: min(900px, 62vw);
        color: #111827;
        font-size: 13px;
        font-weight: 880;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-node-detail-title span {
        color: #64748b;
        font-size: 11px;
        font-weight: 720;
        white-space: nowrap;
      }

      .ws-node-detail-title em {
        color: #64748b;
        font-size: 11px;
        font-style: normal;
        font-weight: 760;
        white-space: nowrap;
      }

      .ws-node-detail-title em.is-typing {
        color: #f59e0b;
      }

      .ws-node-detail-title em.is-saving {
        color: #3b82f6;
      }

      .ws-node-detail-title em.is-error {
        color: #e11d48;
      }

      .ws-node-detail-title em.is-saved {
        color: rgba(100, 116, 139, 0.92);
      }

      .ws-node-detail-actions {
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
        gap: 8px;
      }

      .ws-node-detail-head button,
      .ws-node-detail-actions a {
        display: inline-flex;
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.76);
        color: #111827;
        cursor: pointer;
        text-decoration: none;
      }

      .ws-node-detail-body {
        display: flex;
        min-height: 0;
        grid-column: 1;
        grid-row: 2;
        align-items: stretch;
        justify-content: stretch;
        overflow: hidden;
        padding: 0;
      }

      .ws-node-detail-modal.has-version-sidebar .ws-node-detail-body {
        grid-column: 1;
        grid-row: 2;
        padding: 0;
      }

      .ws-node-detail-body.is-media-detail {
        align-items: center;
        justify-content: center;
        padding: 30px;
      }

      .ws-node-detail-body img,
      .ws-node-detail-body video {
        max-width: min(920px, calc(100vw - 120px));
        max-height: calc(100vh - 142px);
        border-radius: 4px;
        object-fit: contain;
      }

      .ws-node-detail-body audio {
        width: min(520px, calc(100vw - 96px));
      }

      .ws-node-detail-file {
        display: flex;
        width: min(460px, calc(100vw - 96px));
        min-height: 260px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.05);
        padding: 26px;
        text-align: center;
      }

      .ws-node-detail-file strong,
      .ws-node-detail-file span {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-node-detail-file span {
        color: rgba(255, 255, 255, 0.46);
        font-size: 12px;
      }

      .ws-node-detail-file a {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.92);
        padding: 9px 12px;
        text-decoration: none;
        font-size: 13px;
        font-weight: 780;
      }

      .ws-node-detail-body pre {
        width: min(860px, calc(100vw - 96px));
        max-height: calc(100vh - 142px);
        overflow: auto;
        margin: 0;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.88);
        padding: 22px;
        white-space: pre-wrap;
        word-break: break-word;
        font: 13px/1.65 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }

      .ws-node-detail-editor {
        display: flex;
        width: 100%;
        min-width: 0;
        min-height: 0;
        max-height: none;
        flex-direction: column;
        overflow: hidden;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: #0f172a;
        padding: 0;
        box-shadow: none;
      }

      .ws-node-detail-modal.has-version-sidebar .ws-node-detail-editor {
        width: 100%;
      }

      .ws-node-detail-side {
        grid-column: 2;
        grid-row: 2;
        min-height: 0;
        border-left: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(255, 255, 255, 0.72);
        padding: 12px;
        overflow: auto;
      }

      .ws-node-detail-side-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        color: #334155;
        font-size: 12px;
        font-weight: 850;
      }

      .ws-node-detail-side-head strong {
        display: inline-flex;
        min-width: 22px;
        height: 22px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #e5e7eb;
        color: #475569;
        font-size: 12px;
      }

      .ws-node-detail-side-list {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }

      .ws-node-detail-side-list button {
        display: flex;
        width: 100%;
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.88);
        color: #111827;
        cursor: pointer;
        padding: 10px 11px;
        text-align: left;
        transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
      }

      .ws-node-detail-side-list button:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      .ws-node-detail-side-list button.is-active {
        border-color: rgba(16, 185, 129, 0.42);
        background: rgba(209, 250, 229, 0.78);
      }

      .ws-node-detail-side-list button.is-current:not(.is-active) {
        border-color: rgba(244, 63, 94, 0.22);
        background: rgba(244, 63, 94, 0.07);
      }

      .ws-node-detail-side-list button.is-switching {
        cursor: wait;
        opacity: 0.72;
      }

      .ws-node-detail-version-title {
        display: flex;
        width: 100%;
        min-width: 0;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .ws-node-detail-version-title strong {
        overflow: hidden;
        font-size: 13px;
        font-weight: 850;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-node-detail-version-title i {
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 4px;
        border: 1px solid rgba(244, 63, 94, 0.2);
        border-radius: 999px;
        background: rgba(244, 63, 94, 0.08);
        color: #f43f5e;
        padding: 3px 6px;
        font-size: 10px;
        font-style: normal;
        font-weight: 900;
      }

      .ws-node-detail-version-title i svg {
        flex-shrink: 0;
      }

      .ws-node-detail-side-list button em {
        color: #94a3b8;
        font-size: 11px;
        font-style: normal;
        font-weight: 700;
      }

      .ws-node-detail-side-list button small {
        display: -webkit-box;
        overflow: hidden;
        color: #64748b;
        font-size: 12px;
        line-height: 1.42;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }

      .ws-node-detail-rich-editor {
        display: flex;
        flex-direction: column;
        min-height: 0;
        height: 100%;
        border: 0;
        border-radius: 0;
        background: linear-gradient(105deg, #fff8ff 0%, #edf6ff 100%);
        box-shadow: none;
      }

      .ws-node-detail-rich-editor > div:first-of-type {
        min-height: 28px;
        gap: 3px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        background: rgba(255, 255, 255, 0.7);
        padding: 2px 8px;
        backdrop-filter: blur(12px);
      }

      .ws-node-detail-rich-editor button {
        height: 22px;
        min-width: 22px;
        padding: 0 6px;
        border-radius: 6px;
      }

      .ws-node-detail-rich-editor > div:last-of-type {
        flex: 1;
        max-height: none !important;
        min-height: 0;
        overflow: auto;
      }

      .ws-node-detail-rich-editor > div:last-of-type > div {
        min-height: 0 !important;
        height: auto !important;
        padding: 0 !important;
      }

      .ws-node-detail-rich-editor [contenteditable] {
        min-height: auto !important;
        height: auto !important;
        padding: 18px 24px 72px;
        color: #111827;
        font: 14px/1.75 "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif;
      }

      .ws-node-detail-rich-editor .ProseMirror {
        min-height: 0 !important;
      }

      .ws-node-detail-rich-editor [contenteditable] > *:first-child {
        margin-top: 0;
      }

      .ws-node-detail-rich-editor [contenteditable] > *:last-child {
        margin-bottom: 0;
      }

      .ws-node-detail-rich-editor [contenteditable] h1 {
        margin: 16px 0 12px;
        font-size: 20px;
      }

      .ws-node-detail-rich-editor [contenteditable] h2 {
        margin: 16px 0 10px;
        font-size: 18px;
      }

      .ws-node-detail-rich-editor [contenteditable] h3 {
        margin: 12px 0 8px;
        font-size: 16px;
      }

      .ws-node-detail-rich-editor [contenteditable] :where(h1, h2, h3) {
        color: #0f172a;
        font-weight: 700;
        line-height: 1.4;
      }

      .ws-node-detail-rich-editor [contenteditable] :where(h4, h5) {
        margin: 12px 0 6px;
        color: #0f172a;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.45;
      }

      .ws-node-detail-rich-editor [contenteditable] :where(h6) {
        margin: 12px 0 6px;
        color: #64748b;
        font-size: 12px;
        font-weight: 650;
        line-height: 1.45;
      }

      .ws-node-detail-rich-editor [contenteditable] p {
        margin: 6px 0;
      }

      .ws-node-detail-rich-editor [contenteditable] :where(ul, ol) {
        margin: 12px 0;
        padding-left: 24px;
      }

      .ws-node-detail-rich-editor [contenteditable] ul {
        list-style: disc;
      }

      .ws-node-detail-rich-editor [contenteditable] ol {
        list-style: decimal;
      }

      .ws-node-detail-rich-editor [contenteditable] li {
        margin: 4px 0;
        padding-left: 0;
      }

      .ws-node-detail-rich-editor [contenteditable] blockquote {
        margin: 12px 0;
        border-left: 2px solid rgba(148, 163, 184, 0.5);
        padding-left: 12px;
        color: #64748b;
      }

      .ws-node-detail-rich-editor [contenteditable] hr {
        margin: 16px 0;
        border: 0;
        border-top: 1px solid rgba(148, 163, 184, 0.28);
      }

      .ws-node-detail-rich-editor [contenteditable] img {
        display: block;
        max-width: min(620px, 82%);
        max-height: 440px;
        margin: 20px auto;
        border-radius: 10px;
        object-fit: contain;
      }

      .ws-node-detail-rich-editor [contenteditable] pre {
        overflow: auto;
        max-height: 460px;
        margin: 12px 0;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 8px;
        background: rgba(241, 245, 249, 0.72);
        color: #0f172a;
        padding: 12px;
        white-space: pre-wrap;
        word-break: break-word;
        font: 12px/1.65 "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      }

      .ws-node-detail-rich-editor [contenteditable] pre code {
        display: block;
        background: transparent;
        color: inherit;
        padding: 0;
        font: inherit;
        white-space: inherit;
      }

      .ws-node-detail-rich-editor .hljs-keyword {
        color: #be185d;
      }

      .ws-node-detail-rich-editor .hljs-string {
        color: #b45309;
      }

      .ws-node-detail-rich-editor .hljs-comment,
      .ws-node-detail-rich-editor .hljs-meta {
        color: #64748b;
      }

      .ws-node-detail-rich-editor .hljs-title,
      .ws-node-detail-rich-editor .hljs-built_in,
      .ws-node-detail-rich-editor .hljs-type {
        color: #7c3aed;
      }

      .ws-node-detail-rich-editor .hljs-name,
      .ws-node-detail-rich-editor .hljs-tag,
      .ws-node-detail-rich-editor .hljs-selector-class,
      .ws-node-detail-rich-editor .hljs-selector-id {
        color: #047857;
      }

      .ws-node-detail-rich-editor .hljs-attr,
      .ws-node-detail-rich-editor .hljs-attribute,
      .ws-node-detail-rich-editor .hljs-property {
        color: #0369a1;
      }

      .ws-node-detail-rich-editor .hljs-number,
      .ws-node-detail-rich-editor .hljs-literal {
        color: #4338ca;
      }

      .ws-node-detail-rich-editor .hljs-variable,
      .ws-node-detail-rich-editor .hljs-regexp {
        color: #be123c;
      }

      .ws-node-detail-rich-editor [contenteditable] :not(pre) > code {
        border-radius: 6px;
        background: rgba(226, 232, 240, 0.72);
        color: #0f172a;
        padding: 1px 5px;
        font: 0.92em/1.5 "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      }

      .ws-node-detail-fallback-editor {
        flex: 1;
        min-height: 0;
        border: 0;
        outline: none;
        resize: none;
        background: linear-gradient(110deg, #fff7ff 0%, #edf6ff 100%);
        color: #111827;
        padding: 24px 24px 32px;
        font: 14px/1.75 "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif;
      }

      .ws-node-detail-output {
        min-height: 100%;
        flex: 1;
        overflow: auto;
        border-radius: 0;
        background: transparent;
        color: #111827;
        padding: 22px 20px 54px;
        font: 15px/1.66 "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif;
      }

      .ws-node-detail-empty {
        color: rgba(100, 116, 139, 0.7);
      }

      .ws-page.is-light .ws-node-detail-backdrop {
        background: #f8fafc;
        color: #111827;
      }

      .ws-page.is-light .ws-node-detail-head {
        border-bottom-color: rgba(15, 23, 42, 0.08);
        background: rgba(255, 255, 255, 0.86);
      }

      .ws-page.is-light .ws-node-detail-title strong {
        color: #111827;
      }

      .ws-page.is-light .ws-node-detail-title span {
        color: rgba(71, 85, 105, 0.76);
      }

      .ws-page.is-light .ws-node-detail-title em.is-saved {
        color: rgba(100, 116, 139, 0.9);
      }

      .ws-page.is-light .ws-node-detail-head button,
      .ws-page.is-light .ws-node-detail-actions a {
        border-color: rgba(15, 23, 42, 0.12);
        background: rgba(255, 255, 255, 0.88);
        color: #111827;
      }

      .ws-page.is-light .ws-node-detail-file {
        border-color: rgba(15, 23, 42, 0.1);
        background: rgba(255, 255, 255, 0.72);
      }

      .ws-page.is-light .ws-node-detail-file span {
        color: rgba(71, 85, 105, 0.72);
      }

      .ws-page.is-light .ws-node-detail-file a {
        border-color: rgba(15, 23, 42, 0.12);
        background: rgba(15, 23, 42, 0.04);
        color: #111827;
      }

      .ws-page.is-light .ws-node-detail-side {
        border-left-color: rgba(15, 23, 42, 0.08);
        background: rgba(255, 255, 255, 0.68);
      }

      .ws-page.is-light .ws-node-detail-side-head {
        color: rgba(15, 23, 42, 0.78);
      }

      .ws-page.is-light .ws-node-detail-side-head strong {
        background: rgba(15, 23, 42, 0.06);
        color: rgba(15, 23, 42, 0.74);
      }

      .ws-page.is-light .ws-node-detail-side-list button {
        border-color: rgba(15, 23, 42, 0.08);
        background: rgba(255, 255, 255, 0.72);
        color: #0f172a;
      }

      .ws-page.is-light .ws-node-detail-side-list button.is-active {
        border-color: rgba(16, 185, 129, 0.32);
        background: rgba(209, 250, 229, 0.72);
      }

      .ws-page.is-light .ws-node-detail-side-list button small {
        color: rgba(71, 85, 105, 0.72);
      }

      .ws-page.is-light .ws-node-detail-body pre {
        border-color: rgba(15, 23, 42, 0.1);
        background: rgba(255, 255, 255, 0.78);
        color: #111827;
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
        left: 50%;
        top: 50%;
        z-index: 12;
        display: inline-flex;
        align-items: center;
        gap: 16px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        color: rgba(255,255,255,0.4);
        font-size: 17px;
        line-height: 1;
        font-weight: 760;
        letter-spacing: 0;
	      }

	      .ws-page.is-light .ws-empty-note {
	        color: rgba(15,23,42,0.42);
	      }

      .ws-empty-action {
        display: inline-flex;
        min-height: 42px;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        background: rgba(24, 24, 27, 0.86);
        color: rgba(255,255,255,0.88);
        padding: 0 14px;
        box-shadow: 0 18px 48px rgba(0,0,0,0.32);
        backdrop-filter: blur(16px);
        white-space: nowrap;
      }

      .ws-empty-action svg {
        color: var(--ws-green);
        fill: currentColor;
      }

      .ws-empty-copy {
        white-space: nowrap;
      }

      .ws-page.is-light .ws-empty-action {
        border-color: rgba(15,23,42,0.08);
        background: rgba(255,255,255,0.84);
        color: rgba(15,23,42,0.78);
        box-shadow: 0 18px 46px rgba(15,23,42,0.12);
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
          left: auto;
          right: 16px;
          width: min(520px, calc(100vw - 240px));
          transform: none;
        }
      }

      @media (max-width: 760px) {
        .ws-topbar {
          height: auto;
          flex-direction: column;
          align-items: stretch;
          padding: 10px;
          gap: 8px;
        }
        .ws-project-head {
          min-width: 0;
        }
        .ws-project-copy strong,
        .ws-project-copy span {
          max-width: calc(100vw - 78px);
        }
        .ws-cate-strip {
          position: relative;
          top: auto;
          right: auto;
          left: auto;
          width: 100%;
          min-width: 0;
          transform: none;
        }
        .ws-dock {
          left: 12px;
          width: 68px;
          padding: 8px;
        }
        .ws-dock-button {
          min-height: 52px;
          font-size: 11px;
        }
        .ws-workspace-overlay {
          inset: 118px 10px 12px 86px;
          padding: 0;
          align-items: stretch;
        }
        .ws-asset-editor-shell,
        .ws-asset-editor-shell.is-single,
        .ws-chat-stage {
          width: 100%;
          height: auto;
          min-height: 0;
        }
        .ws-asset-editor-shell.has-list {
          grid-template-columns: 1fr;
        }
        .ws-asset-list-pane {
          max-height: 180px;
          border-right: 0;
          border-bottom: 1px solid rgba(15,23,42,0.08);
        }
        .ws-asset-editor textarea {
          padding: 32px 24px;
          font-size: 16px;
        }
        .ws-communication-workspace {
          inset: auto 12px 88px 12px;
          width: auto;
          height: min(620px, calc(100vh - 128px));
          padding: 0;
        }
        .ws-assistant-ball {
          right: 18px;
          bottom: 18px;
          width: 58px;
          height: 58px;
          border-radius: 20px;
        }
        .ws-flow-feedback-backdrop {
          align-items: stretch;
          padding: 12px;
        }
        .ws-flow-feedback-modal {
          width: 100%;
          max-height: calc(100vh - 24px);
          border-radius: 16px;
        }
        .ws-flow-feedback-head,
        .ws-flow-feedback-body,
        .ws-flow-feedback-foot {
          padding-left: 14px;
          padding-right: 14px;
        }
        .ws-add-menu {
          width: min(324px, calc(100vw - 24px));
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
        position: relative;
        z-index: 1;
        width: 120px;
        height: 120px;
        border-radius: 999px;
        background: var(--ws-panel);
        backdrop-filter: blur(16px);
        border: var(--ws-node-border-size) solid var(--ws-border);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-shadow: var(--ws-node-shadow);
        transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
      }
      .ws-node-agent-wrap.is-selected .ws-node-circle,
      .ws-node-agent-wrap:hover .ws-node-circle {
        border-color: var(--ws-amber);
        box-shadow: var(--ws-node-shadow), 0 0 18px rgba(245, 158, 11, 0.32);
        transform: scale(1.01);
      }
      .ws-node-agent-wrap.is-running .ws-node-circle {
        border-color: transparent;
      }
      .ws-node-circle-avatar {
        width: 44px;
        height: 44px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.02);
        border: 1px solid var(--ws-border);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 6px;
      }
      .ws-page.is-dark .ws-node-circle-avatar {
        background: rgba(255, 255, 255, 0.04);
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
      .ws-agent-result-bubble {
        position: absolute;
        top: 50%;
        left: calc(100% + 12px);
        width: max-content;
        min-width: 168px;
        max-width: 260px;
        min-height: 48px;
        max-height: 112px;
        overflow: visible;
        background: var(--ws-panel-strong);
        border: var(--ws-node-border-size) solid rgba(148, 163, 184, 0.24);
        border-radius: 18px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        box-shadow: 0 18px 46px rgba(15, 23, 42, 0.12);
        z-index: 10;
        text-align: left;
        color: inherit;
        font: inherit;
        appearance: none;
        cursor: pointer;
        transform: translateY(-50%);
        transition:
          transform 0.18s ease,
          box-shadow 0.18s ease,
          border-color 0.18s ease;
      }
      .ws-agent-result-bubble::before {
        content: "";
        position: absolute;
        left: -8px;
        top: 50%;
        width: 16px;
        height: 16px;
        background: var(--ws-panel-strong);
        border-left: var(--ws-node-border-size) solid rgba(148, 163, 184, 0.24);
        border-bottom: var(--ws-node-border-size) solid rgba(148, 163, 184, 0.24);
        transform: translateY(-50%) rotate(45deg);
        border-radius: 0 0 0 4px;
        pointer-events: none;
      }
      .ws-agent-result-bubble:hover {
        transform: translate(2px, -50%);
        border-color: rgba(245, 158, 11, 0.34);
        box-shadow: 0 24px 58px rgba(15, 23, 42, 0.16);
      }
      .ws-node-feedback-beacon {
        position: absolute;
        top: -10px;
        right: -6px;
        z-index: 18;
        width: 32px;
        height: 32px;
        border-radius: 999px;
        border: 1px solid rgba(245, 158, 11, 0.32);
        background: rgba(255, 251, 235, 0.96);
        color: #d97706;
        box-shadow:
          0 12px 28px rgba(146, 64, 14, 0.16),
          0 0 0 5px rgba(245, 158, 11, 0.08);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        appearance: none;
        padding: 0;
      }
      .ws-node-feedback-beacon span {
        position: absolute;
        right: -5px;
        bottom: -4px;
        min-width: 15px;
        height: 15px;
        border-radius: 999px;
        background: var(--ws-text);
        color: var(--ws-panel-strong);
        font-size: 9px;
        font-weight: 800;
        line-height: 15px;
        text-align: center;
      }
      .ws-node-feedback-beacon.is-pending {
        animation: ws-feedback-pulse 1.3s ease-in-out infinite;
      }
      .ws-node-feedback-beacon.is-done {
        opacity: 0.76;
      }
      .ws-node-feedback-beacon:hover {
        transform: translateY(-1px);
        box-shadow:
          0 16px 34px rgba(146, 64, 14, 0.22),
          0 0 0 6px rgba(245, 158, 11, 0.12);
      }
      @keyframes ws-feedback-pulse {
        0%,
        100% {
          transform: translateY(0) scale(1);
        }
        50% {
          transform: translateY(-2px) scale(1.06);
        }
      }
      .ws-result-text {
        position: relative;
        z-index: 1;
        font-size: 11px;
        color: var(--ws-text);
        margin: 0;
        line-height: 1.55;
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
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
        transform: scale(1.01);
      }
      .ws-hexagon-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        color: var(--ws-panel);
        filter: drop-shadow(0 14px 18px rgba(15, 23, 42, 0.18));
        transition: filter 0.2s ease, color 0.2s ease;
      }
      .ws-hexagon-svg polygon {
        stroke: var(--ws-border) !important;
        stroke-width: var(--ws-node-border-size) !important;
        vector-effect: non-scaling-stroke;
        transition: stroke 0.2s ease, stroke-width 0.2s ease;
      }
      .ws-node-flow-wrap.is-selected .ws-hexagon-svg,
      .ws-node-flow-wrap:hover .ws-hexagon-svg {
        filter: drop-shadow(0 14px 18px rgba(15, 23, 42, 0.16)) drop-shadow(0 0 18px rgba(59,130,246,0.36));
      }
      .ws-node-flow-wrap.is-selected .ws-hexagon-svg polygon,
      .ws-node-flow-wrap:hover .ws-hexagon-svg polygon {
        stroke: var(--ws-blue) !important;
        stroke-width: var(--ws-node-border-size) !important;
      }
      .ws-node-flow-wrap.is-running .ws-hexagon-svg {
        filter: drop-shadow(0 14px 18px rgba(15, 23, 42, 0.16)) drop-shadow(0 0 22px rgba(99, 102, 241, 0.34));
      }
      .ws-node-flow-wrap.is-running .ws-hexagon-svg polygon {
        stroke: transparent !important;
      }
      .ws-node-running-border.is-hexagon {
        inset: -2px;
        width: calc(100% + 4px);
        height: calc(100% + 4px);
      }
      .ws-node-running-border.is-hexagon .ws-node-running-track,
      .ws-node-running-border.is-hexagon .ws-node-running-progress {
        stroke-width: 2px;
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
        font-size: 12px;
        font-weight: 800;
        margin-top: 6px;
        max-width: 108px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Function Nodes Command Capsule */
      .ws-node-function-wrap {
        position: relative;
        width: 128px;
        height: 46px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.16s ease;
      }
      .ws-node-function-wrap.is-selected,
      .ws-node-function-wrap:hover {
        transform: translateY(-1px);
      }
      .ws-node-function-wrap.has-result-card {
        width: 100%;
        height: 100%;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 10px;
      }
      .ws-node-function-wrap.has-result-card .ws-node-function-pill {
        width: auto;
        min-width: 128px;
        max-width: 100%;
        align-self: flex-start;
      }
      .ws-node-function-pill {
        position: relative;
        z-index: 2;
        display: flex;
        box-sizing: border-box;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        min-width: 128px;
        height: 38px;
        border: 1px solid rgba(244, 63, 94, 0.22);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.94);
        color: var(--ws-rose);
        padding: 7px 12px 7px 8px;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12), 0 0 20px rgba(244, 63, 94, 0.08);
        backdrop-filter: blur(16px);
        transition:
          border-color 0.16s ease,
          box-shadow 0.16s ease,
          background 0.16s ease,
          transform 0.16s ease;
      }
      .ws-node-function-wrap:hover .ws-node-function-pill,
      .ws-node-function-wrap.is-selected .ws-node-function-pill {
        border-color: rgba(244, 63, 94, 0.55);
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 16px 34px rgba(15, 23, 42, 0.14), 0 0 26px rgba(244, 63, 94, 0.18);
      }
      .ws-node-function-icon {
        display: flex;
        width: 24px;
        height: 24px;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: var(--ws-rose);
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(244, 63, 94, 0.24);
      }
      .ws-node-function-title {
        min-width: 0;
        overflow: hidden;
        color: var(--ws-rose);
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0;
        line-height: 1;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ws-node-function-pill[role="button"] {
        cursor: pointer;
      }
      .ws-node-function-pill[aria-disabled="true"] {
        cursor: wait;
        opacity: 0.76;
      }
      .ws-node-function-wrap.is-running .ws-node-function-pill {
        border-color: rgba(244, 63, 94, 0.68);
        box-shadow: 0 16px 34px rgba(15, 23, 42, 0.14), 0 0 30px rgba(244, 63, 94, 0.28);
      }
      .ws-node-function-result-card {
        position: relative;
        width: 100%;
        min-height: 184px;
        flex: 1;
        overflow: hidden;
        border: var(--ws-node-border-size) solid rgba(148, 163, 184, 0.34);
        border-radius: 16px;
        background: var(--ws-panel);
        box-shadow: var(--ws-node-shadow);
        color: var(--ws-text);
        cursor: pointer;
        appearance: none;
        padding: 18px 20px;
        text-align: left;
        transition:
          border-color 0.2s ease,
          box-shadow 0.2s ease,
          transform 0.2s ease;
      }
      .ws-node-function-wrap.has-result-card:hover .ws-node-function-result-card,
      .ws-node-function-wrap.has-result-card.is-selected .ws-node-function-result-card {
        border-color: var(--ws-green);
        box-shadow: var(--ws-node-shadow), 0 0 22px rgba(16,185,129,0.24);
      }
      .ws-node-function-result-preview {
        font-size: 13px;
        line-height: 1.55;
      }
      .ws-node-function-result-preview :where(p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote) {
        margin-top: 0;
        margin-bottom: 6px;
      }
      .ws-node-function-result-preview :where(h1, h2, h3, h4, h5, h6) {
        font-size: 14px;
        font-weight: 850;
        line-height: 1.35;
      }
      .ws-node-function-result-text {
        display: -webkit-box;
        margin: 0;
        overflow: hidden;
        color: var(--ws-text);
        font-size: 15px;
        line-height: 1.55;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 7;
      }
      .ws-node-function-result-media {
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.04);
      }
      .ws-node-function-result-media img,
      .ws-node-function-result-media video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .ws-node-function-result-media.is-audio {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 14px;
      }
      .ws-node-function-result-media.is-audio audio {
        width: 100%;
      }
      .ws-node-function-result-file {
        display: flex;
        height: 100%;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.04);
        color: var(--ws-muted);
        font-size: 13px;
        font-weight: 800;
      }
      .ws-node-function-result-file span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ws-page:not(.is-light) .ws-node-function-pill {
        border-color: rgba(251, 113, 133, 0.28);
        background: rgba(15, 23, 42, 0.9);
        color: #fecdd3;
      }
      .ws-page:not(.is-light) .ws-node-function-title {
        color: #fecdd3;
      }
      .ws-page:not(.is-light) .ws-node-function-result-card {
        border-color: rgba(148, 163, 184, 0.24);
        background: rgba(15, 23, 42, 0.92);
      }
      .ws-triangle-svg,
      .ws-node-function-content,
      .ws-node-function-run {
        display: none;
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
      .ws-node-quick-view {
        position: absolute;
        top: 50%;
        left: 50%;
        right: auto;
        z-index: 12;
        display: inline-flex;
        width: 28px;
        height: 28px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.88);
        color: #111827;
        cursor: pointer;
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, -50%) scale(0.92);
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.16);
        transition: opacity 0.16s ease, transform 0.16s ease, background 0.16s ease;
        backdrop-filter: blur(10px);
      }
      .ws-node-quick-view:hover {
        background: #fff;
      }
      .ws-node-agent-wrap:hover .ws-node-quick-view,
      .ws-node-flow-wrap:hover .ws-node-quick-view,
      .ws-node-function-wrap:hover .ws-node-quick-view,
      .ws-node-image-wrap:hover .ws-node-quick-view,
      .ws-node-video-wrap:hover .ws-node-quick-view,
      .ws-node-text-wrap:hover .ws-node-quick-view,
      .ws-node-power-wrap:hover .ws-node-quick-view,
      .ws-node:hover .ws-node-quick-view,
      .ws-node-quick-view:focus-visible {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, -50%) scale(1);
      }
      .ws-page:not(.is-light) .ws-node-quick-view {
        border-color: rgba(255, 255, 255, 0.14);
        background: rgba(24, 24, 27, 0.84);
        color: rgba(255, 255, 255, 0.92);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.36);
      }
      .ws-page:not(.is-light) .ws-node-quick-view:hover {
        background: rgba(39, 39, 42, 0.96);
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
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 16px;
        overflow: hidden;
        background: var(--ws-panel);
        border: var(--ws-node-border-size) solid rgba(148, 163, 184, 0.34);
        box-shadow: var(--ws-node-shadow);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .ws-node-image-container::after,
      .ws-node-video-container::after {
        content: "";
        position: absolute;
        inset: 0;
        border: var(--ws-node-border-size) solid rgba(148, 163, 184, 0.34);
        border-radius: inherit;
        pointer-events: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .ws-node-image-wrap.is-selected .ws-node-image-container,
      .ws-node-image-wrap:hover .ws-node-image-container,
      .ws-node-video-wrap.is-selected .ws-node-video-container,
      .ws-node-video-wrap:hover .ws-node-video-container {
        border-color: var(--ws-green);
        box-shadow: var(--ws-node-shadow), 0 0 22px rgba(16,185,129,0.34);
      }
      .ws-node-image-wrap.is-selected .ws-node-image-container::after,
      .ws-node-image-wrap:hover .ws-node-image-container::after,
      .ws-node-video-wrap.is-selected .ws-node-video-container::after,
      .ws-node-video-wrap:hover .ws-node-video-container::after {
        border-color: var(--ws-green);
      }
      .ws-node-image-raw,
      .ws-node-video-raw {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .ws-node-image-empty {
        display: flex;
        width: 100%;
        height: 100%;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: rgba(248, 250, 252, 0.82);
        color: rgba(100, 116, 139, 0.82);
        padding: 16px;
        text-align: center;
        font-size: 12px;
        font-weight: 760;
        line-height: 1.45;
      }
      .ws-node-image-empty span {
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
      }
      .ws-page:not(.is-light) .ws-node-image-empty {
        background: rgba(15, 23, 42, 0.52);
        color: rgba(226, 232, 240, 0.72);
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
        position: relative;
        width: 100%;
        height: 100%;
        background: var(--ws-panel);
        border: var(--ws-node-border-size) solid rgba(148, 163, 184, 0.34);
        border-radius: 16px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
        box-shadow: var(--ws-node-shadow);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .ws-node-text-card {
        min-height: 140px;
        padding: 16px;
      }
      .ws-node-text-media.is-audio,
      .ws-node-text-file {
        display: flex;
        height: 100%;
        min-height: 92px;
        align-items: center;
        justify-content: center;
      }
      .ws-node-text-media.is-audio audio {
        width: 100%;
      }
      .ws-node-text-file {
        gap: 8px;
        color: var(--ws-muted);
        font-size: 13px;
        font-weight: 800;
      }
      .ws-node-text-file span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ws-node-power-card {
        animation: ws-soft-pulse 2.2s ease-in-out infinite;
      }
      .ws-node-text-wrap.is-selected .ws-node-text-card,
      .ws-node-text-wrap:hover .ws-node-text-card {
        border-color: var(--ws-green);
        box-shadow: var(--ws-node-shadow), 0 0 22px rgba(16,185,129,0.24);
      }
      .ws-node-power-wrap.is-selected .ws-node-power-card,
      .ws-node-power-wrap:hover .ws-node-power-card {
        border-color: var(--ws-violet);
        box-shadow: var(--ws-node-shadow), 0 0 22px rgba(124,58,237,0.24);
      }
      .ws-node-power-wrap.is-running .ws-node-power-card {
        border-color: transparent;
        box-shadow: var(--ws-node-shadow), 0 0 26px rgba(99, 102, 241, 0.28);
        animation: none;
      }
      .ws-node-power-wrap.has-content .ws-node-power-card {
        justify-content: flex-start;
        animation: none;
      }
      .ws-node-power-wrap.has-media .ws-node-power-card {
        padding: 0;
      }
      .ws-node-running-border {
        position: absolute;
        inset: -4px;
        z-index: 3;
        width: calc(100% + 8px);
        height: calc(100% + 8px);
        overflow: visible;
        pointer-events: none;
      }
      .ws-node-running-border.is-circle {
        inset: 0;
        z-index: 3;
        width: 100%;
        height: 100%;
      }
      .ws-node-running-border.is-circle .ws-node-running-track,
      .ws-node-running-border.is-circle .ws-node-running-progress {
        stroke-width: var(--ws-node-border-size);
      }
      .ws-node-running-track,
      .ws-node-running-progress {
        fill: transparent;
        vector-effect: non-scaling-stroke;
      }
      .ws-node-running-track {
        stroke: rgba(99, 102, 241, 0.12);
        stroke-width: 5px;
      }
      .ws-node-running-progress {
        stroke: #6366f1;
        stroke-width: 5px;
        stroke-linecap: round;
        filter: drop-shadow(0 0 7px rgba(99, 102, 241, 0.68));
      }
      .ws-node-running-border.is-circle.is-agent .ws-node-running-track {
        stroke: rgba(245, 158, 11, 0.14);
      }
      .ws-node-running-border.is-circle.is-agent .ws-node-running-progress {
        stroke: var(--ws-amber);
        filter: drop-shadow(0 0 7px rgba(245, 158, 11, 0.64));
      }
      .ws-node-running-border.is-spin .ws-node-running-progress {
        animation: ws-node-border-spin 1s linear infinite, ws-node-border-breathe 1.2s ease-in-out infinite;
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

      .ws-node-text-rich-preview {
        width: 100%;
        max-height: 100%;
        overflow: hidden;
        color: var(--ws-text);
        font-size: 11px;
        line-height: 1.55;
      }

      .ws-node-text-energon-preview {
        width: 100%;
        max-height: 100%;
        overflow: hidden;
        color: var(--ws-text);
        font-size: 11px;
        line-height: 1.55;
      }

      .ws-node-text-energon-preview :where(p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote) {
        margin-top: 0;
        margin-bottom: 4px;
      }

      .ws-node-text-energon-preview :where(h1, h2, h3, h4, h5, h6) {
        font-size: 12px;
        font-weight: 850;
        line-height: 1.35;
      }

      .ws-node-text-rich-preview :where(p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote) {
        margin-top: 0;
        margin-bottom: 4px;
      }

      .ws-node-text-rich-preview :where(h1, h2, h3, h4, h5, h6) {
        font-size: 12px;
        font-weight: 850;
        line-height: 1.35;
      }
      .ws-node-power-wrap.has-content .ws-node-power-desc {
        display: block;
        width: 100%;
        -webkit-line-clamp: unset;
        color: var(--ws-text);
        font-size: 12px;
        line-height: 1.55;
        text-align: left;
      }
      .ws-node-power-empty {
        display: flex;
        width: 100%;
        flex-direction: column;
        gap: 10px;
      }
      .ws-node-power-empty span {
        display: block;
        height: 10px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(148, 163, 184, 0.18), rgba(148, 163, 184, 0.38), rgba(148, 163, 184, 0.18));
        background-size: 180% 100%;
        animation: ws-node-empty-shimmer 1.9s ease-in-out infinite;
      }
      .ws-node-power-empty span:nth-child(1) {
        width: 88%;
      }
      .ws-node-power-empty span:nth-child(2) {
        width: 68%;
        animation-delay: 120ms;
      }
      .ws-node-power-empty span:nth-child(3) {
        width: 46%;
        animation-delay: 240ms;
      }
      .ws-node-power-media {
        display: flex;
        width: 100%;
        height: 100%;
        min-height: 0;
        flex-direction: column;
        gap: 0;
      }
      .ws-node-power-media img,
      .ws-node-power-media video {
        width: 100%;
        height: 100%;
        max-height: none;
        border-radius: 14px;
        object-fit: cover;
        background: transparent;
      }
      .ws-node-power-media.is-audio {
        justify-content: center;
        gap: 8px;
        padding: 10px;
      }
      .ws-node-power-media.is-audio audio {
        width: 100%;
        height: 34px;
      }
      .ws-node-power-media.is-audio p {
        position: static;
        background: transparent;
        color: var(--ws-text);
        padding: 0;
      }
      .ws-node-power-media p {
        position: absolute;
        right: 8px;
        bottom: 8px;
        left: 8px;
        margin: 0;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.62);
        color: #fff;
        padding: 4px 7px;
        font-size: 10px;
        line-height: 1.35;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ws-node-power-file {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 8px;
        color: var(--ws-text);
        font-size: 11px;
        font-weight: 750;
      }
      .ws-node-power-file span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @keyframes ws-node-border-spin {
        to { stroke-dashoffset: -100; }
      }
      @keyframes ws-node-border-breathe {
        0%, 100% { opacity: 0.32; }
        48% { opacity: 1; }
      }
      @keyframes ws-node-empty-shimmer {
        0%, 100% { background-position: 100% 0; opacity: 0.68; }
        50% { background-position: 0 0; opacity: 1; }
      }

      .ws-page {
        --ws-card: rgba(255,255,255,0.95);
        --ws-card-muted: rgba(245,247,250,0.72);
        --ws-card-border: rgba(15,23,42,0.1);
        --ws-toolbar: rgba(255,255,255,0.95);
        --ws-toolbar-text: #27272a;
        --ws-node-border-size: 2px;
        --ws-node-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
      }

      .ws-page.is-dark {
        --ws-card: rgba(24,24,27,0.92);
        --ws-card-muted: rgba(255,255,255,0.045);
        --ws-card-border: rgba(255,255,255,0.08);
        --ws-toolbar: rgba(9,9,11,0.82);
        --ws-toolbar-text: rgba(255,255,255,0.9);
        --ws-node-shadow: 0 14px 32px rgba(0, 0, 0, 0.42);
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

      .ws-canvas-wrap .react-flow__node .ws-node-function-wrap.has-result-card .ws-rf-handle.is-in::after {
        left: -20px;
      }

      .ws-canvas-wrap .react-flow__node .ws-node-function-wrap.has-result-card .ws-rf-handle.is-out::after {
        right: -20px;
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
        top: calc(100% + var(--ws-node-overlay-gap, 16px));
        left: 50%;
        z-index: 50;
        display: flex;
        width: 720px;
        max-width: min(720px, calc(100vw - 48px));
        transform: translateX(-50%) scale(var(--ws-node-overlay-scale, 1));
        transform-origin: top center;
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

      .ws-node-bottom-settings.is-composer {
        width: 640px;
        max-width: min(640px, calc(100vw - 48px));
        border-radius: 18px;
        padding: 0;
        background: rgba(255, 255, 255, 0.92);
        color: #111827;
        box-shadow: 0 22px 50px rgba(15, 23, 42, 0.14);
      }

      .ws-page:not(.is-light) .ws-node-bottom-settings.is-composer {
        background: rgba(24, 27, 34, 0.94);
        color: var(--ws-toolbar-text);
      }

      .ws-node-bottom-settings.is-flow-run-only {
        width: auto;
        min-width: 0;
        border-radius: 999px;
        padding: 0;
        border: 0;
        background: transparent;
        box-shadow: none;
        backdrop-filter: none;
      }

      .ws-node-flow-wrap .ws-node-bottom-settings.is-flow-run-only {
        top: 50%;
        z-index: 6;
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, -50%) scale(var(--ws-node-overlay-scale, 1));
        transform-origin: center;
        transition: opacity 140ms ease, transform 140ms ease;
        animation: none;
      }

      .ws-node-flow-wrap:hover .ws-node-bottom-settings.is-flow-run-only,
      .ws-node-flow-wrap.is-selected .ws-node-bottom-settings.is-flow-run-only,
      .ws-node-flow-wrap.is-running .ws-node-bottom-settings.is-flow-run-only {
        opacity: 1;
        pointer-events: auto;
      }

      @keyframes ws-settings-in {
        from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(var(--ws-node-overlay-scale, 1)); }
        to { opacity: 1; transform: translateX(-50%) translateY(0) scale(var(--ws-node-overlay-scale, 1)); }
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

      .ws-node-settings-state.is-function-desc {
        min-width: 0;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
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
        gap: 7px;
        border-color: rgba(37, 99, 235, 0.18);
        background: rgba(255, 255, 255, 0.88);
        color: #1e3a8a;
        padding: 6px 10px 6px 7px;
        border-radius: 999px;
        font-size: 12px;
        letter-spacing: 0;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.13);
        backdrop-filter: blur(14px);
      }

      .ws-node-flow-run svg {
        display: inline-flex;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        background: #2563eb;
        color: #ffffff;
        padding: 5px;
        box-shadow: 0 8px 18px rgba(37, 99, 235, 0.24);
      }

      .ws-node-flow-run:hover {
        border-color: rgba(37, 99, 235, 0.32);
        background: rgba(255, 255, 255, 0.96);
      }

      .ws-node-flow-run span {
        white-space: nowrap;
      }

      .ws-page:not(.is-light) .ws-node-flow-run {
        border-color: rgba(96, 165, 250, 0.28);
        background: rgba(15, 23, 42, 0.9);
        color: #bfdbfe;
      }

      .ws-node-flow-run:disabled {
        cursor: wait;
        opacity: 0.72;
      }

      .ws-confirm-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(15, 23, 42, 0.34);
        backdrop-filter: blur(8px);
      }

      .ws-confirm-card {
        width: min(420px, calc(100vw - 48px));
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.96);
        color: #0f172a;
        box-shadow: 0 30px 90px rgba(15, 23, 42, 0.24);
        padding: 22px;
      }

      .ws-confirm-copy {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .ws-confirm-copy h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 900;
        letter-spacing: 0;
      }

      .ws-confirm-copy p {
        margin: 0;
        color: rgba(71, 85, 105, 0.95);
        font-size: 14px;
        line-height: 1.65;
      }

      .ws-confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 22px;
      }

      .ws-confirm-actions button {
        min-width: 82px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 999px;
        background: rgba(248, 250, 252, 0.95);
        color: #334155;
        padding: 9px 16px;
        font-size: 13px;
        font-weight: 850;
        cursor: pointer;
        transition:
          transform 140ms ease,
          border-color 140ms ease,
          background 140ms ease,
          box-shadow 140ms ease;
      }

      .ws-confirm-actions button:hover {
        transform: translateY(-1px);
        border-color: rgba(15, 23, 42, 0.18);
        background: #ffffff;
      }

      .ws-confirm-actions button.is-primary,
      .ws-confirm-actions button.is-danger {
        border-color: transparent;
        color: #ffffff;
        box-shadow: 0 14px 28px rgba(15, 23, 42, 0.18);
      }

      .ws-confirm-actions button.is-primary {
        background: #0f172a;
      }

      .ws-confirm-actions button.is-danger {
        background: #ef4444;
      }

      .ws-page.is-dark .ws-confirm-card {
        border-color: rgba(148, 163, 184, 0.22);
        background: rgba(15, 23, 42, 0.96);
        color: #f8fafc;
      }

      .ws-page.is-dark .ws-confirm-copy p {
        color: rgba(203, 213, 225, 0.86);
      }

      .ws-node-save-run {
        border-color: transparent;
        background: #10b981;
        color: #020617;
      }

      .ws-flow-feedback-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, 0.42);
        padding: 28px;
        backdrop-filter: blur(10px);
      }

      .ws-flow-feedback-modal {
        display: grid;
        width: min(920px, calc(100vw - 56px));
        max-height: min(760px, calc(100vh - 56px));
        grid-template-rows: auto minmax(0, 1fr) auto;
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.96);
        color: #0f172a;
        box-shadow: 0 32px 90px rgba(15, 23, 42, 0.26);
      }

      .ws-flow-feedback-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        padding: 18px 20px 14px;
      }

      .ws-flow-feedback-head div {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 5px;
      }

      .ws-flow-feedback-head strong {
        color: #0f172a;
        font-size: 17px;
        font-weight: 850;
      }

      .ws-flow-feedback-head span {
        color: #64748b;
        font-size: 13px;
        line-height: 1.5;
      }

      .ws-flow-feedback-tabs {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 14px 20px 0;
      }

      .ws-flow-feedback-tabs button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 999px;
        background: rgba(248, 250, 252, 0.9);
        color: #64748b;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 750;
        white-space: nowrap;
        cursor: pointer;
      }

      .ws-flow-feedback-tabs button span {
        width: 16px;
        height: 16px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.08);
        color: #0f172a;
        font-size: 10px;
        line-height: 16px;
        text-align: center;
      }

      .ws-flow-feedback-tabs button.is-active {
        border-color: rgba(245, 158, 11, 0.42);
        background: rgba(255, 251, 235, 0.95);
        color: #b45309;
      }

      .ws-flow-feedback-close {
        display: inline-flex;
        width: 34px;
        height: 34px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #0f172a;
        cursor: pointer;
      }

      .ws-flow-feedback-close:hover {
        background: rgba(15, 23, 42, 0.06);
      }

      .ws-flow-feedback-body {
        display: grid;
        gap: 14px;
        overflow-y: auto;
        padding: 20px;
      }

      .ws-flow-feedback-field,
      .ws-flow-feedback-switch,
      .ws-flow-feedback-field.is-radio,
      .ws-flow-feedback-field.is-choice {
        display: grid;
        gap: 10px;
        border: 0;
        border-radius: 16px;
        background: rgba(248, 250, 252, 0.92);
        padding: 16px;
      }

      .ws-flow-feedback-field > span,
      .ws-flow-feedback-switch > span,
      .ws-flow-feedback-field legend,
      .ws-flow-feedback-field.is-radio legend {
        color: #0f172a;
        font-size: 14px;
        font-weight: 820;
      }

      .ws-flow-feedback-field i,
      .ws-flow-feedback-switch i {
        margin-left: 5px;
        color: #ef4444;
        font-style: normal;
      }

      .ws-flow-feedback-field input,
      .ws-flow-feedback-field textarea,
      .ws-flow-feedback-field select {
        width: 100%;
        border: 1px solid rgba(148, 163, 184, 0.34);
        border-radius: 12px;
        background: #ffffff;
        color: #0f172a;
        padding: 12px 13px;
        font: inherit;
        font-size: 14px;
        outline: none;
      }

      .ws-flow-feedback-field textarea {
        min-height: 116px;
        resize: vertical;
        line-height: 1.6;
      }

      .ws-flow-feedback-field input:focus,
      .ws-flow-feedback-field textarea:focus,
      .ws-flow-feedback-field select:focus {
        border-color: rgba(59, 130, 246, 0.58);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .ws-flow-feedback-radios {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .ws-flow-feedback-radios label {
        display: inline-flex;
        min-height: 36px;
        align-items: center;
        gap: 0;
        border: 1px solid rgba(148, 163, 184, 0.36);
        border-radius: 999px;
        background: #ffffff;
        color: #334155;
        padding: 8px 14px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 760;
        transition:
          border-color 0.16s ease,
          background 0.16s ease,
          color 0.16s ease,
          box-shadow 0.16s ease;
      }

      .ws-flow-feedback-radios input {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: 0;
        opacity: 0;
        pointer-events: none;
      }

      .ws-flow-feedback-radios label.is-active {
        border-color: rgba(15, 23, 42, 0.78);
        background: #0f172a;
        color: #ffffff;
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
      }

      .ws-flow-feedback-options {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .ws-flow-feedback-options button {
        border: 1px solid rgba(148, 163, 184, 0.34);
        border-radius: 999px;
        background: #ffffff;
        color: #334155;
        padding: 8px 13px;
        font-size: 13px;
        font-weight: 760;
        cursor: pointer;
      }

      .ws-flow-feedback-options button.is-active {
        border-color: rgba(59, 130, 246, 0.46);
        background: #eff6ff;
        color: #1d4ed8;
      }

      .ws-flow-feedback-switch {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .ws-flow-feedback-switch input {
        width: 18px;
        height: 18px;
      }

      .ws-flow-feedback-foot {
        display: flex;
        justify-content: flex-end;
        border-top: 1px solid rgba(148, 163, 184, 0.2);
        padding: 14px 18px;
      }

      .ws-flow-feedback-submit {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 0;
        border-radius: 12px;
        background: #0f172a;
        color: #ffffff;
        padding: 11px 16px;
        font-size: 14px;
        font-weight: 850;
        cursor: pointer;
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
      }

      .ws-flow-feedback-submit:disabled,
      .ws-flow-feedback-close:disabled,
      .ws-flow-feedback-radios label:has(input:disabled),
      .ws-flow-feedback-options button:disabled {
        cursor: wait;
        opacity: 0.64;
      }

      .ws-prompt-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 22px;
        color: var(--ws-muted);
        font-size: 13px;
        font-weight: 700;
      }

      .ws-prompt-composer {
        position: relative;
        display: flex;
        min-height: 92px;
        flex-direction: column;
        gap: 7px;
        border-radius: 18px;
        padding: 10px 12px;
        overflow: visible;
      }

      .ws-prompt-main {
        position: relative;
        z-index: 2;
        display: flex;
        min-width: 0;
        align-items: flex-start;
        gap: 10px;
      }

      .ws-prompt-inline-uploads {
        display: inline-flex;
        max-width: min(260px, 38%);
        flex-shrink: 0;
        align-items: flex-start;
        gap: 6px;
      }

      .ws-prompt-upload-group {
        position: relative;
        display: inline-flex;
        min-width: 0;
        max-width: min(300px, calc(100vw - 160px));
        flex-wrap: nowrap;
        align-items: flex-start;
        padding: 0 8px 8px 0;
        overflow: visible;
        z-index: 2;
      }

      .ws-prompt-upload-group.has-previews {
        width: 84px;
      }

      .ws-prompt-upload-card,
      .ws-prompt-upload-add {
        appearance: none;
        position: relative;
        display: inline-flex;
        width: 48px;
        height: 54px;
        flex-shrink: 0;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        border: 1px solid rgba(203, 213, 225, 0.82);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.92);
        color: #0f172a;
        padding: 0;
        font-size: 11px;
        font-weight: 750;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
        transition: margin 160ms ease, transform 160ms ease, border-color 120ms ease, background 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
      }

      .ws-page:not(.is-light) .ws-prompt-upload-card,
      .ws-page:not(.is-light) .ws-prompt-upload-add {
        background: rgba(15, 23, 42, 0.54);
        color: var(--ws-toolbar-text);
      }

      .ws-prompt-upload-add {
        border-style: dashed;
        color: #64748b;
        cursor: pointer;
      }

      .ws-prompt-upload-card {
        cursor: pointer;
      }

      .ws-prompt-upload-group.has-previews .ws-prompt-upload-card,
      .ws-prompt-upload-group.has-previews .ws-prompt-upload-add {
        margin-left: -22px;
      }

      .ws-prompt-upload-group.has-previews .ws-prompt-upload-card:first-child {
        margin-left: 0;
      }

      .ws-prompt-upload-group.has-previews .ws-prompt-upload-card:nth-child(odd) {
        transform: rotate(-4deg);
      }

      .ws-prompt-upload-group.has-previews .ws-prompt-upload-card:nth-child(even) {
        transform: rotate(4deg);
      }

      .ws-prompt-upload-group.has-previews .ws-prompt-upload-add {
        transform: rotate(3deg);
      }

      .ws-prompt-upload-group.has-previews:hover .ws-prompt-upload-card,
      .ws-prompt-upload-group.has-previews:focus-within .ws-prompt-upload-card,
      .ws-prompt-upload-group.has-previews:hover .ws-prompt-upload-add,
      .ws-prompt-upload-group.has-previews:focus-within .ws-prompt-upload-add {
        margin-left: 6px;
        transform: rotate(0deg) translateY(0);
      }

      .ws-prompt-upload-group.has-previews:hover,
      .ws-prompt-upload-group.has-previews:focus-within {
        z-index: 6;
      }

      .ws-prompt-upload-group.has-previews:hover .ws-prompt-upload-card:first-child,
      .ws-prompt-upload-group.has-previews:focus-within .ws-prompt-upload-card:first-child {
        margin-left: 0;
      }

      .ws-prompt-upload-card:hover,
      .ws-prompt-upload-add:hover {
        border-color: rgba(148, 163, 184, 0.95);
        background: rgba(248, 250, 252, 0.98);
        color: #334155;
        transform: translateY(-1px);
        box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
      }

      .ws-page:not(.is-light) .ws-prompt-upload-add:hover {
        background: rgba(30, 41, 59, 0.9);
        color: #e2e8f0;
      }

      .ws-prompt-upload-thumb {
        position: absolute;
        inset: 3px;
        width: calc(100% - 6px);
        height: calc(100% - 6px);
        border-radius: 8px;
        object-fit: cover;
      }

      .ws-prompt-upload-file {
        display: inline-flex;
        width: 36px;
        height: 36px;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: rgba(15, 23, 42, 0.06);
        color: #64748b;
      }

      .ws-page:not(.is-light) .ws-prompt-upload-file {
        background: rgba(255, 255, 255, 0.08);
      }

      .ws-prompt-upload-name,
      .ws-prompt-upload-add span {
        position: relative;
        z-index: 1;
        max-width: 46px;
        overflow: hidden;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-prompt-upload-card .ws-prompt-upload-name {
        position: absolute;
        right: 5px;
        bottom: 5px;
        left: 5px;
        max-width: none;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.72);
        color: #fff;
        padding: 2px 4px;
        font-size: 10px;
        opacity: 0;
        transform: translateY(3px);
        transition: opacity 120ms ease, transform 120ms ease;
      }

      .ws-prompt-upload-group:hover .ws-prompt-upload-name,
      .ws-prompt-upload-group:focus-within .ws-prompt-upload-name {
        opacity: 1;
        transform: translateY(0);
      }

      .ws-prompt-upload-hover {
        position: absolute;
        left: 50%;
        bottom: calc(100% + 10px);
        z-index: 20;
        display: none;
        width: 190px;
        flex-direction: column;
        gap: 4px;
        border: 1px solid rgba(203, 213, 225, 0.88);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.98);
        color: #0f172a;
        padding: 10px;
        text-align: left;
        transform: translateX(-50%);
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.16);
        backdrop-filter: blur(14px);
      }

      .ws-prompt-upload-hover strong,
      .ws-prompt-upload-hover small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-prompt-upload-hover strong {
        font-size: 12px;
        font-weight: 850;
      }

      .ws-prompt-upload-hover small {
        color: #64748b;
        font-size: 11px;
        font-weight: 650;
      }

      .ws-prompt-upload-card:hover .ws-prompt-upload-hover,
      .ws-prompt-upload-card:focus-visible .ws-prompt-upload-hover {
        display: flex;
      }

      .ws-prompt-upload-remove {
        position: absolute;
        top: -7px;
        right: -7px;
        display: inline-flex;
        width: 18px;
        height: 18px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 999px;
        background: #fff;
        color: #64748b;
        cursor: pointer;
        opacity: 0;
        transform: scale(0.86);
        box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
        transition: opacity 120ms ease, transform 120ms ease;
        z-index: 8;
      }

      .ws-prompt-upload-group:hover .ws-prompt-upload-remove,
      .ws-prompt-upload-group:focus-within .ws-prompt-upload-remove {
        opacity: 1;
        transform: scale(1);
      }

      .ws-prompt-upload-remove:disabled,
      .ws-prompt-upload-add:disabled {
        cursor: not-allowed;
        opacity: 0.58;
        transform: none;
      }

      .ws-asset-picker-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        background: rgba(248, 250, 252, 0.56);
        backdrop-filter: blur(16px);
      }

      .ws-asset-picker {
        display: flex;
        width: min(880px, calc(100vw - 80px));
        max-height: min(680px, calc(100vh - 80px));
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(203, 213, 225, 0.9);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.96);
        color: #0f172a;
        box-shadow: 0 28px 80px rgba(15, 23, 42, 0.2);
      }

      .ws-page:not(.is-light) .ws-asset-picker,
      .ws-page:not(.is-light) .ws-prompt-upload-hover {
        border-color: rgba(255, 255, 255, 0.1);
        background: rgba(24, 27, 34, 0.96);
        color: rgba(255, 255, 255, 0.92);
      }

      .ws-asset-picker-head {
        display: grid;
        grid-template-columns: auto minmax(220px, 1fr) auto;
        align-items: center;
        gap: 14px;
        border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        padding: 14px;
      }

      .ws-asset-picker-tabs {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 1px solid rgba(203, 213, 225, 0.86);
        border-radius: 12px;
        background: rgba(241, 245, 249, 0.75);
        padding: 3px;
      }

      .ws-asset-picker-tabs button,
      .ws-asset-picker-close,
      .ws-asset-kind-row button {
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      .ws-asset-picker-tabs button {
        border-radius: 9px;
        padding: 7px 14px;
        font-size: 13px;
        font-weight: 820;
      }

      .ws-asset-picker-tabs button.is-active {
        background: #fff;
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
      }

      .ws-asset-picker-search {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(203, 213, 225, 0.88);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        color: #64748b;
        padding: 0 12px;
      }

      .ws-asset-picker-search input {
        width: 100%;
        height: 36px;
        min-width: 0;
        border: 0;
        background: transparent;
        color: #0f172a;
        font: inherit;
        font-size: 13px;
        outline: none;
      }

      .ws-asset-picker-close {
        display: inline-flex;
        width: 36px;
        height: 36px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
      }

      .ws-asset-picker-close:hover {
        background: rgba(15, 23, 42, 0.06);
      }

      .ws-asset-kind-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 16px 0;
        color: #64748b;
        font-size: 12px;
        font-weight: 760;
      }

      .ws-asset-role-tabs {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-left: auto;
        border: 1px solid rgba(203, 213, 225, 0.8);
        border-radius: 999px;
        background: rgba(241, 245, 249, 0.7);
        padding: 3px;
      }

      .ws-asset-role-tabs button {
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #64748b;
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 820;
        cursor: pointer;
      }

      .ws-asset-role-tabs button.is-active {
        background: #fff;
        color: #0f172a;
        box-shadow: 0 5px 12px rgba(15, 23, 42, 0.08);
      }

      .ws-page:not(.is-light) .ws-asset-role-tabs {
        border-color: rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.06);
      }

      .ws-page:not(.is-light) .ws-asset-role-tabs button {
        color: rgba(255, 255, 255, 0.62);
      }

      .ws-page:not(.is-light) .ws-asset-role-tabs button.is-active {
        background: rgba(255, 255, 255, 0.14);
        color: rgba(255, 255, 255, 0.92);
      }

      .ws-asset-kind-row > button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.06);
        padding: 7px 10px;
        font-size: 12px;
        font-weight: 800;
      }

      .ws-asset-kind-row > button:disabled {
        cursor: default;
        opacity: 0.62;
      }

      .ws-asset-picker-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
        overflow: auto;
        padding: 14px 16px 18px;
      }

      .ws-asset-picker-error {
        grid-column: 1 / -1;
        border: 1px solid rgba(244, 63, 94, 0.22);
        border-radius: 12px;
        background: rgba(244, 63, 94, 0.08);
        color: #e11d48;
        padding: 10px 12px;
        font-size: 12px;
        font-weight: 760;
      }

      .ws-asset-picker-card {
        display: flex;
        min-height: 178px;
        flex-direction: column;
        gap: 8px;
        border: 1px solid rgba(203, 213, 225, 0.72);
        border-radius: 16px;
        background: rgba(248, 250, 252, 0.78);
        color: inherit;
        padding: 9px;
        text-align: left;
        cursor: pointer;
        transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
      }

      .ws-asset-picker-card:hover {
        transform: translateY(-2px);
        border-color: rgba(99, 102, 241, 0.48);
        background: #fff;
        box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
      }

      .ws-asset-picker-card img,
      .ws-asset-picker-card video,
      .ws-asset-picker-card i {
        display: flex;
        width: 100%;
        aspect-ratio: 1.18;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.06);
        color: #64748b;
        object-fit: cover;
      }

      .ws-asset-picker-card span,
      .ws-asset-picker-card small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-asset-picker-card span {
        font-size: 13px;
        font-weight: 850;
      }

      .ws-asset-picker-card small {
        color: #64748b;
        font-size: 11px;
        font-weight: 740;
      }

      .ws-asset-picker-empty {
        grid-column: 1 / -1;
        display: flex;
        min-height: 220px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #94a3b8;
        font-size: 13px;
        font-weight: 760;
      }

      .ws-asset-picker-foot {
        border-top: 1px solid rgba(15, 23, 42, 0.08);
        color: #64748b;
        padding: 10px 16px;
        font-size: 12px;
        font-weight: 760;
      }

      .ws-upload-preview-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 74px;
        background: rgba(248, 250, 252, 0.62);
        backdrop-filter: blur(18px);
      }

      .ws-upload-preview-shell {
        position: relative;
        display: flex;
        max-width: min(680px, calc(100vw - 148px));
        max-height: min(760px, calc(100vh - 96px));
        flex-direction: column;
        gap: 14px;
      }

      .ws-upload-preview-title {
        display: flex;
        max-width: 520px;
        flex-direction: column;
        gap: 4px;
        color: #0f172a;
      }

      .ws-upload-preview-title span {
        color: #64748b;
        font-size: 13px;
        font-weight: 750;
      }

      .ws-upload-preview-title strong {
        overflow: hidden;
        font-size: 18px;
        font-weight: 850;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-upload-preview-body {
        display: flex;
        min-width: 320px;
        min-height: 280px;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
      }

      .ws-upload-preview-body img {
        display: block;
        max-width: 100%;
        max-height: min(680px, calc(100vh - 178px));
        border-radius: 20px;
        object-fit: contain;
      }

      .ws-upload-preview-file {
        display: flex;
        width: min(420px, calc(100vw - 180px));
        min-height: 280px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: #0f172a;
        padding: 34px;
      }

      .ws-upload-preview-text {
        display: flex;
        width: min(520px, calc(100vw - 180px));
        max-height: min(520px, calc(100vh - 180px));
        flex-direction: column;
        gap: 14px;
        overflow: auto;
        color: #0f172a;
        padding: 30px;
      }

      .ws-upload-preview-text svg {
        color: #64748b;
      }

      .ws-upload-preview-text p {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 14px;
        line-height: 1.7;
      }

      .ws-upload-preview-file svg {
        color: #64748b;
      }

      .ws-upload-preview-file span {
        max-width: 100%;
        overflow: hidden;
        font-size: 16px;
        font-weight: 850;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-upload-preview-file small {
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
      }

      .ws-upload-preview-actions {
        position: absolute;
        top: 0;
        left: calc(100% + 14px);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .ws-upload-preview-actions button,
      .ws-upload-preview-actions a {
        display: inline-flex;
        width: 48px;
        height: 48px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(203, 213, 225, 0.88);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        color: #0f172a;
        cursor: pointer;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
        transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
      }

      .ws-upload-preview-actions button:hover,
      .ws-upload-preview-actions a:hover {
        transform: translateY(-1px);
        border-color: rgba(148, 163, 184, 0.95);
        background: #fff;
      }

      @media (max-width: 760px) {
        .ws-upload-preview-backdrop {
          padding: 24px;
        }

        .ws-upload-preview-shell {
          max-width: calc(100vw - 48px);
          max-height: calc(100vh - 48px);
        }

        .ws-upload-preview-actions {
          top: auto;
          bottom: 12px;
          left: 50%;
          flex-direction: row;
          transform: translateX(-50%);
        }
      }

      .ws-prompt-editor-shell {
        position: relative;
        display: flex;
        min-width: 0;
        flex: 1;
        overflow: hidden;
        border-radius: 12px;
      }

      .ws-prompt-composer.is-running .ws-prompt-editor-shell::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
        transform: translateX(-100%);
        animation: ws-prompt-loading-sweep 1.4s ease-in-out infinite;
      }

      .ws-prompt-composer.is-running .ws-prompt-editor {
        opacity: 0.7;
      }

      .ws-prompt-editor {
        flex: 1;
        min-width: 0;
        width: 100%;
        min-height: 40px;
        resize: none;
        border: 0;
        background: transparent;
        color: inherit;
        padding: 6px 2px 4px;
        font: inherit;
        font-size: 14px;
        line-height: 1.5;
        outline: none;
      }

      .ws-prompt-editor::placeholder {
        color: rgba(100, 116, 139, 0.86);
      }

      .ws-page:not(.is-light) .ws-prompt-editor::placeholder {
        color: rgba(148, 163, 184, 0.72);
      }

      .ws-prompt-toolbar {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .ws-prompt-tools {
        display: flex;
        min-width: 0;
        flex: 1;
        align-items: center;
        gap: 6px;
        overflow: visible;
      }

      .ws-prompt-tool-wrap {
        position: relative;
        display: inline-flex;
        min-width: 0;
        flex-shrink: 0;
        align-items: center;
      }

      .ws-prompt-tool-wrap.is-open::before {
        content: "";
        position: absolute;
        left: 0;
        bottom: 100%;
        z-index: 79;
        width: max(100%, 238px);
        height: 14px;
        pointer-events: auto;
      }

      .ws-prompt-tool {
        display: inline-flex;
        max-width: 190px;
        height: 32px;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 1px solid transparent;
        border-radius: 9px;
        background: transparent;
        color: #0f172a;
        padding: 0 6px;
        font-size: 13px;
        font-weight: 750;
        cursor: pointer;
        transition: background 120ms ease, color 120ms ease, opacity 120ms ease;
      }

      .ws-page:not(.is-light) .ws-prompt-tool {
        background: transparent;
        color: var(--ws-toolbar-text);
      }

      .ws-prompt-tool:hover,
      .ws-prompt-tool.is-open,
      .ws-prompt-tool.is-filled {
        border-color: transparent;
        background: rgba(15, 23, 42, 0.045);
      }

      .ws-page:not(.is-light) .ws-prompt-tool:hover,
      .ws-page:not(.is-light) .ws-prompt-tool.is-open,
      .ws-page:not(.is-light) .ws-prompt-tool.is-filled {
        background: rgba(255, 255, 255, 0.08);
      }

      .ws-prompt-tool span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ws-prompt-popover {
        position: absolute;
        bottom: calc(100% + 10px);
        left: 0;
        z-index: 80;
        width: 238px;
        max-width: min(238px, calc(100vw - 64px));
        border: 1px solid rgba(203, 213, 225, 0.78);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.98);
        padding: 7px;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
        backdrop-filter: blur(18px);
      }

      .ws-page:not(.is-light) .ws-prompt-popover {
        background: rgba(17, 24, 39, 0.96);
      }

      .ws-prompt-menu-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .ws-prompt-menu-item {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: inherit;
        padding: 10px 9px;
        text-align: left;
        font-size: 13px;
        font-weight: 750;
        cursor: pointer;
      }

      .ws-prompt-menu-item:hover,
      .ws-prompt-menu-item.is-active {
        background: rgba(241, 245, 249, 0.96);
      }

      .ws-page:not(.is-light) .ws-prompt-menu-item:hover,
      .ws-page:not(.is-light) .ws-prompt-menu-item.is-active {
        background: rgba(255, 255, 255, 0.08);
      }

      .ws-prompt-param-input,
      .ws-prompt-param-textarea {
        width: 100%;
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 9px;
        background: rgba(248, 250, 252, 0.94);
        color: #0f172a;
        padding: 9px 10px;
        font: inherit;
        font-size: 13px;
        outline: none;
      }

      .ws-prompt-param-textarea {
        min-height: 88px;
        resize: vertical;
      }

      .ws-page:not(.is-light) .ws-prompt-param-input,
      .ws-page:not(.is-light) .ws-prompt-param-textarea {
        background: rgba(15, 23, 42, 0.72);
        color: var(--ws-toolbar-text);
      }

      .ws-prompt-switch {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        border: 0;
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.06);
        color: inherit;
        padding: 10px;
        font-size: 13px;
        font-weight: 750;
        cursor: pointer;
      }

      .ws-prompt-switch i {
        position: relative;
        width: 42px;
        height: 24px;
        border-radius: 999px;
        background: rgba(100, 116, 139, 0.26);
        transition: background 140ms ease;
      }

      .ws-prompt-switch i::after {
        content: "";
        position: absolute;
        top: 3px;
        left: 3px;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #fff;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.22);
        transition: transform 140ms ease;
      }

      .ws-prompt-switch.is-on i {
        background: #111827;
      }

      .ws-prompt-switch.is-on i::after {
        transform: translateX(18px);
      }

      .ws-prompt-submit-group {
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
        gap: 8px;
      }

      .ws-prompt-submit {
        display: inline-flex;
        width: 36px;
        height: 36px;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: #111827;
        color: #fff;
        cursor: pointer;
        box-shadow: 0 14px 30px rgba(17, 24, 39, 0.22);
        transition: transform 120ms ease, opacity 120ms ease, background 120ms ease;
      }

      .ws-prompt-submit:hover {
        background: #020617;
        transform: translateY(-1px);
      }

      .ws-prompt-tool:disabled,
      .ws-prompt-submit:disabled {
        cursor: not-allowed;
        opacity: 0.6;
        transform: none;
      }

      @keyframes ws-prompt-loading-sweep {
        to { transform: translateX(100%); }
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
