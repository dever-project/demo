import { type FormEvent, type ReactNode, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  Input,
  SiteLogo,
  getSiteConfig,
  joinFrontApi,
  loadMainInfo,
  request,
  resetFrontRuntimeCache,
  resolvePostLoginTarget,
  useAuthStore,
  useNavigate,
  useSearch,
} from "@dever/front-plugin";

type AuthMode = "login" | "register";
type AuthPayload = {
  account: string;
  password: string;
  name?: string;
};

export function HuabuLoginPage() {
  const site = getSiteConfig();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/(auth)/sign-in" });
  const { auth } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>("login");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    const payload = buildAuthPayload(mode, account, password, name);
    if (payload.error || !payload.data) {
      setMessage(payload.error);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const result = await request(
        joinFrontApi(mode === "login" ? "auth/login" : "auth/register"),
        "post",
        payload.data,
      );
      if (result.code !== 0 || !result.data?.token) {
        setMessage(result.message || "操作失败");
        return;
      }

      resetFrontRuntimeCache();
      auth.setUser(result.data.user);
      auth.setAccessToken(result.data.token);

      const mainInfo = await loadMainInfo();
      const target = resolvePostLoginTarget({
        redirectTo: redirect,
        entry: mainInfo.entry,
        menu: mainInfo.menu,
      });
      navigate({ to: target.to, search: target.search, replace: true });
      toast.success(
        mode === "login"
          ? `欢迎回来，${result.data.user?.name || payload.data.account}`
          : "账号已创建",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-svh overflow-hidden bg-background text-foreground xl:grid-cols-[minmax(0,1fr)_460px]">
      <section className="relative hidden min-h-svh flex-col justify-center border-r border-border bg-card px-16 xl:flex xl:px-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-12 top-10 h-44 w-44 rounded-full border border-primary/15" />
          <div className="absolute bottom-20 right-16 h-72 w-72 rounded-full border border-border/70" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-border/80" />
          <div className="absolute left-28 top-1/2 h-72 w-px bg-border/70" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Sparkles className="size-7" />
          </div>
          <p className="mb-4 text-sm font-medium text-primary">
            AI Creative Workspace
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-tight text-foreground">
            神创画布工作台
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            创建项目画布，编排能力节点和智能体流程，把每一次生成结果沉淀为可复用的项目资产。
          </p>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-sm">
            {["项目画布", "能力编排", "资产沉淀"].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-border bg-background/70 px-4 py-3 text-foreground shadow-xs"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-svh items-center justify-center px-5 py-8 sm:px-8 xl:bg-background">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
            <SiteLogo className="size-8" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">
                {site.name || "画布前台"}
              </p>
              <p className="text-xs text-muted-foreground">AI 工作台</p>
            </div>
          </div>

          <Card className="gap-0 rounded-2xl border-border/80 p-0 shadow-2xl shadow-slate-950/10">
            <div className="flex items-start justify-between gap-6 border-b border-border px-7 py-6">
              <div className="min-w-0">
                <p className="mb-2 text-sm text-muted-foreground">项目账号</p>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {mode === "login" ? "登录" : "创建账号"}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="shrink-0"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setMessage("");
                }}
              >
                {mode === "login" ? "注册" : "登录"}
              </Button>
            </div>

            <form className="space-y-4 px-7 py-7" onSubmit={submit}>
              <AuthField label="账号">
                <Input
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  autoComplete="username"
                  placeholder="输入手机号或账号"
                  className="h-11"
                />
              </AuthField>

              {mode === "register" ? (
                <AuthField label="昵称">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder="项目中显示的名字"
                    className="h-11"
                  />
                </AuthField>
              ) : null}

              <AuthField label="密码">
                <Input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder="至少 6 位"
                  type="password"
                  className="h-11"
                />
              </AuthField>

              {message ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {message}
                </div>
              ) : null}

              <Button
                className="h-11 w-full gap-2"
                disabled={loading}
                type="submit"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {loading
                  ? "处理中"
                  : mode === "login"
                    ? "进入工作台"
                    : "注册并进入"}
                {!loading ? <ArrowRight className="size-4" /> : null}
              </Button>
            </form>
          </Card>
        </div>
      </section>
    </main>
  );
}

function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function buildAuthPayload(
  mode: AuthMode,
  account: string,
  password: string,
  name: string,
): { error: string; data: AuthPayload | null } {
  const normalizedAccount = account.trim();
  const normalizedPassword = password.trim();
  const normalizedName = name.trim();

  if (!normalizedAccount || !normalizedPassword) {
    return { error: "请输入账号和密码", data: null };
  }
  if (normalizedPassword.length < 6) {
    return { error: "密码不能少于 6 位", data: null };
  }

  return {
    error: "",
    data: {
      account: normalizedAccount,
      password: normalizedPassword,
      ...(mode === "register"
        ? { name: normalizedName || normalizedAccount }
        : {}),
    },
  };
}
