# chat/tests/test_models.py
from django.test import TestCase
from User.models import User, Room, Message, Attachment


class UserModelTest(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(email="test@example.com", password="testpass", name="Test User")
        self.assertEqual(user.email, "test@example.com")
        self.assertTrue(user.check_password("testpass"))

    def test_create_superuser(self):
        superuser = User.objects.create_superuser(email="admin@example.com", password="adminpass", name="Admin")
        self.assertEqual(superuser.email, "admin@example.com")
        
        
class RoomModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="user@example.com", password="pass", name="User1")

    def test_create_room(self):
        room = Room.objects.create(name="Test Room",owner=self.user)
        self.assertEqual(room.name, "Test Room")
        self.assertEqual(room.owner, self.user)
        
        
        
class MessageModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="user@example.com", password="pass", name="User1")
        self.room = Room.objects.create(name="Room1", owner=self.user)

    def test_create_message(self):
        message = Message.objects.create(room=self.room, sender=self.user, message="Hello World")
        self.assertEqual(message.room, self.room)
        self.assertEqual(message.sender, self.user)
        self.assertEqual(message.message, "Hello World")
        self.assertFalse(message.is_read)
        
        
class AttachmentModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="user@example.com", password="pass", name="User1")
        self.room = Room.objects.create(name="Room1", owner=self.user)
        self.message = Message.objects.create(room=self.room, sender=self.user, message="Hi")

    def test_create_attachment(self):
        attachment = Attachment.objects.create(
            message=self.message,
            file_type="image/png",
            original_filename="file.png",
            file_size=1024
        )
        self.assertEqual(attachment.message, self.message)
        self.assertEqual(attachment.file_type, "image/png")
        self.assertEqual(attachment.original_filename, "file.png")
        self.assertEqual(attachment.file_size, 1024)
