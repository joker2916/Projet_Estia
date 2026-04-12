from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('login/', views.login_view, name='login'),

    # Info générale
    path('settings/university/', views.university_info_view, name='university-info'),

    # Rôles
    path('settings/roles/', views.roles_view, name='roles'),
    path('settings/roles/<int:pk>/', views.role_detail_view, name='role-detail'),

    # Utilisateurs
    path('settings/users/', views.users_view, name='users'),
    path('settings/users/<int:pk>/toggle/', views.user_toggle_view, name='user-toggle'),
    path('settings/users/<int:pk>/reset-password/', views.user_reset_password_view, name='user-reset-password'),

    # RFID
    path('settings/rfid/', views.rfid_settings_view, name='rfid-settings'),

    # Règles d'accès
    path('settings/access/', views.access_rules_view, name='access-rules'),

    # Notifications
    path('settings/notifications/', views.notification_settings_view, name='notification-settings'),

    # Étudiants
    path('students/', views.students_view, name='students'),
    path('students/<int:pk>/', views.student_detail_view, name='student-detail'),
]