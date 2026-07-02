from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UniversityInfo, Role, Permission, UserProfile,
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
    name = serializers.CharField(read_only=True)
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Promotion
        fields = '__all__'
        extra_kwargs = {
            'level': {'required': True, 'allow_blank': False},
        }

    def _build_name(self, level):
        return level.strip()

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        faculty = attrs.get('faculty', instance.faculty if instance else None)
        level = attrs.get('level', instance.level if instance else '')
        code = attrs.get('code', instance.code if instance else '')

        if not faculty:
            raise serializers.ValidationError({'faculty': 'La faculté est requise.'})

        level_clean = (level or '').strip()
        if not level_clean:
            raise serializers.ValidationError({'level': 'Le niveau/promotion est requis.'})

        code_clean = (code or '').strip()
        attrs['level'] = level_clean
        attrs['code'] = code_clean
        attrs['name'] = self._build_name(level_clean)

        existing = Promotion.objects.filter(faculty=faculty)
        if instance:
            existing = existing.exclude(pk=instance.pk)

        if existing.filter(name=attrs['name']).exists():
            raise serializers.ValidationError({'level': 'Une promotion avec ce niveau existe déjà dans cette faculté.'})

        if existing.filter(code=code_clean).exists():
            raise serializers.ValidationError({'code': 'Une promotion avec ce code existe déjà dans cette faculté.'})

        return attrs

class StudentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    promotion_name = serializers.CharField(source='promotion.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)

    class Meta:
        model = Student
        fields = '__all__'


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    promotion_name = serializers.CharField(source='promotion.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)

    class Meta:
        model = Enrollment
        fields = '__all__'

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name} ({obj.student.matricule})"


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
    uid = serializers.CharField(source='card.uid', read_only=True)
    faculty_name = serializers.CharField(source='faculty.name', read_only=True)
    promotion_name = serializers.CharField(source='promotion.name', read_only=True)

    class Meta:
        model = AccessEvent
        fields = '__all__'

    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name} ({obj.student.matricule})"
        return ""