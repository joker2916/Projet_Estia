import logging

from .models import AdminActionLog


logger = logging.getLogger(__name__)


def log_admin_action(request, action, obj=None, metadata=None):
    user = getattr(request, "user", None)
    actor = user if getattr(user, "is_authenticated", False) else None
    object_type = obj.__class__.__name__ if obj is not None else ""
    object_id = str(getattr(obj, "pk", "")) if obj is not None else ""

    try:
        AdminActionLog.objects.create(
            actor=actor,
            action=action,
            object_type=object_type,
            object_id=object_id,
            metadata=metadata or {},
        )
    except Exception:
        logger.exception("Unable to persist admin action log")

    logger.info(
        "admin_action",
        extra={
            "actor_id": getattr(actor, "id", None),
            "action": action,
            "object_type": object_type,
            "object_id": object_id,
        },
    )
