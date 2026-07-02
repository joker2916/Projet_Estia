from rest_framework.permissions import BasePermission


PROFESSOR_PORTAL_VIEWS = {"professor-portal", "professor-cpt"}


def is_active_professor(user):
    profile = getattr(user, "professor_profile", None)
    return bool(profile and profile.active)


ACCESS_MATRIX = {
    "dashboard": {"GET": ("view_dashboard",)},
    "university-info": {
        "GET": ("view_settings", "manage_settings"),
        "PUT": ("manage_settings",),
    },
    "roles": {"GET": ("manage_roles",), "POST": ("manage_roles",)},
    "role-detail": {"PUT": ("manage_roles",), "DELETE": ("manage_roles",)},
    "roles-bootstrap-direction": {"POST": ("manage_roles",)},
    "permissions": {"GET": ("manage_roles",), "POST": ("manage_roles",)},
    "permission-detail": {"PUT": ("manage_roles",)},
    "users": {"GET": ("manage_users",)},
    "user-toggle": {"PUT": ("manage_users",)},
    "user-assign-role": {"PUT": ("manage_users",)},
    "user-reset-password": {"POST": ("manage_users",)},
    "professors": {"GET": ("manage_users",), "POST": ("manage_users",)},
    "professor-detail": {"PUT": ("manage_users",)},
    "rfid-settings": {
        "GET": ("view_settings", "manage_rfid_settings"),
        "PUT": ("manage_rfid_settings",),
    },
    "access-rules": {
        "GET": ("view_settings", "manage_access_rules"),
        "PUT": ("manage_access_rules",),
    },
    "notification-settings": {
        "GET": ("view_settings", "manage_notifications"),
        "PUT": ("manage_notifications",),
    },
    "faculties": {
        "GET": ("view_academics", "manage_academics", "manage_faculties"),
        "POST": ("manage_academics", "manage_faculties"),
    },
    "faculty-detail": {"PUT": ("manage_academics", "manage_faculties")},
    "faculty-deactivate": {"POST": ("manage_academics", "manage_faculties")},
    "faculty-reactivate": {"POST": ("manage_academics", "manage_faculties")},
    "departments": {
        "GET": ("view_academics", "manage_academics", "manage_faculties"),
        "POST": ("manage_academics", "manage_faculties"),
    },
    "department-detail": {"PUT": ("manage_academics", "manage_faculties")},
    "academic-years": {
        "GET": ("view_academics", "manage_academics"),
        "POST": ("manage_academics",),
    },
    "academic-year-detail": {"PUT": ("manage_academics",)},
    "promotions": {
        "GET": ("view_academics", "manage_academics", "manage_promotions"),
        "POST": ("manage_academics", "manage_promotions"),
    },
    "promotion-detail": {"PUT": ("manage_academics", "manage_promotions")},
    "promotion-deactivate": {"POST": ("manage_academics", "manage_promotions")},
    "promotion-reactivate": {"POST": ("manage_academics", "manage_promotions")},
    "promotion-tuition-plan": {
        "GET": ("view_financial_status", "manage_financial_status"),
        "PUT": ("manage_financial_status",),
    },
    "enrollments": {
        "GET": ("view_academics", "manage_academics", "manage_students"),
        "POST": ("manage_academics", "manage_students"),
    },
    "student-transfer": {"POST": ("manage_academics", "manage_students")},
    "enrollment-installments": {
        "GET": ("view_financial_status", "manage_financial_status"),
    },
    "enrollment-installment-pay": {"PUT": ("manage_financial_status",)},
    "financial-statuses": {
        "GET": ("view_financial_status", "manage_financial_status"),
        "POST": ("manage_financial_status",),
    },
    "financial-status-detail": {"PUT": ("manage_financial_status",)},
    "students": {
        "GET": ("view_academics", "manage_academics", "manage_students"),
        "POST": ("manage_academics", "manage_students"),
    },
    "student-detail": {
        "GET": ("view_academics", "manage_academics", "manage_students"),
        "PUT": ("manage_academics", "manage_students"),
        "DELETE": ("manage_academics", "manage_students"),
    },
    "cards": {
        "GET": ("view_cards", "manage_cards"),
        "POST": ("manage_cards",),
    },
    "card-detail": {
        "GET": ("view_cards", "manage_cards"),
        "PUT": ("manage_cards",),
    },
    "card-deactivate": {"POST": ("manage_cards",)},
    "card-reactivate": {"POST": ("manage_cards",)},
    "access-events": {
        "GET": ("view_access_logs",),
        "POST": ("record_access_events",),
    },
    "rfid-scan": {"POST": ("scan_rfid", "record_access_events")},
}


def user_permission_codes(user):
    if not user or not user.is_authenticated:
        return set()
    if user.is_superuser or user.is_staff:
        return {"all_access"}
    profile = getattr(user, "profile", None)
    role = getattr(profile, "role", None)
    if not role or not role.active:
        return set()

    refs = set(role.permission_refs.filter(active=True).values_list("code", flat=True))
    return refs or set(role.permissions or [])


def user_has_any_permission(user, required_codes):
    if not required_codes:
        return True
    codes = user_permission_codes(user)
    return "all_access" in codes or bool(codes.intersection(required_codes))


class HasRolePermission(BasePermission):
    message = "Permission insuffisante pour cette action."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        resolver_match = getattr(request, "resolver_match", None)
        url_name = getattr(resolver_match, "url_name", None)

        if url_name in PROFESSOR_PORTAL_VIEWS:
            return is_active_professor(user)

        method_permissions = ACCESS_MATRIX.get(url_name)
        if not method_permissions:
            return True

        required_codes = method_permissions.get(request.method, ())
        return user_has_any_permission(user, required_codes)
