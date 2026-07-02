from django.utils import timezone

from .models import Card, Promotion


def _deactivate_cards(queryset, status):
    now = timezone.now()
    queryset.filter(status=Card.STATUS_ACTIVE).update(
        status=status,
        is_active=False,
        deactivated_at=now,
    )


def disable_cards_for_promotion(promotion):
    _deactivate_cards(
        Card.objects.filter(enrollment__promotion=promotion),
        Card.STATUS_DISABLED,
    )


def disable_cards_for_faculty(faculty):
    promotion_ids = Promotion.objects.filter(faculty=faculty).values_list("id", flat=True)
    _deactivate_cards(
        Card.objects.filter(enrollment__promotion_id__in=promotion_ids),
        Card.STATUS_DISABLED,
    )


def expire_cards_for_enrollment(enrollment):
    _deactivate_cards(
        Card.objects.filter(enrollment=enrollment),
        Card.STATUS_EXPIRED,
    )


def expire_cards_for_enrollments(enrollment_ids):
    _deactivate_cards(
        Card.objects.filter(enrollment_id__in=enrollment_ids),
        Card.STATUS_EXPIRED,
    )


def sync_card_status_from_enrollment(card):
    enrollment = card.enrollment
    if not enrollment or card.status != Card.STATUS_ACTIVE:
        return card

    promotion = enrollment.promotion
    if not promotion.is_active:
        card.status = Card.STATUS_DISABLED
    elif not enrollment.is_active or not promotion.is_within_course_period():
        card.status = Card.STATUS_EXPIRED
    else:
        return card

    card.is_active = False
    card.deactivated_at = timezone.now()
    card.save(update_fields=["status", "is_active", "deactivated_at"])
    return card
