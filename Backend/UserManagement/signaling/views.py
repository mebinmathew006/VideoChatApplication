# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# from django.utils.decorators import method_decorator
# from django.views.generic import View
# from User.models import Room, RoomParticipant
# import json

# @method_decorator(csrf_exempt, name='dispatch')
# class RoomStatusView(View):
#     def get(self, request, room_id):
#         try:
#             room = Room.objects.get(room_id=room_id, is_active=True)
#             participants = RoomParticipant.objects.filter(
#                 room=room, 
#                 is_connected=True
#             ).count()
            
#             return JsonResponse({
#                 'room_id': room_id,
#                 'participant_count': participants,
#                 'is_active': room.is_active
#             })
#         except Room.DoesNotExist:
#             return JsonResponse({
#                 'room_id': room_id,
#                 'participant_count': 0,
#                 'is_active': False
#             })

# @method_decorator(csrf_exempt, name='dispatch')
# class CreateRoomView(View):
#     def post(self, request):
#         try:
#             data = json.loads(request.body)
#             room_id = data.get('room_id')
            
#             if not room_id:
#                 return JsonResponse({'error': 'Room ID is required'}, status=400)
            
#             room, created = Room.objects.get_or_create(
#                 room_id=room_id,
#                 defaults={'is_active': True}
#             )
            
#             return JsonResponse({
#                 'room_id': room.room_id,
#                 'created': created,
#                 'is_active': room.is_active
#             })
#         except json.JSONDecodeError:
#             return JsonResponse({'error': 'Invalid JSON'}, status=400)