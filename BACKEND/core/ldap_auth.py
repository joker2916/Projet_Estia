from django.contrib.auth import authenticate

from .models import Student


def authenticate_student(matricule, password):
    student = Student.objects.filter(matricule=matricule).first()
    if not student or not student.check_portal_password(password):
        return None
    return student


def authenticate_professor(username, password):
    user = authenticate(username=username, password=password)
    if not user:
        return None
    profile = getattr(user, "professor_profile", None)
    if not profile or not profile.active:
        return None
    return user
