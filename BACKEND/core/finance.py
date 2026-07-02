from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from .models import (
    Enrollment,
    PromotionTuitionPlan,
    StudentFinancialStatus,
    StudentInstallmentPayment,
    TuitionInstallment,
)


def get_tuition_plan(enrollment):
    return PromotionTuitionPlan.objects.filter(
        promotion_id=enrollment.promotion_id,
        academic_year_id=enrollment.academic_year_id,
    ).prefetch_related("installments").first()


def refresh_installment_statuses(enrollment):
    plan = get_tuition_plan(enrollment)
    if not plan:
        return []

    today = timezone.localdate()
    payments = {
        payment.installment_id: payment
        for payment in StudentInstallmentPayment.objects.filter(
            enrollment=enrollment,
            installment__plan=plan,
        ).select_related("installment")
    }

    updated = []
    for installment in plan.installments.all():
        payment = payments.get(installment.id)
        if not payment:
            payment = StudentInstallmentPayment.objects.create(
                enrollment=enrollment,
                installment=installment,
                status=StudentInstallmentPayment.STATUS_PENDING,
            )

        if payment.status == StudentInstallmentPayment.STATUS_PAID:
            updated.append(payment)
            continue

        if installment.due_date < today:
            payment.status = StudentInstallmentPayment.STATUS_OVERDUE
        else:
            payment.status = StudentInstallmentPayment.STATUS_PENDING
        payment.save(update_fields=["status", "updated_at"])
        updated.append(payment)
    return updated


def ensure_student_installments(enrollment):
    plan = get_tuition_plan(enrollment)
    if not plan:
        return []
    return refresh_installment_statuses(enrollment)


def sync_financial_status(enrollment):
    ensure_student_installments(enrollment)
    plan = get_tuition_plan(enrollment)

    if not plan:
        financial_status, _ = StudentFinancialStatus.objects.get_or_create(
            student=enrollment.student,
            academic_year=enrollment.academic_year,
            defaults={"is_in_good_standing": True, "balance_due": Decimal("0")},
        )
        return financial_status

    installments = list(plan.installments.all())
    total_due = sum((item.amount for item in installments), Decimal("0"))
    payments = StudentInstallmentPayment.objects.filter(
        enrollment=enrollment,
        installment__plan=plan,
    ).select_related("installment")

    total_paid = Decimal("0")
    has_overdue_unpaid = False
    for payment in payments:
        if payment.status == StudentInstallmentPayment.STATUS_PAID:
            total_paid += payment.amount_paid or payment.installment.amount
        elif payment.status == StudentInstallmentPayment.STATUS_OVERDUE:
            has_overdue_unpaid = True

    balance_due = max(total_due - total_paid, Decimal("0"))
    financial_status, _ = StudentFinancialStatus.objects.update_or_create(
        student=enrollment.student,
        academic_year=enrollment.academic_year,
        defaults={
            "balance_due": balance_due,
            "is_in_good_standing": not has_overdue_unpaid,
        },
    )
    return financial_status


def mark_installment_paid(enrollment, installment_number, amount_paid=None, paid_at=None):
    plan = get_tuition_plan(enrollment)
    if not plan:
        raise ValueError("Aucun barème de scolarité défini pour cette promotion.")

    installment = plan.installments.filter(installment_number=installment_number).first()
    if not installment:
        raise ValueError("Tranche introuvable.")

    ensure_student_installments(enrollment)
    payment, _ = StudentInstallmentPayment.objects.get_or_create(
        enrollment=enrollment,
        installment=installment,
        defaults={"status": StudentInstallmentPayment.STATUS_PENDING},
    )
    payment.status = StudentInstallmentPayment.STATUS_PAID
    payment.amount_paid = amount_paid if amount_paid is not None else installment.amount
    payment.paid_at = paid_at or timezone.now()
    payment.save()
    return sync_financial_status(enrollment)


def upsert_tuition_plan(promotion, academic_year, installments_data):
    if len(installments_data) != 4:
        raise ValueError("Le barème doit contenir exactement 4 tranches.")

    plan, _ = PromotionTuitionPlan.objects.get_or_create(
        promotion=promotion,
        academic_year=academic_year,
    )
    plan.installments.all().delete()
    created = []
    for item in sorted(installments_data, key=lambda row: row["installment_number"]):
        due_date = item["due_date"]
        if isinstance(due_date, str):
            due_date = timezone.datetime.strptime(due_date, "%Y-%m-%d").date()
        created.append(
            TuitionInstallment.objects.create(
                plan=plan,
                installment_number=int(item["installment_number"]),
                label=item.get("label", f"Tranche {item['installment_number']}"),
                amount=Decimal(str(item["amount"])),
                due_date=due_date,
            )
        )

    for enrollment in Enrollment.objects.filter(
        promotion=promotion,
        academic_year=academic_year,
        is_active=True,
    ):
        ensure_student_installments(enrollment)
        sync_financial_status(enrollment)
    return plan, created


def build_student_financial_report(enrollment):
    ensure_student_installments(enrollment)
    financial_status = sync_financial_status(enrollment)
    plan = get_tuition_plan(enrollment)

    if not plan:
        return {
            "total_due": str(financial_status.balance_due),
            "total_paid": "0",
            "balance_due": str(financial_status.balance_due),
            "is_in_good_standing": financial_status.is_in_good_standing,
            "installments": [],
        }

    installments = list(plan.installments.all())
    total_due = sum((item.amount for item in installments), Decimal("0"))
    payments = {
        payment.installment_id: payment
        for payment in StudentInstallmentPayment.objects.filter(
            enrollment=enrollment,
            installment__plan=plan,
        ).select_related("installment")
    }

    rows = []
    total_paid = Decimal("0")
    for installment in installments:
        payment = payments.get(installment.id)
        status = payment.status if payment else StudentInstallmentPayment.STATUS_PENDING
        amount_paid = payment.amount_paid if payment else Decimal("0")
        paid_at = payment.paid_at.isoformat() if payment and payment.paid_at else None
        if status == StudentInstallmentPayment.STATUS_PAID:
            total_paid += amount_paid or installment.amount
        rows.append(
            {
                "installment_number": installment.installment_number,
                "label": installment.label or f"Tranche {installment.installment_number}",
                "amount": str(installment.amount),
                "due_date": installment.due_date.isoformat(),
                "status": status,
                "amount_paid": str(amount_paid),
                "paid_at": paid_at,
            }
        )

    return {
        "total_due": str(total_due),
        "total_paid": str(total_paid),
        "balance_due": str(financial_status.balance_due),
        "is_in_good_standing": financial_status.is_in_good_standing,
        "installments": rows,
    }


def enrollment_has_overdue_unpaid(enrollment):
    ensure_student_installments(enrollment)
    return StudentInstallmentPayment.objects.filter(
        enrollment=enrollment,
        status=StudentInstallmentPayment.STATUS_OVERDUE,
    ).exists()
