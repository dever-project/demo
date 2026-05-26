package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	deverjwt "github.com/shemic/dever/auth/jwt"
	"github.com/shemic/dever/config"

	projectmodel "my/module/project/model"
)

const tokenScopeProject = "project"

type AuthService struct{}

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
	model := projectmodel.NewUserModel()
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
		"status":     projectmodel.StatusEnabled,
		"created_at": time.Now(),
	}))
	if userID == 0 {
		return nil, fmt.Errorf("注册失败")
	}
	user := model.Find(ctx, map[string]any{"id": userID})
	return authUserPayload(ctx, user)
}

func (AuthService) Login(ctx context.Context, account string, password string) (map[string]any, error) {
	account = strings.TrimSpace(account)
	password = strings.TrimSpace(password)
	if account == "" || password == "" {
		return nil, fmt.Errorf("账号和密码不能为空")
	}
	user := projectmodel.NewUserModel().Find(ctx, map[string]any{
		"account": account,
		"status":  projectmodel.StatusEnabled,
	})
	if user == nil || user.Password != hashPassword(password) {
		return nil, fmt.Errorf("账号或密码错误")
	}
	return authUserPayload(ctx, user)
}

func (AuthService) Profile(ctx context.Context) (map[string]any, error) {
	user, err := CurrentUser(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]any{"user": userPayload(*user)}, nil
}

func CurrentUserID(ctx context.Context) (uint64, error) {
	claims := deverjwt.Claims(ctx)
	if strings.TrimSpace(fmt.Sprint(claims["scope"])) != tokenScopeProject {
		return 0, fmt.Errorf("用户信息不正确")
	}
	uid, ok := deverjwt.ActiveInt64(ctx)
	if !ok || uid <= 0 {
		return 0, fmt.Errorf("用户信息不正确")
	}
	return uint64(uid), nil
}

func CurrentUser(ctx context.Context) (*projectmodel.User, error) {
	userID, err := CurrentUserID(ctx)
	if err != nil {
		return nil, err
	}
	user := projectmodel.NewUserModel().Find(ctx, map[string]any{
		"id":     userID,
		"status": projectmodel.StatusEnabled,
	})
	if user == nil {
		return nil, fmt.Errorf("用户不存在或已停用")
	}
	return user, nil
}

func authUserPayload(ctx context.Context, user *projectmodel.User) (map[string]any, error) {
	if user == nil {
		return nil, fmt.Errorf("用户不存在")
	}
	expiredAt := time.Now().Add(7 * 24 * time.Hour)
	token, err := createProjectToken(user.ID, expiredAt)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"token": token,
		"user":  userPayload(*user),
		"exp":   expiredAt.UnixMilli(),
	}, nil
}

func userPayload(user projectmodel.User) map[string]any {
	return map[string]any{
		"id":         user.ID,
		"account":    user.Account,
		"name":       user.Name,
		"status":     user.Status,
		"created_at": user.CreatedAt,
	}
}

func createProjectToken(userID uint64, expiredAt time.Time) (string, error) {
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
		"scope": tokenScopeProject,
		"exp":   expiredAt.Unix(),
		"iat":   time.Now().Unix(),
	})
	return token.SignedString([]byte(signer.Secret))
}

func hashPassword(password string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(password)))
	return hex.EncodeToString(sum[:])
}
