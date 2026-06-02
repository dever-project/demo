import { defineFrontPlugin, lazyNode } from "@dever/front-plugin";

export default defineFrontPlugin({
  name: "huabu",
  nodes: {
    "huabu-login-page": lazyNode(() =>
      import("./nodes/auth/login-page").then((mod) => ({
        default: mod.HuabuLoginPage,
      })),
    ),
    "huabu-home-shell": lazyNode(() =>
      import("./nodes/home/home-shell").then((mod) => ({
        default: mod.HuabuHomeShell,
      })),
    ),
    "huabu-project-page": lazyNode(() =>
      import("./nodes/project/project-page").then((mod) => ({
        default: mod.HuabuProjectPage,
      })),
    ),
  },
});
