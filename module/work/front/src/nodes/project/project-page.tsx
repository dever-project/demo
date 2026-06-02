import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowUp,
  Bot,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Loader2,
  MoreVertical,
  Plus,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { joinSiteApi, request } from "@dever/front-plugin";

type ProjectItem = {
  id: number;
  body_id?: number;
  team_id?: number;
  release_id?: number;
  name: string;
  description?: string;
  cover?: string;
  created_at?: string;
  updated_at?: string;
  team?: {
    id?: number;
    name?: string;
    version?: number;
  };
};

type TeamItem = {
  id: number;
  name: string;
  description?: string;
  release_id?: number;
  version?: number;
  can_create?: boolean;
};

type CreateProjectPayload = {
  name: string;
  teamID: number;
  releaseID?: number;
};

const coverGradients = [
  "linear-gradient(135deg, #dbeafe 0%, #eef2ff 46%, #f8fafc 100%)",
  "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 46%, #f8fafc 100%)",
  "linear-gradient(135deg, #fef3c7 0%, #fff7ed 46%, #f8fafc 100%)",
  "linear-gradient(135deg, #fce7f3 0%, #fdf2f8 46%, #f8fafc 100%)",
];

export function WorkProjectPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const availableTeams = useMemo(
    () => teams.filter((team) => team.id > 0 && team.can_create !== false),
    [teams],
  );

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [projectResult, teamResult] = await Promise.all([
        request(joinSiteApi("project/list")),
        request(joinSiteApi("project/team_list")),
      ]);

      if (projectResult.code !== 0) {
        toast.error(projectResult.message || "加载项目失败");
      } else {
        setProjects(toProjectItems(projectResult.data?.items));
      }

      if (teamResult.code !== 0) {
        toast.error(teamResult.message || "加载团队失败");
      } else {
        setTeams(toTeamItems(teamResult.data?.items));
      }
    } catch {
      toast.error("加载工作台失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  function openCreateModal(initialName = "") {
    setPrompt(initialName);
    setModalOpen(true);
  }

  return (
    <div className="hb-project-page">
      <WorkProjectStyles />

      <section className="hb-hero" aria-label="项目助手">
        <h1 className="hb-hero-title">说吧，今天让我帮你搞定什么？</h1>

        <div className="hb-prompt-card">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="可以向我提问或布置设计任务，输入 @ 使用 skill"
            className="hb-prompt-input"
          />

          <div className="hb-prompt-toolbar">
            <div className="hb-tool-group">
              <button type="button" className="hb-chip is-strong">
                <Bot size={14} />
                Agent
              </button>
              <button
                type="button"
                className="hb-icon-chip"
                onClick={() => openCreateModal(prompt)}
                aria-label="新建项目"
              >
                <Plus size={16} />
              </button>
              <button type="button" className="hb-icon-chip" aria-label="图片">
                <ImageIcon size={14} />
              </button>
              <button type="button" className="hb-icon-chip" aria-label="视频">
                <Video size={14} />
              </button>
              <button type="button" className="hb-icon-chip" aria-label="文本">
                <FileText size={14} />
              </button>
            </div>

            <div className="hb-tool-group">
              <button type="button" className="hb-model-chip">
                <Sparkles size={13} />
                旗舰模型
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                className="hb-send"
                onClick={() => openCreateModal(prompt)}
                aria-label="创建项目"
              >
                <ArrowUp size={17} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="hb-workbench" aria-label="项目工作台">
        <div className="hb-section-head">
          <h2>最近项目</h2>
          <button type="button" className="hb-link-button">
            全部项目
            <ChevronRight size={14} />
          </button>
        </div>

        {loading ? (
          <ProjectLoading />
        ) : projects.length > 0 ? (
          <ProjectGrid projects={projects} onCreate={() => openCreateModal()} />
        ) : (
          <ProjectEmpty onCreate={() => openCreateModal()} />
        )}
      </section>

      {modalOpen ? (
        <CreateProjectModal
          initialName={prompt}
          teams={availableTeams}
          onClose={() => setModalOpen(false)}
          onCreated={async () => {
            setModalOpen(false);
            setPrompt("");
            await loadWorkspace();
          }}
        />
      ) : null}
    </div>
  );
}

function ProjectGrid({
  projects,
  onCreate,
}: {
  projects: ProjectItem[];
  onCreate: () => void;
}) {
  return (
    <div className="hb-project-grid">
      <CreateProjectCard onCreate={onCreate} />

      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}
    </div>
  );
}

function CreateProjectCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button type="button" className="hb-create-card" onClick={onCreate}>
      <div className="hb-create-plus">
        <Plus size={26} />
      </div>
      <span>新建项目</span>
    </button>
  );
}

function ProjectCard({
  project,
  index,
}: {
  project: ProjectItem;
  index: number;
}) {
  return (
    <button
      type="button"
      className="hb-project-card"
      onClick={() => toast.info("项目工作台稍后开放")}
    >
      <div
        className="hb-project-cover"
        style={getProjectCoverStyle(project, index)}
      >
        {project.cover ? null : <DocumentMark />}
        <span className="hb-card-badge">Workflow</span>
      </div>

      <div className="hb-project-meta">
        <div className="hb-project-title-row">
          <h3>{project.name || "未命名项目"}</h3>
          <MoreVertical size={15} />
        </div>
        <time>{formatTime(project.updated_at || project.created_at)}</time>
      </div>
    </button>
  );
}

function DocumentMark() {
  return (
    <div className="hb-document-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <b>✓</b>
    </div>
  );
}

function CreateProjectModal({
  initialName,
  teams,
  onClose,
  onCreated,
}: {
  initialName: string;
  teams: TeamItem[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState(initialName.trim());
  const [teamID, setTeamID] = useState(() => String(teams[0]?.id || ""));
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!teamID && teams[0]?.id) {
      setTeamID(String(teams[0].id));
    }
  }, [teamID, teams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const selectedTeam = teams.find((team) => String(team.id) === teamID);
    if (!name.trim()) {
      setMessage("请输入项目名");
      return;
    }
    if (!selectedTeam) {
      setMessage("请选择团队");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const result = await createProject({
        name: name.trim(),
        teamID: selectedTeam.id,
        releaseID: selectedTeam.release_id,
      });
      if (result.code !== 0) {
        setMessage(result.message || "创建项目失败");
        return;
      }
      toast.success("项目已创建");
      await onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="hb-modal-backdrop">
      <form className="hb-modal" onSubmit={submit}>
        <div className="hb-modal-head">
          <div>
            <p>新建项目</p>
            <h3>创建工作台项目</h3>
          </div>
          <button
            type="button"
            className="hb-modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="hb-modal-body">
          <label className="hb-field">
            <span>项目名</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：小说世界观设定"
              autoFocus
            />
          </label>

          <label className="hb-field">
            <span>团队</span>
            <select
              value={teamID}
              onChange={(event) => setTeamID(event.target.value)}
              disabled={teams.length === 0}
            >
              {teams.length === 0 ? (
                <option value="">暂无已发布团队</option>
              ) : (
                teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {teamDisplayName(team)}
                  </option>
                ))
              )}
            </select>
          </label>

          {message ? <div className="hb-form-error">{message}</div> : null}
        </div>

        <div className="hb-modal-actions">
          <button
            type="button"
            className="hb-secondary-button"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="submit"
            className="hb-primary-button"
            disabled={submitting || teams.length === 0}
          >
            {submitting ? <Loader2 size={16} className="hb-spin" /> : null}
            创建项目
          </button>
        </div>
      </form>
    </div>
  );
}

function ProjectEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="hb-project-grid">
      <CreateProjectCard onCreate={onCreate} />
    </div>
  );
}

function ProjectLoading() {
  return (
    <div className="hb-project-grid">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="hb-card-skeleton">
          <div />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function WorkProjectStyles() {
  return (
    <style>{`
      .hb-project-page {
        width: 100%;
        min-height: 100vh;
        padding: 44px 44px 72px;
      }

      .hb-hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
        margin-bottom: 40px;
      }

      .hb-hero-title {
        margin: 0;
        color: var(--hb-text, #080d1c);
        font-size: 28px;
        font-weight: 800;
        line-height: 1.18;
        letter-spacing: 0;
        text-align: center;
      }

      .hb-prompt-card {
        display: flex;
        width: min(840px, calc(100vw - 250px));
        min-height: 126px;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
        border: 1px solid var(--hb-border, #dce3ee);
        border-radius: 18px;
        background: var(--hb-panel, #fff);
        background: color-mix(in srgb, var(--hb-panel, #fff) 94%, transparent);
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.035);
      }

      .hb-prompt-input {
        width: 100%;
        min-height: 58px;
        resize: none;
        border: 0;
        background: transparent;
        padding: 20px 20px 8px;
        color: var(--hb-text, #080d1c);
        font: inherit;
        font-size: 15px;
        line-height: 1.55;
        outline: none;
      }

      .hb-prompt-input::placeholder {
        color: var(--hb-text-muted, #667085);
      }

      .hb-prompt-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border-top: 1px solid var(--hb-border, #dce3ee);
        padding: 12px 20px;
      }

      .hb-tool-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .hb-chip,
      .hb-icon-chip,
      .hb-model-chip,
      .hb-primary-button,
      .hb-secondary-button {
        display: inline-flex;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        gap: 9px;
        border: 1px solid var(--hb-border, #dce3ee);
        border-radius: 14px;
        background: var(--hb-panel, #fff);
        color: var(--hb-text, #080d1c);
        font: inherit;
        font-weight: 680;
        letter-spacing: 0;
        transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
      }

      .hb-chip,
      .hb-model-chip {
        min-height: 32px;
        padding: 0 11px;
        font-size: 12px;
      }

      .hb-chip.is-strong {
        background: var(--hb-panel-soft, #f8fafc);
        box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
      }

      .hb-icon-chip {
        width: 32px;
        height: 32px;
      }

      .hb-chip:hover,
      .hb-icon-chip:hover,
      .hb-model-chip:hover,
      .hb-secondary-button:hover {
        border-color: var(--hb-border-strong, #cfd8e6);
        transform: translateY(-1px);
      }

      .hb-send {
        display: inline-flex;
        width: 38px;
        height: 38px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: #12c987;
        color: #07111c;
        box-shadow: 0 16px 30px rgba(18, 201, 135, 0.18);
        transition: transform 160ms ease, box-shadow 160ms ease;
      }

      .hb-send:hover,
      .hb-primary-button:hover {
        transform: translateY(-1px);
      }

      .hb-workbench {
        width: 100%;
        max-width: none;
      }

      .hb-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 36px;
      }

      .hb-section-head h2 {
        margin: 0;
        color: var(--hb-text, #080d1c);
        font-size: 16px;
        font-weight: 800;
        line-height: 1.2;
      }

      .hb-link-button {
        display: inline-flex;
        cursor: pointer;
        align-items: center;
        gap: 2px;
        border: 0;
        background: transparent;
        color: var(--hb-text-muted, #667085);
        font: inherit;
        font-size: 12px;
        font-weight: 650;
      }

      .hb-link-button:hover {
        color: var(--hb-text, #080d1c);
      }

      .hb-primary-button {
        min-height: 46px;
        border-color: var(--hb-primary, #090f22);
        background: var(--hb-primary, #090f22);
        color: var(--hb-primary-text, #fff);
        padding: 0 22px;
        box-shadow: 0 14px 30px rgba(9, 15, 34, 0.16);
      }

      .hb-primary-button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
        transform: none;
      }

      .hb-secondary-button {
        min-height: 44px;
        padding: 0 20px;
      }

      .hb-project-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, 280px);
        gap: 20px;
        justify-content: start;
      }

      .hb-create-card,
      .hb-project-card,
      .hb-card-skeleton {
        min-height: 180px;
        border: 1px solid var(--hb-border, #dce3ee);
        border-radius: 16px;
        background: var(--hb-panel, #fff);
        box-shadow: 0 3px 12px rgba(15, 23, 42, 0.05);
      }

      .hb-create-card,
      .hb-project-card {
        cursor: pointer;
        overflow: hidden;
        padding: 0;
        color: var(--hb-text, #080d1c);
        font: inherit;
        text-align: left;
        transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
      }

      .hb-create-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        border-style: dashed;
        box-shadow: none;
        color: var(--hb-text-muted, #667085);
        font-size: 14px;
        font-weight: 700;
      }

      .hb-create-card:hover,
      .hb-project-card:hover {
        border-color: var(--hb-border-strong, #cfd8e6);
        box-shadow: var(--hb-shadow, 0 22px 70px rgba(18, 27, 47, 0.08));
        transform: translateY(-2px);
      }

      .hb-create-plus {
        display: flex;
        width: 52px;
        height: 52px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--hb-panel-soft, #f8fafc);
      }

      .hb-project-cover {
        position: relative;
        display: flex;
        height: 124px;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .hb-document-mark {
        position: relative;
        display: flex;
        width: 62px;
        height: 72px;
        flex-direction: column;
        gap: 9px;
        border: 1px solid rgba(255, 255, 255, 0.7);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.82);
        padding: 15px 13px;
        box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
        backdrop-filter: blur(10px);
      }

      .hb-document-mark span {
        display: block;
        height: 6px;
        border-radius: 999px;
        background: #d8dee8;
      }

      .hb-document-mark span:nth-child(2) {
        width: 72%;
      }

      .hb-document-mark span:nth-child(3) {
        width: 48%;
      }

      .hb-document-mark b {
        position: absolute;
        top: -7px;
        right: -7px;
        display: flex;
        width: 20px;
        height: 20px;
        align-items: center;
        justify-content: center;
        border: 2px solid #fff;
        border-radius: 999px;
        background: #c8ff21;
        color: #111827;
        font-size: 12px;
        line-height: 1;
      }

      .hb-card-badge {
        position: absolute;
        top: 12px;
        right: 12px;
        border-radius: 999px;
        background: rgba(9, 15, 34, 0.72);
        color: #fff;
        padding: 5px 9px;
        font-size: 10px;
        font-weight: 760;
        letter-spacing: 0.02em;
      }

      .hb-project-meta {
        border-top: 1px solid var(--hb-border, #dce3ee);
        padding: 14px 16px 15px;
      }

      .hb-project-title-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .hb-project-title-row h3 {
        margin: 0;
        overflow: hidden;
        color: var(--hb-text, #080d1c);
        font-size: 14px;
        font-weight: 780;
        line-height: 1.3;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .hb-project-title-row svg {
        flex: 0 0 auto;
        color: var(--hb-text-muted, #667085);
        transition: transform 160ms ease, color 160ms ease;
      }

      .hb-project-card:hover .hb-project-title-row svg {
        color: var(--hb-text, #080d1c);
        transform: translateX(2px);
      }

      .hb-project-meta time {
        display: block;
        margin: 8px 0 0;
        overflow: hidden;
        color: var(--hb-text-muted, #667085);
        font-size: 13px;
        line-height: 1.35;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .hb-card-skeleton {
        overflow: hidden;
      }

      .hb-card-skeleton div {
        height: 150px;
        background: linear-gradient(90deg, var(--hb-panel-soft, #f8fafc), var(--hb-accent, #e8eef7), var(--hb-panel-soft, #f8fafc));
        background-size: 220% 100%;
        animation: hb-shimmer 1.2s linear infinite;
      }

      .hb-card-skeleton span {
        display: block;
        height: 14px;
        margin: 18px 18px 0;
        border-radius: 999px;
        background: var(--hb-panel-soft, #f8fafc);
      }

      .hb-card-skeleton span:last-child {
        width: 54%;
        margin-top: 12px;
      }

      .hb-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(5, 7, 17, 0.46);
        padding: 24px;
        backdrop-filter: blur(8px);
      }

      .hb-modal {
        width: min(520px, 100%);
        overflow: hidden;
        border: 1px solid var(--hb-border, #dce3ee);
        border-radius: 28px;
        background: var(--hb-panel, #fff);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.26);
      }

      .hb-modal-head,
      .hb-modal-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        border-bottom: 1px solid var(--hb-border, #dce3ee);
        padding: 24px 26px;
      }

      .hb-modal-head p {
        margin: 0;
        color: var(--hb-text-muted, #667085);
        font-size: 14px;
      }

      .hb-modal-head h3 {
        margin: 6px 0 0;
        color: var(--hb-text, #080d1c);
        font-size: 25px;
        line-height: 1.2;
      }

      .hb-modal-close {
        display: inline-flex;
        width: 40px;
        height: 40px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        border: 1px solid transparent;
        border-radius: 14px;
        background: transparent;
        color: var(--hb-text-muted, #667085);
      }

      .hb-modal-close:hover {
        border-color: var(--hb-border, #dce3ee);
        color: var(--hb-text, #080d1c);
      }

      .hb-modal-body {
        display: grid;
        gap: 18px;
        padding: 26px;
      }

      .hb-field {
        display: grid;
        gap: 9px;
      }

      .hb-field span {
        font-size: 14px;
        font-weight: 720;
      }

      .hb-field input,
      .hb-field select {
        width: 100%;
        height: 48px;
        border: 1px solid var(--hb-border, #dce3ee);
        border-radius: 14px;
        background: var(--hb-panel-soft, #f8fafc);
        color: var(--hb-text, #080d1c);
        font: inherit;
        padding: 0 14px;
        outline: none;
      }

      .hb-field input:focus,
      .hb-field select:focus {
        border-color: var(--hb-border-strong, #cfd8e6);
        background: var(--hb-panel, #fff);
      }

      .hb-form-error {
        border: 1px solid #fecaca;
        border-radius: 14px;
        background: #fef2f2;
        color: #dc2626;
        padding: 11px 13px;
        font-size: 14px;
      }

      .hb-modal-actions {
        justify-content: flex-end;
        border-top: 1px solid var(--hb-border, #dce3ee);
        border-bottom: 0;
      }

      .hb-spin {
        animation: hb-spin 0.85s linear infinite;
      }

      @keyframes hb-spin {
        to { transform: rotate(360deg); }
      }

      @keyframes hb-shimmer {
        to { background-position: -220% 0; }
      }

      @media (max-width: 980px) {
        .hb-project-page {
          padding: 48px 28px 56px;
        }

        .hb-hero {
          align-items: stretch;
        }

        .hb-section-head,
        .hb-prompt-toolbar {
          align-items: stretch;
          flex-direction: column;
        }

        .hb-tool-group {
          justify-content: space-between;
        }

        .hb-project-grid {
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
      }

      @media (max-width: 640px) {
        .hb-project-page {
          padding: 34px 18px 44px;
        }

        .hb-hero-title {
          font-size: 24px;
        }

        .hb-prompt-card {
          min-height: 190px;
          border-radius: 24px;
        }

        .hb-prompt-card {
          width: 100%;
        }
      }
    `}</style>
  );
}

function toProjectItems(value: any): ProjectItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => ({
    id: Number(item?.id || 0),
    body_id: Number(item?.body_id || 0),
    team_id: Number(item?.team_id || 0),
    release_id: Number(item?.release_id || 0),
    name: String(item?.name || ""),
    description: String(item?.description || ""),
    cover: String(item?.cover || ""),
    created_at: String(item?.created_at || ""),
    updated_at: String(item?.updated_at || ""),
    team: {
      id: Number(item?.team?.id || 0),
      name: String(item?.team?.name || ""),
      version: Number(item?.team?.version || 0),
    },
  }));
}

function toTeamItems(value: any): TeamItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => ({
    id: Number(item?.id || 0),
    name: String(item?.name || ""),
    description: String(item?.description || ""),
    release_id: Number(item?.release_id || 0),
    version: Number(item?.version || 0),
    can_create: item?.can_create !== false,
  }));
}

function teamDisplayName(team: TeamItem) {
  return team.name.trim() || "未命名团队";
}

function createProject(payload: CreateProjectPayload) {
  return request(joinSiteApi("project/create"), "post", {
    name: payload.name,
    team_id: payload.teamID,
    release_id: payload.releaseID || 0,
  });
}

function formatTime(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getProjectCoverStyle(
  project: ProjectItem,
  index: number,
): CSSProperties {
  const cover = project.cover?.trim();
  if (!cover) {
    return { background: coverGradients[index % coverGradients.length] };
  }
  if (
    cover.startsWith("linear-gradient") ||
    cover.startsWith("radial-gradient")
  ) {
    return { background: cover };
  }
  return {
    backgroundImage: `url(${cover})`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
}
