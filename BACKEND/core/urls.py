from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('login/', views.login_view, name='login'),

    # Dashboard
    path('dashboard/', views.dashboard_view, name='dashboard'),

    # Info générale
    path('settings/university/', views.university_info_view, name='university-info'),

    # Rôles
    path('settings/roles/', views.roles_view, name='roles'),
    path('settings/roles/<int:pk>/', views.role_detail_view, name='role-detail'),
    path('settings/roles/bootstrap-direction/', views.bootstrap_direction_roles_view, name='roles-bootstrap-direction'),
    path('settings/permissions/', views.permissions_view, name='permissions'),
    path('settings/permissions/<int:pk>/', views.permission_detail_view, name='permission-detail'),

    # Utilisateurs
    path('settings/users/', views.users_view, name='users'),
    path('settings/users/<int:pk>/toggle/', views.user_toggle_view, name='user-toggle'),
    path('settings/users/<int:pk>/assign-role/', views.user_assign_role_view, name='user-assign-role'),
    path('settings/users/<int:pk>/reset-password/', views.user_reset_password_view, name='user-reset-password'),

    # RFID
    path('settings/rfid/', views.rfid_settings_view, name='rfid-settings'),

    # Règles d'accès
    path('settings/access/', views.access_rules_view, name='access-rules'),

    # Notifications
    path('settings/notifications/', views.notification_settings_view, name='notification-settings'),

    # Structure académique
    path('faculties/', views.faculties_view, name='faculties'),
    path('faculties/<int:pk>/', views.faculty_detail_view, name='faculty-detail'),
    path('faculties/<int:pk>/deactivate/', views.faculty_deactivate_view, name='faculty-deactivate'),
    path('faculties/<int:pk>/reactivate/', views.faculty_reactivate_view, name='faculty-reactivate'),

    path('departments/', views.departments_view, name='departments'),
    path('departments/<int:pk>/', views.department_detail_view, name='department-detail'),

    path('academic-years/', views.academic_years_view, name='academic-years'),
    path('academic-years/<int:pk>/', views.academic_year_detail_view, name='academic-year-detail'),

    path('promotions/', views.promotions_view, name='promotions'),
    path('promotions/<int:pk>/', views.promotion_detail_view, name='promotion-detail'),
    path('promotions/<int:pk>/deactivate/', views.promotion_deactivate_view, name='promotion-deactivate'),
    path('promotions/<int:pk>/reactivate/', views.promotion_reactivate_view, name='promotion-reactivate'),

    path('enrollments/', views.enrollments_view, name='enrollments'),
    path('students/<int:pk>/transfer/', views.student_transfer_view, name='student-transfer'),

    path('financial-statuses/', views.financial_statuses_view, name='financial-statuses'),
    path('financial-statuses/<int:pk>/', views.financial_status_detail_view, name='financial-status-detail'),

    # Étudiants
    path('students/', views.students_view, name='students'),
    path('students/<int:pk>/', views.student_detail_view, name='student-detail'),

    # Cartes RFID
    path('cards/', views.cards_view, name='cards'),
    path('cards/<int:pk>/', views.card_detail_view, name='card-detail'),
    path('cards/<int:pk>/deactivate/', views.card_deactivate_view, name='card-deactivate'),
    path('cards/<int:pk>/reactivate/', views.card_reactivate_view, name='card-reactivate'),

    # Accès RFID
    path('access-events/', views.access_events_view, name='access-events'),
    path('device/access-check/', views.device_access_check_view, name='device-access-check'),
]

