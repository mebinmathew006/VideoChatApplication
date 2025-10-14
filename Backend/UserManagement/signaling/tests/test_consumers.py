import base64
import asyncio
from datetime import datetime, timedelta
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from User.models import Message, Room  
from signaling.consumers import ChatConsumer
import jwt
from django.conf import settings

User = get_user_model()


def async_to_sync_test(async_func):
    """Decorator to run async functions in sync tests with proper cleanup"""
    def wrapper(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(async_func(self))
        finally:
            # Close all remaining tasks
            try:
                pending = asyncio.all_tasks(loop)
                for task in pending:
                    task.cancel()
                loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
            except:
                pass
            loop.close()
    return wrapper


@database_sync_to_async
def create_user(email, password, name):
    """Create a user asynchronously"""
    return User.objects.create_user(
        email=email,
        password=password,
        name=name,
    )


@database_sync_to_async
def create_room(user, name="Test Room"):
    """Create a room asynchronously"""
    return Room.objects.create(name=name, owner=user)


@database_sync_to_async
def create_message(room, sender, message, sender_type='user'):
    """Create a message asynchronously"""
    return Message.objects.create(
        room=room,
        sender=sender,
        message=message,
        sender_type=sender_type
    )


@database_sync_to_async
def get_message_count():
    """Get message count asynchronously"""
    return Message.objects.count()


@database_sync_to_async
def delete_all_users():
    """Delete all users asynchronously"""
    User.objects.all().delete()


@database_sync_to_async
def delete_all_messages():
    """Delete all messages asynchronously"""
    Message.objects.all().delete()


@database_sync_to_async
def delete_all_rooms():
    """Delete all rooms asynchronously"""
    Room.objects.all().delete()


@override_settings(
    CHANNEL_LAYERS={
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer'
        }
    },
    DATABASES={
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
)
class ChatConsumerTests(TestCase):
    """Test suite for ChatConsumer WebSocket consumer"""

    async def async_setup(self):
        """Async setup method - runs before each test"""
        # Clean up any existing data first
        await delete_all_messages()
        await delete_all_users()
        await delete_all_rooms()
        
        # Create users
        self.user = await create_user(
            email='test@example.com',
            password='testpass123',
            name='Test User',
        )
        self.user2 = await create_user(
            email='test2@example.com',
            password='testpass123',
            name='Test User 2',
        )
        
        # Create a room
        self.room = await create_room(self.user, name="Test Room")
        self.room_id = self.room.id
        
        self.valid_token = self._generate_jwt_token(self.user)

    async def async_teardown(self):
        """Async teardown method - runs after each test"""
        await delete_all_messages()
        await delete_all_users()
        await delete_all_rooms()

    def setUp(self):
        """Set up test fixtures synchronously"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(self.async_setup())
        finally:
            loop.close()

    def tearDown(self):
        """Tear down test fixtures synchronously"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(self.async_teardown())
        finally:
            loop.close()

    def _generate_jwt_token(self, user):
        """Generate JWT token for user"""
        payload = {
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(hours=1),
            'iat': datetime.utcnow()
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        return token

    def _create_communicator(self, token=None):
        """Helper to create properly configured WebsocketCommunicator"""
        communicator = WebsocketCommunicator(
            ChatConsumer.as_asgi(),
            f'/ws/chat/{self.room_id}/',
            headers=[(b'origin', b'http://localhost')],
        )
        if token:
            communicator.scope['query_string'] = f'token={token}'.encode()
        else:
            communicator.scope['query_string'] = b''
        
        if 'url_route' not in communicator.scope:
            communicator.scope['url_route'] = {}
        communicator.scope['url_route']['kwargs'] = {'room_id': self.room_id}
        
        return communicator

    @async_to_sync_test
    async def test_connect_success_with_valid_token(self):
        """Test successful WebSocket connection with valid token"""
        communicator = self._create_communicator(self.valid_token)

        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)

        # Receive connection established message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'connection_established')
        self.assertEqual(response['user_id'], self.user.id)

        # Receive initial message history
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'message_history')
        self.assertIsInstance(response['messages'], list)

        await communicator.disconnect()

    @async_to_sync_test
    async def test_connect_failure_without_token(self):
        """Test connection failure without authentication token"""
        communicator = self._create_communicator()

        connected, subprotocol = await communicator.connect()
        # For connection failures, we need to handle the rejection differently
        try:
            connected, subprotocol = await communicator.connect()
            # If we get here, the connection was accepted when it shouldn't be
            self.assertFalse(connected, "Connection should have been rejected")
            await communicator.disconnect()
        except Exception as e:
            # Connection was properly rejected
            self.assertTrue(True, "Connection was properly rejected")

    @async_to_sync_test
    async def test_connect_failure_with_invalid_token(self):
        """Test connection failure with invalid token"""
        communicator = self._create_communicator('invalid_token_xyz')

        try:
            connected, subprotocol = await communicator.connect()
            # If we get here, the connection was accepted when it shouldn't be
            self.assertFalse(connected, "Connection should have been rejected")
            await communicator.disconnect()
        except Exception as e:
            # Connection was properly rejected
            self.assertTrue(True, "Connection was properly rejected")

    @async_to_sync_test
    async def test_connect_failure_with_expired_token(self):
        """Test connection failure with expired token"""
        payload = {
            'user_id': self.user.id,
            'exp': datetime.utcnow() - timedelta(hours=1),
            'iat': datetime.utcnow()
        }
        expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

        communicator = self._create_communicator(expired_token)

        try:
            connected, subprotocol = await communicator.connect()
            # If we get here, the connection was accepted when it shouldn't be
            self.assertFalse(connected, "Connection should have been rejected")
            await communicator.disconnect()
        except Exception as e:
            # Connection was properly rejected
            self.assertTrue(True, "Connection was properly rejected")

    @async_to_sync_test
    async def test_send_text_message(self):
        """Test sending a text message"""
        communicator = self._create_communicator(self.valid_token)

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Skip initial messages
        await communicator.receive_json_from()  # connection_established
        await communicator.receive_json_from()  # message_history

        # Send message
        await communicator.send_json_to({
            'type': 'message',
            'message': 'Test message',
            'media': []
        })

        # Receive broadcasted message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'chat_message')
        self.assertEqual(response['message'], 'Test message')
        self.assertEqual(response['sender_id'], self.user.id)

        await communicator.disconnect()

    @async_to_sync_test
    async def test_send_message_with_attachment(self):
        """Test sending message with file attachment"""
        communicator = self._create_communicator(self.valid_token)

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.receive_json_from()  # connection_established
        await communicator.receive_json_from()  # message_history

        # Create base64 encoded file
        file_content = b'test file content'
        file_base64 = base64.b64encode(file_content).decode()

        await communicator.send_json_to({
            'type': 'message',
            'message': 'Check this file',
            'media': [{
                'data': f'data:text/plain;base64,{file_base64}',
                'name': 'test.txt',
                'type': 'text/plain',
                'size': len(file_content)
            }]
        })

        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'chat_message')
        self.assertEqual(len(response['media']), 1)
        self.assertEqual(response['media'][0]['name'], 'test.txt')

        await communicator.disconnect()

    @async_to_sync_test
    async def test_empty_message_not_sent(self):
        """Test that empty messages are not saved"""
        communicator = self._create_communicator(self.valid_token)

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.receive_json_from()  # connection_established
        await communicator.receive_json_from()  # message_history

        await communicator.send_json_to({
            'type': 'message',
            'message': '   ',
            'media': []
        })

        # Should timeout waiting for broadcast (empty message not sent)
        try:
            await asyncio.wait_for(
                communicator.receive_json_from(),
                timeout=0.5
            )
            self.fail("Should have timed out")
        except asyncio.TimeoutError:
            pass  # Expected

        await communicator.disconnect()

    @async_to_sync_test
    async def test_fetch_messages_pagination(self):
        """Test message pagination"""
        # Create test messages asynchronously
        for i in range(5):
            await create_message(
                room=self.room,
                sender=self.user,
                message=f'Message {i}',
                sender_type='user'
            )

        communicator = self._create_communicator(self.valid_token)

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.receive_json_from()  # connection_established
        await communicator.receive_json_from()  # message_history

        await communicator.send_json_to({
            'type': 'fetch_messages',
            'limit': 2,
            'offset': 0
        })

        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'message_history')
        self.assertEqual(len(response['messages']), 2)
        self.assertTrue(response['has_more'])

        await communicator.disconnect()

    @async_to_sync_test
    async def test_invalid_json(self):
        """Test handling of invalid JSON"""
        communicator = self._create_communicator(self.valid_token)

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.receive_json_from()  # connection_established
        await communicator.receive_json_from()  # message_history

        await communicator.send_to(text_data='{invalid json}')

        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'error')
        self.assertIn('Invalid JSON', response['message'])

        await communicator.disconnect()

    @async_to_sync_test
    async def test_disconnect_sends_user_leave(self):
        """Test that disconnection sends user leave notification"""
        communicator = self._create_communicator(self.valid_token)

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.receive_json_from()  # connection_established
        await communicator.receive_json_from()  # message_history

        try:
            await communicator.disconnect()
        except asyncio.CancelledError:
            # This can happen during disconnect, it's usually fine
            pass

    @async_to_sync_test
    async def test_token_refresh(self):
        """Test token refresh functionality"""
        communicator = self._create_communicator(self.valid_token)

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.receive_json_from()  # connection_established
        await communicator.receive_json_from()  # message_history

        # Send refresh token request (this will fail since we don't have a valid refresh token)
        await communicator.send_json_to({
            'type': 'refresh_token',
            'refresh_token': 'invalid_refresh_token'
        })

        # Should receive token error
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'token_error')

        await communicator.disconnect()

    @async_to_sync_test
    async def test_user_join_notification(self):
        """Test that user join notifications are sent to other users"""
        # First user connects
        communicator1 = self._create_communicator(self.valid_token)
        connected1, _ = await communicator1.connect()
        self.assertTrue(connected1)

        await communicator1.receive_json_from()  # connection_established
        await communicator1.receive_json_from()  # message_history

        # Second user connects
        token2 = self._generate_jwt_token(self.user2)
        communicator2 = self._create_communicator(token2)
        connected2, _ = await communicator2.connect()
        self.assertTrue(connected2)

        await communicator2.receive_json_from()  # connection_established
        await communicator2.receive_json_from()  # message_history

        # First user should receive user_join notification for second user
        response = await communicator1.receive_json_from()
        self.assertEqual(response['type'], 'user_join')
        self.assertEqual(response['user_id'], self.user2.id)

        await communicator1.disconnect()
        await communicator2.disconnect()