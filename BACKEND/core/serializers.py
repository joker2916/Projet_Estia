from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UniversityInfo, Role, Permission, UserProfile, ProfessorProfile,
    RFIDSettings, AccessRules, NotificationSettings,
    Faculty, Department, AcademicYear, Promotion,
    Student, Enrollment, StudentFinancialStatus,
    Card, AccessEvent
)


class UniversityInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = UniversityInfo
        fields = '__all__'


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = '__all__'


class RoleSerializer(serializers.ModelSerializer):
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
    )
    permission_details = PermissionSerializer(source='permission_refs', many=True, read_only=True)
    permission_codes_read = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'permissions', 'active', 'permission_codes', 'permission_codes_read', 'permission_details']

    def get_permission_codes_read(self, obj):
        refs = list(obj.permission_refs.values_list('code', flat=True))
        if refs:
            return refs
        return obj.permissions or []

    def _sync_permissions(self, role, permission_codes):
        unique_codes = sorted(set(permission_codes or []))
        if unique_codes:
            perms = list(Permission.objects.filter(code__in=unique_codes, active=True))
            role.permission_refs.set(perms)
            role.permissions = [p.code for p in perms]
        else:
            role.permission_refs.clear()
            role.permissions = []
        role.save(update_fields=['permissions'])

    def create(self, validated_data):
        permission_codes = validated_data.pop('permission_codes', validated_data.get('permissions', []))
        role = Role.objects.create(**validated_data)
        self._sync_permissions(role, permission_codes)
        return role

    def update(self, instance, validated_data):
        permission_codes = validated_data.pop('permission_codes', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if permission_codes is not None:
            self._sync_permissions(instance, permission_codes)
        return instance


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    role_id = serializers.SerializerMethodField()
    active = serializers.BooleanField(source='is_active')

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'active', 'role', 'role_id']

    def get_role(self, obj):
        if hasattr(obj, 'profile') and obj.profile.role:
            return obj.profile.role.name
        return "Aucun"

    def get_role_id(self, obj):
        if hasattr(obj, 'profile') and obj.profile.role:
            return obj.profile.role.id
        return None


class ProfessorProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    promotion_details = serializers.SerializerMethodField()

    class Meta:
        model = ProfessorProfile
        fields = ['id', 'user', 'username', 'email', 'promotions', 'promotion_details', 'active']

    def get_promotion_details(self, obj):
        return [
            {
                'id': promotion.id,
                'name': promotion.name,
                'faculty': promotion.faculty.name,
            }
            for promotion in obj.promotions.select_related('faculty').all()
        ]


class RFIDSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RFIDSettings
        fields = '__all__'


class AccessRulesSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessRules
        fields = '__all__'


class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        fields = '__all__'


class FacultySerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = '__all__'


class DepartmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)

    class Meta:
        model = Department
        fields = '__all__'


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'


class PromotionSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Promotion
        fields = '__all__'

    def validate(self, attrs):
        faculty = attrs.get('faculty', getattr(self.instance, 'faculty', None))
        if faculty and not faculty.is_active:
            raise serializers.ValidationError(
                "Impossible de créer ou modifier une promotion dans une faculté inactive."
            )
        start = attrs.get('course_start_date', getattr(self.instance, 'course_start_date', None))
        end = attrs.get('course_end_date', getattr(self.instance, 'course_end_date', None))
        if not start or not end:
            raise serializers.ValidationError(
                "Les dates de debut et de fin des cours sont obligatoires."
            )
        if start > end:
            raise serializers.ValidationError(
                {"course_end_date": "La fin des cours doit etre posterieure ou egale au debut."}
            )
        return attrs

class StudentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.SerializerMethodField()
    promotion_name = serializers.SerializerMethodField()
    academic_year_name = serializers.SerializerMethodField()
    enrollment_status = serializers.SerializerMethodField()
    portal_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Student
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'matricule',
            'portal_password',
            'created_at',
            'faculty_name',
            'promotion_name',
            'academic_year_name',
            'enrollment_status',
        ]

    def _active_enrollment(self, obj):
        cache = getattr(obj, '_prefetched_objects_cache', {})
        if 'enrollments' in cache:
            for enrollment in obj.enrollments.all():
                if enrollment.is_active:
                    return enrollment
            return None
        return (
            obj.enrollments.filter(is_active=True)
            .select_related('faculty', 'promotion', 'academic_year')
            .first()
        )

    def get_faculty_name(self, obj):
        enrollment = self._active_enrollment(obj)
        return enrollment.faculty.name if enrollment and enrollment.faculty else ""

    def get_promotion_name(self, obj):
        enrollment = self._active_enrollment(obj)
        return enrollment.promotion.name if enrollment and enrollment.promotion else ""

    def get_academic_year_name(self, obj):
        enrollment = self._active_enrollment(obj)
        return enrollment.academic_year.name if enrollment and enrollment.academic_year else ""

    def get_enrollment_status(self, obj):
        return "active" if self._active_enrollment(obj) else "none"

    def create(self, validated_data):
        portal_password = validated_data.pop('portal_password', '')
        student = Student(**validated_data)
        if portal_password:
            student.set_portal_password(portal_password)
        student.save()
        return student

    def update(self, instance, validated_data):
        portal_password = validated_data.pop('portal_password', '')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if portal_password:
            instance.set_portal_password(portal_password)
        instance.save()
        return instance


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    promotion_name = serializers.CharField(source='promotion.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    valid_from = serializers.DateField(source='promotion.course_start_date', read_only=True)
    valid_to = serializers.DateField(source='promotion.course_end_date', read_only=True)
    is_within_validity = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = '__all__'

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name} ({obj.student.matricule})"

    def get_is_within_validity(self, obj):
        if not obj.is_active or not obj.promotion_id:
            return False
        return obj.promotion.is_within_course_period()

    def validate(self, attrs):
        is_active = attrs.get('is_active', getattr(self.instance, 'is_active', True))
        student = attrs.get('student', getattr(self.instance, 'student', None))
        faculty = attrs.get('faculty', getattr(self.instance, 'faculty', None))
        promotion = attrs.get('promotion', getattr(self.instance, 'promotion', None))
        department = attrs.get('department', getattr(self.instance, 'department', None))
        academic_year = attrs.get('academic_year', getattr(self.instance, 'academic_year', None))

        if promotion and faculty and promotion.faculty_id != faculty.id:
            raise serializers.ValidationError(
                "La promotion sélectionnée n'appartient pas à cette faculté."
            )
        if department and faculty and department.faculty_id != faculty.id:
            raise serializers.ValidationError(
                "Le département sélectionné n'appartient pas à cette faculté."
            )
        if is_active and faculty and not faculty.is_active:
            raise serializers.ValidationError("La faculté sélectionnée est inactive.")
        if is_active and promotion and not promotion.is_active:
            raise serializers.ValidationError("La promotion sélectionnée est inactive.")
        if is_active and academic_year and not academic_year.is_active:
            raise serializers.ValidationError("L'année académique sélectionnée est inactive.")
        if is_active and student:
            active_enrollments = Enrollment.objects.filter(student=student, is_active=True)
            if self.instance:
                active_enrollments = active_enrollments.exclude(pk=self.instance.pk)
            if active_enrollments.exists():
                raise serializers.ValidationError(
                    "Cet étudiant possède déjà une inscription active."
                )
        return attrs


class StudentFinancialStatusSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)

    class Meta:
        model = StudentFinancialStatus
        fields = '__all__'

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name} ({obj.student.matricule})"

class CardSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    faculty_name = serializers.SerializerMethodField()
    promotion_name = serializers.SerializerMethodField()
    academic_year_name = serializers.SerializerMethodField()

    class Meta:
        model = Card
        fields = '__all__'
        read_only_fields = ['card_uuid', 'deactivated_at', 'created_at']

    def validate(self, attrs):
        status = attrs.get('status', getattr(self.instance, 'status', Card.STATUS_ACTIVE))
        enrollment = attrs.get('enrollment', getattr(self.instance, 'enrollment', None))
        explicit_student = attrs.get('student', getattr(self.instance, 'student', None))
        student = enrollment.student if enrollment else explicit_student

        if status == Card.STATUS_ACTIVE and not enrollment:
            raise serializers.ValidationError(
                "Une carte active doit être liée à une inscription active."
            )
        if enrollment and explicit_student and enrollment.student_id != explicit_student.id:
            raise serializers.ValidationError(
                "L'étudiant de la carte doit correspondre à l'inscription."
            )
        if status == Card.STATUS_ACTIVE and enrollment:
            if not enrollment.is_active:
                raise serializers.ValidationError("L'inscription liée à la carte est inactive.")
            if not enrollment.faculty.is_active or not enrollment.promotion.is_active:
                raise serializers.ValidationError(
                    "La faculté et la promotion liées à la carte doivent être actives."
                )
            if not enrollment.promotion.is_within_course_period():
                raise serializers.ValidationError(
                    "La promotion est hors de sa période de cours."
                )
        if status == Card.STATUS_ACTIVE and student:
            settings = RFIDSettings.objects.first()
            max_cards = settings.max_cards_per_student if settings else 1
            active_cards = Card.objects.filter(student=student, status=Card.STATUS_ACTIVE)
            if self.instance:
                active_cards = active_cards.exclude(pk=self.instance.pk)
            if active_cards.count() >= max_cards:
                raise serializers.ValidationError(
                    f"Cet étudiant possède déjà {max_cards} carte(s) active(s)."
                )
        return attrs

    def create(self, validated_data):
        if validated_data.get('enrollment'):
            validated_data['student'] = validated_data['enrollment'].student
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if validated_data.get('enrollment'):
            validated_data['student'] = validated_data['enrollment'].student
        return super().update(instance, validated_data)

    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name} ({obj.student.matricule})"
        return "Non assignée"

    def get_faculty_name(self, obj):
        if obj.enrollment and obj.enrollment.faculty:
            return obj.enrollment.faculty.name
        if obj.student and obj.student.faculty:
            return obj.student.faculty.name
        return ""

    def get_promotion_name(self, obj):
        if obj.enrollment and obj.enrollment.promotion:
            return obj.enrollment.promotion.name
        if obj.student and obj.student.promotion:
            return obj.student.promotion.name
        return ""

    def get_academic_year_name(self, obj):
        if obj.enrollment and obj.enrollment.academic_year:
            return obj.enrollment.academic_year.name
        if obj.student and obj.student.academic_year:
            return obj.student.academic_year.name
        return ""


class AccessEventSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    card_uuid = serializers.CharField(source='card.card_uuid', read_only=True)
    uid = serializers.SerializerMethodField()
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    promotion_name = serializers.CharField(source='promotion.name', read_only=True)

    class Meta:
        model = AccessEvent
        fields = '__all__'

    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name} ({obj.student.matricule})"
        return ""

    def get_uid(self, obj):
        if obj.card:
            return obj.card.uid
        return obj.raw_uid


class RFIDScanRequestSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=50)
    source = serializers.CharField(max_length=30, required=False, allow_blank=True)
    request_id = serializers.CharField(max_length=100, required=False, allow_blank=True)
    timestamp = serializers.DateTimeField(required=False)