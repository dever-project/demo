package service

import (
	"context"
	"crypto/rand"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	workmodel "my/module/work/model"
)

const canvasAssetLockRetryInterval = 80 * time.Millisecond
const canvasAssetLockWaitTimeout = 5 * time.Second

func withCanvasAssetVersionLock[T any](
	ctx context.Context,
	projectID uint64,
	parts []string,
	run func() (T, error),
) (T, error) {
	var zero T
	lockKey := canvasAssetVersionLockKey(projectID, parts)
	if projectID == 0 || lockKey == "" {
		return run()
	}
	owner := newCanvasAssetLockOwner()
	release, err := acquireCanvasAssetLock(ctx, projectID, lockKey, owner)
	if err != nil {
		return zero, err
	}
	defer release()
	return run()
}

func acquireCanvasAssetLock(ctx context.Context, projectID uint64, lockKey string, owner string) (func(), error) {
	deadline := time.Now().Add(canvasAssetLockWaitTimeout)
	for {
		if claimCanvasAssetLockOnce(ctx, projectID, lockKey, owner) {
			return func() {
				releaseCanvasAssetLock(context.Background(), lockKey, owner)
			}, nil
		}
		if time.Now().After(deadline) {
			return nil, fmt.Errorf("资产版本正在保存，请稍后重试")
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(canvasAssetLockRetryInterval):
		}
	}
}

func claimCanvasAssetLockOnce(ctx context.Context, projectID uint64, lockKey string, owner string) bool {
	model := workmodel.NewCanvasAssetLockModel()
	now := time.Now()
	expiresAt := now.Add(canvasRunLockTTL)
	if existing := model.Find(ctx, map[string]any{"lock_key": lockKey}); existing != nil {
		return claimCanvasAssetLock(ctx, existing, projectID, owner, expiresAt, now)
	}
	if tryInsertCanvasAssetLock(ctx, projectID, lockKey, owner, expiresAt, now) {
		return true
	}
	existing := model.Find(ctx, map[string]any{"lock_key": lockKey})
	return claimCanvasAssetLock(ctx, existing, projectID, owner, expiresAt, now)
}

func claimCanvasAssetLock(
	ctx context.Context,
	row *workmodel.CanvasAssetLock,
	projectID uint64,
	owner string,
	expiresAt time.Time,
	now time.Time,
) bool {
	if row == nil || row.ProjectID != projectID {
		return false
	}
	model := workmodel.NewCanvasAssetLockModel()
	if row.Owner == owner {
		return model.Update(ctx, map[string]any{
			"id":    row.ID,
			"owner": owner,
		}, canvasAssetLockUpdate(owner, expiresAt, now)) > 0
	}
	if row.ExpiresAt.After(now) {
		return false
	}
	return model.Update(ctx, map[string]any{
		"id":         row.ID,
		"project_id": projectID,
		"expires_at": map[string]any{"lte": now},
	}, canvasAssetLockUpdate(owner, expiresAt, now)) > 0
}

func tryInsertCanvasAssetLock(
	ctx context.Context,
	projectID uint64,
	lockKey string,
	owner string,
	expiresAt time.Time,
	now time.Time,
) (ok bool) {
	defer func() {
		if recover() != nil {
			ok = false
		}
	}()
	return workmodel.NewCanvasAssetLockModel().Insert(ctx, map[string]any{
		"project_id": projectID,
		"lock_key":   lockKey,
		"owner":      owner,
		"expires_at": expiresAt,
		"created_at": now,
		"updated_at": now,
	}) > 0
}

func canvasAssetLockUpdate(owner string, expiresAt time.Time, now time.Time) map[string]any {
	return map[string]any{
		"owner":      owner,
		"expires_at": expiresAt,
		"updated_at": now,
	}
}

func releaseCanvasAssetLock(ctx context.Context, lockKey string, owner string) {
	workmodel.NewCanvasAssetLockModel().Delete(ctx, map[string]any{
		"lock_key": lockKey,
		"owner":    owner,
	})
}

func canvasAssetVersionLockKey(projectID uint64, parts []string) string {
	cleanParts := make([]string, 0, len(parts)+1)
	cleanParts = append(cleanParts, fmt.Sprintf("%d", projectID))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value != "" {
			cleanParts = append(cleanParts, value)
		}
	}
	if len(cleanParts) == 1 {
		return ""
	}
	sum := sha1.Sum([]byte(strings.Join(cleanParts, "\x1f")))
	return hex.EncodeToString(sum[:])
}

func newCanvasAssetLockOwner() string {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("work-canvas-asset-%d", time.Now().UnixNano())
	}
	return fmt.Sprintf("work-canvas-asset-%s", hex.EncodeToString(buf))
}
