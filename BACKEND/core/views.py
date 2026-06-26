from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db.models import Q
from django.db import transaction
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import json

from .models import (
    UniversityInfo, Role, Permission, UserProfile,
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
    CardSerializer, AccessEventSerializer
)


DEFAULT_PERMISSION_CATALOG = [
    {"code": "all_access", "label": "Accès total", "module": "global"},
    {"code": "manage_users", "label": "Gérer les utilisateurs", "module": "users"},
    {"code": "manage_roles", "label": "Gérer les rôles", "module": "users"},
    {"code": "manage_students", "label": "Gérer les étudiants", "module": "academics"},
    {"code": "manage_faculties", "label": "Gérer les facultés", "module": "academics"},
    {"code": "manage_promotions", "label": "Gérer les promotions", "module": "academics"},
    {"code": "view_access_logs", "label": "Voir les journaux d'accès", "module": "access"},
    {"code": "manage_cards", "label": "Gérer les cartes RFID", "module": "cards"},
    {"code": "view_financial_status", "label": "Voir statut financier", "module": "finance"},
    {"code": "manage_access_rules", "label": "Gérer les règles d'accès", "module": "access"},
    {"code": "manage_notifications", "label": "Gérer les notifications", "module": "notifications"},
]


DEFAULT_DIRECTION_ROLE_TEMPLATES = {
    "Super Administrateur": [
        "all_access",
        "manage_users",
        "manage_roles",
        "manage_students",
        "manage_faculties",
        "manage_promotions",
        "view_access_logs",
        "manage_cards",
        "view_financial_status",
        "manage_access_rules",
        "manage_notifications",
    ],
    "Recteur": [
        "view_access_logs",
        "view_financial_status",
        "manage_access_rules",
    ],
    "Secretaire General Academique": [
        "manage_students",
        "manage_faculties",
        "manage_promotions",
        "view_access_logs",
    ],
    "Responsable de la Scolarite": [
        "manage_students",
        "manage_faculties",
        "manage_promotions",
        "manage_cards",
    ],
    "Responsable des Finances": [
        "view_financial_status",
        "view_access_logs",
    ],
    "Responsable de la Securite": [
        "view_access_logs",
        "manage_cards",
        "manage_access_rules",
    ],
    "Responsable Informatique": [
        "manage_users",
        "manage_roles",
        "manage_notifications",
        "view_access_logs",
    ],
}


def ensure_default_permissions():
    if Permission.objects.exists():
        return
    Permission.objects.bulk_create([Permission(**item) for item in DEFAULT_PERMISSION_CATALOG])


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
                return JsonResponse({
                    'token': token.key,
                    'username': user.username,
                }, status=200)
            else:
                return JsonResponse({'error': 'Identifiants invalides'}, status=401)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON invalide'}, status=400)

    return JsonResponse({'error': 'Méthode non autorisée'}, status=405)


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
            serializer.save()
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
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
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
        serializer.save()
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
    return Response({'message': f'Mot de passe de {user.username} réinitialisé'})


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
            serializer.save()
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
            serializer.save()
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
            serializer.save()
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
    return Response({'message': 'Faculté désactivée'})


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
            promotions = promotions.filter(is_active=True)
        elif status_filter == 'inactive':
            promotions = promotions.filter(is_active=False)
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

    promotion.is_active = False
    promotion.deactivated_at = timezone.now()
    promotion.save(update_fields=['is_active', 'deactivated_at'])
    return Response({'message': 'Promotion désactivée'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promotion_reactivate_view(request, pk):
    try:
        promotion = Promotion.objects.get(pk=pk)
    except Promotion.DoesNotExist:
        return Response({'error': 'Promotion introuvable'}, status=404)

    promotion.is_active = True
    promotion.deactivated_at = None
    promotion.save(update_fields=['is_active', 'deactivated_at'])
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
            enrollments = enrollments.filter(is_active=True)
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

    Enrollment.objects.filter(student=student, is_active=True).update(is_active=False, ended_at=timezone.now())

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
        students = Student.objects.all()
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
            students = students.filter(faculty_id=faculty_id)
        if promotion_id:
            students = students.filter(promotion_id=promotion_id)
        if academic_year_id:
            students = students.filter(academic_year_id=academic_year_id)

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
            'student', 'enrollment', 'enrollment__faculty', 'enrollment__promotion', 'enrollment__academic_year'
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
            cards = cards.filter(Q(enrollment__faculty_id=faculty_id) | Q(student__faculty_id=faculty_id))
        if promotion_id:
            cards = cards.filter(Q(enrollment__promotion_id=promotion_id) | Q(student__promotion_id=promotion_id))

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

    card.status = Card.STATUS_ACTIVE
    card.save(update_fields=['status', 'is_active', 'deactivated_at'])

    serializer = CardSerializer(card)
    return Response(serializer.data)


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

        serializer = AccessEventSerializer(events[:500], many=True)
        return Response(serializer.data)

    serializer = AccessEventSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


# ========== DASHBOARD ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    today = timezone.localdate()

    total_students = Student.objects.count()
    total_cards = Card.objects.count()
    total_faculties = Faculty.objects.count()
    total_promotions = Promotion.objects.count()

    active_cards = Card.objects.filter(status=Card.STATUS_ACTIVE).count()
    disabled_cards = Card.objects.filter(status=Card.STATUS_DISABLED).count()
    expired_cards = Card.objects.filter(status=Card.STATUS_EXPIRED).count()

    assigned_cards = Card.objects.filter(Q(student__isnull=False) | Q(enrollment__isnull=False)).count()
    unassigned_cards = Card.objects.filter(student__isnull=True, enrollment__isnull=True).count()

    access_today = AccessEvent.objects.filter(created_at__date=today)
    allowed_today = access_today.filter(result=AccessEvent.RESULT_ALLOWED).count()
    denied_today = access_today.filter(result=AccessEvent.RESULT_DENIED).count()
    denied_unpaid_today = access_today.filter(reason=AccessEvent.REASON_UNPAID_FEES).count()
    denied_disabled_today = access_today.filter(reason=AccessEvent.REASON_DISABLED_CARD).count()

    return Response({
        'total_students': total_students,
        'total_faculties': total_faculties,
        'total_promotions': total_promotions,
        'total_cards': total_cards,
        'active_cards': active_cards,
        'disabled_cards': disabled_cards,
        'expired_cards': expired_cards,
        'assigned_cards': assigned_cards,
        'unassigned_cards': unassigned_cards,
        'allowed_today': allowed_today,
        'denied_today': denied_today,
        'denied_unpaid_today': denied_unpaid_today,
        'denied_disabled_today': denied_disabled_today,
    })