import { useEffect, useState } from "react";
import { ArrowLeft, Brain } from "lucide-react";
import { useNavigate } from "@dever/front-plugin";

export function WorkSpacePage() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProjectId(params.get("id") || "1");
  }, []);

  return (
    <div className="hb-space-page">
      <style>{`
        .hb-space-page {
          display: flex;
          min-height: 100vh;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f5f6f8;
          color: #080d1c;
          font-family: ui-sans-serif, system-ui, sans-serif;
          padding: 24px;
        }
        .hb-space-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 560px;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          background: #ffffff;
          padding: 48px 32px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.04);
          text-align: center;
          transition: transform 200ms ease;
        }
        .hb-space-card:hover {
          transform: translateY(-2px);
        }
        .hb-space-glow {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 80px;
          border-radius: 999px;
          background: linear-gradient(135deg, #c8ff21 0%, #12c987 100%);
          filter: blur(24px);
          opacity: 0.35;
        }
        .hb-space-icon-box {
          display: flex;
          width: 64px;
          height: 64px;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: linear-gradient(135deg, #090f22 0%, #1a233d 100%);
          color: #ffffff;
          margin-bottom: 24px;
          box-shadow: 0 8px 24px rgba(9, 15, 34, 0.16);
        }
        .hb-space-card h1 {
          margin: 0 0 12px;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .hb-space-card p {
          margin: 0 0 32px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }
        .hb-space-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 44px;
          padding: 0 24px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 160ms, border-color 160ms, color 160ms, transform 160ms;
        }
        .hb-space-btn:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
          color: #0f172a;
          transform: translateY(-1px);
        }
      `}</style>
      <div className="hb-space-card">
        <div className="hb-space-glow" />
        <div className="hb-space-icon-box">
          <Brain size={28} />
        </div>
        <h1>Hello World</h1>
        <p>欢迎来到您的创作空间！当前作品 ID 是: <strong style={{ color: "#090f22", fontWeight: 800 }}>{projectId}</strong></p>
        <button
          type="button"
          className="hb-space-btn"
          onClick={() => navigate({ to: "/work/home" })}
        >
          <ArrowLeft size={16} />
          返回工作台
        </button>
      </div>
    </div>
  );
}
