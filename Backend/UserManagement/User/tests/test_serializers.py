# chat/tests/test_serializers.py
from django.test import TestCase
from User.serializers import UserSignupSerializer,RoomSerializer
from User.models import User,Room

class UserSignupSerializerTest(TestCase):
    def test_valid_data(self):
        data = {
            'name': 'Test User',
            'email': 'test@example.com',
            'password': 'Test@1234'
        }
        serializer = UserSignupSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        user = serializer.save()
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('Test@1234'))

    def test_invalid_name(self):
        data = {'name': 'User123', 'email': 'a@b.com', 'password': 'Test@1234'}
        serializer = UserSignupSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)

    def test_invalid_email(self):
        data = {'name': 'User', 'email': 'invalidemail', 'password': 'Test@1234'}
        serializer = UserSignupSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_weak_password(self):
        data = {'name': 'User', 'email': 'a@b.com', 'password': 'weak'}
        serializer = UserSignupSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
        
        
class RoomSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="user@example.com", password="pass", name="User1")
        self.room = Room.objects.create(name="Test Room", owner=self.user)

    def test_room_serialization(self):
        serializer = RoomSerializer(instance=self.room)
        data = serializer.data
        self.assertEqual(data['name'], 'Test Room')
        self.assertEqual(data['owner']['name'], 'User1')
        
