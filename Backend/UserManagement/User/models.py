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
    
    name = models.CharField(max_length=120)
    participants = models.PositiveIntegerField(default=0)   
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    owner = models.ForeignKey(User,on_delete=models.CASCADE, related_name="rooms" )


class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    message = models.TextField(blank=True, null=True)
    sender_type = models.CharField(max_length=20, default='user')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender.name}: {self.message[:50]}"


class Attachment(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='chat_attachments/%Y/%m/%d/', blank=True, null=True)
    file_url = models.URLField(blank=True, null=True)
    file_type = models.CharField(max_length=100)
    original_filename = models.CharField(max_length=255)
    file_size = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.original_filename} - {self.message.id}"

