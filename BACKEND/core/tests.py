from datetime import date, time

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import (
    AccessEvent,
    AccessRules,
    AcademicYear,
    Card,
    Enrollment,
    Faculty,
    ProfessorProfile,
    Promotion,
    RFIDSettings,
    Student,
    StudentFinancialStatus,
)
from .rfid import process_rfid_scan


COURSE_START = date(2026, 1, 1)
COURSE_END = date(2026, 12, 31)


class RFIDDecisionTests(TestCase):
    def setUp(self):
        RFIDSettings.objects.create(
            uid_length=8,
            max_cards_per_student=1,
            card_validity_days=365,
            card_auto_disable=False,
            duplicate_scan_window_seconds=5,
        )
        AccessRules.objects.create(
            access_start=time(0, 0),
            access_end=time(23, 59),
            block_unpaid_fees=True,
        )
        self.faculty = Faculty.objects.create(name="Sciences", code="SCI")
        self.year = AcademicYear.objects.create(
            name="2026-2027",
            start_date=date(2026, 1, 1),
            end_date=date(2027, 1, 1),
            is_current=True,
        )
        self.promotion = Promotion.objects.create(
            faculty=self.faculty,
            name="Licence 1",
            code="L1",
            level="L1",
            course_start_date=COURSE_START,
            course_end_date=COURSE_END,
        )
        self.student = Student.objects.create(
            first_name="Jane",
            last_name="Doe",
            matricule="ETSIA-001",
            faculty=self.faculty,
            promotion=self.promotion,
            academic_year=self.year,
        )
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            faculty=self.faculty,
            promotion=self.promotion,
            academic_year=self.year,
            is_active=True,
        )
        self.card = Card.objects.create(
            uid="04A1B2C3",
            student=self.student,
            enrollment=self.enrollment,
        )

    def test_unknown_card_is_denied_and_logged_with_raw_uid(self):
        scan = process_rfid_scan("UNKNOWN", source="gate-1")

        self.assertFalse(scan["allowed"])
        self.assertEqual(scan["reason"], AccessEvent.REASON_UNKNOWN_CARD)
        event = scan["event"]
        self.assertEqual(event.raw_uid, "UNKNOWN")
        self.assertIsNone(event.card)

    def test_allowed_scan_creates_event_and_updates_card_usage(self):
        scan = process_rfid_scan(self.card.uid, source="gate-1", request_id="req-1")

        self.assertTrue(scan["allowed"])
        self.assertEqual(scan["reason"], AccessEvent.REASON_NONE)
        self.card.refresh_from_db()
        self.assertEqual(self.card.total_uses, 1)
        self.assertIsNotNone(self.card.last_used_at)

    def test_request_id_makes_retries_idempotent(self):
        first = process_rfid_scan(self.card.uid, source="gate-1", request_id="req-2")
        second = process_rfid_scan(self.card.uid, source="gate-1", request_id="req-2")

        self.assertFalse(first["duplicate"])
        self.assertTrue(second["duplicate"])
        self.assertEqual(first["event"].id, second["event"].id)
        self.assertEqual(AccessEvent.objects.count(), 1)

    def test_unpaid_fees_are_denied_when_rule_is_enabled(self):
        StudentFinancialStatus.objects.create(
            student=self.student,
            academic_year=self.year,
            is_in_good_standing=False,
            balance_due=100,
        )

        scan = process_rfid_scan(self.card.uid, source="gate-1", request_id="req-3")

        self.assertFalse(scan["allowed"])
        self.assertEqual(scan["reason"], AccessEvent.REASON_UNPAID_FEES)

    def test_scan_outside_schedule_is_denied(self):
        AccessRules.objects.update(access_start=time(23, 58), access_end=time(23, 59))

        scan = process_rfid_scan(self.card.uid, source="gate-1", request_id="req-4")

        self.assertFalse(scan["allowed"])
        self.assertEqual(scan["reason"], AccessEvent.REASON_OUTSIDE_SCHEDULE)

    def test_outside_course_period_is_denied(self):
        self.promotion.course_end_date = date(2020, 12, 31)
        self.promotion.save(update_fields=["course_end_date"])

        scan = process_rfid_scan(self.card.uid, source="gate-1", request_id="req-course-period")
        self.card.refresh_from_db()

        self.assertFalse(scan["allowed"])
        self.assertEqual(scan["reason"], AccessEvent.REASON_EXPIRED_CARD)
        self.assertEqual(self.card.status, Card.STATUS_EXPIRED)


class RFIDScanAPITests(TestCase):
    def setUp(self):
        RFIDSettings.objects.create(card_auto_disable=False, duplicate_scan_window_seconds=0)
        AccessRules.objects.create(access_start=time(0, 0), access_end=time(23, 59))
        faculty = Faculty.objects.create(name="Sciences", code="SCI")
        year = AcademicYear.objects.create(
            name="2026-2027",
            start_date=date(2026, 1, 1),
            end_date=date(2027, 1, 1),
            is_current=True,
        )
        promotion = Promotion.objects.create(
            faculty=faculty,
            name="Licence 1",
            code="L1",
            course_start_date=COURSE_START,
            course_end_date=COURSE_END,
        )
        student = Student.objects.create(
            first_name="Jane",
            last_name="Doe",
            matricule="ETSIA-API",
            faculty=faculty,
            promotion=promotion,
            academic_year=year,
        )
        enrollment = Enrollment.objects.create(
            student=student,
            faculty=faculty,
            promotion=promotion,
            academic_year=year,
        )
        self.card = Card.objects.create(uid="API12345", student=student, enrollment=enrollment)
        self.user = User.objects.create_superuser("admin", "admin@example.com", "secret")
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_scan_endpoint_returns_decision_payload(self):
        response = self.client.post(
            "/api/rfid/scan/",
            {"uid": self.card.uid, "source": "gate-api", "request_id": "api-1"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["allowed"])
        self.assertEqual(response.data["event"]["uid"], self.card.uid)


class MVPBusinessRulesTests(TestCase):
    def setUp(self):
        RFIDSettings.objects.create(card_auto_disable=False, duplicate_scan_window_seconds=0)
        AccessRules.objects.create(access_start=time(0, 0), access_end=time(23, 59), block_unpaid_fees=True)
        self.faculty = Faculty.objects.create(name="Informatique", code="INFO")
        self.other_faculty = Faculty.objects.create(name="MNTC", code="MNTC")
        self.year = AcademicYear.objects.create(
            name="2026",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            is_current=True,
        )
        self.promotion = Promotion.objects.create(
            faculty=self.faculty,
            name="L1 Info",
            code="L1-INFO",
            course_start_date=COURSE_START,
            course_end_date=COURSE_END,
        )
        self.other_promotion = Promotion.objects.create(
            faculty=self.other_faculty,
            name="L1 MNTC",
            code="L1-MNTC",
            course_start_date=COURSE_START,
            course_end_date=COURSE_END,
        )
        self.student = Student.objects.create(
            first_name="Alice",
            last_name="Demo",
            matricule="ETSIA-MVP",
            faculty=self.faculty,
            promotion=self.promotion,
            academic_year=self.year,
        )
        self.student.set_portal_password("student123")
        self.student.save()
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            faculty=self.faculty,
            promotion=self.promotion,
            academic_year=self.year,
        )
        self.card = Card.objects.create(uid="MVP001", student=self.student, enrollment=self.enrollment)
        self.admin = User.objects.create_superuser("admin", "admin@example.com", "secret")
        self.admin_token = Token.objects.create(user=self.admin)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.admin_token.key}")

    def test_deactivating_faculty_hides_promotions_and_dashboard_counts_active_only(self):
        response = self.client.post(f"/api/faculties/{self.faculty.id}/deactivate/")
        self.assertEqual(response.status_code, 200)
        self.promotion.refresh_from_db()
        self.assertFalse(self.promotion.is_active)

        dashboard = self.client.get("/api/dashboard/")
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.data["active_faculties"], 1)
        self.assertEqual(dashboard.data["inactive_faculties"], 1)
        self.assertEqual(dashboard.data["active_promotions"], 1)

    def test_deactivating_promotion_disables_linked_cards(self):
        response = self.client.post(f"/api/promotions/{self.promotion.id}/deactivate/")
        self.assertEqual(response.status_code, 200)
        self.card.refresh_from_db()
        self.assertEqual(self.card.status, Card.STATUS_DISABLED)
        self.assertFalse(self.card.is_active)

    def test_reactivating_promotion_does_not_reactivate_cards(self):
        self.client.post(f"/api/promotions/{self.promotion.id}/deactivate/")
        self.card.refresh_from_db()
        self.client.post(f"/api/promotions/{self.promotion.id}/reactivate/")
        self.card.refresh_from_db()
        self.assertEqual(self.card.status, Card.STATUS_DISABLED)

    def test_expired_course_period_expires_card_on_scan(self):
        self.promotion.course_end_date = date(2020, 12, 31)
        self.promotion.save(update_fields=["course_end_date"])

        scan = process_rfid_scan(self.card.uid, source="gate-mvp", request_id="expire-card-1")
        self.card.refresh_from_db()

        self.assertFalse(scan["allowed"])
        self.assertEqual(self.card.status, Card.STATUS_EXPIRED)

    def test_deactivating_promotion_keeps_record_and_deactivates_enrollments(self):
        response = self.client.post(f"/api/promotions/{self.promotion.id}/deactivate/")
        self.assertEqual(response.status_code, 200)

        self.promotion.refresh_from_db()
        self.enrollment.refresh_from_db()
        self.assertFalse(self.promotion.is_active)
        self.assertIsNotNone(self.promotion.deactivated_at)
        self.assertTrue(Promotion.objects.filter(pk=self.promotion.pk).exists())
        self.assertFalse(self.enrollment.is_active)
        self.assertIsNotNone(self.enrollment.ended_at)

    def test_reactivating_promotion_fails_when_faculty_is_inactive(self):
        self.faculty.is_active = False
        self.faculty.save(update_fields=["is_active"])
        self.promotion.is_active = False
        self.promotion.save(update_fields=["is_active"])

        response = self.client.post(f"/api/promotions/{self.promotion.id}/reactivate/")
        self.assertEqual(response.status_code, 400)

    def test_card_with_mismatched_student_academic_state_is_denied(self):
        self.student.faculty = self.other_faculty
        self.student.promotion = self.other_promotion
        self.student.save(update_fields=["faculty", "promotion"])

        scan = process_rfid_scan(self.card.uid, source="gate-mvp", request_id="mismatch-1")

        self.assertFalse(scan["allowed"])
        self.assertEqual(scan["reason"], AccessEvent.REASON_ENROLLMENT_MISMATCH)

    def test_student_login_and_portal_are_limited_to_student(self):
        public_client = APIClient()
        login = public_client.post(
            "/api/student/login/",
            {"matricule": self.student.matricule, "password": "student123"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)

        report = public_client.get(
            "/api/student/portal/",
            HTTP_AUTHORIZATION=f"Student {login.data['token']}",
        )
        self.assertEqual(report.status_code, 200)
        self.assertEqual(report.data["student"]["matricule"], self.student.matricule)

    def test_professor_sees_only_assigned_promotions(self):
        professor = User.objects.create_user("prof.info", password="prof123")
        profile = ProfessorProfile.objects.create(user=professor)
        profile.promotions.set([self.promotion])

        public_client = APIClient()
        login = public_client.post(
            "/api/professor/login/",
            {"username": "prof.info", "password": "prof123"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)

        professor_client = APIClient()
        professor_client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        report = professor_client.get(
            "/api/professor/portal/",
        )
        self.assertEqual(report.status_code, 200)
        enrollment_ids = {
            student["enrollment_id"]
            for branch in report.data["branches"]
            for student in branch["students"]
        }
        self.assertIn(self.enrollment.id, enrollment_ids)
        student = next(
            item
            for branch in report.data["branches"]
            for item in branch["students"]
            if item["enrollment_id"] == self.enrollment.id
        )
        self.assertIn("timeline", student["attendance"])
        self.assertIn("weekly_timeline", student["cpt"])

        forbidden = professor_client.get(
            f"/api/professor/portal/?promotion_id={self.other_promotion.id}",
        )
        self.assertEqual(forbidden.status_code, 403)

    def test_professor_can_update_cpt_for_assigned_student(self):
        professor = User.objects.create_user("prof.info", password="prof123")
        profile = ProfessorProfile.objects.create(user=professor)
        profile.promotions.set([self.promotion])

        professor_client = APIClient()
        login = professor_client.post(
            "/api/professor/login/",
            {"username": "prof.info", "password": "prof123"},
            format="json",
        )
        professor_client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")

        response = professor_client.post(
            "/api/professor/cpt/",
            {
                "enrollment_id": self.enrollment.id,
                "delta": 3,
                "note": "Bon comportement",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["cpt"]["balance"], 3)

    def test_professor_cannot_update_cpt_for_other_promotion(self):
        professor = User.objects.create_user("prof.info", password="prof123")
        profile = ProfessorProfile.objects.create(user=professor)
        profile.promotions.set([self.promotion])
        other_student = Student.objects.create(
            first_name="Bob",
            last_name="Externe",
            matricule="ETSIA-OTHER",
            faculty=self.other_faculty,
            promotion=self.other_promotion,
            academic_year=self.year,
        )
        other_enrollment = Enrollment.objects.create(
            student=other_student,
            faculty=self.other_faculty,
            promotion=self.other_promotion,
            academic_year=self.year,
            is_active=True,
        )

        professor_client = APIClient()
        login = professor_client.post(
            "/api/professor/login/",
            {"username": "prof.info", "password": "prof123"},
            format="json",
        )
        professor_client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")

        response = professor_client.post(
            "/api/professor/cpt/",
            {
                "enrollment_id": other_enrollment.id,
                "delta": 1,
                "note": "Tentative",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)
