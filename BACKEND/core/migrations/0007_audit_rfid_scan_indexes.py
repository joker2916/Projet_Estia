from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0006_permission_role_permission_refs"),
    ]

    operations = [
        migrations.CreateModel(
            name="AdminActionLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(db_index=True, max_length=100)),
                ("object_type", models.CharField(blank=True, max_length=100)),
                ("object_id", models.CharField(blank=True, max_length=100)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="admin_action_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddField(
            model_name="rfidsettings",
            name="duplicate_scan_window_seconds",
            field=models.PositiveIntegerField(default=5),
        ),
        migrations.AddField(
            model_name="accessevent",
            name="raw_uid",
            field=models.CharField(blank=True, db_index=True, max_length=50),
        ),
        migrations.AddField(
            model_name="accessevent",
            name="request_id",
            field=models.CharField(blank=True, db_index=True, max_length=100),
        ),
        migrations.AddIndex(
            model_name="adminactionlog",
            index=models.Index(fields=["actor", "created_at"], name="admin_actor_created_idx"),
        ),
        migrations.AddIndex(
            model_name="adminactionlog",
            index=models.Index(fields=["object_type", "object_id"], name="admin_object_idx"),
        ),
        migrations.AddIndex(
            model_name="card",
            index=models.Index(fields=["student", "status"], name="card_student_status_idx"),
        ),
        migrations.AddIndex(
            model_name="card",
            index=models.Index(fields=["status", "created_at"], name="card_status_created_idx"),
        ),
        migrations.AddIndex(
            model_name="accessevent",
            index=models.Index(fields=["created_at", "result"], name="access_created_result_idx"),
        ),
        migrations.AddIndex(
            model_name="accessevent",
            index=models.Index(fields=["result", "reason"], name="access_result_reason_idx"),
        ),
        migrations.AddIndex(
            model_name="accessevent",
            index=models.Index(fields=["faculty", "promotion", "created_at"], name="access_scope_created_idx"),
        ),
        migrations.AddIndex(
            model_name="accessevent",
            index=models.Index(fields=["raw_uid", "source", "created_at"], name="access_uid_source_created_idx"),
        ),
        migrations.AddConstraint(
            model_name="enrollment",
            constraint=models.UniqueConstraint(
                condition=models.Q(("is_active", True)),
                fields=("student",),
                name="unique_active_enrollment_per_student",
            ),
        ),
        migrations.AddConstraint(
            model_name="accessevent",
            constraint=models.UniqueConstraint(
                condition=models.Q(("request_id", ""), _negated=True),
                fields=("source", "request_id"),
                name="unique_access_request_per_source",
            ),
        ),
    ]
