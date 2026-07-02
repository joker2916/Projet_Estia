from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.hashers import check_password, make_password
from django.db.models import Q
import uuid
from django.utils import timezone


class UniversityInfo(models.Model):
    name = models.CharField(max_length=255, default="Université ETSIA")
    logo = models.ImageField(upload_to="logos/", null=True, blank=True)

    class Meta:
        verbose_name = "Information Université"

    def __str__(self):
        return self.name


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    permissions = models.JSONField(default=list)
    permission_refs = models.ManyToManyField("Permission", blank=True, related_name="roles")
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Permission(models.Model):
    code = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=255)
    module = models.CharField(max_length=100, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["module", "label"]

    def __str__(self):
        return self.code


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"


class ProfessorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="professor_profile")
    promotions = models.ManyToManyField("Promotion", blank=True, related_name="professors")
    active = models.BooleanField(default=True)

    def __str__(self):
        return f"Professeur {self.user.username}"


class AdminActionLog(models.Model):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="admin_action_logs")
    action = models.CharField(max_length=100, db_index=True)
    object_type = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["actor", "created_at"], name="admin_actor_created_idx"),
            models.Index(fields=["object_type", "object_id"], name="admin_object_idx"),
        ]

    def __str__(self):
        username = self.actor.username if self.actor else "system"
        return f"{self.action} by {username}"


class Faculty(models.Model):
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=30, unique=True)
    is_active = models.BooleanField(default=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Department(models.Model):
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name="departments")
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=30)
    is_active = models.BooleanField(default=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["faculty", "name"], name="unique_department_name_per_faculty"),
            models.UniqueConstraint(fields=["faculty", "code"], name="unique_department_code_per_faculty"),
        ]

    def __str__(self):
        return f"{self.name} - {self.faculty.name}"


class AcademicYear(models.Model):
    name = models.CharField(max_length=20, unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return self.name


class Promotion(models.Model):
    faculty = models.ForeignKey(Faculty, on_delete=models.PROTECT, related_name="promotions")
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="promotions")
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    level = models.CharField(max_length=30, blank=True)
    course_start_date = models.DateField(help_text="Debut de la periode de cours")
    course_end_date = models.DateField(help_text="Fin de la periode de cours")
    is_active = models.BooleanField(default=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["faculty", "name"], name="unique_promotion_name_per_faculty"),
            models.UniqueConstraint(fields=["faculty", "code"], name="unique_promotion_code_per_faculty"),
        ]

    def __str__(self):
        return f"{self.name} - {self.faculty.name}"

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.course_start_date and self.course_end_date and self.course_start_date > self.course_end_date:
            raise ValidationError(
                {"course_end_date": "La fin des cours doit etre posterieure ou egale au debut."}
            )

    def is_within_course_period(self, when=None):
        when = when or timezone.localdate()
        return self.course_start_date <= when <= self.course_end_date


class RFIDSettings(models.Model):
    uid_length = models.IntegerField(default=8)
    max_cards_per_student = models.IntegerField(default=1)
    card_validity_days = models.IntegerField(default=365)
    card_auto_disable = models.BooleanField(default=True)
    duplicate_scan_window_seconds = models.PositiveIntegerField(default=5)

    class Meta:
        verbose_name = "Paramètres RFID"

    def __str__(self):
        return "Paramètres RFID"


class AccessRules(models.Model):
    access_start = models.TimeField(default="07:00")
    access_end = models.TimeField(default="18:00")
    late_threshold_minutes = models.IntegerField(default=15)
    block_unpaid_fees = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Règles d'accès"

    def __str__(self):
        return "Règles d'accès"


class NotificationSettings(models.Model):
    email_admin = models.EmailField(default="admin@etsia.cd")
    notify_access_denied = models.BooleanField(default=True)
    notify_expired_card = models.BooleanField(default=True)
    notify_disabled_card = models.BooleanField(default=True)
    notify_unpaid_fees = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Paramètres Notifications"

    def __str__(self):
        return "Paramètres Notifications"

class Student(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    matricule = models.CharField(max_length=50, unique=True)
    filiere = models.CharField(max_length=150, blank=True)
    niveau = models.CharField(max_length=50, blank=True)
    faculty = models.ForeignKey(Faculty, on_delete=models.SET_NULL, null=True, blank=True, related_name="students")
    promotion = models.ForeignKey(Promotion, on_delete=models.SET_NULL, null=True, blank=True, related_name="students")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, blank=True, related_name="students")
    password_hash = models.CharField(max_length=128, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.matricule} - {self.last_name} {self.first_name}"

    def set_portal_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_portal_password(self, raw_password):
        if not self.password_hash:
            return False
        return check_password(raw_password, self.password_hash)


class Enrollment(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrollments")
    faculty = models.ForeignKey(Faculty, on_delete=models.PROTECT, related_name="enrollments")
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="enrollments")
    promotion = models.ForeignKey(Promotion, on_delete=models.PROTECT, related_name="enrollments")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name="enrollments")
    is_active = models.BooleanField(default=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]
        constraints = [
            models.UniqueConstraint(fields=["student", "academic_year"], name="unique_student_year_enrollment"),
            models.UniqueConstraint(
                fields=["student"],
                condition=Q(is_active=True),
                name="unique_active_enrollment_per_student",
            ),
        ]

    def __str__(self):
        return f"{self.student.matricule} - {self.promotion.name} ({self.academic_year.name})"

    def clean(self):
        from django.core.exceptions import ValidationError

        errors = {}
        if self.promotion and self.faculty_id and self.promotion.faculty_id != self.faculty_id:
            errors["promotion"] = "La promotion doit appartenir à la faculté de l'inscription."
        if self.department and self.department.faculty_id != self.faculty_id:
            errors["department"] = "Le département doit appartenir à la faculté de l'inscription."
        if self.is_active:
            if self.faculty and not self.faculty.is_active:
                errors["faculty"] = "Impossible d'activer une inscription dans une faculté inactive."
            if self.promotion and not self.promotion.is_active:
                errors["promotion"] = "Impossible d'activer une inscription dans une promotion inactive."
            if self.academic_year and not self.academic_year.is_active:
                errors["academic_year"] = "Impossible d'activer une inscription dans une année inactive."
        if errors:
            raise ValidationError(errors)


class StudentFinancialStatus(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="financial_statuses")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name="financial_statuses")
    is_in_good_standing = models.BooleanField(default=True)
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "academic_year"], name="unique_student_financial_status_per_year"),
        ]

    def __str__(self):
        return f"{self.student.matricule} - {self.academic_year.name}"


class BehaviorPointEntry(models.Model):
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="behavior_points")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="behavior_points")
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="behavior_point_entries",
    )
    points_delta = models.IntegerField()
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["enrollment", "created_at"], name="cpt_enrollment_created_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.enrollment_id:
            self.student_id = self.enrollment.student_id
        super().save(*args, **kwargs)

    def __str__(self):
        sign = "+" if self.points_delta >= 0 else ""
        return f"{self.student.matricule} {sign}{self.points_delta} CPT"

    
class Card(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_DISABLED = "disabled"
    STATUS_LOST = "lost"
    STATUS_EXPIRED = "expired"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_DISABLED, "Disabled"),
        (STATUS_LOST, "Lost"),
        (STATUS_EXPIRED, "Expired"),
    ]

    card_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    uid = models.CharField(max_length=50, unique=True)
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name="cards")
    enrollment = models.ForeignKey(Enrollment, on_delete=models.SET_NULL, null=True, blank=True, related_name="cards")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE, db_index=True)
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    total_uses = models.PositiveIntegerField(default=0)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=["student", "status"], name="card_student_status_idx"),
            models.Index(fields=["status", "created_at"], name="card_status_created_idx"),
        ]

    def __str__(self):
        return f"{self.uid} - {self.student if self.student else 'Non assignée'}"

    def save(self, *args, **kwargs):
        if self.enrollment:
            self.student = self.enrollment.student
        if self.status == self.STATUS_ACTIVE:
            self.is_active = True
            self.deactivated_at = None
        else:
            self.is_active = False
            if not self.deactivated_at:
                self.deactivated_at = timezone.now()
        super().save(*args, **kwargs)

    def clean(self):
        from django.core.exceptions import ValidationError

        errors = {}
        if self.status == self.STATUS_ACTIVE:
            if not self.enrollment_id:
                errors["enrollment"] = "Une carte active doit être liée à une inscription."
            elif not self.enrollment.is_active:
                errors["enrollment"] = "Une carte active doit être liée à une inscription active."
            elif not self.enrollment.faculty.is_active or not self.enrollment.promotion.is_active:
                errors["enrollment"] = "La faculté et la promotion de la carte doivent être actives."
        if self.enrollment_id and self.student_id and self.enrollment.student_id != self.student_id:
            errors["student"] = "L'étudiant de la carte doit correspondre à l'inscription."
        if errors:
            raise ValidationError(errors)


class AccessEvent(models.Model):
    RESULT_ALLOWED = "allowed"
    RESULT_DENIED = "denied"
    RESULT_CHOICES = [
        (RESULT_ALLOWED, "Allowed"),
        (RESULT_DENIED, "Denied"),
    ]

    REASON_NONE = "none"
    REASON_UNKNOWN_CARD = "unknown_card"
    REASON_DISABLED_CARD = "disabled_card"
    REASON_EXPIRED_CARD = "expired_card"
    REASON_LOST_CARD = "lost_card"
    REASON_UNPAID_FEES = "unpaid_fees"
    REASON_OUTSIDE_SCHEDULE = "outside_schedule"
    REASON_OUTSIDE_COURSE_PERIOD = "outside_course_period"
    REASON_INACTIVE_ENROLLMENT = "inactive_enrollment"
    REASON_ENROLLMENT_MISMATCH = "enrollment_mismatch"
    REASON_CHOICES = [
        (REASON_NONE, "None"),
        (REASON_UNKNOWN_CARD, "Unknown card"),
        (REASON_DISABLED_CARD, "Disabled card"),
        (REASON_EXPIRED_CARD, "Expired card"),
        (REASON_LOST_CARD, "Lost card"),
        (REASON_UNPAID_FEES, "Unpaid fees"),
        (REASON_OUTSIDE_SCHEDULE, "Outside schedule"),
        (REASON_OUTSIDE_COURSE_PERIOD, "Outside course period"),
        (REASON_INACTIVE_ENROLLMENT, "Inactive enrollment"),
        (REASON_ENROLLMENT_MISMATCH, "Enrollment mismatch"),
    ]

    card = models.ForeignKey(Card, on_delete=models.SET_NULL, null=True, blank=True, related_name="access_events")
    raw_uid = models.CharField(max_length=50, blank=True, db_index=True)
    request_id = models.CharField(max_length=100, blank=True, db_index=True)
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name="access_events")
    enrollment = models.ForeignKey(Enrollment, on_delete=models.SET_NULL, null=True, blank=True, related_name="access_events")
    faculty = models.ForeignKey(Faculty, on_delete=models.SET_NULL, null=True, blank=True, related_name="access_events")
    promotion = models.ForeignKey(Promotion, on_delete=models.SET_NULL, null=True, blank=True, related_name="access_events")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, blank=True, related_name="access_events")
    result = models.CharField(max_length=20, choices=RESULT_CHOICES, db_index=True)
    reason = models.CharField(max_length=50, choices=REASON_CHOICES, default=REASON_NONE, db_index=True)
    note = models.CharField(max_length=255, blank=True)
    source = models.CharField(max_length=30, default="rfid_gate")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at", "result"], name="access_created_result_idx"),
            models.Index(fields=["result", "reason"], name="access_result_reason_idx"),
            models.Index(fields=["faculty", "promotion", "created_at"], name="access_scope_created_idx"),
            models.Index(fields=["raw_uid", "source", "created_at"], name="access_uid_source_created_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "request_id"],
                condition=~Q(request_id=""),
                name="unique_access_request_per_source",
            ),
        ]