import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny,IsAuthenticated
from django.core.exceptions import ValidationError
from .serializers import UserSignupSerializer,LoginSerializer
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RoomSerializer
from .models import Room, User
from django.db.models import Q
from jwt import decode
from rest_framework_simplejwt.exceptions import TokenError
from django.conf import settings
from rest_framework.pagination import PageNumberPagination


logger = logging.getLogger(__name__)


class PaginationClass(PageNumberPagination):
    page_size = 6
    page_size_query_param = 'page_size'
    max_page_size = 100

class UserSignupView(APIView):
    permission_classes = [AllowAny] 
     
    def post(self, request):
        try:
            
            serializer = UserSignupSerializer(data=request.data)
            if not serializer.is_valid():
                logger.warning(f"User signup validation failed: {serializer.errors}")
                return Response(
                    {
                        "status": "error",
                        "message": "Invalid input data",
                        "errors": serializer.errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
                
            serializer.save()
            logger.info("New user registered successfully")
            return Response(
                {
                    "status": "success",
                    "message": "User registered successfully",
                    "data": serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            logger.error(f"Validation error during user signup: {str(e)}")
            return Response(
                {
                    "status": "error",
                    "message": "Validation error",
                    "errors": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.critical(f"Unexpected error in UserSignupView: {str(e)}", exc_info=True)
            return Response(
                {
                    "status": "error",
                    "message": "An unexpected error occurred",
                    
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    
   
class Login(APIView):
    permission_classes = [AllowAny]  
    
    def post(self, request):
        try:
            serializer = LoginSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {
                        "status":"error",
                        "message":"User Login validation failed",
                        "errors": serializer.errors
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            email =serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(request, username=email, password=password)

            if user:
                refresh_token= RefreshToken.for_user(user)
                access_token = refresh_token.access_token
                response = Response({
                        'user': {
                            'access_token': str(access_token),
                            'id': user.id,
                            'name': user.name,
                            'email': user.email,
                        }
                            }, status=status.HTTP_200_OK)
        
                response.set_cookie(
                            key='refresh_token',
                            value=refresh_token, 
                            httponly=True,
                            secure=False,
                            samesite=None,
                            max_age=60 * 60 * 24 ,
                        )
                return response
            return Response(
                    {
                        "status":"error",
                        "message":"Invalid Credentials",
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e :
            logger.critical(f"Unexpected Error in Login {str(e)}")
            
            return Response(
                {
                    "status":"error",
                    "messasge": "An unexpected error happend"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RoomListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = PaginationClass

    def get(self, request):
        """
        List all active rooms of the authenticated user with optional search and pagination.
        """
        try:
            search = request.GET.get("search", "").strip()
            is_active = request.GET.get("active", "true").lower() == "true"

            # Filter rooms owned by current user and active status
            rooms = Room.objects.filter(is_active=is_active)

            # Search by name or description
            if search:
                rooms = rooms.filter(Q(name__icontains=search) | Q(description__icontains=search))

            # Order by creation date descending
            rooms = rooms.order_by("-created_at")

            # Pagination
            paginator = self.pagination_class()
            paginated_rooms = paginator.paginate_queryset(rooms, request)
            serializer = RoomSerializer(paginated_rooms, many=True)

            return paginator.get_paginated_response(serializer.data)

        except Exception as e:
            logger.exception(f"{e} - Error fetching rooms")
            return Response(
                {"error": "An error occurred while fetching rooms", "details": str(e)},
                status=500,
            )

    def post(self, request):
        """
        Create a new room with the authenticated user as owner.
        """
        try:
            name = request.data.get("name", "").strip()
            description = request.data.get("description", "").strip()

            # Validation
            if not name:
                return Response({"error": "Room name is required", "field": "name"}, status=400)
            if len(name) > 120:
                return Response(
                    {"error": "Room name cannot exceed 120 characters", "field": "name"}, status=400
                )

            # Check duplicate room name for this user
            if Room.objects.filter(owner=request.user, name__iexact=name).exists():
                return Response(
                    {"error": "You already have a room with this name", "field": "name"}, status=400
                )

            # Create room
            room = Room.objects.create(name=name, description=description, owner=request.user, is_active=True)
            serializer = RoomSerializer(room)
            return Response({"message": "Room created successfully", "room": serializer.data}, status=201)

        except Exception as e:
            logger.exception(f"{e} - Error creating room")
            return Response(
                {"error": "An error occurred while creating the room", "details": str(e)},
                status=500,
            )
    
class TokenRefreshFromCookieView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        # Extract the refresh token from cookies
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response(
                {"detail": "Refresh token not provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Create a RefreshToken instance and generate a new access token
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)

            # Decode refresh token
            refresh_payload = decode(refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = refresh_payload['user_id']
           
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

            # Create response with access token and user details in body
            response = Response({
                    'access_token': access_token,
            }, status=status.HTTP_200_OK)
            return response
        except TokenError as e:
            return Response(
                {"detail": f"Invalid or expired refresh token.{e}"},
                status=status.HTTP_401_UNAUTHORIZED,
            )