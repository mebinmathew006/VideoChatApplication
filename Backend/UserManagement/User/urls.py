from django.urls import path
from .views import UserSignupView,Login,RoomListCreateView,TokenRefreshFromCookieView



urlpatterns = [
    path('v1/auth/signup',UserSignupView.as_view() , name= 'signup'),
    path('v1/auth/login',Login.as_view() , name= 'login'),
    path('v1/rooms',RoomListCreateView.as_view() , name= 'roomcreation'),
    path('v1/auth/refresh', TokenRefreshFromCookieView.as_view(), name='token_refresh'),  
]

