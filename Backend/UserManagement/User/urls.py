from django.urls import path
from .views import UserSignupView,Login,RoomListCreateView
from rest_framework_simplejwt.views import  TokenRefreshView



urlpatterns = [
    path('api/v1/auth/signup',UserSignupView.as_view() , name= 'signup'),
    path('api/v1/auth/login',Login.as_view() , name= 'login'),
    path('api/v1/rooms',RoomListCreateView.as_view() , name= 'roomcreation'),
    path('api/v1/auth/refresh', TokenRefreshView.as_view(), name='token_refresh'),  
]