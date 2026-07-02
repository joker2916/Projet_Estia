from datetime import timedelta

from django.utils import timezone

from .models import AccessEvent, AccessRules, Enrollment, StudentFinancialStatus


def _parse_date(value, fallback):
    if not value:
        return fallback
    parsed = timezone.datetime.strptime(value, "%Y-%m-%d").date()
    return parsed


def _weekdays_between(start_date, end_date):
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:
            yield current
        current += timedelta(days=1)


def _clamp_period(enrollment, start_date=None, end_date=None):
    today = timezone.localdate()
    period_start = enrollment.promotion.course_start_date
    period_end = enrollment.promotion.course_end_date
    year_start = enrollment.academic_year.start_date
    year_end = enrollment.academic_year.end_date
    validity_start = max(period_start, year_start)
    validity_end = min(period_end, year_end, today)
    start = max(_parse_date(start_date, validity_start), validity_start)
    end = min(_parse_date(end_date, validity_end), validity_end)
    if start > end:
        start, end = end, start
    return start, end


def active_enrollment_for_student(student):
    return (
        Enrollment.objects.select_related("student", "faculty", "promotion", "academic_year")
        .filter(student=student, is_active=True)
        .order_by("-started_at")
        .first()
    )


def build_attendance_report(enrollment, start_date=None, end_date=None):
    rules, _ = AccessRules.objects.get_or_create(pk=1)
    start, end = _clamp_period(enrollment, start_date, end_date)
    expected_days = list(_weekdays_between(start, end))

    events = (
        AccessEvent.objects.filter(
            enrollment=enrollment,
            created_at__date__gte=start,
            created_at__date__lte=end,
        )
        .select_related("card")
        .order_by("created_at")
    )
    allowed_events = [event for event in events if event.result == AccessEvent.RESULT_ALLOWED]
    present_dates = {timezone.localtime(event.created_at).date() for event in allowed_events}
    late_limit = (
        timezone.datetime.combine(start, rules.access_start) + timedelta(minutes=rules.late_threshold_minutes)
    ).time()
    late_events = [
        event
        for event in allowed_events
        if timezone.localtime(event.created_at).time() > late_limit
    ]
    absent_dates = [day for day in expected_days if day not in present_dates]
    financial_status = StudentFinancialStatus.objects.filter(
        student=enrollment.student,
        academic_year=enrollment.academic_year,
    ).first()

    return {
        "student": {
            "id": enrollment.student.id,
            "matricule": enrollment.student.matricule,
            "name": f"{enrollment.student.first_name} {enrollment.student.last_name}",
        },
        "enrollment": {
            "id": enrollment.id,
            "faculty": enrollment.faculty.name,
            "promotion": enrollment.promotion.name,
            "academic_year": enrollment.academic_year.name,
            "valid_from": enrollment.promotion.course_start_date.isoformat(),
            "valid_to": enrollment.promotion.course_end_date.isoformat(),
        },
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
        },
        "financial": {
            "is_in_good_standing": financial_status.is_in_good_standing if financial_status else True,
            "balance_due": str(financial_status.balance_due if financial_status else 0),
        },
        "summary": {
            "expected_days": len(expected_days),
            "present_days": len(present_dates),
            "late_count": len(late_events),
            "absence_count": len(absent_dates),
            "denied_count": events.filter(result=AccessEvent.RESULT_DENIED).count(),
        },
        "absent_dates": [day.isoformat() for day in absent_dates],
        "events": [
            {
                "id": event.id,
                "created_at": event.created_at.isoformat(),
                "result": event.result,
                "reason": event.reason,
                "uid": event.raw_uid or (event.card.uid if event.card else ""),
            }
            for event in events[:100]
        ],
    }
