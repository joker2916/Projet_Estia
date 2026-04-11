from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token
import json

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