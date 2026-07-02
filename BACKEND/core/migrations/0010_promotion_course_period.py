import datetime

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_promotion_protect_no_delete"),
    ]

    operations = [
        migrations.AddField(
            model_name="promotion",
            name="course_start_date",
            field=models.DateField(
                default=datetime.date(2026, 1, 15),
                help_text="Debut de la periode de cours",
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="promotion",
            name="course_end_date",
            field=models.DateField(
                default=datetime.date(2026, 12, 15),
                help_text="Fin de la periode de cours",
            ),
            preserve_default=False,
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
                    ("outside_course_period", "Outside course period"),
                    ("inactive_enrollment", "Inactive enrollment"),
                    ("enrollment_mismatch", "Enrollment mismatch"),
                ],
                db_index=True,
                default="none",
                max_length=50,
            ),
        ),
    ]
