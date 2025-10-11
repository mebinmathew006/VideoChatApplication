from channels.routing import ProtocolTypeRouter, URLRouter
from signaling.middleware import JWTAuthMiddleware
from django.core.asgi import get_asgi_application
import signaling.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(signaling.routing.websocket_urlpatterns)
    ),
})
