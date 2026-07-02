from django.db.models import Sum

from .models import BehaviorPointEntry, Enrollment


def get_cpt_balance(enrollment):
    total = (
        BehaviorPointEntry.objects.filter(enrollment=enrollment)
        .aggregate(total=Sum("points_delta"))
        .get("total")
    )
    return total or 0


def build_cpt_summary(enrollment, limit=20):
    entries = BehaviorPointEntry.objects.filter(enrollment=enrollment).select_related(
        "recorded_by"
    )[:limit]
    return {
        "balance": get_cpt_balance(enrollment),
        "entries": [
            {
                "id": entry.id,
                "points_delta": entry.points_delta,
                "note": entry.note,
                "recorded_by": entry.recorded_by.username if entry.recorded_by else "system",
                "created_at": entry.created_at.isoformat(),
            }
            for entry in entries
        ],
    }


def record_cpt_entry(enrollment, professor, points_delta, note=""):
    if points_delta == 0:
        raise ValueError("Le delta de points ne peut pas etre nul.")
    return BehaviorPointEntry.objects.create(
        enrollment=enrollment,
        student=enrollment.student,
        recorded_by=professor,
        points_delta=points_delta,
        note=note.strip(),
    )


def professor_can_manage_enrollment(profile, enrollment):
    if not profile or not profile.active:
        return False
    return profile.promotions.filter(pk=enrollment.promotion_id).exists()
