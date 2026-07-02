from django.db.models import Sum
from django.utils import timezone

from .attendance import _clamp_period
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


def build_cpt_timeline(enrollment, start_date=None, end_date=None):
    start, end = _clamp_period(enrollment, start_date, end_date)
    entries = BehaviorPointEntry.objects.filter(enrollment=enrollment).order_by("created_at")
    if start_date:
        entries = entries.filter(created_at__date__gte=start)
    if end_date:
        entries = entries.filter(created_at__date__lte=end)

    opening_balance = 0
    if start_date:
        opening_balance = (
            BehaviorPointEntry.objects.filter(
                enrollment=enrollment,
                created_at__date__lt=start,
            )
            .aggregate(total=Sum("points_delta"))
            .get("total")
            or 0
        )

    timeline = [{"date": start.isoformat(), "date_label": start.strftime("%d/%m"), "balance": opening_balance, "delta": 0}]
    balance = opening_balance
    for entry in entries:
        balance += entry.points_delta
        entry_date = timezone.localtime(entry.created_at).date()
        timeline.append(
            {
                "date": entry_date.isoformat(),
                "date_label": entry_date.strftime("%d/%m"),
                "balance": balance,
                "delta": entry.points_delta,
            }
        )

    if len(timeline) == 1 and balance == 0:
        timeline[0]["date_label"] = "Aujourd'hui"
    return timeline


def build_cpt_weekly_timeline(enrollment, start_date=None, end_date=None):
    from datetime import timedelta

    start, end = _clamp_period(enrollment, start_date, end_date)
    timeline = []
    week_start = start
    while week_start <= end:
        week_end = min(week_start + timedelta(days=6), end)
        balance = (
            BehaviorPointEntry.objects.filter(
                enrollment=enrollment,
                created_at__date__lte=week_end,
            )
            .aggregate(total=Sum("points_delta"))
            .get("total")
            or 0
        )
        timeline.append(
            {
                "week_label": week_start.strftime("%d/%m"),
                "week_start": week_start.isoformat(),
                "week_end": week_end.isoformat(),
                "balance": balance,
            }
        )
        week_start = week_end + timedelta(days=1)
    return timeline


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
