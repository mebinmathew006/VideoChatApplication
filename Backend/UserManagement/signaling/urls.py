from django.urls import path
from . import consumers

urlpatterns = [
    path('ws/signaling/', consumers.SignalingConsumer.as_asgi()),
]