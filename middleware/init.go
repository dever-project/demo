package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"sync"

	deverjwt "github.com/shemic/dever/auth/jwt"
	"github.com/shemic/dever/config"
	coremiddleware "github.com/shemic/dever/middleware"
	"github.com/shemic/dever/server"

	permissionservice "my/package/front/service/permission"
	frontsite "my/package/front/service/site"
)

var registerOnce sync.Once

// Register 将项目中定义的中间件统一挂载。
func Register() {
	registerOnce.Do(func() {
		coremiddleware.UseGlobal(coremiddleware.Init())
		coremiddleware.UseGlobalFunc(auth())
		coremiddleware.UseGlobalFunc(frontBootstrap())
		//coremiddleware.UseRouteFunc("GET", "/user/test/user", panicDemo())
	})
}

// panicDemo 示例：在请求带 panic=1 时触发 panic。
/*
func panicDemo() coremiddleware.ContextFunc {
	return func(ctx any) error {
		if c, ok := ctx.(*server.Context); ok && c.Query("panic") == "1" {
			panic("triggered demo panic middleware")
		}
		return nil
	}
}*/

func auth() coremiddleware.ContextFunc {
	cfg, err := config.Load("")
	if err != nil {
		panic(fmt.Errorf("读取配置失败: %w", err))
	}
	if err := deverjwt.Configure(cfg.Auth); err != nil {
		panic(fmt.Errorf("初始化 JWT 认证失败: %w", err))
	}

	return deverjwt.UseConfigured(deverjwt.Options{
		Allow: func(c *server.Context) bool {
			path := strings.TrimSpace(c.Path())
			return path == "/upload" || strings.HasPrefix(path, "/upload/") || frontsite.Allows(cfg.FrontSite, path)
		},
		AllowMissing: func(*server.Context) bool {
			return false
		},
		PublicPaths: []string{
			"/auth/login",
			"/front/auth/login",
			"/auth/register",
			"/auth/send_code",
			"/bot/energon/request",
			"/bot/energon/demo",
			"/site/info",
			"/qiniu/callback",
		},
		OnUnauthorized: func(c *server.Context, msg string) error {
			return abortUnauthorized(c, msg)
		},
	})
}

func frontBootstrap() coremiddleware.ContextFunc {
	return func(ctx any) error {
		c, ok := ctx.(*server.Context)
		if !ok || c == nil {
			return nil
		}
		if !strings.HasPrefix(strings.TrimSpace(c.Path()), "/front/") {
			return nil
		}
		return permissionservice.EnsureBootstrap(c.Context())
	}
}

func abortUnauthorized(c *server.Context, msg string) error {
	if c != nil {
		return c.Error(msg, http.StatusUnauthorized)
	}
	return fmt.Errorf("%s", msg)
}
