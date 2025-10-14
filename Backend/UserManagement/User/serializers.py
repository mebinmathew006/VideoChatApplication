from rest_framework import serializers
from .models import User,Room
import re


class UserSignupSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['name', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_name(self,value):
        if not re.match(r'^[A-Za-z\s]+$', value):  
            raise serializers.ValidationError("Name must contain only letters and spaces.")
        return value
    
    def validate_email(self, value):
        email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Enter a valid email address.")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value
    
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not re.search(r'[^A-Za-z0-9]', value):   
            raise serializers.ValidationError("Password must contain at least one special character.")
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password) 
        user.save()
        return user
        
        
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required = True)
    password = serializers.CharField(required = True)
    
    class Meta :
         fields = ['email','password' ]
         
         
class RoomOwnerSerializer(serializers.ModelSerializer):
   
    class Meta:
        model = User
        fields = ['id', 'email', 'name']

class RoomSerializer(serializers.ModelSerializer):
   
    # owner = RoomOwnerSerializer(read_only=True)
    owner = serializers.SerializerMethodField()
    
    class Meta:
        model = Room
        fields = [
            'id', 
            'name', 
            'type', 
            'participants', 
            'description', 
            'created_at', 
            'is_active', 
            'owner', 
            
        ]
        read_only_fields = ['id', 'created_at', 'owner']
    
    def get_owner(self, obj):
        
        if obj.owner.name:
            return obj.owner.name
        return obj.owner.email
    
from rest_framework import serializers
from .models import Room, Message, Attachment, User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email']

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ['id', 'file_url', 'file_type', 'original_filename', 'file_size']

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'message', 'sender', 'sender_type', 'created_at', 'attachments']

class RoomSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    
    class Meta:
        model = Room
        fields = ['id', 'name', 'description',  'is_active', 'owner', 'created_at']
