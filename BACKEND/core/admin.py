from django.contrib import admin


class NoDeleteModelAdmin(admin.ModelAdmin):
    """Empêche la suppression physique : désactivation uniquement via l'API."""

    def has_delete_permission(self, request, obj=None):
        return False


from .models import (
    AccessEvent,
    AccessRules,
    AcademicYear,
    AdminActionLog,
    BehaviorPointEntry,
    Card,
    Department,
    Enrollment,
    Faculty,
    NotificationSettings,
    Permission,
    ProfessorProfile,
    Promotion,
    RFIDSettings,
    Role,
    Student,
    StudentFinancialStatus,
    UniversityInfo,
    UserProfile,
)


@admin.register(AdminActionLog)
class AdminActionLogAdmin(admin.ModelAdmin):
    list_display = ("action", "actor", "object_type", "object_id", "created_at")
    list_filter = ("action", "object_type", "created_at")
    search_fields = ("action", "object_type", "object_id", "actor__username")


admin.site.register(UniversityInfo)
admin.site.register(Role)
admin.site.register(Permission)
admin.site.register(UserProfile)
admin.site.register(ProfessorProfile)


@admin.register(BehaviorPointEntry)
class BehaviorPointEntryAdmin(admin.ModelAdmin):
    list_display = ("student", "enrollment", "points_delta", "recorded_by", "created_at")
    list_filter = ("created_at",)
    search_fields = ("student__matricule", "note", "recorded_by__username")


@admin.register(Faculty)
class FacultyAdmin(NoDeleteModelAdmin):
    list_display = ("name", "code", "is_active", "deactivated_at", "created_at")
    list_filter = ("is_active",)


@admin.register(Department)
class DepartmentAdmin(NoDeleteModelAdmin):
    list_display = ("name", "code", "faculty", "is_active", "deactivated_at")
    list_filter = ("is_active", "faculty")


admin.site.register(AcademicYear)


@admin.register(Promotion)
class PromotionAdmin(NoDeleteModelAdmin):
    list_display = (
        "name",
        "code",
        "faculty",
        "level",
        "course_start_date",
        "course_end_date",
        "is_active",
        "deactivated_at",
    )
    list_filter = ("is_active", "faculty")
admin.site.register(RFIDSettings)
admin.site.register(AccessRules)
admin.site.register(NotificationSettings)
admin.site.register(Student)
admin.site.register(Enrollment)
admin.site.register(StudentFinancialStatus)
admin.site.register(Card)
admin.site.register(AccessEvent)
