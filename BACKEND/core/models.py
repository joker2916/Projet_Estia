from django.db import models
from django.contrib.auth.models import User


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
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"


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