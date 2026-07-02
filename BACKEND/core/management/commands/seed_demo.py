from datetime import date, time, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import (
    AccessEvent,
    AccessRules,
    AcademicYear,
    BehaviorPointEntry,
    Card,
    Enrollment,
    Faculty,
    ProfessorProfile,
    Promotion,
    RFIDSettings,
    Role,
    Student,
    StudentFinancialStatus,
    UserProfile,
)
from core.finance import mark_installment_paid, upsert_tuition_plan
from core.views import ensure_default_permissions


class Command(BaseCommand):
    help = "Cree un jeu de donnees de demonstration pour le pointage RFID."

    @transaction.atomic
    def handle(self, *args, **options):
        ensure_default_permissions()
        role, _ = Role.objects.get_or_create(name="Super Administrateur", defaults={"active": True})
        role.permissions = ["all_access"]
        role.save(update_fields=["permissions"])

        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@etsia.local", "is_staff": True, "is_superuser": True},
        )
        if created:
            admin.set_password("admin123")
            admin.save()
        profile, _ = UserProfile.objects.get_or_create(user=admin)
        profile.role = role
        profile.save(update_fields=["role"])

        faculty, _ = Faculty.objects.update_or_create(
            code="INFO",
            defaults={"name": "Informatique", "is_active": True, "deactivated_at": None},
        )
        inactive_faculty, _ = Faculty.objects.update_or_create(
            code="MNTC",
            defaults={"name": "Management et Technologie", "is_active": False, "deactivated_at": timezone.now()},
        )
        year, _ = AcademicYear.objects.update_or_create(
            name="2026",
            defaults={
                "start_date": date(2026, 1, 1),
                "end_date": date(2026, 12, 31),
                "is_current": True,
                "is_active": True,
            },
        )
        promotion, _ = Promotion.objects.update_or_create(
            faculty=faculty,
            code="L1-INFO",
            defaults={
                "name": "Licence 1 Informatique",
                "level": "L1",
                "course_start_date": date(2026, 1, 15),
                "course_end_date": date(2026, 12, 15),
                "is_active": True,
                "deactivated_at": None,
            },
        )
        inactive_promotion, _ = Promotion.objects.update_or_create(
            faculty=inactive_faculty,
            code="L1-MNTC",
            defaults={
                "name": "Licence 1 MNTC",
                "level": "L1",
                "course_start_date": date(2026, 1, 15),
                "course_end_date": date(2026, 12, 15),
                "is_active": False,
                "deactivated_at": timezone.now(),
            },
        )

        students = [
            ("ETSIA-001", "Jane", "Doe", "04A1B2C3", True, "student123"),
            ("ETSIA-002", "John", "Smith", "04D4E5F6", False, "student123"),
        ]

        upsert_tuition_plan(
            promotion,
            year,
            [
                {
                    "installment_number": 1,
                    "label": "Tranche 1",
                    "amount": "300.00",
                    "due_date": "2026-02-15",
                },
                {
                    "installment_number": 2,
                    "label": "Tranche 2",
                    "amount": "300.00",
                    "due_date": "2026-05-15",
                },
                {
                    "installment_number": 3,
                    "label": "Tranche 3",
                    "amount": "300.00",
                    "due_date": "2026-08-15",
                },
                {
                    "installment_number": 4,
                    "label": "Tranche 4",
                    "amount": "300.00",
                    "due_date": "2026-11-15",
                },
            ],
        )

        created_cards = []
        for matricule, first_name, last_name, uid, good_standing, password in students:
            student, _ = Student.objects.update_or_create(
                matricule=matricule,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": f"{matricule.lower()}@etsia.local",
                    "faculty": faculty,
                    "promotion": promotion,
                    "academic_year": year,
                },
            )
            student.set_portal_password(password)
            student.save(update_fields=["password_hash"])
            Enrollment.objects.filter(student=student, is_active=True).exclude(academic_year=year).update(
                is_active=False,
                ended_at=timezone.now(),
            )
            enrollment, _ = Enrollment.objects.update_or_create(
                student=student,
                academic_year=year,
                defaults={
                    "faculty": faculty,
                    "promotion": promotion,
                    "is_active": True,
                    "ended_at": None,
                },
            )
            if good_standing:
                mark_installment_paid(enrollment, 1)
                mark_installment_paid(enrollment, 2)
            card, _ = Card.objects.update_or_create(
                uid=uid,
                defaults={
                    "student": student,
                    "enrollment": enrollment,
                    "status": Card.STATUS_ACTIVE,
                },
            )
            created_cards.append((card, enrollment, good_standing))

        professor_user, created = User.objects.get_or_create(
            username="prof.info",
            defaults={"email": "prof.info@etsia.local"},
        )
        professor_user.set_password("prof123")
        professor_user.save()
        professor_profile, _ = ProfessorProfile.objects.get_or_create(user=professor_user)
        professor_profile.active = True
        professor_profile.save(update_fields=["active"])
        professor_profile.promotions.set([promotion])

        BehaviorPointEntry.objects.filter(recorded_by=professor_user).delete()
        first_enrollment = Enrollment.objects.filter(promotion=promotion, is_active=True).first()
        if first_enrollment:
            BehaviorPointEntry.objects.create(
                enrollment=first_enrollment,
                student=first_enrollment.student,
                recorded_by=professor_user,
                points_delta=5,
                note="Participation en cours",
            )
            BehaviorPointEntry.objects.create(
                enrollment=first_enrollment,
                student=first_enrollment.student,
                recorded_by=professor_user,
                points_delta=-2,
                note="Retard non justifie",
            )

        AccessEvent.objects.filter(source="seed_demo").delete()
        now = timezone.now()
        for index, (card, enrollment, good_standing) in enumerate(created_cards, start=1):
            event = AccessEvent.objects.create(
                card=card,
                raw_uid=card.uid,
                request_id=f"seed-presence-{index}",
                student=enrollment.student,
                enrollment=enrollment,
                faculty=enrollment.faculty,
                promotion=enrollment.promotion,
                academic_year=enrollment.academic_year,
                result=AccessEvent.RESULT_ALLOWED if good_standing else AccessEvent.RESULT_DENIED,
                reason=AccessEvent.REASON_NONE if good_standing else AccessEvent.REASON_UNPAID_FEES,
                note="Demo présence" if good_standing else "Demo frais impayés",
                source="seed_demo",
            )
            event.created_at = now - timedelta(days=index)
            event.save(update_fields=["created_at"])

        late_card, late_enrollment, _ = created_cards[0]
        late_event = AccessEvent.objects.create(
            card=late_card,
            raw_uid=late_card.uid,
            request_id="seed-late-1",
            student=late_enrollment.student,
            enrollment=late_enrollment,
            faculty=late_enrollment.faculty,
            promotion=late_enrollment.promotion,
            academic_year=late_enrollment.academic_year,
            result=AccessEvent.RESULT_ALLOWED,
            reason=AccessEvent.REASON_NONE,
            note="Demo retard",
            source="seed_demo",
        )
        late_event.created_at = timezone.make_aware(timezone.datetime.combine(timezone.localdate(), time(8, 30)))
        late_event.save(update_fields=["created_at"])

        RFIDSettings.objects.update_or_create(
            pk=1,
            defaults={
                "uid_length": 8,
                "max_cards_per_student": 1,
                "card_validity_days": 365,
                "card_auto_disable": True,
                "duplicate_scan_window_seconds": 5,
            },
        )
        AccessRules.objects.update_or_create(
            pk=1,
            defaults={
                "access_start": time(7, 0),
                "access_end": time(18, 0),
                "late_threshold_minutes": 15,
                "block_unpaid_fees": True,
            },
        )

        self.stdout.write(self.style.SUCCESS("Donnees de demonstration creees."))
        self.stdout.write("Compte admin: admin / admin123")
        self.stdout.write("Compte professeur: prof.info / prof123")
        self.stdout.write("Comptes etudiants: ETSIA-001 / student123, ETSIA-002 / student123")
        self.stdout.write("Cartes RFID: 04A1B2C3 autorisee, 04D4E5F6 bloquee pour frais impayes.")
