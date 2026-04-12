from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import json

from .models import (
    UniversityInfo, Role, UserProfile,
    RFIDSettings, AccessRules, NotificationSettings
)
from .serializers import (
    UniversityInfoSerializer, RoleSerializer, UserSerializer,
    RFIDSettingsSerializer, AccessRulesSerializer, NotificationSettingsSerializer
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