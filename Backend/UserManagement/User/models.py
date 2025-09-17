from django.db import models
from django.contrib.auth.models import AbstractBaseUser,BaseUserManager

class UserManger(BaseUserManager):
    def create_user(self,email,password,**extra_fields):
        if not email:
            raise ValueError('Email is required')
        
        email = self.normalize_email(email)
        user = self.model(email=email,**extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self,email,password,**extra_fields):
        return self.create_user(email, password, **extra_fields)
        

class User(AbstractBaseUser):
    name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    
    USERNAME_FIELD = 'email'
    
    REQUIRED_FIELDS = ['profile_image','name']
    
    objects = UserManger()
        
    def __str__(self):
        return self.name
    

class Room(models.Model):
    ROOM_TYPES = [
        ("video", "Video"),
        ("chat", "Chat"),
    ]
   
    name = models.CharField(max_length=120)
    type = models.CharField(max_length=10, choices=ROOM_TYPES, default="chat")
    participants = models.PositiveIntegerField(default=0)   
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    owner = models.ForeignKey(User,on_delete=models.CASCADE, related_name="rooms" )

    def __str__(self):
        return f"{self.name} ({self.type}, {self.privacy})"

class RoomParticipant(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='room_participants')
    user_id = models.CharField(max_length=100)  
    joined_at = models.DateTimeField(auto_now_add=True)
    is_connected = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['room', 'user_id']
    
    def __str__(self):
        return f"{self.user_id} in {self.room.room_id}"