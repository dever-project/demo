package model

import (
	"time"

	"github.com/shemic/dever/orm"

	frontmeta "github.com/dever-package/front/service/meta"
)

type User struct {
	ID          uint64    `dorm:"primaryKey;autoIncrement;comment:用户ID"`
	Username    string    `dorm:"type:varchar(64);not null;comment:用户名"`
	FirstName   string    `dorm:"type:varchar(64);not null;comment:名字"`
	LastName    string    `dorm:"type:varchar(64);not null;comment:姓氏"`
	Email       string    `dorm:"type:varchar(128);not null;comment:邮箱"`
	PhoneNumber string    `dorm:"type:varchar(32);not null;comment:手机号"`
	Role        string    `dorm:"type:varchar(32);not null;comment:角色"`
	AvatarID    uint64    `dorm:"type:bigint;not null;default:0;comment:头像"`
	VideoID     uint64    `dorm:"type:bigint;not null;default:0;comment:视频"`
	Audio       string    `dorm:"type:text;not null;default:'[]';comment:音频"`
	SourceID    uint64    `dorm:"type:bigint;not null;default:0;comment:来源"`
	Intro       string    `dorm:"type:text;not null;comment:介绍"`
	Content     string    `dorm:"type:text;not null;comment:内容"`
	Status      string    `dorm:"type:varchar(32);not null;default:Active;comment:状态"`
	CreatedAt   time.Time `dorm:"comment:创建时间"`
}

type UserIndex struct {
	Username struct{} `unique:"username"`
	Email    struct{} `unique:"email"`
}

var (
	userRoleOptions = []map[string]any{
		{"id": "Super Admin", "value": "超级管理员"},
		{"id": "Admin", "value": "管理员"},
		{"id": "Manager", "value": "经理"},
		{"id": "Cashier", "value": "收银员"},
	}

	userStatusOptions = []map[string]any{
		{"id": "Active", "value": "启用", "label": "启用", "color": "#0f766e"},
		{"id": "Inactive", "value": "停用", "label": "停用", "color": "#737373"},
		{"id": "Invited", "value": "待邀请", "label": "待邀请", "color": "#0369a1"},
		{"id": "Suspended", "value": "已停用", "label": "已停用", "color": "#dc2626"},
	}

	userWorkRelation = frontmeta.Relation{
		Field:        "work_ids",
		Through:      "user.NewUserWorkModel",
		Option:       "work.NewWorkModel",
		ThroughOrder: "id asc",
	}

	userAvatarRelation = frontmeta.Relation{
		Field:      "avatar_id",
		Option:     "front.NewUploadFileModel",
		EmptyValue: 0,
		OptionKeys: []string{},
	}

	userVideoRelation = frontmeta.Relation{
		Field:      "video_id",
		Option:     "front.NewUploadFileModel",
		EmptyValue: 0,
		OptionKeys: []string{},
	}

	userSourceRelation = frontmeta.Relation{
		Field:      "source_id",
		Option:     "user.NewSourceModel",
		OptionKeys: []string{},
	}

	userAttachmentRelation = frontmeta.Relation{
		Field:        "attachment_ids",
		Through:      "user.NewUserAttachmentModel",
		Option:       "front.NewUploadFileModel",
		ThroughOrder: "sort asc, id asc",
		OptionKeys:   []string{},
	}

	userRegionRelation = frontmeta.Relation{
		Field:        "region_ids",
		Through:      "user.NewUserRegionModel",
		Option:       "region.NewRegionModel",
		ThroughOrder: "sort asc, id asc",
		OptionKeys:   []string{},
	}

	userTitleRelation = frontmeta.Relation{
		Field:   "titles",
		Through: "user.NewUserTitleModel",
		Order:   "sort asc, id asc",
	}
)

func init() {
	frontmeta.RegisterModelMeta("user.NewUserModel", frontmeta.ModelMeta{
		Options: map[string]any{
			"role":   userRoleOptions,
			"status": userStatusOptions,
		},
		Relations: []frontmeta.Relation{
			userWorkRelation,
			userAvatarRelation,
			userVideoRelation,
			userSourceRelation,
			userAttachmentRelation,
			userRegionRelation,
			userTitleRelation,
		},
	})
}

func NewUserModel() *orm.Model[User] {
	return orm.LoadModel[User]("user", User{}, UserIndex{}, "id desc", "default")
}
