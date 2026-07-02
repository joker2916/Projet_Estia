from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .finance import enrollment_has_overdue_unpaid, sync_financial_status
from .models import AccessEvent, AccessRules, Card, Enrollment, RFIDSettings
from .card_lifecycle import sync_card_status_from_enrollment


DEFAULT_SOURCE = "rfid_gate"


def _within_schedule(current_time, start, end):
    if start <= end:
        return start <= current_time <= end
    return current_time >= start or current_time <= end


def _active_enrollment_for(card):
    if not card.enrollment:
        return None
    return card.enrollment if card.enrollment.is_active else None


def _has_enrollment_mismatch(card, enrollment):
    if not enrollment:
        return True
    if not card.student_id or card.student_id != enrollment.student_id:
        return True
    if not enrollment.faculty.is_active or not enrollment.promotion.is_active:
        return True
    current_enrollment = (
        Enrollment.objects.filter(student=enrollment.student, is_active=True)
        .order_by("-started_at")
        .first()
    )
    if current_enrollment and current_enrollment.id != enrollment.id:
        return True
    student = enrollment.student
    return any([
        student.faculty_id and student.faculty_id != enrollment.faculty_id,
        student.promotion_id and student.promotion_id != enrollment.promotion_id,
        student.academic_year_id and student.academic_year_id != enrollment.academic_year_id,
    ])


def _context_from(card, enrollment):
    student = enrollment.student if enrollment else card.student
    return {
        "student": student,
        "enrollment": enrollment,
        "faculty": enrollment.faculty if enrollment else getattr(student, "faculty", None),
        "promotion": enrollment.promotion if enrollment else getattr(student, "promotion", None),
        "academic_year": enrollment.academic_year if enrollment else getattr(student, "academic_year", None),
    }


def _create_event(uid, source, request_id, card, enrollment, result, reason, message):
    context = _context_from(card, enrollment) if card else {
        "student": None,
        "enrollment": None,
        "faculty": None,
        "promotion": None,
        "academic_year": None,
    }
    return AccessEvent.objects.create(
        card=card,
        raw_uid=uid,
        request_id=request_id,
        source=source,
        result=result,
        reason=reason,
        note=message,
        **context,
    )


def _decision(event, duplicate=False):
    return {
        "allowed": event.result == AccessEvent.RESULT_ALLOWED,
        "result": event.result,
        "reason": event.reason,
        "message": event.note,
        "duplicate": duplicate,
        "event": event,
    }


@transaction.atomic
def process_rfid_scan(uid, source=None, request_id="", timestamp=None):
    # Le timestamp lecteur est accepte pour le protocole embarque, mais le
    # serveur reste source de verite avec AccessEvent.created_at.
    uid = (uid or "").strip()
    source = (source or DEFAULT_SOURCE).strip() or DEFAULT_SOURCE
    request_id = (request_id or "").strip()
    settings, _ = RFIDSettings.objects.get_or_create(pk=1)

    if request_id:
        existing = (
            AccessEvent.objects.select_related("card", "student", "faculty", "promotion", "academic_year")
            .filter(source=source, request_id=request_id)
            .first()
        )
        if existing:
            return _decision(existing, duplicate=True)

    duplicate_window = max(settings.duplicate_scan_window_seconds, 0)
    if duplicate_window:
        since = timezone.now() - timedelta(seconds=duplicate_window)
        existing = (
            AccessEvent.objects.select_related("card", "student", "faculty", "promotion", "academic_year")
            .filter(raw_uid=uid, source=source, created_at__gte=since)
            .first()
        )
        if existing:
            return _decision(existing, duplicate=True)

    card = (
        Card.objects.select_related(
            "student",
            "student__faculty",
            "student__promotion",
            "student__academic_year",
            "enrollment",
            "enrollment__student",
            "enrollment__faculty",
            "enrollment__promotion",
            "enrollment__academic_year",
        )
        .filter(uid=uid)
        .first()
    )

    if not card:
        event = _create_event(
            uid=uid,
            source=source,
            request_id=request_id,
            card=None,
            enrollment=None,
            result=AccessEvent.RESULT_DENIED,
            reason=AccessEvent.REASON_UNKNOWN_CARD,
            message="Carte inconnue",
        )
        return _decision(event)

    if (
        card.status == Card.STATUS_ACTIVE
        and settings.card_auto_disable
        and settings.card_validity_days > 0
        and card.created_at <= timezone.now() - timedelta(days=settings.card_validity_days)
    ):
        card.status = Card.STATUS_EXPIRED
        card.save(update_fields=["status", "is_active", "deactivated_at"])

    enrollment = _active_enrollment_for(card)
    card = sync_card_status_from_enrollment(card)

    if card.status != Card.STATUS_ACTIVE or not card.is_active:
        reason_by_status = {
            Card.STATUS_DISABLED: AccessEvent.REASON_DISABLED_CARD,
            Card.STATUS_EXPIRED: AccessEvent.REASON_EXPIRED_CARD,
            Card.STATUS_LOST: AccessEvent.REASON_LOST_CARD,
        }
        event = _create_event(
            uid=uid,
            source=source,
            request_id=request_id,
            card=card,
            enrollment=enrollment,
            result=AccessEvent.RESULT_DENIED,
            reason=reason_by_status.get(card.status, AccessEvent.REASON_DISABLED_CARD),
            message="Carte inactive",
        )
        return _decision(event)

    if not enrollment:
        event = _create_event(
            uid=uid,
            source=source,
            request_id=request_id,
            card=card,
            enrollment=None,
            result=AccessEvent.RESULT_DENIED,
            reason=AccessEvent.REASON_INACTIVE_ENROLLMENT,
            message="Aucune inscription active",
        )
        return _decision(event)

    if _has_enrollment_mismatch(card, enrollment):
        event = _create_event(
            uid=uid,
            source=source,
            request_id=request_id,
            card=card,
            enrollment=enrollment,
            result=AccessEvent.RESULT_DENIED,
            reason=AccessEvent.REASON_ENROLLMENT_MISMATCH,
            message="Carte incohérente avec l'inscription académique",
        )
        return _decision(event)

    rules, _ = AccessRules.objects.get_or_create(pk=1)
    sync_financial_status(enrollment)
    if rules.block_unpaid_fees and enrollment_has_overdue_unpaid(enrollment):
        event = _create_event(
            uid=uid,
            source=source,
            request_id=request_id,
            card=card,
            enrollment=enrollment,
            result=AccessEvent.RESULT_DENIED,
            reason=AccessEvent.REASON_UNPAID_FEES,
            message="Frais impayes",
        )
        return _decision(event)

    if not _within_schedule(timezone.localtime().time(), rules.access_start, rules.access_end):
        event = _create_event(
            uid=uid,
            source=source,
            request_id=request_id,
            card=card,
            enrollment=enrollment,
            result=AccessEvent.RESULT_DENIED,
            reason=AccessEvent.REASON_OUTSIDE_SCHEDULE,
            message="Hors plage horaire autorisee",
        )
        return _decision(event)

    if not enrollment.promotion.is_within_course_period():
        event = _create_event(
            uid=uid,
            source=source,
            request_id=request_id,
            card=card,
            enrollment=enrollment,
            result=AccessEvent.RESULT_DENIED,
            reason=AccessEvent.REASON_OUTSIDE_COURSE_PERIOD,
            message="Hors periode de cours de la promotion",
        )
        return _decision(event)

    event = _create_event(
        uid=uid,
        source=source,
        request_id=request_id,
        card=card,
        enrollment=enrollment,
        result=AccessEvent.RESULT_ALLOWED,
        reason=AccessEvent.REASON_NONE,
        message="Acces autorise",
    )
    card.last_used_at = timezone.now()
    card.total_uses += 1
    card.save(update_fields=["last_used_at", "total_uses"])
    return _decision(event)
