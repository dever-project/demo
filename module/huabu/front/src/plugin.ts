import { defineFrontPlugin, lazyNode } from "@dever/front-plugin";

export default defineFrontPlugin({
  name: "huabu",
  nodes: {
    "huabu-login-page": lazyNode(() =>
      import("./nodes/auth/login-page").then((mod) => ({
        default: mod.HuabuLoginPage,
      })),
    ),
  },
});
