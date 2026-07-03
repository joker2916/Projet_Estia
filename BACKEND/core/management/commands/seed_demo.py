import random
from datetime import date, time, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.finance import mark_installment_paid, upsert_tuition_plan
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
    UserProfile,
)
from core.views import ensure_default_permissions

random.seed(2026)

FACULTIES = [
    ("GINFO", "Genie informatique"),
    ("GIND", "Genie industriel"),
    ("PO", "Parcours ouvert"),
]
LEVELS = ["L1", "L2", "L3"]
STUDENTS_PER_PROMOTION = 22
COURSE_START = date(2026, 1, 15)
COURSE_END = date(2026, 12, 15)
SEED_UNTIL = date(2026, 6, 30)

FIRST_NAMES = [
    "Amine", "Sarah", "Youssef", "Fatou", "Karim", "Awa", "Moussa", "Claire",
    "Ibrahim", "Nadia", "Omar", "Leila", "Thomas", "Aicha", "David", "Mariam",
    "Lucas", "Salma", "Noah", "Ines", "Adam", "Zoe", "Paul", "Rania", "Hugo",
]
LAST_NAMES = [
    "Diallo", "Martin", "Kone", "Bernard", "Traore", "Petit", "Camara", "Robert",
    "Sow", "Richard", "Ba", "Durand", "Sy", "Moreau", "Fofana", "Simon", "Keita",
    "Laurent", "Cisse", "Garcia", "Ndiaye", "Roux", "Toure", "Blanc", "Sarr",
]
CPT_POSITIVE = [
    "Participation active", "Bon comportement", "Travail de groupe exemplaire",
    "Aide aux camarades", "Ponctualite exemplaire",
]
CPT_NEGATIVE = [
    "Retard repetitif", "Telephone en cours", "Absence non justifiee",
    "Bavardage", "Tenue non conforme",
]
TUITION_INSTALLMENTS = [
    {"installment_number": 1, "label": "Tranche 1", "amount": "300.00", "due_date": "2026-02-15"},
    {"installment_number": 2, "label": "Tranche 2", "amount": "300.00", "due_date": "2026-05-15"},
    {"installment_number": 3, "label": "Tranche 3", "amount": "300.00", "due_date": "2026-08-15"},
    {"installment_number": 4, "label": "Tranche 4", "amount": "300.00", "due_date": "2026-11-15"},
]


def weekdays_between(start_date, end_date):
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:
            yield current
        current += timedelta(days=1)


def make_uid(faculty_code, level, index):
    level_digit = LEVELS.index(level) + 1
    base = sum(ord(char) for char in faculty_code) % 90 + 10
    return f"{base:02X}{level_digit}{index:05X}"[:8]


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

        year, _ = AcademicYear.objects.update_or_create(
            name="2026",
            defaults={
                "start_date": date(2026, 1, 1),
                "end_date": date(2026, 12, 31),
                "is_current": True,
                "is_active": True,
            },
        )

        Faculty.objects.filter(code__in=["INFO", "MNTC"]).update(
            is_active=False,
            deactivated_at=timezone.now(),
        )

        faculty_by_code = {}
        promotions_by_key = {}
        for fac_code, fac_name in FACULTIES:
            faculty, _ = Faculty.objects.update_or_create(
                code=fac_code,
                defaults={"name": fac_name, "is_active": True, "deactivated_at": None},
            )
            faculty_by_code[fac_code] = faculty
            for level in LEVELS:
                promo_code = f"{level}-{fac_code}"
                promotion, _ = Promotion.objects.update_or_create(
                    faculty=faculty,
                    code=promo_code,
                    defaults={
                        "name": f"{level} {fac_name}",
                        "level": level,
                        "course_start_date": COURSE_START,
                        "course_end_date": COURSE_END,
                        "is_active": True,
                        "deactivated_at": None,
                    },
                )
                promotions_by_key[(fac_code, level)] = promotion
                upsert_tuition_plan(promotion, year, TUITION_INSTALLMENTS)

        professors = {}
        for fac_code, fac_name in FACULTIES:
            username = f"prof.{fac_code.lower()}"
            user, prof_created = User.objects.get_or_create(
                username=username,
                defaults={"email": f"{username}@etsia.local"},
            )
            user.set_password("prof123")
            user.save()
            professor_profile, _ = ProfessorProfile.objects.get_or_create(user=user)
            professor_profile.active = True
            professor_profile.save(update_fields=["active"])
            faculty_promotions = [
                promotions_by_key[(fac_code, level)] for level in LEVELS
            ]
            professor_profile.promotions.set(faculty_promotions)
            professors[fac_code] = user

        AccessEvent.objects.filter(source="seed_demo").delete()
        BehaviorPointEntry.objects.filter(
            recorded_by__username__in=[f"prof.{code.lower()}" for code, _ in FACULTIES]
        ).delete()

        school_days = list(weekdays_between(COURSE_START, SEED_UNTIL))
        total_students = 0
        total_events = 0
        total_cpt = 0
        demo_students = []

        name_index = 0
        for fac_code, _fac_name in FACULTIES:
            faculty = faculty_by_code[fac_code]
            professor_user = professors[fac_code]
            for level in LEVELS:
                promotion = promotions_by_key[(fac_code, level)]
                for student_num in range(1, STUDENTS_PER_PROMOTION + 1):
                    matricule = f"{fac_code}-{level}-{student_num:03d}"
                    first_name = FIRST_NAMES[name_index % len(FIRST_NAMES)]
                    last_name = LAST_NAMES[(name_index * 3) % len(LAST_NAMES)]
                    name_index += 1

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
                    student.set_portal_password("student123")
                    student.save(update_fields=["password_hash"])

                    Enrollment.objects.filter(student=student, is_active=True).exclude(
                        academic_year=year
                    ).update(is_active=False, ended_at=timezone.now())

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

                    payment_profile = student_num % 5
                    if payment_profile in (0, 1, 2):
                        mark_installment_paid(enrollment, 1)
                    if payment_profile in (0, 1):
                        mark_installment_paid(enrollment, 2)

                    uid = make_uid(fac_code, level, student_num)
                    card, _ = Card.objects.update_or_create(
                        uid=uid,
                        defaults={
                            "student": student,
                            "enrollment": enrollment,
                            "status": Card.STATUS_ACTIVE,
                        },
                    )

                    attendance_rate = random.uniform(0.62, 0.96)
                    target_present = min(
                        35,
                        max(15, int(len(school_days) * attendance_rate)),
                    )
                    present_days = set(random.sample(school_days, min(target_present, len(school_days))))

                    for day in present_days:
                        is_late = random.random() < 0.14
                        event_time = time(8, random.randint(5, 45)) if is_late else time(
                            7, random.randint(5, 14)
                        )
                        event_dt = timezone.make_aware(
                            timezone.datetime.combine(day, event_time)
                        )
                        total_events += 1
                        event = AccessEvent.objects.create(
                            card=card,
                            raw_uid=card.uid,
                            request_id=f"seed-{matricule}-{day.isoformat()}",
                            student=student,
                            enrollment=enrollment,
                            faculty=faculty,
                            promotion=promotion,
                            academic_year=year,
                            result=AccessEvent.RESULT_ALLOWED,
                            reason=AccessEvent.REASON_NONE,
                            note="[seed] Presence",
                            source="seed_demo",
                        )
                        event.created_at = event_dt
                        event.save(update_fields=["created_at"])

                    cpt_entries = random.randint(3, 8)
                    cpt_balance = 0
                    for entry_idx in range(cpt_entries):
                        month_offset = random.randint(0, 5)
                        entry_day = date(2026, 1 + month_offset, random.randint(1, 28))
                        if random.random() < 0.6:
                            delta = random.randint(1, 5)
                            note = f"[seed] {random.choice(CPT_POSITIVE)}"
                        else:
                            delta = -random.randint(1, 4)
                            note = f"[seed] {random.choice(CPT_NEGATIVE)}"
                        cpt_balance += delta
                        entry_dt = timezone.make_aware(
                            timezone.datetime.combine(entry_day, time(12, 0))
                        )
                        entry = BehaviorPointEntry.objects.create(
                            enrollment=enrollment,
                            student=student,
                            recorded_by=professor_user,
                            points_delta=delta,
                            note=note,
                        )
                        entry.created_at = entry_dt
                        entry.save(update_fields=["created_at"])
                        total_cpt += 1

                    total_students += 1
                    if student_num <= 2 and level == "L1" and fac_code == "GINFO":
                        demo_students.append(matricule)

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
        self.stdout.write(f"Facultes: {len(FACULTIES)} | Promotions: {len(promotions_by_key)}")
        self.stdout.write(f"Etudiants: {total_students} ({STUDENTS_PER_PROMOTION} par promotion)")
        self.stdout.write(f"Evenements de presence: {total_events} | Entrees CPT: {total_cpt}")
        self.stdout.write("Compte admin: admin / admin123")
        self.stdout.write("Comptes professeurs: prof.ginfo, prof.gind, prof.po / prof123")
        if demo_students:
            self.stdout.write(
                f"Exemples etudiants: {', '.join(demo_students)} / student123"
            )
