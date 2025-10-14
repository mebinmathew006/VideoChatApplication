# chat/tests/integration_tests.py
import base64
import json
from datetime import datetime, timedelta
from django.test import TransactionTestCase, override_settings
from django.contrib.auth import get_user_model
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
import jwt
from django.conf import settings
import asyncio

from User.models import Message, Room, Attachment
from signaling.consumers import ChatConsumer

User = get_user_model()


@database_sync_to_async
def create_user_via_orm(email, password, name):
    """Create user directly via ORM for testing"""
    return User.objects.create_user(
        email=email,
        password=password,
        name=name
    )


@database_sync_to_async
def create_room_via_orm(user, name, description=""):
    """Create room directly via ORM for testing"""
    return Room.objects.create(
        name=name,
        owner=user,
        description=description
    )


@database_sync_to_async
def cleanup_database():
    """Clean up all test data"""
    Message.objects.all().delete()
    Attachment.objects.all().delete()
    Room.objects.all().delete()
    User.objects.all().delete()


@override_settings(
    CHANNEL_LAYERS={
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer'
        }
    }
)
class ChatIntegrationTests(TransactionTestCase):
    """Integration tests for complete chat flow"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'password': 'Test@1234'
        }
        self.user2_data = {
            'name': 'Test User 2', 
            'email': 'test2@example.com',
            'password': 'Test@1234'
        }

    async def asyncSetUp(self):
        """Async setup for test data"""
        await cleanup_database()
        
        # Create users via ORM
        self.user1 = await create_user_via_orm(
            email=self.user_data['email'],
            password=self.user_data['password'],
            name=self.user_data['name']
        )
        self.user2 = await create_user_via_orm(
            email=self.user2_data['email'],
            password=self.user2_data['password'],
            name=self.user2_data['name']
        )
        
        # Generate tokens
        self.user1_token = self._generate_jwt_token(self.user1)
        self.user2_token = self._generate_jwt_token(self.user2)

    def _generate_jwt_token(self, user):
        """Generate JWT token for user"""
        payload = {
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(hours=1),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

    def _login_user_via_api(self, email, password):
        """Login user through API - sync version"""
        client = APIClient()
        response = client.post(reverse('login'), {
            'email': email,
            'password': password
        })
        return response

    def _create_room_via_api(self, token, room_data):
        """Create room through API - sync version"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.post(reverse('roomcreation'), room_data)
        return response

    async def _create_websocket_connection(self, room_id, token):
        """Create and connect WebSocket communicator"""
        communicator = WebsocketCommunicator(
            ChatConsumer.as_asgi(),
            f'/ws/chat/{room_id}/',
            headers=[(b'origin', b'http://localhost')],
        )
        communicator.scope['query_string'] = f'token={token}'.encode()
        communicator.scope['url_route'] = {'kwargs': {'room_id': room_id}}
        
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        return communicator

    async def _receive_until_chat_message(self, communicator, expected_count=1):
        """Receive messages until we get the expected number of chat messages"""
        chat_messages = []
        timeout = 5.0  # 5 second timeout
        start_time = asyncio.get_event_loop().time()
        
        while len(chat_messages) < expected_count:
            try:
                # Calculate remaining timeout
                elapsed = asyncio.get_event_loop().time() - start_time
                remaining = timeout - elapsed
                if remaining <= 0:
                    break
                    
                response = await asyncio.wait_for(
                    communicator.receive_json_from(), 
                    timeout=remaining
                )
                
                if response.get('type') == 'chat_message':
                    chat_messages.append(response)
                # Ignore other message types like user_join, user_leave, etc.
                    
            except asyncio.TimeoutError:
                break
                
        return chat_messages

    async def test_complete_chat_flow(self):
        """Test complete flow: login -> create room -> chat -> history"""
        await self.asyncSetUp()

        # Step 1: User login via API
        login_response = await database_sync_to_async(self._login_user_via_api)(
            self.user_data['email'], 
            self.user_data['password']
        )
        self.assertEqual(login_response.status_code, 200)
        user1_token = login_response.data['user']['access_token']

        login_response2 = await database_sync_to_async(self._login_user_via_api)(
            self.user2_data['email'], 
            self.user2_data['password']
        )
        self.assertEqual(login_response2.status_code, 200)
        user2_token = login_response2.data['user']['access_token']

        # Step 2: Create room via API
        room_data = {'name': 'Integration Test Room', 'description': 'Test room'}
        room_response = await database_sync_to_async(self._create_room_via_api)(
            user1_token, room_data
        )
        self.assertEqual(room_response.status_code, 201)
        room_id = room_response.data['room']['id']

        # Step 3: Connect both users to WebSocket
        user1_ws = await self._create_websocket_connection(room_id, user1_token)
        user2_ws = await self._create_websocket_connection(room_id, user2_token)

        # Receive connection messages (skip user_join notifications)
        await user1_ws.receive_json_from()  # connection_established
        await user1_ws.receive_json_from()  # message_history
        await user2_ws.receive_json_from()  # connection_established  
        await user2_ws.receive_json_from()  # message_history

        # User1 will receive user_join notification for User2
        user_join_msg = await user1_ws.receive_json_from()
        self.assertEqual(user_join_msg['type'], 'user_join')

        # Step 4: User1 sends message
        test_message = "Hello from User1!"
        await user1_ws.send_json_to({
            'type': 'message',
            'message': test_message,
            'media': []
        })

        # Both users should receive the chat message (ignore other message types)
        user1_messages = await self._receive_until_chat_message(user1_ws, 1)
        user2_messages = await self._receive_until_chat_message(user2_ws, 1)

        self.assertEqual(len(user1_messages), 1)
        self.assertEqual(len(user2_messages), 1)
        self.assertEqual(user1_messages[0]['type'], 'chat_message')
        self.assertEqual(user1_messages[0]['message'], test_message)
        self.assertEqual(user2_messages[0]['type'], 'chat_message')
        self.assertEqual(user2_messages[0]['message'], test_message)

        # Step 5: User2 replies
        reply_message = "Hello User1! How are you?"
        await user2_ws.send_json_to({
            'type': 'message',
            'message': reply_message,
            'media': []
        })

        # Both users should receive the reply
        user1_messages = await self._receive_until_chat_message(user1_ws, 1)
        user2_messages = await self._receive_until_chat_message(user2_ws, 1)

        self.assertEqual(len(user1_messages), 1)
        self.assertEqual(len(user2_messages), 1)
        self.assertEqual(user1_messages[0]['message'], reply_message)
        self.assertEqual(user2_messages[0]['message'], reply_message)

        # Cleanup
        await user1_ws.disconnect()
        await user2_ws.disconnect()

    async def test_multiple_rooms_integration(self):
        """Test users communicating across multiple rooms"""
        await self.asyncSetUp()

        # Login users
        login_response1 = await database_sync_to_async(self._login_user_via_api)(
            self.user_data['email'], 
            self.user_data['password']
        )
        user1_token = login_response1.data['user']['access_token']

        login_response2 = await database_sync_to_async(self._login_user_via_api)(
            self.user2_data['email'], 
            self.user2_data['password']
        )
        user2_token = login_response2.data['user']['access_token']

        # Create multiple rooms
        room1_response = await database_sync_to_async(self._create_room_via_api)(
            user1_token, {'name': 'Room 1'}
        )
        room1_id = room1_response.data['room']['id']

        room2_response = await database_sync_to_async(self._create_room_via_api)(
            user1_token, {'name': 'Room 2'}
        )
        room2_id = room2_response.data['room']['id']

        # Connect users to Room 1 only
        user1_room1_ws = await self._create_websocket_connection(room1_id, user1_token)
        user2_room1_ws = await self._create_websocket_connection(room1_id, user2_token)

        # Skip initial messages and user_join notifications
        await user1_room1_ws.receive_json_from()  # connection_established
        await user1_room1_ws.receive_json_from()  # message_history
        await user2_room1_ws.receive_json_from()  # connection_established
        await user2_room1_ws.receive_json_from()  # message_history
        
        # User1 will receive user_join for User2
        await user1_room1_ws.receive_json_from()  # user_join

        # Send message in Room 1
        await user1_room1_ws.send_json_to({
            'type': 'message',
            'message': "Room 1 message",
            'media': []
        })

        # Both should receive the chat message
        user1_messages = await self._receive_until_chat_message(user1_room1_ws, 1)
        user2_messages = await self._receive_until_chat_message(user2_room1_ws, 1)

        self.assertEqual(len(user1_messages), 1)
        self.assertEqual(len(user2_messages), 1)
        self.assertEqual(user1_messages[0]['message'], "Room 1 message")
        self.assertEqual(user2_messages[0]['message'], "Room 1 message")

        await user1_room1_ws.disconnect()
        await user2_room1_ws.disconnect()


class SimpleWebSocketIntegrationTests(TransactionTestCase):
    """Simple WebSocket integration tests without API calls"""
    
    async def test_websocket_communication(self):
        """Test basic WebSocket communication"""
        # Create test data directly
        user1 = await create_user_via_orm('user1@test.com', 'pass123', 'User 1')
        user2 = await create_user_via_orm('user2@test.com', 'pass123', 'User 2')
        room = await create_room_via_orm(user1, 'Test Room')

        # Generate tokens
        token1 = jwt.encode(
            {'user_id': user1.id, 'exp': 9999999999, 'iat': 1}, 
            settings.SECRET_KEY, 
            algorithm='HS256'
        )
        token2 = jwt.encode(
            {'user_id': user2.id, 'exp': 9999999999, 'iat': 1}, 
            settings.SECRET_KEY, 
            algorithm='HS256'
        )

        # Connect users
        comm1 = WebsocketCommunicator(ChatConsumer.as_asgi(), f'/ws/chat/{room.id}/')
        comm1.scope['query_string'] = f'token={token1}'.encode()
        comm1.scope['url_route'] = {'kwargs': {'room_id': room.id}}

        comm2 = WebsocketCommunicator(ChatConsumer.as_asgi(), f'/ws/chat/{room.id}/')
        comm2.scope['query_string'] = f'token={token2}'.encode()
        comm2.scope['url_route'] = {'kwargs': {'room_id': room.id}}

        connected1, _ = await comm1.connect()
        connected2, _ = await comm2.connect()
        self.assertTrue(connected1)
        self.assertTrue(connected2)

        # Skip initial messages
        await comm1.receive_json_from()  # connection_established
        await comm1.receive_json_from()  # message_history
        await comm2.receive_json_from()  # connection_established
        await comm2.receive_json_from()  # message_history

        # User1 will receive user_join notification
        user_join_msg = await comm1.receive_json_from()
        self.assertEqual(user_join_msg['type'], 'user_join')

        # Send and receive message
        test_msg = "Test message"
        await comm1.send_json_to({
            'type': 'message',
            'message': test_msg,
            'media': []
        })

        # Use helper to get only chat messages
        messages1 = await self._receive_until_chat_message(comm1, 1)
        messages2 = await self._receive_until_chat_message(comm2, 1)

        self.assertEqual(len(messages1), 1)
        self.assertEqual(len(messages2), 1)
        self.assertEqual(messages1[0]['message'], test_msg)
        self.assertEqual(messages2[0]['message'], test_msg)

        await comm1.disconnect()
        await comm2.disconnect()

    async def _receive_until_chat_message(self, communicator, expected_count=1):
        """Receive messages until we get the expected number of chat messages"""
        chat_messages = []
        timeout = 5.0
        start_time = asyncio.get_event_loop().time()
        
        while len(chat_messages) < expected_count:
            try:
                elapsed = asyncio.get_event_loop().time() - start_time
                remaining = timeout - elapsed
                if remaining <= 0:
                    break
                    
                response = await asyncio.wait_for(
                    communicator.receive_json_from(), 
                    timeout=remaining
                )
                
                if response.get('type') == 'chat_message':
                    chat_messages.append(response)
                    
            except asyncio.TimeoutError:
                break
                
        return chat_messages


class SyncChatIntegrationTests(TransactionTestCase):
    """Synchronous integration tests for API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user_data = {
            'name': 'Sync Test User',
            'email': 'sync_test@example.com',
            'password': 'Test@1234'
        }

    def test_api_signup_flow(self):
        """Test complete API signup flow"""
        # Signup user
        response = self.client.post(reverse('signup'), self.user_data)
        print("Signup response:", response.data)
        
        # Check response structure
        self.assertEqual(response.status_code, 201)
        # Your API returns user data without token in signup
        self.assertIn('data', response.data)
        self.assertEqual(response.data['data']['name'], self.user_data['name'])

    def test_login_flow(self):
        """Test login flow"""
        # First create a user
        user = User.objects.create_user(**self.user_data)
        
        # Then login
        response = self.client.post(reverse('login'), {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('user', response.data)
        self.assertIn('access_token', response.data['user'])

    def test_room_creation_flow(self):
        """Test room creation via API"""
        # Create user and login
        user = User.objects.create_user(**self.user_data)
        self.client.force_authenticate(user=user)

        # Create room
        room_data = {'name': 'API Test Room', 'description': 'Test description'}
        response = self.client.post(reverse('roomcreation'), room_data)
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['room']['name'], 'API Test Room')


# Test runner to handle async tests
def run_async_test(test_method):
    """Decorator to run async test methods"""
    def sync_wrapper(self):
        return asyncio.run(test_method(self))
    return sync_wrapper


# Apply decorator to async methods
ChatIntegrationTests.test_complete_chat_flow = run_async_test(ChatIntegrationTests.test_complete_chat_flow)
ChatIntegrationTests.test_multiple_rooms_integration = run_async_test(ChatIntegrationTests.test_multiple_rooms_integration)
SimpleWebSocketIntegrationTests.test_websocket_communication = run_async_test(SimpleWebSocketIntegrationTests.test_websocket_communication)