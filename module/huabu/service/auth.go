package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	deverjwt "github.com/shemic/dever/auth/jwt"
	"github.com/shemic/dever/config"

	huabumodel "my/module/huabu/model"
	"my/package/front/service/siteconfig"
)

const tokenScopeHuabu = "huabu"

type AuthService struct{}

type AuthRequiredError struct {
	Message string
}

func (e AuthRequiredError) Error() string {
	message := strings.TrimSpace(e.Message)
	if message == "" {
		return "请先登录"
	}
	return message
}

func NewAuthRequiredError(message string) error {
	return AuthRequiredError{Message: message}
}

func IsAuthRequired(err error) bool {
	var target AuthRequiredError
	return errors.As(err, &target)
}

func (AuthService) Register(ctx context.Context, account string, password string, name string) (map[string]any, error) {
	account = strings.TrimSpace(account)
	password = strings.TrimSpace(password)
	name = strings.TrimSpace(name)
	if account == "" || password == "" {
		return nil, fmt.Errorf("账号和密码不能为空")
	}
	if len([]rune(password)) < 6 {
		return nil, fmt.Errorf("密码不能少于 6 位")
	}

	model := huabumodel.NewUserModel()
	if row := model.Find(ctx, map[string]any{"account": account}); row != nil {
		return nil, fmt.Errorf("账号已存在")
	}
	if name == "" {
		name = account
	}

	userID := uint64(model.Insert(ctx, map[string]any{
		"account":    account,
		"password":   hashPassword(password),
		"name":       name,
		"status":     huabumodel.StatusEnabled,
		"created_at": time.Now(),
	}))
	if userID == 0 {
		return nil, fmt.Errorf("注册失败")
	}
	return authUserPayload(model.Find(ctx, map[string]any{"id": userID}))
}

func (AuthService) Login(ctx context.Context, account string, password string) (map[string]any, error) {
	account = strings.TrimSpace(account)
	password = strings.TrimSpace(password)
	if account == "" || password == "" {
		return nil, fmt.Errorf("账号和密码不能为空")
	}

	user := huabumodel.NewUserModel().Find(ctx, map[string]any{
		"account": account,
		"status":  huabumodel.StatusEnabled,
	})
	if user == nil || user.Password != hashPassword(password) {
		return nil, fmt.Errorf("账号或密码错误")
	}
	return authUserPayload(user)
}

func (AuthService) Profile(ctx context.Context) (map[string]any, error) {
	user, err := CurrentUser(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]any{"user": userPayload(*user)}, nil
}

func CurrentUserID(ctx context.Context) (uint64, error) {
	if !hasHuabuTokenScope(ctx) {
		return 0, NewAuthRequiredError("用户信息不正确")
	}
	uid, ok := deverjwt.ActiveInt64(ctx)
	if !ok || uid <= 0 {
		return 0, NewAuthRequiredError("用户信息不正确")
	}
	return uint64(uid), nil
}

func hasHuabuTokenScope(ctx context.Context) bool {
	claims := deverjwt.Claims(ctx)
	siteKey := cleanTokenClaim(claims["site"])
	scope := cleanTokenClaim(claims["scope"])
	if siteKey == tokenScopeHuabu || scope == tokenScopeHuabu {
		return true
	}

	site, err := resolveHuabuSite()
	if err != nil {
		return false
	}
	return siteKey == site.Key || scope == site.Access.AuthProvider
}

func cleanTokenClaim(value any) string {
	if value == nil {
		return ""
	}
	text := strings.TrimSpace(fmt.Sprint(value))
	if text == "<nil>" {
		return ""
	}
	return text
}

func CurrentUser(ctx context.Context) (*huabumodel.User, error) {
	userID, err := CurrentUserID(ctx)
	if err != nil {
		return nil, err
	}
	user := huabumodel.NewUserModel().Find(ctx, map[string]any{
		"id":     userID,
		"status": huabumodel.StatusEnabled,
	})
	if user == nil {
		return nil, NewAuthRequiredError("用户不存在或已停用")
	}
	return user, nil
}

func authUserPayload(user *huabumodel.User) (map[string]any, error) {
	if user == nil {
		return nil, fmt.Errorf("用户不存在")
	}

	site, err := resolveHuabuSite()
	if err != nil {
		return nil, err
	}
	expiredAt := time.Now().Add(7 * 24 * time.Hour)
	token, err := createHuabuToken(user.ID, expiredAt, site)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"token": token,
		"user":  userPayload(*user),
		"exp":   expiredAt.UnixMilli(),
	}, nil
}

func userPayload(user huabumodel.User) map[string]any {
	return map[string]any{
		"id":         user.ID,
		"account":    user.Account,
		"name":       user.Name,
		"status":     user.Status,
		"created_at": user.CreatedAt,
	}
}

func createHuabuToken(userID uint64, expiredAt time.Time, site siteconfig.Site) (string, error) {
	cfg, err := config.Load("")
	if err != nil {
		return "", fmt.Errorf("读取配置失败")
	}
	signer, err := deverjwt.ResolveSigner(cfg.Auth, "user", "default")
	if err != nil {
		return "", fmt.Errorf("JWT密钥未配置")
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"uid":   fmt.Sprintf("%d", userID),
		"site":  site.Key,
		"scope": site.Access.AuthProvider,
		"exp":   expiredAt.Unix(),
		"iat":   time.Now().Unix(),
	})
	return token.SignedString([]byte(signer.Secret))
}

func resolveHuabuSite() (siteconfig.Site, error) {
	cfg := siteconfig.MustLoad()
	for _, site := range cfg.Sites {
		if strings.TrimSpace(site.Access.AuthProvider) == tokenScopeHuabu {
			return site, nil
		}
	}
	return siteconfig.Site{}, fmt.Errorf("画布站点未配置")
}

func hashPassword(password string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(password)))
	return hex.EncodeToString(sum[:])
}
