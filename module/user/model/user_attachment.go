package model

import (
	"time"

	"github.com/shemic/dever/orm"
)

type UserAttachment struct {
	ID           uint64    `dorm:"primaryKey;autoIncrement;comment:用户附件关联ID"`
	UserID       uint64    `dorm:"not null;comment:用户ID"`
	AttachmentID uint64    `dorm:"not null;comment:附件ID"`
	Sort         int       `dorm:"type:int;not null;default:0;comment:排序"`
	CreatedAt    time.Time `dorm:"comment:创建时间"`
}

type UserAttachmentIndex struct {
	UserAttachment struct{} `unique:"user_id,attachment_id"`
}

func NewUserAttachmentModel() *orm.Model[UserAttachment] {
	return orm.LoadModel[UserAttachment]("用户附件关联", "user_attachment", orm.ModelConfig{
		Index:    UserAttachmentIndex{},
		Order:    "id asc",
		Database: "default",
	})
}
