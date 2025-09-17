import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from User.models import Room, RoomParticipant

logger = logging.getLogger(__name__)

class RoomManager:
    _rooms = {}  
    
    @classmethod
    def add_participant(cls, room_id, user_id, channel_name):
        if room_id not in cls._rooms:
            cls._rooms[room_id] = {'participants': {}}
        cls._rooms[room_id]['participants'][user_id] = channel_name
        logger.info(f"Added {user_id} to room {room_id}. Total: {len(cls._rooms[room_id]['participants'])}")
    
    @classmethod
    def remove_participant(cls, room_id, user_id):
        if room_id in cls._rooms and user_id in cls._rooms[room_id]['participants']:
            del cls._rooms[room_id]['participants'][user_id]
            logger.info(f"Removed {user_id} from room {room_id}")
            
            # Clean up empty rooms
            if not cls._rooms[room_id]['participants']:
                del cls._rooms[room_id]
                logger.info(f"Room {room_id} deleted (empty)")
    
    @classmethod
    def get_participants(cls, room_id, exclude_user=None):
        if room_id not in cls._rooms:
            return []
        participants = list(cls._rooms[room_id]['participants'].keys())
        if exclude_user:
            participants = [p for p in participants if p != exclude_user]
        return participants
    
    @classmethod
    def get_participant_channel(cls, room_id, user_id):
        if room_id in cls._rooms and user_id in cls._rooms[room_id]['participants']:
            return cls._rooms[room_id]['participants'][user_id]
        return None
    
    @classmethod
    def find_user_room(cls, channel_name):
        for room_id, room_data in cls._rooms.items():
            for user_id, ch_name in room_data['participants'].items():
                if ch_name == channel_name:
                    return room_id, user_id
        return None, None

class SignalingConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_id = None
        self.user_id = None
        self.room_group_name = None

    async def connect(self):
        await self.accept()
        logger.info(f"WebSocket connection accepted: {self.channel_name}")

    async def disconnect(self, close_code):
        # Find user's room if not already known
        if not self.room_id or not self.user_id:
            self.room_id, self.user_id = RoomManager.find_user_room(self.channel_name)
        
        # Leave room group
        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            # Notify other participants that user left
            if self.user_id:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_left',
                        'user_id': self.user_id
                    }
                )
                
                # Update database and in-memory storage
                await self.mark_user_disconnected()
                RoomManager.remove_participant(self.room_id, self.user_id)
        
        logger.info(f"WebSocket disconnected: {self.channel_name}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            logger.info(f"Received message: {message_type} from {self.user_id}")
            
            if message_type == 'join-room':
                await self.handle_join_room(data)
            elif message_type == 'leave-room':
                await self.handle_leave_room(data)
            elif message_type in ['offer', 'answer', 'ice-candidate']:
                await self.handle_webrtc_message(data)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")

    async def handle_join_room(self, data):
        self.room_id = data.get('data', {}).get('roomId')
        self.user_id = data.get('userId') or self.generate_user_id()
        
        if not self.room_id:
            await self.send_error("Room ID is required")
            return
        
        self.room_group_name = f'room_{self.room_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Get existing participants before adding new one
        existing_participants = RoomManager.get_participants(self.room_id, exclude_user=self.user_id)
        
        # Add to in-memory room management
        RoomManager.add_participant(self.room_id, self.user_id, self.channel_name)
        
        # Create or get room in database
        await self.create_or_get_room()
        
        # Add participant to database
        await self.add_participant_to_room()
        
        # Notify existing participants about new user
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': self.user_id,
                'sender_channel': self.channel_name
            }
        )
        
        # Send existing participants list to new user
        await self.send(text_data=json.dumps({
            'type': 'room-joined',
            'data': {
                'roomId': self.room_id,
                'userId': self.user_id,
                'participants': existing_participants
            }
        }))
        
        logger.info(f"User {self.user_id} joined room {self.room_id}")

    async def handle_leave_room(self, data):
        if self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_left',
                    'user_id': self.user_id
                }
            )
            
            await self.mark_user_disconnected()
            RoomManager.remove_participant(self.room_id, self.user_id)
        
        self.room_id = None
        self.user_id = None
        self.room_group_name = None

    async def handle_webrtc_message(self, data):
        if not self.room_group_name:
            await self.send_error("Not in a room")
            return
        
        # Forward WebRTC signaling messages to specific peer
        target_user = data.get('to')
        if target_user:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_message',
                    'message_type': data.get('type'),
                    'from_user': self.user_id,
                    'to_user': target_user,
                    'data': data.get('data', {}),
                    'sender_channel': self.channel_name
                }
            )

    async def user_joined(self, event):
        # Don't send to the user who just joined
        if event.get('sender_channel') != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'user-joined',
                'data': {
                    'userId': event['user_id']
                }
            }))

    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user-left',
            'data': {
                'userId': event['user_id']
            }
        }))

    async def webrtc_message(self, event):
        # Only send to the target user
        if event.get('to_user') == self.user_id and event.get('sender_channel') != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': event['message_type'],
                'from': event['from_user'],
                'to': event['to_user'],
                'data': event['data']
            }))

    async def send_error(self, message):
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))

    def generate_user_id(self):
        import uuid
        return str(uuid.uuid4())[:8]

    @database_sync_to_async
    def create_or_get_room(self):
        room, created = Room.objects.get_or_create(
            room_id=self.room_id,
            defaults={'is_active': True}
        )
        return room

    @database_sync_to_async
    def add_participant_to_room(self):
        room = Room.objects.get(room_id=self.room_id)
        participant, created = RoomParticipant.objects.get_or_create(
            room=room,
            user_id=self.user_id,
            defaults={'is_connected': True}
        )
        if not created:
            participant.is_connected = True
            participant.save()
        return participant

    @database_sync_to_async
    def mark_user_disconnected(self):
        if self.user_id and self.room_id:
            try:
                room = Room.objects.get(room_id=self.room_id)
                RoomParticipant.objects.filter(
                    room=room,
                    user_id=self.user_id
                ).update(is_connected=False)
            except Room.DoesNotExist:
                pass