from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0007_audit_rfid_scan_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="student",
            name="password_hash",
            field=models.CharField(blank=True, max_length=128),
        ),
        migrations.CreateModel(
            name="ProfessorProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("active", models.BooleanField(default=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="professor_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "promotions",
                    models.ManyToManyField(blank=True, related_name="professors", to="core.promotion"),
                ),
            ],
        ),
        migrations.AlterField(
            model_name="accessevent",
            name="reason",
            field=models.CharField(
                choices=[
                    ("none", "None"),
                    ("unknown_card", "Unknown card"),
                    ("disabled_card", "Disabled card"),
                    ("expired_card", "Expired card"),
                    ("lost_card", "Lost card"),
                    ("unpaid_fees", "Unpaid fees"),
                    ("outside_schedule", "Outside schedule"),
                    ("inactive_enrollment", "Inactive enrollment"),
                    ("enrollment_mismatch", "Enrollment mismatch"),
                ],
                db_index=True,
                default="none",
                max_length=50,
            ),
        ),
    ]
