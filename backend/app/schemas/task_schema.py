from marshmallow import Schema, fields, validate
from app.utils.enums import TaskStatus, TaskPriority

class TaskSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    description = fields.Str(load_default="")
    status = fields.Str(validate=validate.OneOf([TaskStatus.ENTRADA, TaskStatus.FAZENDO, TaskStatus.CONCLUIDA]), load_default=TaskStatus.ENTRADA)
    priority = fields.Str(validate=validate.OneOf([TaskPriority.BAIXA, TaskPriority.MEDIA, TaskPriority.ALTA]), load_default=TaskPriority.MEDIA)
    due_date = fields.Date(allow_none=True, load_default=None)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
