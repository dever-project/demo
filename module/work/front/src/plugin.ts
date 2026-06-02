import { defineFrontPlugin, lazyNode } from "@dever/front-plugin";

export default defineFrontPlugin({
  name: "work",
  nodes: {
    "work-login-page": lazyNode(() =>
      import("./nodes/auth/login-page").then((mod) => ({
        default: mod.WorkLoginPage,
      })),
    ),
    "work-home-shell": lazyNode(() =>
      import("./nodes/home/home-shell").then((mod) => ({
        default: mod.WorkHomeShell,
      })),
    ),
    "work-project-page": lazyNode(() =>
      import("./nodes/project/project-page").then((mod) => ({
        default: mod.WorkProjectPage,
      })),
    ),
  },
});
