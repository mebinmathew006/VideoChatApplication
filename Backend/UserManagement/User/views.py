import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny,IsAuthenticated
from django.core.exceptions import ValidationError
from .serializers import UserSignupSerializer,LoginSerializer
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from .models import Room
from .serializers import RoomSerializer


logger = logging.getLogger(__name__)


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
            logger.warning(f"User signup validation failed: {email},{password},{user}")

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
                            max_age=60 * 60 * 24 
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

    def get(self, request):
        """
        List all active rooms with optional filtering
        """
        try:
            room_type = request.GET.get("type", None)
            search = request.GET.get("search", "").strip()
            is_active = request.GET.get("active", "true").lower() == "true"

            rooms = Room.objects.all()

            if is_active is not None:
                rooms = rooms.filter(is_active=is_active)

            if room_type and room_type in ["video", "chat"]:
                rooms = rooms.filter(type=room_type)

            if search:
                rooms = rooms.filter(
                    name__icontains=search
                ) | Room.objects.filter(description__icontains=search)

            rooms = rooms.order_by("-created_at")

            serializer = RoomSerializer(rooms, many=True)
            return Response({"rooms": serializer.data, "count": rooms.count()}, status=200)
        except Exception as e:
            return Response(
                {"error": "An error occurred while fetching rooms", "details": str(e)},
                status=500,
            )

    def post(self, request):
        """
        Create a new room with the authenticated user as owner
        """
        data = request.data
        name = data.get("name", "").strip()
        room_type = data.get("type", "chat")
        description = data.get("description", "").strip()

       
        if not name:
            return Response(
                {"error": "Room name is required", "field": "name"}, status=400
            )

        if len(name) > 120:
            return Response(
                {"error": "Room name cannot exceed 120 characters", "field": "name"},
                status=400,
            )

        if room_type not in ["video", "chat"]:
            return Response(
                {"error": 'Room type must be either "video" or "chat"', "field": "type"},
                status=400,
            )

        existing_room = Room.objects.filter(
            owner=request.user, name__iexact=name
        ).exists()
        if existing_room:
            return Response(
                {"error": "You already have a room with this name", "field": "name"},
                status=400,
            )

        room = Room.objects.create(
            name=name,
            type=room_type,
            description=description,
            owner=request.user,
            participants=0,
            is_active=True,
        )

        serializer = RoomSerializer(room)
        return Response({"message": "Room created successfully", "room": serializer.data}, status=201)


class RoomDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        """
        Get a specific room by ID
        """
        room = get_object_or_404(Room, id=room_id)
        serializer = RoomSerializer(room)
        return Response({"room": serializer.data}, status=200)

    def put(self, request, room_id):
        """
        Update a room (only owner can update)
        """
        room = get_object_or_404(Room, id=room_id)

        if room.owner != request.user:
            return Response(
                {"error": "You can only update rooms you created"}, status=403
            )

        data = request.data
        if "name" in data:
            name = data["name"].strip()
            if not name:
                return Response(
                    {"error": "Room name cannot be empty", "field": "name"}, status=400
                )
            if len(name) > 120:
                return Response(
                    {"error": "Room name cannot exceed 120 characters", "field": "name"},
                    status=400,
                )
            room.name = name

        if "type" in data:
            room_type = data["type"]
            if room_type not in ["video", "chat"]:
                return Response(
                    {"error": 'Room type must be either "video" or "chat"', "field": "type"},
                    status=400,
                )
            room.type = room_type

        if "description" in data:
            room.description = data["description"].strip()

        if "is_active" in data:
            room.is_active = bool(data["is_active"])

        room.save()
        serializer = RoomSerializer(room)
        return Response({"message": "Room updated successfully", "room": serializer.data}, status=200)

    def delete(self, request, room_id):
        """
        Delete a room (only owner can delete)
        """
        room = get_object_or_404(Room, id=room_id)

        if room.owner != request.user:
            return Response(
                {"error": "You can only delete rooms you created"}, status=403
            )

        room_name = room.name
        room.delete()
        return Response({"message": f'Room "{room_name}" deleted successfully'}, status=200)
