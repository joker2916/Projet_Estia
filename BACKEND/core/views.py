from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core import signing
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.core.paginator import Paginator
from django.db.models import Count, Exists, OuterRef, Prefetch, Q
from django.db import transaction
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import json

from .models import (
    UniversityInfo, Role, Permission, UserProfile, ProfessorProfile,
    RFIDSettings, AccessRules, NotificationSettings,
    Faculty, Department, AcademicYear, Promotion,
    Student, Enrollment, StudentFinancialStatus,
    Card, AccessEvent
)
from .serializers import (
    UniversityInfoSerializer, RoleSerializer, PermissionSerializer, UserSerializer,
    RFIDSettingsSerializer, AccessRulesSerializer, NotificationSettingsSerializer,
    FacultySerializer, DepartmentSerializer, AcademicYearSerializer, PromotionSerializer,
    StudentSerializer, EnrollmentSerializer, StudentFinancialStatusSerializer,
    CardSerializer, AccessEventSerializer, RFIDScanRequestSerializer, ProfessorProfileSerializer
)
from .attendance import active_enrollment_for_student, build_attendance_report, build_attendance_timeline
from .audit import log_admin_action
from .card_lifecycle import (
    disable_cards_for_faculty,
    disable_cards_for_promotion,
    expire_cards_for_enrollments,
)
from .cpt import (
    build_cpt_summary,
    build_cpt_timeline,
    build_cpt_weekly_timeline,
    professor_can_manage_enrollment,
    record_cpt_entry,
)
from .ldap_auth import authenticate_professor, authenticate_student
from .permissions import HasRolePermission as IsAuthenticated
from .rfid import process_rfid_scan


DEFAULT_PERMISSION_CATALOG = [
    {"code": "all_access", "label": "Accès total", "module": "global"},
    {"code": "view_dashboard", "label": "Voir le tableau de bord", "module": "dashboard"},
    {"code": "view_settings", "label": "Voir les paramètres", "module": "settings"},
    {"code": "manage_settings", "label": "Gérer les paramètres généraux", "module": "settings"},
    {"code": "manage_users", "label": "Gérer les utilisateurs", "module": "users"},
    {"code": "manage_roles", "label": "Gérer les rôles", "module": "users"},
    {"code": "view_academics", "label": "Voir les données académiques", "module": "academics"},
    {"code": "manage_academics", "label": "Gérer la structure académique", "module": "academics"},
    {"code": "manage_students", "label": "Gérer les étudiants", "module": "academics"},
    {"code": "manage_faculties", "label": "Gérer les facultés", "module": "academics"},
    {"code": "manage_promotions", "label": "Gérer les promotions", "module": "academics"},
    {"code": "view_access_logs", "label": "Voir les journaux d'accès", "module": "access"},
    {"code": "record_access_events", "label": "Enregistrer des événements d'accès", "module": "access"},
    {"code": "view_cards", "label": "Voir les cartes RFID", "module": "cards"},
    {"code": "manage_cards", "label": "Gérer les cartes RFID", "module": "cards"},
    {"code": "view_financial_status", "label": "Voir statut financier", "module": "finance"},
    {"code": "manage_financial_status", "label": "Gérer statut financier", "module": "finance"},
    {"code": "manage_rfid_settings", "label": "Gérer les paramètres RFID", "module": "rfid"},
    {"code": "scan_rfid", "label": "Scanner des cartes RFID", "module": "rfid"},
    {"code": "manage_access_rules", "label": "Gérer les règles d'accès", "module": "access"},
    {"code": "manage_notifications", "label": "Gérer les notifications", "module": "notifications"},
]


DEFAULT_DIRECTION_ROLE_TEMPLATES = {
    "Super Administrateur": [
        "all_access",
        "view_dashboard",
        "view_settings",
        "manage_settings",
        "manage_users",
        "manage_roles",
        "view_academics",
        "manage_academics",
        "manage_students",
        "manage_faculties",
        "manage_promotions",
        "view_access_logs",
        "record_access_events",
        "view_cards",
        "manage_cards",
        "view_financial_status",
        "manage_financial_status",
        "manage_rfid_settings",
        "scan_rfid",
        "manage_access_rules",
        "manage_notifications",
    ],
    "Recteur": [
        "view_dashboard",
        "view_academics",
        "view_access_logs",
        "view_financial_status",
        "manage_access_rules",
    ],
    "Secretaire General Academique": [
        "view_dashboard",
        "view_academics",
        "manage_academics",
        "manage_students",
        "manage_faculties",
        "manage_promotions",
        "view_access_logs",
    ],
    "Responsable de la Scolarite": [
        "view_dashboard",
        "view_academics",
        "manage_academics",
        "manage_students",
        "manage_faculties",
        "manage_promotions",
        "view_cards",
        "manage_cards",
    ],
    "Responsable des Finances": [
        "view_dashboard",
        "view_academics",
        "view_financial_status",
        "manage_financial_status",
        "view_access_logs",
    ],
    "Responsable de la Securite": [
        "view_dashboard",
        "view_access_logs",
        "record_access_events",
        "view_cards",
        "manage_cards",
        "scan_rfid",
        "manage_access_rules",
    ],
    "Responsable Informatique": [
        "view_dashboard",
        "view_settings",
        "manage_settings",
        "manage_users",
        "manage_roles",
        "manage_rfid_settings",
        "manage_notifications",
        "view_access_logs",
    ],
}


def ensure_default_permissions():
    for item in DEFAULT_PERMISSION_CATALOG:
        Permission.objects.update_or_create(
            code=item["code"],
            defaults={
                "label": item["label"],
                "module": item["module"],
                "active": True,
            },
        )


# ========== LOGIN ==========
@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')

            user = authenticate(request, username=username, password=password)

            if user is not None:
                token, created = Token.objects.get_or_create(user=user)
                profile = getattr(user, "professor_profile", None)
                is_professor = bool(profile and profile.active)
                return JsonResponse({
                    'token': token.key,
                    'username': user.username,
                    'account_type': 'professor' if is_professor else 'admin',
                }, status=200)
            else:
                return JsonResponse({'error': 'Identifiants invalides'}, status=401)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON invalide'}, status=400)

    return JsonResponse({'error': 'Méthode non autorisée'}, status=405)


def _student_token(student):
    return signing.dumps({"student_id": student.id}, salt="student-portal")


def _student_from_request(request):
    auth_header = request.headers.get("Authorization", "")
    prefix = "Student "
    if not auth_header.startswith(prefix):
        return None
    try:
        payload = signing.loads(auth_header[len(prefix):], salt="student-portal", max_age=60 * 60 * 12)
    except signing.BadSignature:
        return None
    return Student.objects.filter(pk=payload.get("student_id")).first()


@api_view(['POST'])
@permission_classes([AllowAny])
def student_login_view(request):
    student = authenticate_student(
        request.data.get('matricule', '').strip(),
        request.data.get('password', ''),
    )
    if not student:
        return Response({'error': 'Identifiants étudiant invalides'}, status=401)
    enrollment = active_enrollment_for_student(student)
    if not enrollment:
        return Response({'error': 'Aucune inscription active pour cet étudiant'}, status=403)
    return Response({
        'token': _student_token(student),
        'matricule': student.matricule,
        'student_name': f"{student.first_name} {student.last_name}",
        'enrollment_id': enrollment.id,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def student_portal_view(request):
    student = _student_from_request(request)
    if not student:
        return Response({'error': 'Token étudiant invalide'}, status=401)
    enrollment = active_enrollment_for_student(student)
    if not enrollment:
        return Response({'error': 'Aucune inscription active'}, status=404)
    report = build_attendance_report(
        enrollment,
        request.query_params.get('start_date'),
        request.query_params.get('end_date'),
    )
    return Response(report)


@api_view(['POST'])
@permission_classes([AllowAny])
def professor_login_view(request):
    user = authenticate_professor(
        request.data.get('username', '').strip(),
        request.data.get('password', ''),
    )
    if not user:
        return Response({'error': 'Identifiants professeur invalides'}, status=401)
    token, _ = Token.objects.get_or_create(user=user)
    profile = user.professor_profile
    return Response({
        'token': token.key,
        'username': user.username,
        'professor': ProfessorProfileSerializer(profile).data,
    })


def _build_professor_branches(profile, promotion_ids, start_date=None, end_date=None):
    enrollments = (
        Enrollment.objects.select_related(
            "student", "faculty", "promotion", "academic_year", "promotion__faculty"
        )
        .filter(is_active=True, promotion_id__in=promotion_ids)
        .order_by("promotion__name", "student__last_name", "student__first_name")
    )
    students_by_promotion = {promotion_id: [] for promotion_id in promotion_ids}
    for enrollment in enrollments:
        attendance = build_attendance_report(enrollment, start_date, end_date)
        students_by_promotion.setdefault(enrollment.promotion_id, []).append(
            {
                "enrollment_id": enrollment.id,
                "student": attendance["student"],
                "enrollment": attendance["enrollment"],
                "attendance": {
                    "period": attendance["period"],
                    "summary": attendance["summary"],
                    "absent_dates": attendance["absent_dates"],
                    "timeline": build_attendance_timeline(enrollment, start_date, end_date),
                },
                "cpt": {
                    **build_cpt_summary(enrollment),
                    "timeline": build_cpt_timeline(enrollment, start_date, end_date),
                    "weekly_timeline": build_cpt_weekly_timeline(enrollment, start_date, end_date),
                },
            }
        )

    branches = []
    for promotion in profile.promotions.select_related("faculty").filter(id__in=promotion_ids):
        branches.append(
            {
                "promotion": {
                    "id": promotion.id,
                    "name": promotion.name,
                    "code": promotion.code,
                    "faculty": promotion.faculty.name,
                    "course_start_date": promotion.course_start_date.isoformat(),
                    "course_end_date": promotion.course_end_date.isoformat(),
                },
                "students": students_by_promotion.get(promotion.id, []),
            }
        )
    return branches


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def professor_portal_view(request):
    profile = getattr(request.user, 'professor_profile', None)
    if not profile or not profile.active:
        return Response({'error': 'Profil professeur introuvable'}, status=403)

    promotion_ids = list(profile.promotions.values_list('id', flat=True))
    requested_promotion_id = request.query_params.get('promotion_id')
    if requested_promotion_id:
        try:
            requested_promotion_id = int(requested_promotion_id)
        except ValueError:
            return Response({'error': 'promotion_id invalide'}, status=400)
        if requested_promotion_id not in promotion_ids:
            return Response({'error': 'Promotion non affectée à ce professeur'}, status=403)
        promotion_ids = [requested_promotion_id]

    branches = _build_professor_branches(
        profile,
        promotion_ids,
        request.query_params.get('start_date'),
        request.query_params.get('end_date'),
    )
    return Response({
        'professor': ProfessorProfileSerializer(profile).data,
        'branches': branches,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def professor_cpt_view(request):
    profile = getattr(request.user, 'professor_profile', None)
    if not profile or not profile.active:
        return Response({'error': 'Profil professeur introuvable'}, status=403)

    enrollment_id = request.data.get('enrollment_id')
    try:
        points_delta = int(request.data.get('delta', 0))
    except (TypeError, ValueError):
        return Response({'error': 'delta invalide'}, status=400)
    note = (request.data.get('note') or '').strip()

    if not enrollment_id:
        return Response({'error': 'enrollment_id requis'}, status=400)
    if points_delta == 0:
        return Response({'error': 'delta doit etre different de zero'}, status=400)

    try:
        enrollment = Enrollment.objects.select_related("promotion", "student").get(pk=enrollment_id)
    except Enrollment.DoesNotExist:
        return Response({'error': 'Inscription introuvable'}, status=404)

    if not professor_can_manage_enrollment(profile, enrollment):
        return Response({'error': 'Etudiant hors de vos promotions affectees'}, status=403)

    entry = record_cpt_entry(enrollment, request.user, points_delta, note)
    return Response(
        {
            "message": "Points CPT mis a jour",
            "entry": {
                "id": entry.id,
                "points_delta": entry.points_delta,
                "note": entry.note,
                "created_at": entry.created_at.isoformat(),
            },
            "cpt": build_cpt_summary(enrollment),
        },
        status=201,
    )


# ========== INFO GÉNÉRALE ==========
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def university_info_view(request):
    info, created = UniversityInfo.objects.get_or_create(pk=1)

    if request.method == 'GET':
        serializer = UniversityInfoSerializer(info)
        return Response(serializer.data)

    if request.method == 'PUT':
        # Gérer le logo uploadé
        info.name = request.data.get('name', info.name)
        if 'logo' in request.FILES:
            info.logo = request.FILES['logo']
        info.save()
        log_admin_action(request, "update_university_info", info)
        serializer = UniversityInfoSerializer(info)
        return Response(serializer.data)


# ========== RÔLES ==========
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def roles_view(request):
    ensure_default_permissions()

    if request.method == 'GET':
        roles = Role.objects.all()
        serializer = RoleSerializer(roles, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = RoleSerializer(data=request.data)
        if serializer.is_valid():
            role = serializer.save()
            log_admin_action(request, "create_role", role)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def role_detail_view(request, pk):
    try:
        role = Role.objects.get(pk=pk)
    except Role.DoesNotExist:
        return Response({'error': 'Rôle introuvable'}, status=404)

    if request.method == 'PUT':
        serializer = RoleSerializer(role, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            log_admin_action(request, "update_role", updated)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        log_admin_action(request, "delete_role", role, {"name": role.name})
        role.delete()
        return Response({'message': 'Rôle supprimé'}, status=204)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def permissions_view(request):
    ensure_default_permissions()

    if request.method == 'GET':
        permissions = Permission.objects.all()
        serializer = PermissionSerializer(permissions, many=True)
        return Response(serializer.data)

    serializer = PermissionSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def permission_detail_view(request, pk):
    try:
        permission = Permission.objects.get(pk=pk)
    except Permission.DoesNotExist:
        return Response({'error': 'Permission introuvable'}, status=404)

    serializer = PermissionSerializer(permission, data=request.data, partial=True)
    if serializer.is_valid():
        updated = serializer.save()
        log_admin_action(request, "update_permission", updated)
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bootstrap_direction_roles_view(request):
    ensure_default_permissions()

    catalog = {p.code: p for p in Permission.objects.filter(active=True)}
    created = []
    updated = []

    with transaction.atomic():
        for role_name, permission_codes in DEFAULT_DIRECTION_ROLE_TEMPLATES.items():
            role, role_created = Role.objects.get_or_create(
                name=role_name,
                defaults={
                    'active': True,
                    'permissions': [],
                },
            )

            perms = [catalog[code] for code in permission_codes if code in catalog]
            role.permission_refs.set(perms)
            role.permissions = [p.code for p in perms]
            role.active = True
            role.save(update_fields=['permissions', 'active'])

            if role_created:
                created.append(role.name)
            else:
                updated.append(role.name)

    log_admin_action(
        request,
        "bootstrap_direction_roles",
        metadata={"created_roles": created, "updated_roles": updated},
    )
    return Response({
        'created_roles': created,
        'updated_roles': updated,
    })


# ========== UTILISATEURS ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def users_view(request):
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def user_toggle_view(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=404)

    user.is_active = not user.is_active
    user.save()
    log_admin_action(request, "toggle_user", user, {"active": user.is_active})
    return Response({'id': user.id, 'username': user.username, 'active': user.is_active})


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def user_assign_role_view(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=404)

    role_id = request.data.get('role_id')

    role = None
    if role_id not in [None, "", "null"]:
        try:
            role = Role.objects.get(pk=role_id)
        except Role.DoesNotExist:
            return Response({'error': 'Rôle introuvable'}, status=404)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    profile.save(update_fields=['role'])
    log_admin_action(
        request,
        "assign_user_role",
        user,
        {"role_id": role.id if role else None, "role": role.name if role else None},
    )

    serializer = UserSerializer(user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_reset_password_view(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=404)

    new_password = request.data.get('password', 'default123')
    user.set_password(new_password)
    user.save()
    log_admin_action(request, "reset_user_password", user)
    return Response({'message': f'Mot de passe de {user.username} réinitialisé'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def professors_view(request):
    if request.method == 'GET':
        profiles = ProfessorProfile.objects.select_related('user').prefetch_related('promotions__faculty').all()
        serializer = ProfessorProfileSerializer(profiles, many=True)
        return Response(serializer.data)

    username = request.data.get('username', '').strip()
    password = request.data.get('password', 'prof123')
    email = request.data.get('email', '')
    promotion_ids = request.data.get('promotion_ids', [])
    if not username:
        return Response({'error': 'username est requis'}, status=400)
    user, created = User.objects.get_or_create(username=username, defaults={'email': email})
    if created or password:
        user.set_password(password)
        user.save()
    profile, _ = ProfessorProfile.objects.get_or_create(user=user)
    profile.active = request.data.get('active', True)
    profile.save(update_fields=['active'])
    profile.promotions.set(Promotion.objects.filter(id__in=promotion_ids, is_active=True, faculty__is_active=True))
    log_admin_action(request, "upsert_professor_profile", profile)
    return Response(ProfessorProfileSerializer(profile).data, status=201)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def professor_detail_view(request, pk):
    try:
        profile = ProfessorProfile.objects.get(pk=pk)
    except ProfessorProfile.DoesNotExist:
        return Response({'error': 'Professeur introuvable'}, status=404)

    promotion_ids = request.data.get('promotion_ids')
    if promotion_ids is not None:
        profile.promotions.set(Promotion.objects.filter(id__in=promotion_ids, is_active=True, faculty__is_active=True))
    if 'active' in request.data:
        profile.active = bool(request.data.get('active'))
        profile.save(update_fields=['active'])
    log_admin_action(request, "update_professor_profile", profile)
    return Response(ProfessorProfileSerializer(profile).data)


# ========== RFID ==========
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def rfid_settings_view(request):
    settings, created = RFIDSettings.objects.get_or_create(pk=1)

    if request.method == 'GET':
        serializer = RFIDSettingsSerializer(settings)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = RFIDSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            log_admin_action(request, "update_rfid_settings", updated)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


# ========== RÈGLES D'ACCÈS ==========
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def access_rules_view(request):
    rules, created = AccessRules.objects.get_or_create(pk=1)

    if request.method == 'GET':
        serializer = AccessRulesSerializer(rules)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = AccessRulesSerializer(rules, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            log_admin_action(request, "update_access_rules", updated)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


# ========== NOTIFICATIONS ==========
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def notification_settings_view(request):
    settings, created = NotificationSettings.objects.get_or_create(pk=1)

    if request.method == 'GET':
        serializer = NotificationSettingsSerializer(settings)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = NotificationSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            log_admin_action(request, "update_notification_settings", updated)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


# ========== FACULTÉS ==========
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def faculties_view(request):
    if request.method == 'GET':
        faculties = Faculty.objects.all()
        status_filter = request.query_params.get('status', 'active')
        search = request.query_params.get('search', '').strip()

        if status_filter == 'active':
            faculties = faculties.filter(is_active=True)
        elif status_filter == 'inactive':
            faculties = faculties.filter(is_active=False)

        if search:
            faculties = faculties.filter(Q(name__icontains=search) | Q(code__icontains=search))

        serializer = FacultySerializer(faculties, many=True)
        return Response(serializer.data)

    serializer = FacultySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def faculty_detail_view(request, pk):
    try:
        faculty = Faculty.objects.get(pk=pk)
    except Faculty.DoesNotExist:
        return Response({'error': 'Faculté introuvable'}, status=404)

    serializer = FacultySerializer(faculty, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def faculty_deactivate_view(request, pk):
    try:
        faculty = Faculty.objects.get(pk=pk)
    except Faculty.DoesNotExist:
        return Response({'error': 'Faculté introuvable'}, status=404)

    faculty.is_active = False
    faculty.deactivated_at = timezone.now()
    faculty.save(update_fields=['is_active', 'deactivated_at'])
    Promotion.objects.filter(faculty=faculty, is_active=True).update(
        is_active=False,
        deactivated_at=timezone.now(),
    )
    Department.objects.filter(faculty=faculty, is_active=True).update(
        is_active=False,
        deactivated_at=timezone.now(),
    )
    disable_cards_for_faculty(faculty)
    log_admin_action(request, "deactivate_faculty", faculty, {"cascade_promotions": True})
    return Response({'message': 'Faculté et promotions associées désactivées'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def faculty_reactivate_view(request, pk):
    try:
        faculty = Faculty.objects.get(pk=pk)
    except Faculty.DoesNotExist:
        return Response({'error': 'Faculté introuvable'}, status=404)

    faculty.is_active = True
    faculty.deactivated_at = None
    faculty.save(update_fields=['is_active', 'deactivated_at'])
    log_admin_action(request, "reactivate_faculty", faculty)
    serializer = FacultySerializer(faculty)
    return Response(serializer.data)


# ========== DÉPARTEMENTS ==========
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def departments_view(request):
    if request.method == 'GET':
        departments = Department.objects.select_related('faculty').all()
        faculty_id = request.query_params.get('faculty_id')
        status_filter = request.query_params.get('status', 'active')

        if faculty_id:
            departments = departments.filter(faculty_id=faculty_id)
        if status_filter == 'active':
            departments = departments.filter(is_active=True)
        elif status_filter == 'inactive':
            departments = departments.filter(is_active=False)

        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)

    serializer = DepartmentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def department_detail_view(request, pk):
    try:
        department = Department.objects.get(pk=pk)
    except Department.DoesNotExist:
        return Response({'error': 'Département introuvable'}, status=404)

    serializer = DepartmentSerializer(department, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ========== ANNÉES ACADÉMIQUES ==========
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def academic_years_view(request):
    if request.method == 'GET':
        years = AcademicYear.objects.all()
        serializer = AcademicYearSerializer(years, many=True)
        return Response(serializer.data)

    serializer = AcademicYearSerializer(data=request.data)
    if serializer.is_valid():
        if serializer.validated_data.get('is_current'):
            AcademicYear.objects.filter(is_current=True).update(is_current=False)
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def academic_year_detail_view(request, pk):
    try:
        year = AcademicYear.objects.get(pk=pk)
    except AcademicYear.DoesNotExist:
        return Response({'error': 'Année académique introuvable'}, status=404)

    serializer = AcademicYearSerializer(year, data=request.data, partial=True)
    if serializer.is_valid():
        if serializer.validated_data.get('is_current'):
            AcademicYear.objects.exclude(pk=pk).filter(is_current=True).update(is_current=False)
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ========== PROMOTIONS ==========
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def promotions_view(request):
    if request.method == 'GET':
        promotions = Promotion.objects.select_related('faculty', 'department').all()
        faculty_id = request.query_params.get('faculty_id')
        department_id = request.query_params.get('department_id')
        status_filter = request.query_params.get('status', 'active')
        search = request.query_params.get('search', '').strip()

        if faculty_id:
            promotions = promotions.filter(faculty_id=faculty_id)
        if department_id:
            promotions = promotions.filter(department_id=department_id)
        if status_filter == 'active':
            promotions = promotions.filter(is_active=True, faculty__is_active=True)
        elif status_filter == 'inactive':
            promotions = promotions.filter(Q(is_active=False) | Q(faculty__is_active=False))
        if search:
            promotions = promotions.filter(Q(name__icontains=search) | Q(code__icontains=search))

        serializer = PromotionSerializer(promotions, many=True)
        return Response(serializer.data)

    serializer = PromotionSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def promotion_detail_view(request, pk):
    try:
        promotion = Promotion.objects.get(pk=pk)
    except Promotion.DoesNotExist:
        return Response({'error': 'Promotion introuvable'}, status=404)

    serializer = PromotionSerializer(promotion, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promotion_deactivate_view(request, pk):
    try:
        promotion = Promotion.objects.get(pk=pk)
    except Promotion.DoesNotExist:
        return Response({'error': 'Promotion introuvable'}, status=404)

    now = timezone.now()
    promotion.is_active = False
    promotion.deactivated_at = now
    promotion.save(update_fields=['is_active', 'deactivated_at'])
    Enrollment.objects.filter(promotion=promotion, is_active=True).update(
        is_active=False,
        ended_at=now,
    )
    disable_cards_for_promotion(promotion)
    log_admin_action(
        request,
        "deactivate_promotion",
        promotion,
        {"cascade_enrollments": True, "cards_disabled": True},
    )
    return Response({'message': 'Promotion, inscriptions et cartes associées désactivées'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promotion_reactivate_view(request, pk):
    try:
        promotion = Promotion.objects.select_related('faculty').get(pk=pk)
    except Promotion.DoesNotExist:
        return Response({'error': 'Promotion introuvable'}, status=404)

    if not promotion.faculty.is_active:
        return Response(
            {'error': 'Impossible de réactiver la promotion : la faculté est désactivée'},
            status=400,
        )

    promotion.is_active = True
    promotion.deactivated_at = None
    promotion.save(update_fields=['is_active', 'deactivated_at'])
    log_admin_action(request, "reactivate_promotion", promotion)
    serializer = PromotionSerializer(promotion)
    return Response(serializer.data)


# ========== INSCRIPTIONS ==========
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def enrollments_view(request):
    if request.method == 'GET':
        enrollments = Enrollment.objects.select_related(
            'student', 'faculty', 'department', 'promotion', 'academic_year'
        ).all()
        student_id = request.query_params.get('student_id')
        faculty_id = request.query_params.get('faculty_id')
        promotion_id = request.query_params.get('promotion_id')
        academic_year_id = request.query_params.get('academic_year_id')
        status_filter = request.query_params.get('status', 'active')

        if student_id:
            enrollments = enrollments.filter(student_id=student_id)
        if faculty_id:
            enrollments = enrollments.filter(faculty_id=faculty_id)
        if promotion_id:
            enrollments = enrollments.filter(promotion_id=promotion_id)
        if academic_year_id:
            enrollments = enrollments.filter(academic_year_id=academic_year_id)
        if status_filter == 'active':
            enrollments = enrollments.filter(
                is_active=True,
                faculty__is_active=True,
                promotion__is_active=True,
            )
        elif status_filter == 'inactive':
            enrollments = enrollments.filter(is_active=False)

        serializer = EnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)

    serializer = EnrollmentSerializer(data=request.data)
    if serializer.is_valid():
        enrollment = serializer.save()
        Student.objects.filter(pk=enrollment.student_id).update(
            faculty=enrollment.faculty,
            promotion=enrollment.promotion,
            academic_year=enrollment.academic_year,
        )
        return Response(EnrollmentSerializer(enrollment).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def student_transfer_view(request, pk):
    try:
        student = Student.objects.get(pk=pk)
    except Student.DoesNotExist:
        return Response({'error': 'Étudiant introuvable'}, status=404)

    target_promotion_id = request.data.get('promotion_id')
    target_year_id = request.data.get('academic_year_id')
    target_department_id = request.data.get('department_id')

    if not target_promotion_id or not target_year_id:
        return Response({'error': 'promotion_id et academic_year_id sont requis'}, status=400)

    try:
        promotion = Promotion.objects.get(pk=target_promotion_id)
        academic_year = AcademicYear.objects.get(pk=target_year_id)
    except (Promotion.DoesNotExist, AcademicYear.DoesNotExist):
        return Response({'error': 'Promotion ou année académique introuvable'}, status=404)

    department = None
    if target_department_id:
        try:
            department = Department.objects.get(pk=target_department_id)
        except Department.DoesNotExist:
            return Response({'error': 'Département introuvable'}, status=404)

    ended_enrollment_ids = list(
        Enrollment.objects.filter(student=student, is_active=True).values_list("id", flat=True)
    )
    now = timezone.now()
    Enrollment.objects.filter(student=student, is_active=True).update(is_active=False, ended_at=now)
    expire_cards_for_enrollments(ended_enrollment_ids)

    enrollment, created = Enrollment.objects.update_or_create(
        student=student,
        academic_year=academic_year,
        defaults={
            'faculty': promotion.faculty,
            'department': department,
            'promotion': promotion,
            'is_active': True,
            'ended_at': None,
        }
    )

    student.faculty = promotion.faculty
    student.promotion = promotion
    student.academic_year = academic_year
    student.save(update_fields=['faculty', 'promotion', 'academic_year'])
    log_admin_action(request, "transfer_student", student, {"enrollment_id": enrollment.id})

    serializer = EnrollmentSerializer(enrollment)
    return Response(serializer.data)


# ========== FINANCE ÉTUDIANTS ==========
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def financial_statuses_view(request):
    if request.method == 'GET':
        statuses = StudentFinancialStatus.objects.select_related('student', 'academic_year').all()
        student_id = request.query_params.get('student_id')
        academic_year_id = request.query_params.get('academic_year_id')
        good_standing = request.query_params.get('good_standing')

        if student_id:
            statuses = statuses.filter(student_id=student_id)
        if academic_year_id:
            statuses = statuses.filter(academic_year_id=academic_year_id)
        if good_standing in ['true', 'false']:
            statuses = statuses.filter(is_in_good_standing=(good_standing == 'true'))

        serializer = StudentFinancialStatusSerializer(statuses, many=True)
        return Response(serializer.data)

    serializer = StudentFinancialStatusSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def financial_status_detail_view(request, pk):
    try:
        financial_status = StudentFinancialStatus.objects.get(pk=pk)
    except StudentFinancialStatus.DoesNotExist:
        return Response({'error': 'Statut financier introuvable'}, status=404)

    serializer = StudentFinancialStatusSerializer(financial_status, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

# ========== ÉTUDIANTS ==========
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def students_view(request):
    if request.method == 'GET':
        active_enrollments = Enrollment.objects.filter(
            student_id=OuterRef('pk'),
            is_active=True,
        )
        students = Student.objects.prefetch_related(
            Prefetch(
                'enrollments',
                queryset=Enrollment.objects.filter(is_active=True).select_related(
                    'faculty', 'promotion', 'academic_year'
                ),
            )
        ).all()
        search = request.query_params.get('search', '')
        faculty_id = request.query_params.get('faculty_id')
        promotion_id = request.query_params.get('promotion_id')
        academic_year_id = request.query_params.get('academic_year_id')

        if search:
            students = students.filter(
                Q(matricule__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        if faculty_id:
            students = students.filter(
                Exists(active_enrollments.filter(faculty_id=faculty_id))
            )
        if promotion_id:
            students = students.filter(
                Exists(active_enrollments.filter(promotion_id=promotion_id))
            )
        if academic_year_id:
            students = students.filter(
                Exists(active_enrollments.filter(academic_year_id=academic_year_id))
            )

        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = StudentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def student_detail_view(request, pk):
    try:
        student = Student.objects.get(pk=pk)
    except Student.DoesNotExist:
        return Response({'error': 'Étudiant introuvable'}, status=404)

    if request.method == 'GET':
        serializer = StudentSerializer(student)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = StudentSerializer(student, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        student.delete()
        return Response({'message': 'Étudiant supprimé'}, status=204)
    
# ========== CARTES RFID ==========
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def cards_view(request):
    if request.method == 'GET':
        cards = Card.objects.select_related(
            'student', 'enrollment', 'enrollment__student', 'enrollment__faculty',
            'enrollment__promotion', 'enrollment__academic_year'
        ).all()
        status_filter = request.query_params.get('status', 'active')
        search = request.query_params.get('search', '').strip()
        faculty_id = request.query_params.get('faculty_id')
        promotion_id = request.query_params.get('promotion_id')

        if status_filter in [
            Card.STATUS_ACTIVE,
            Card.STATUS_DISABLED,
            Card.STATUS_LOST,
            Card.STATUS_EXPIRED,
        ]:
            cards = cards.filter(status=status_filter)
        elif status_filter == 'inactive':
            cards = cards.filter(is_active=False)
        elif status_filter == 'active':
            cards = cards.filter(is_active=True)

        if search:
            cards = cards.filter(
                Q(card_uuid__icontains=search) |
                Q(uid__icontains=search) |
                Q(student__matricule__icontains=search) |
                Q(student__first_name__icontains=search) |
                Q(student__last_name__icontains=search)
            )

        if faculty_id:
            cards = cards.filter(enrollment__faculty_id=faculty_id)
        if promotion_id:
            cards = cards.filter(enrollment__promotion_id=promotion_id)

        serializer = CardSerializer(cards, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = CardSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def card_detail_view(request, pk):
    try:
        card = Card.objects.get(pk=pk)
    except Card.DoesNotExist:
        return Response({'error': 'Carte introuvable'}, status=404)

    if request.method == 'GET':
        serializer = CardSerializer(card)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = CardSerializer(card, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(CardSerializer(updated).data)
        return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def card_deactivate_view(request, pk):
    try:
        card = Card.objects.get(pk=pk)
    except Card.DoesNotExist:
        return Response({'error': 'Carte introuvable'}, status=404)

    if card.status == Card.STATUS_DISABLED:
        return Response({'message': 'Carte déjà désactivée'})

    card.status = Card.STATUS_DISABLED
    card.save(update_fields=['status', 'is_active', 'deactivated_at'])
    log_admin_action(request, "deactivate_card", card)

    return Response({'message': 'Carte désactivée'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def card_reactivate_view(request, pk):
    try:
        card = Card.objects.get(pk=pk)
    except Card.DoesNotExist:
        return Response({'error': 'Carte introuvable'}, status=404)

    if card.status == Card.STATUS_ACTIVE:
        return Response({'message': 'Carte déjà active'})

    if card.status == Card.STATUS_EXPIRED:
        return Response(
            {'error': 'Carte expirée avec l\'inscription. Créez une nouvelle carte.'},
            status=400,
        )

    serializer = CardSerializer(card, data={'status': Card.STATUS_ACTIVE}, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    card = serializer.save()
    log_admin_action(request, "reactivate_card", card)

    return Response(CardSerializer(card).data)


# ========== JOURNAL D'ACCÈS RFID ==========
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def access_events_view(request):
    if request.method == 'GET':
        events = AccessEvent.objects.select_related(
            'card', 'student', 'faculty', 'promotion', 'academic_year'
        ).all()

        result = request.query_params.get('result')
        reason = request.query_params.get('reason')
        faculty_id = request.query_params.get('faculty_id')
        promotion_id = request.query_params.get('promotion_id')
        academic_year_id = request.query_params.get('academic_year_id')
        page = request.query_params.get('page')
        try:
            page_size = min(int(request.query_params.get('page_size', 50)), 100)
        except (TypeError, ValueError):
            page_size = 50

        if result in [AccessEvent.RESULT_ALLOWED, AccessEvent.RESULT_DENIED]:
            events = events.filter(result=result)
        if reason:
            events = events.filter(reason=reason)
        if faculty_id:
            events = events.filter(faculty_id=faculty_id)
        if promotion_id:
            events = events.filter(promotion_id=promotion_id)
        if academic_year_id:
            events = events.filter(academic_year_id=academic_year_id)

        if page:
            paginator = Paginator(events, page_size)
            current_page = paginator.get_page(page)
            serializer = AccessEventSerializer(current_page.object_list, many=True)
            return Response({
                'results': serializer.data,
                'count': paginator.count,
                'page': current_page.number,
                'page_size': page_size,
                'num_pages': paginator.num_pages,
                'has_next': current_page.has_next(),
                'has_previous': current_page.has_previous(),
            })

        serializer = AccessEventSerializer(events[:500], many=True)
        return Response(serializer.data)

    serializer = AccessEventSerializer(data=request.data)
    if serializer.is_valid():
        event = serializer.save()
        log_admin_action(request, "create_access_event", event)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rfid_scan_view(request):
    serializer = RFIDScanRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    scan = process_rfid_scan(**serializer.validated_data)
    event_data = AccessEventSerializer(scan["event"]).data
    response = {
        "allowed": scan["allowed"],
        "result": scan["result"],
        "reason": scan["reason"],
        "message": scan["message"],
        "duplicate": scan["duplicate"],
        "event": event_data,
    }
    return Response(response, status=200 if scan["duplicate"] else 201)


# ========== DASHBOARD ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    today = timezone.localdate()

    total_students = Student.objects.count()
    active_students = Enrollment.objects.filter(
        is_active=True,
        faculty__is_active=True,
        promotion__is_active=True,
        academic_year__is_active=True,
    ).values("student_id").distinct().count()
    faculty_stats = Faculty.objects.aggregate(
        total_faculties=Count("id"),
        active_faculties=Count("id", filter=Q(is_active=True)),
        inactive_faculties=Count("id", filter=Q(is_active=False)),
    )
    promotion_stats = Promotion.objects.aggregate(
        total_promotions=Count("id"),
        active_promotions=Count("id", filter=Q(is_active=True, faculty__is_active=True)),
        inactive_promotions=Count("id", filter=Q(is_active=False) | Q(faculty__is_active=False)),
    )

    card_stats = Card.objects.aggregate(
        total_cards=Count("id"),
        active_cards=Count("id", filter=Q(status=Card.STATUS_ACTIVE)),
        disabled_cards=Count("id", filter=Q(status=Card.STATUS_DISABLED)),
        expired_cards=Count("id", filter=Q(status=Card.STATUS_EXPIRED)),
        assigned_cards=Count("id", filter=Q(student__isnull=False) | Q(enrollment__isnull=False)),
        unassigned_cards=Count("id", filter=Q(student__isnull=True, enrollment__isnull=True)),
    )

    access_today = AccessEvent.objects.filter(created_at__date=today).aggregate(
        allowed_today=Count("id", filter=Q(result=AccessEvent.RESULT_ALLOWED)),
        denied_today=Count("id", filter=Q(result=AccessEvent.RESULT_DENIED)),
        denied_unpaid_today=Count("id", filter=Q(reason=AccessEvent.REASON_UNPAID_FEES)),
        denied_disabled_today=Count("id", filter=Q(reason=AccessEvent.REASON_DISABLED_CARD)),
    )

    return Response({
        'total_students': total_students,
        'active_students': active_students,
        'total_faculties': faculty_stats['total_faculties'],
        'active_faculties': faculty_stats['active_faculties'],
        'inactive_faculties': faculty_stats['inactive_faculties'],
        'total_promotions': promotion_stats['total_promotions'],
        'active_promotions': promotion_stats['active_promotions'],
        'inactive_promotions': promotion_stats['inactive_promotions'],
        'total_cards': card_stats['total_cards'],
        'active_cards': card_stats['active_cards'],
        'disabled_cards': card_stats['disabled_cards'],
        'expired_cards': card_stats['expired_cards'],
        'assigned_cards': card_stats['assigned_cards'],
        'unassigned_cards': card_stats['unassigned_cards'],
        'allowed_today': access_today['allowed_today'],
        'denied_today': access_today['denied_today'],
        'denied_unpaid_today': access_today['denied_unpaid_today'],
        'denied_disabled_today': access_today['denied_disabled_today'],
    })