import { defineFrontPlugin, lazyNode } from "@/lib/plugin/types";

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
