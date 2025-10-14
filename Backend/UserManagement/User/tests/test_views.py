from rest_framework.test import APITestCase, APIClient
from django.urls import reverse
from User.models import User, Room


class UserAuthViewsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.signup_url = reverse('signup') 
        self.login_url = reverse('login')

    def test_user_signup_success(self):
        data = {'name': 'Test User', 'email': 'test@example.com', 'password': 'Test@1234'}
        response = self.client.post(self.signup_url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['data']['name'], 'Test User')

    def test_user_signup_invalid_email(self):
        data = {'name': 'Test User', 'email': 'invalidemail', 'password': 'Test@1234'}
        response = self.client.post(self.signup_url, data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data['errors'])

    def test_login_success(self):
        user = User.objects.create_user(email='test@example.com', password='Test@1234', name='Test User')
        data = {'email': 'test@example.com', 'password': 'Test@1234'}
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, 200)
        self.assertIn('access_token', response.data['user'])
        
        
class RoomViewsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='user@example.com', password='Test@1234', name='User1')
        self.client.force_authenticate(user=self.user)
        self.room_list_url = reverse('roomcreation')  

    def test_create_room_success(self):
        data = {'name': 'New Room','description':'test description for the room'}
        response = self.client.post(self.room_list_url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['room']['name'], 'New Room')

    def test_create_room_duplicate_name(self):
        Room.objects.create(name='New Room', owner=self.user)
        data = {'name': 'New Room','description':'test description for the room'}
        response = self.client.post(self.room_list_url, data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('name', response.data['error'].lower())

    def test_get_rooms(self):
        Room.objects.create(name='Room1', owner=self.user)
        Room.objects.create(name='Room2', owner=self.user)
        response = self.client.get(self.room_list_url)
        self.assertEqual(response.status_code, 200)
        

class TokenRefreshTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='user@example.com', password='Test@1234', name='User1')
        self.client = APIClient()
        self.refresh_url = reverse('token_refresh')  

    def test_refresh_token_missing_cookie(self):
        response = self.client.post(self.refresh_url)
        self.assertEqual(response.status_code, 400)


