from django.db import models
from django.contrib.auth.models import User
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
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name="promotions")
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name="promotions")
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    level = models.CharField(max_length=30, blank=True)
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


class RFIDSettings(models.Model):
    uid_length = models.IntegerField(default=8)
    max_cards_per_student = models.IntegerField(default=1)
    card_validity_days = models.IntegerField(default=365)
    card_auto_disable = models.BooleanField(default=True)

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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.matricule} - {self.last_name} {self.first_name}"


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
        ]

    def __str__(self):
        return f"{self.student.matricule} - {self.promotion.name} ({self.academic_year.name})"


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

    def __str__(self):
        return f"{self.uid} - {self.student if self.student else 'Non assignée'}"

    def save(self, *args, **kwargs):
        if self.status == self.STATUS_ACTIVE:
            self.is_active = True
            self.deactivated_at = None
        else:
            self.is_active = False
            if not self.deactivated_at:
                self.deactivated_at = timezone.now()
        super().save(*args, **kwargs)


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
    REASON_INACTIVE_ENROLLMENT = "inactive_enrollment"
    REASON_CHOICES = [
        (REASON_NONE, "None"),
        (REASON_UNKNOWN_CARD, "Unknown card"),
        (REASON_DISABLED_CARD, "Disabled card"),
        (REASON_EXPIRED_CARD, "Expired card"),
        (REASON_LOST_CARD, "Lost card"),
        (REASON_UNPAID_FEES, "Unpaid fees"),
        (REASON_OUTSIDE_SCHEDULE, "Outside schedule"),
        (REASON_INACTIVE_ENROLLMENT, "Inactive enrollment"),
    ]

    card = models.ForeignKey(Card, on_delete=models.SET_NULL, null=True, blank=True, related_name="access_events")
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