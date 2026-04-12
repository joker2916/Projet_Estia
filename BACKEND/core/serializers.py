from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UniversityInfo, Role, UserProfile,
    RFIDSettings, AccessRules, NotificationSettings, Student, Card
)


class UniversityInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = UniversityInfo
        fields = '__all__'


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    active = serializers.BooleanField(source='is_active')

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'active', 'role']

    def get_role(self, obj):
        if hasattr(obj, 'profile') and obj.profile.role:
            return obj.profile.role.name
        return "Aucun"


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

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'

class CardSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Card
        fields = '__all__'

    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name} ({obj.student.matricule})"
        return "Non assignée"