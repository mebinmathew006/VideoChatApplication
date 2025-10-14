# 🧪 Django Project Testing Documentation

## 📘 Overview
This documentation covers the comprehensive testing strategy for the **Django backend project**, including **unit tests**, **integration tests**, **WebSocket tests**, and **testing best practices**.

---

## 🧱 Test Structure

### **1. Model Tests (`User/tests/test_models.py`)**
**Purpose:** Test database models and their behavior.

**Test Cases Covered:**
- User model creation (regular user and superuser)
- Room model creation with owner relationship
- Message model with room and sender relationships
- Attachment model with file metadata

**Key Assertions:**
- Field values are correctly stored  
- Relationships are properly established  
- Default values are set correctly  
- Model methods work as expected  

---

### **2. Serializer Tests (`User/tests/test_serializers.py`)**
**Purpose:** Test data validation and serialization/deserialization.

**Test Cases Covered:**
- `UserSignupSerializer` validation  
- Valid and invalid user data  
- Password strength validation  
- Email format validation  
- `RoomSerializer` serialization  

**Key Assertions:**
- Valid data passes validation  
- Invalid data raises appropriate errors  
- Serialized output contains expected fields  
- Password hashing works correctly  

---

### **3. View Tests (`User/tests/test_views.py`)**
**Purpose:** Test API endpoints and HTTP responses.

**Test Cases Covered:**
- User authentication (signup and login)
- Room creation and management
- Token refresh functionality
- Error handling for invalid requests

**Key Assertions:**
- HTTP status codes are correct  
- Response data structure is as expected  
- Authentication works properly  
- Error messages are appropriate  

---

### **4. WebSocket Consumer Tests (`signaling/tests/test_consumers.py`)**
**Purpose:** Test real-time WebSocket functionality.

**Test Cases Covered:**
- WebSocket connection with valid/invalid tokens  
- Message sending and broadcasting  
- File attachment handling  
- User join/leave notifications  
- Message pagination  
- Token refresh handling  
- Error handling for invalid JSON  

**Key Assertions:**
- WebSocket connections establish properly  
- Messages are broadcast to all room participants  
- Authentication tokens are validated  
- File attachments are processed correctly  
- Error messages are properly formatted  

---

### **5. Integration Tests (`UserManagement/tests/integration_tests.py`)**
**Purpose:** Test complete system workflows across multiple components.

**Test Cases Covered:**
- Complete chat flow (login → create room → chat → history)
- Multiple rooms with different users
- API endpoint integration
- WebSocket communication across rooms
- Synchronous and asynchronous test scenarios

**Key Assertions:**
- End-to-end workflows function correctly  
- Multiple components integrate properly  
- Data consistency across API and WebSocket layers  
- Concurrent user interactions work as expected  

---

## 🧩 Testing Methodology

### **Unit Testing**
- **Models:** Test individual model instances and methods  
- **Serializers:** Test data validation in isolation  
- **Forms:** Test form validation (if applicable)  
- **Consumers:** Test WebSocket handlers in isolation  

### **Integration Testing**
- **Views:** Test complete request-response cycle  
- **API Endpoints:** Test endpoints with authentication  
- **Database Operations:** Test CRUD operations  
- **WebSocket Communication:** Test real-time messaging flows  
- **Cross-Component Workflows:** Validate API ↔ WebSocket interaction  

---

## ⚙️ Async Testing Patterns

```python
# Example: Testing asynchronous WebSocket consumers
@async_to_sync_test
async def test_websocket_communication(self):
    communicator = WebsocketCommunicator(consumer, path)
    connected, _ = await communicator.connect()
    self.assertTrue(connected)
