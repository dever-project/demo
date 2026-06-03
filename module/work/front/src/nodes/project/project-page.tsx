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
  Brain,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Loader2,
  MoreVertical,
  Plus,
  Video,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { joinSiteApi, request, useNavigate } from "@dever/front-plugin";

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
  const [selectedModel, setSelectedModel] = useState<"flagship" | "economy">("flagship");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

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
        toast.error(projectResult.message || "加载作品失败");
      } else {
        setProjects(toProjectItems(projectResult.data?.items));
      }

      if (teamResult.code !== 0) {
        toast.error(teamResult.message || "加载类型失败");
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

      <section className="hb-hero" aria-label="作品助手">
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
              <button type="button" className="hb-icon-chip" aria-label="图片">
                <ImageIcon size={14} />
              </button>
              <button type="button" className="hb-icon-chip" aria-label="视频">
                <Video size={14} />
              </button>
              <button
                type="button"
                className="hb-icon-chip"
                onClick={() => openCreateModal(prompt)}
                aria-label="新建作品"
              >
                <Plus size={16} />
              </button>
              <button type="button" className="hb-icon-chip" aria-label="文本">
                <FileText size={14} />
              </button>
            </div>

            <div className="hb-tool-group">
              <div className="hb-model-select-container">
                <button
                  type="button"
                  className="hb-model-chip"
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                >
                  {selectedModel === "flagship" ? (
                    <>
                      <Brain size={13} />
                      旗舰
                    </>
                  ) : (
                    <>
                      <Zap size={13} />
                      经济
                    </>
                  )}
                  <ChevronDown size={14} className={`hb-select-arrow ${modelDropdownOpen ? 'is-open' : ''}`} />
                </button>

                {modelDropdownOpen && (
                  <>
                    <div className="hb-model-dropdown-backdrop" onClick={() => setModelDropdownOpen(false)} />
                    <div className="hb-model-dropdown-popover">
                      <button
                        type="button"
                        className={`hb-model-option ${selectedModel === 'flagship' ? 'is-active' : ''}`}
                        onClick={() => {
                          setSelectedModel("flagship");
                          setModelDropdownOpen(false);
                        }}
                      >
                        <div className="hb-model-icon-box">
                          <Brain size={16} />
                        </div>
                        <div className="hb-model-info">
                          <h4>旗舰</h4>
                          <p>巅峰算力深度推理能力，1 倍算力消耗</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`hb-model-option ${selectedModel === 'economy' ? 'is-active' : ''}`}
                        onClick={() => {
                          setSelectedModel("economy");
                          setModelDropdownOpen(false);
                        }}
                      >
                        <div className="hb-model-icon-box">
                          <Zap size={16} />
                        </div>
                        <div className="hb-model-info">
                          <h4>经济</h4>
                          <p>轻松应对日常简单任务，0.35 倍算力消耗</p>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                className="hb-send"
                onClick={() => openCreateModal(prompt)}
                aria-label="创建作品"
              >
                <ArrowUp size={17} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="hb-workbench" aria-label="作品工作台">
        <div className="hb-section-head">
          <h2>最近作品</h2>
          <button type="button" className="hb-link-button">
            全部作品
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
      <div className="hb-create-cover">
        <div className="hb-create-plus">
          <Plus size={26} strokeWidth={1.8} />
        </div>
      </div>
      <div className="hb-project-meta">
        <div className="hb-project-title-row">
          <h3>新建作品</h3>
        </div>
      </div>
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
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="hb-project-card"
      onClick={() => navigate({ to: "/work/space", search: { id: String(project.id) } })}
    >
      <div
        className="hb-project-cover"
        style={getProjectCoverStyle(project, index)}
      >
        {project.cover ? null : <DocumentMark />}
        <span className="hb-card-badge">
          {(!project.team?.name || project.team.name.toLowerCase() === "workflow") ? "团队名称" : project.team.name}
        </span>
      </div>

      <div className="hb-project-meta">
        <div className="hb-project-title-row">
          <h3>{project.name || "未命名作品"}</h3>
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
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
      setMessage("请输入标题");
      return;
    }
    if (!selectedTeam) {
      setMessage("请选择类型");
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
        setMessage(result.message || "创建作品失败");
        return;
      }
      toast.success("作品已创建");
      await onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTeam = teams.find((team) => String(team.id) === teamID);

  return (
    <div className="hb-modal-backdrop">
      <div className="hb-modal-container">
        <button
          type="button"
          className="hb-modal-close-outside"
          onClick={onClose}
          aria-label="关闭"
        >
          <X size={18} strokeWidth={2.4} />
        </button>

        <form className="hb-modal" onSubmit={submit}>
          <div className="hb-modal-head">
            <div className="hb-modal-head-title-row">
              <h3>创建作品</h3>
              <span className="hb-modal-head-tip">请填写作品名称并选择您的创作类型</span>
            </div>
          </div>

        <div className="hb-modal-body">
          <label className="hb-field">
            <span>标题</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：小说世界观设定"
              autoFocus
            />
          </label>

          <div className="hb-field">
            <span>类型</span>
            <div className="hb-custom-select-container">
              <button
                type="button"
                className="hb-custom-select-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={teams.length === 0}
              >
                <span>
                  {teams.length === 0
                    ? "暂无已发布类型"
                    : selectedTeam
                      ? teamDisplayName(selectedTeam)
                      : "选择类型"}
                </span>
                <ChevronDown size={16} className={`hb-select-arrow ${dropdownOpen ? 'is-open' : ''}`} />
              </button>

              {dropdownOpen && teams.length > 0 && (
                <>
                  <div className="hb-custom-select-backdrop" onClick={() => setDropdownOpen(false)} />
                  <div className="hb-custom-select-options">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        className={`hb-custom-select-option ${String(team.id) === teamID ? 'is-selected' : ''}`}
                        onClick={() => {
                          setTeamID(String(team.id));
                          setDropdownOpen(false);
                        }}
                      >
                        {teamDisplayName(team)}
                        {String(team.id) === teamID && <span className="hb-option-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

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
            创建作品
          </button>
        </div>
      </form>
    </div>
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
        color: var(--hb-text, #0f172a);
        font-size: 28px;
        font-weight: 500;
        line-height: 1.2;
        letter-spacing: -0.02em;
        text-align: center;
      }

      .hb-prompt-card {
        display: flex;
        width: min(840px, calc(100vw - 250px));
        min-height: 136px;
        flex-direction: column;
        justify-content: space-between;
        overflow: visible;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        background: var(--hb-panel, #fff);
        box-shadow: 0 8px 30px rgba(15, 23, 42, 0.03);
        transition: border-color 160ms, box-shadow 160ms;
      }

      .hb-prompt-card:focus-within {
        border-color: #cbd5e1;
        box-shadow: 0 12px 36px rgba(15, 23, 42, 0.05);
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
        border-top: 0;
        padding: 12px 20px 16px;
      }

      .hb-tool-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .hb-chip,
      .hb-icon-chip,
      .hb-model-chip {
        display: inline-flex;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #ffffff;
        color: #475569;
        font: inherit;
        font-weight: 500;
        letter-spacing: 0;
        transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
      }

      .hb-chip,
      .hb-model-chip {
        min-height: 32px;
        padding: 0 10px;
        font-size: 13px;
      }

      .hb-chip.is-strong {
        background: #f8fafc;
        border-color: #e2e8f0;
      }

      .hb-icon-chip {
        width: 32px;
        height: 32px;
      }

      .hb-chip:hover,
      .hb-icon-chip:hover,
      .hb-model-chip:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
        color: #0f172a;
      }

      .hb-send {
        display: inline-flex;
        width: 36px;
        height: 36px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: #94a3b8;
        color: #ffffff;
        box-shadow: none;
        transition: transform 160ms ease, background-color 160ms ease;
      }

      .hb-send:hover {
        background: #64748b;
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
        gap: 24px;
        justify-content: start;
      }

      .hb-create-card,
      .hb-project-card {
        display: flex;
        flex-direction: column;
        width: 280px;
        min-height: auto;
        cursor: pointer;
        border: 0;
        background: transparent;
        box-shadow: none;
        padding: 0;
        text-align: left;
        transition: transform 180ms ease;
      }

      .hb-card-skeleton {
        min-height: 160px;
        border: 1px solid var(--hb-border, #dce3ee);
        border-radius: 12px;
        background: var(--hb-panel, #fff);
        box-shadow: 0 3px 12px rgba(15, 23, 42, 0.05);
      }

      .hb-create-card:hover,
      .hb-project-card:hover {
        box-shadow: none;
        transform: translateY(-2px);
      }

      .hb-project-cover {
        position: relative;
        display: flex;
        width: 100%;
        height: 160px;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border: 1px solid var(--hb-border, #dce3ee);
        border-radius: 12px;
        background: var(--hb-panel, #fff);
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02);
        transition: border-color 160ms, box-shadow 160ms;
      }

      .hb-project-card:hover .hb-project-cover {
        border-color: var(--hb-border-strong, #cfd8e6);
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
      }

      .hb-create-cover {
        position: relative;
        display: flex;
        width: 100%;
        height: 160px;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border: 1px dashed var(--hb-border, #dce3ee);
        border-radius: 12px;
        background: var(--hb-panel, #fff);
        box-shadow: none;
        transition: border-color 160ms, background-color 160ms;
      }

      .hb-create-card:hover .hb-create-cover {
        border-color: var(--hb-border-strong, #cfd8e6);
        background: var(--hb-panel-soft, #f8fafc);
      }

      .hb-create-plus {
        display: flex;
        width: 48px;
        height: 48px;
        align-items: center;
        justify-content: center;
        color: var(--hb-text-muted, #94a3b8);
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
        border-top: 0;
        padding: 12px 2px 4px;
      }

      .hb-project-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .hb-project-title-row h3 {
        margin: 0;
        overflow: hidden;
        color: var(--hb-text, #0f172a);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.4;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .hb-project-title-row svg {
        flex: 0 0 auto;
        color: var(--hb-text-muted, #667085);
        opacity: 0;
        transition: opacity 160ms, color 160ms;
      }

      .hb-project-card:hover .hb-project-title-row svg {
        opacity: 1;
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
        background: rgba(15, 23, 42, 0.18);
        padding: 24px;
        backdrop-filter: blur(4px);
      }

      .hb-modal-container {
        position: relative;
        width: min(520px, 100%);
      }

      .hb-modal {
        width: 100%;
        overflow: hidden;
        border: 1px solid var(--hb-border, #dce3ee);
        border-radius: 16px;
        background: var(--hb-panel, #fff);
        box-shadow: 0 24px 64px rgba(15, 23, 42, 0.18);
      }

      .hb-modal-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 32px 32px 12px;
      }

      .hb-modal-head-title-row {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
      }

      .hb-modal-head-title-row h3 {
        margin: 0;
        color: var(--hb-text, #0f172a);
        font-size: 14px;
        font-weight: 700;
        line-height: 1.2;
      }

      .hb-modal-head-tip {
        color: var(--hb-text-muted, #64748b);
        font-size: 11px;
        font-weight: 400;
      }

      .hb-modal-close-outside {
        position: absolute;
        top: 0;
        right: -64px;
        display: inline-flex;
        width: 44px;
        height: 44px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.46);
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
        backdrop-filter: blur(8px);
        transition: transform 160ms ease, background 160ms ease;
      }

      .hb-modal-close-outside:hover {
        background: rgba(0, 0, 0, 0.65);
        transform: scale(1.06);
      }

      @media (max-width: 660px) {
        .hb-modal-close-outside {
          top: -64px;
          right: 0;
        }
      }

      .hb-modal-body {
        display: grid;
        gap: 16px;
        padding: 8px 32px 20px;
      }

      .hb-field {
        display: grid;
        gap: 9px;
      }

      .hb-field span {
        font-size: 12px;
        font-weight: 600;
        color: var(--hb-text-muted, #475569);
      }

      .hb-field input,
      .hb-field select {
        width: 100%;
        height: 42px;
        border: 1px solid var(--hb-border, #dce3ee);
        border-radius: 10px;
        background: var(--hb-panel-soft, #f8fafc);
        color: var(--hb-text, #080d1c);
        font: inherit;
        padding: 0 14px;
        outline: none;
        transition: border-color 160ms ease, background-color 160ms ease;
      }

      .hb-field input:focus,
      .hb-field select:focus {
        border-color: var(--hb-primary, #090f22);
        background: var(--hb-panel, #fff);
      }

      .hb-form-error {
        border: 1px solid #fecaca;
        border-radius: 10px;
        background: #fef2f2;
        color: #dc2626;
        padding: 11px 13px;
        font-size: 14px;
      }

      .hb-modal-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        padding: 12px 32px 32px;
      }

      .hb-modal-actions .hb-secondary-button {
        min-height: 38px;
        height: 38px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        color: #475569;
        padding: 0 32px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: none;
        transition: background-color 160ms, border-color 160ms, color 160ms;
      }

      .hb-modal-actions .hb-secondary-button:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #0f172a;
      }

      .hb-modal-actions .hb-primary-button {
        min-height: 38px;
        height: 38px;
        border-radius: 8px;
        border: 1px solid transparent;
        background: #0f172a;
        color: #ffffff;
        padding: 0 32px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: none;
        transition: background-color 160ms, opacity 160ms, transform 160ms;
      }

      .hb-modal-actions .hb-primary-button:hover:not(:disabled) {
        background: #1e293b;
        transform: translateY(-1px);
      }

      .hb-modal-actions .hb-primary-button:disabled {
        cursor: not-allowed;
        background: #f1f5f9;
        border-color: #f1f5f9;
        color: #94a3b8;
        opacity: 1;
        transform: none;
      }

      /* Custom Select Dropdown Styling */
      .hb-custom-select-container {
        position: relative;
        width: 100%;
      }

      .hb-custom-select-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 42px;
        border: 1px solid var(--hb-border, #dce3ee);
        border-radius: 10px;
        background: var(--hb-panel-soft, #f8fafc);
        color: var(--hb-text, #080d1c);
        font: inherit;
        padding: 0 14px;
        cursor: pointer;
        outline: none;
        transition: border-color 160ms, background-color 160ms;
      }

      .hb-custom-select-trigger:focus,
      .hb-custom-select-trigger:active {
        border-color: var(--hb-primary, #090f22);
        background: var(--hb-panel, #fff);
      }

      .hb-custom-select-trigger:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .hb-select-arrow {
        color: var(--hb-text-muted, #64748b);
        transition: transform 160ms ease;
      }

      .hb-select-arrow.is-open {
        transform: rotate(180deg);
      }

      .hb-custom-select-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1010;
        background: transparent;
      }

      .hb-custom-select-options {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        z-index: 1020;
        max-height: 240px;
        overflow-y: auto;
        border: 1px solid var(--hb-border, #dce3ee);
        border-radius: 10px;
        background: var(--hb-panel, #fff);
        box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
        padding: 6px;
      }

      .hb-custom-select-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        min-height: 38px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--hb-text, #080d1c);
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        padding: 8px 12px;
        cursor: pointer;
        text-align: left;
        transition: background-color 120ms, color 120ms;
      }

      .hb-custom-select-option:hover {
        background: var(--hb-panel-soft, #f8fafc);
        color: var(--hb-primary, #090f22);
      }

      .hb-custom-select-option.is-selected {
        background: var(--hb-accent, #e8eef7);
        color: #0f172a;
        font-weight: 700;
      }

      .hb-option-check {
        color: #12c987;
        font-weight: 900;
      }

      /* Model Selection Custom Popover Dropdown */
      .hb-model-select-container {
        position: relative;
      }

      .hb-model-chip {
        min-height: 32px;
        padding: 0 10px;
        font-size: 13px;
        gap: 6px;
      }

      .hb-model-dropdown-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1010;
        background: transparent;
      }

      .hb-model-dropdown-popover {
        position: absolute;
        bottom: calc(100% + 8px);
        right: 0;
        z-index: 1020;
        display: flex;
        flex-direction: column;
        width: 320px;
        border: 1px solid var(--hb-border, #e2e8f0);
        border-radius: 14px;
        background: var(--hb-panel, #fff);
        box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
        padding: 8px;
        gap: 6px;
      }

      .hb-model-option {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        width: 100%;
        border: 0;
        border-radius: 10px;
        background: transparent;
        padding: 10px 12px;
        cursor: pointer;
        text-align: left;
        transition: background-color 160ms, transform 160ms;
      }

      .hb-model-option:hover {
        background: var(--hb-panel-soft, #f8fafc);
        transform: translateY(-0.5px);
      }

      .hb-model-option.is-active {
        background: var(--hb-panel-soft, #f8fafc);
        background: color-mix(in srgb, var(--hb-accent, #e8eef7) 50%, var(--hb-panel-soft, #f8fafc) 50%);
      }

      .hb-model-icon-box {
        display: flex;
        width: 32px;
        height: 32px;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: #ffffff;
        border: 1px solid var(--hb-border, #e2e8f0);
        color: var(--hb-text, #0f172a);
        flex-shrink: 0;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.02);
      }

      .hb-model-option.is-active .hb-model-icon-box {
        background: #0f172a;
        color: #ffffff;
        border-color: #0f172a;
      }

      .hb-model-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .hb-model-info h4 {
        margin: 0;
        color: var(--hb-text, #0f172a);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.2;
      }

      .hb-model-info p {
        margin: 0;
        color: var(--hb-text-muted, #64748b);
        font-size: 11px;
        line-height: 1.35;
        white-space: normal;
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
