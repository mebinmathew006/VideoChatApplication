# consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from User.models import Message, Attachment
import base64
from datetime import datetime
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import jwt
from django.conf import settings
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        
        token = self.scope['query_string'].decode().split('token=')[-1] if 'token=' in self.scope['query_string'].decode() else None
        
        self.user = await self.authenticate_user(token)
        
        # FIX: Check authentication first and reject immediately if failed
        if not self.user or not self.user.is_authenticated:
            # Reject the connection immediately without sending any messages
            await self.close(code=4001)
            return

        # Only accept the connection if authentication succeeds
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Now you can send messages after accept()
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to chat',
            'user_id': self.user.id,
            'room_id': self.room_id
        }))

        initial_messages = await self.get_messages(limit=50, offset=0)
        await self.send(text_data=json.dumps({
            'type': 'message_history',
            'messages': initial_messages,
            'total': await self.get_total_messages()
        }))

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_join',
                'user_id': self.user.id,
                'user_name': getattr(self.user, "name", self.user.name),
                'timestamp': datetime.now().isoformat()
            }
        )
        
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_leave',
                    'user_id': self.user.id,
                    'user_name': getattr(self.user, "name", self.user.name),
                    'timestamp': datetime.now().isoformat()
                }
            )
        
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'message')
            
            if message_type == 'message':
                await self.handle_chat_message(data)
            elif message_type == 'join':
                pass
            elif message_type == 'fetch_messages':
                await self.handle_fetch_messages(data)
            elif message_type == 'refresh_token':
                await self.handle_refresh_token(data)
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.info(f"Error in receive: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    async def handle_chat_message(self, data):
        """Handle chat message with attachments"""
        message_text = data.get('message', '')
        media = data.get('media', [])
        
        if not message_text.strip() and not media:
            return
        
        message = await self.save_message(message_text, media)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message_broadcast',
                'message': message
            }
        )

    async def handle_fetch_messages(self, data):
        """Handle pagination - fetch older messages"""
        try:
            limit = min(int(data.get('limit', 20)), 50)  # Limit to 50 max
            offset = int(data.get('offset', 0))
            
            messages = await self.get_messages(limit=limit, offset=offset)
            total = await self.get_total_messages()
            
            await self.send(text_data=json.dumps({
                'type': 'message_history',
                'messages': messages,
                'total': total,
                'offset': offset,
                'limit': limit,
                'has_more': offset + len(messages) < total
            }))
        except Exception as e:
            logger.info(f"Error fetching messages: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to load messages'
            }))

    async def handle_refresh_token(self, data):
        """Handle token refresh"""
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            await self.send(text_data=json.dumps({
                'type': 'token_error',
                'message': 'No refresh token provided'
            }))
            return
        
        try:
            new_tokens = await self.refresh_access_token(refresh_token)
            await self.send(text_data=json.dumps({
                'type': 'token_refreshed',
                'access_token': new_tokens['access'],
                'refresh_token': new_tokens['refresh']
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'token_error',
                'message': str(e)
            }))

    # Broadcast handlers
    async def chat_message_broadcast(self, event):
        """Send chat message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'id': event['message']['id'],
            'username': event['message']['sender_name'],
            'message': event['message']['message'],
            'media': event['message'].get('media', []),
            'sender_id': event['message']['sender_id'],
            'timestamp': event['message']['created_at']
        }))

    async def user_join(self, event):
        """Send user join notification"""
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_join',
                'message': f"{event['user_name']} joined the chat",
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'timestamp': event['timestamp']
            }))

    async def user_leave(self, event):
        """Send user leave notification"""
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_leave',
                'message': f"{event['user_name']} left the chat",
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'timestamp': event['timestamp']
            }))

    # Database operations
    async def authenticate_user(self, token):
        """Authenticate user from JWT token with better error handling"""
        if not token:
            return None
        
        try:
            # Try to decode without verification first to check expiration
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'], options={"verify_exp": False})
            except jwt.DecodeError:
                return None
            
            # Check expiration manually
            from datetime import datetime
            exp = payload.get('exp')
            if exp and datetime.fromtimestamp(exp) < datetime.now():
                return None
            
            # Now verify properly
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            user = await database_sync_to_async(User.objects.get)(id=user_id)
            return user
            
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist) as e:
            logger.info(f"Token authentication error: {e}")
            return None

    @database_sync_to_async
    def refresh_access_token(self, refresh_token_str):
        """Refresh the access token"""
        try:
            refresh = RefreshToken(refresh_token_str)
            return {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        except TokenError as e:
            raise Exception(f"Token refresh failed: {str(e)}")

    @database_sync_to_async
    def save_message(self, message_text, media):
        """Save message to database with media attachments"""
        message = Message.objects.create(
            room_id=self.room_id,
            sender=self.user,
            message=message_text,
            sender_type='user'
        )
        
        media_list = []
        for media_item in media:
            try:
                file_data = media_item.get('data', '')
                file_name = media_item.get('name', 'attachment')
                file_type = media_item.get('type', 'application/octet-stream')
                
                # Decode base64
                if isinstance(file_data, str) and file_data.startswith('data:'):
                    try:
                        format_part, filestr = file_data.split(';base64,')
                        file_data = base64.b64decode(filestr)
                    except (ValueError, Exception) as e:
                        logger.info(f"Error decoding base64: {e}")
                        continue
                
                # Create attachment
                attachment = Attachment.objects.create(
                    message=message,
                    file=ContentFile(file_data, name=file_name),
                    file_type=file_type,
                    original_filename=file_name,
                    file_size=len(file_data) if isinstance(file_data, bytes) else media_item.get('size', 0)
                )
                
                media_list.append({
                    'id': attachment.id,
                    'name': attachment.original_filename,
                    'type': attachment.file_type,
                    'size': attachment.file_size,
                    'url': attachment.file.url if attachment.file else None
                })
            except Exception as e:
                logger.info(f"Error saving attachment: {e}")
                continue
        
        return {
            'id': message.id,
            'message': message.message,
            'sender': 'user',
            'sender_id': self.user.id,
            'sender_name': getattr(self.user, "name", self.user.name),
            'created_at': message.created_at.isoformat(),
            'media': media_list
        }

    @database_sync_to_async
    def get_messages(self, limit, offset):
        """Fetch messages from database with pagination"""
        messages = Message.objects.filter(
            room_id=self.room_id
        ).select_related('sender').prefetch_related('attachments').order_by('-created_at')[offset:offset + limit]
        
        # Convert to list and reverse for chronological order
        messages_list = list(messages)
        messages_list.reverse()  # Oldest first for prepending
        
        return [{
            'id': msg.id,
            'message': msg.message,
            'sender': msg.sender_type,
            'sender_id': msg.sender.id,
            'sender_name': getattr(msg.sender, "name", msg.sender.name),
            'created_at': msg.created_at.isoformat(),
            'media': [{
                'id': att.id,
                'name': att.original_filename,
                'type': att.file_type,
                'size': att.file_size,
                'url': att.file.url if att.file else None
            } for att in msg.attachments.all()]
        } for msg in messages_list]

    @database_sync_to_async
    def get_total_messages(self):
        """Get total message count for pagination"""
        return Message.objects.filter(room_id=self.room_id).count()

    @database_sync_to_async
    def mark_message_read(self, message_id):
        """Mark message as read"""
        try:
            message = Message.objects.get(id=message_id)
            pass
        except Exception as e:
            logger.info(f"Error marking message as read: {e}")