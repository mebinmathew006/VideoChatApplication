// hooks/useChat.js
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axiosInstance from "../api/axiosconfig";

export const useChat = (userId, userType) => {
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [activeConsultationId, setActiveConsultationId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("select ...");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false); // New state for sending status
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeConsultationIdRef = useRef(null);
  const currentSelectedUserid = useRef(null);
  const socketBaseUrl = import.meta.env.VITE_WEBSOCKET_URL;
  // Enable notification sound
  const accessToken = useSelector((state) => state.userDetails.access_token);;

  // Update ref whenever activeConsultationId changes
  useEffect(() => {
    activeConsultationIdRef.current = activeConsultationId;
  }, [activeConsultationId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!userId) return;

    try {
      const endpoint =
        userType === "doctor"
          ? `/consultations/get_consultation_mapping_for_chat/${userId}`
          : `/consultations/get_consultation_mapping_for_user_chat/${userId}`;

      const response = await axiosInstance.get(endpoint);
      setUsers(response.data);
      console.log(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [userId, userType]);

  const sendVideoCallResponse = async (message) => {
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      activeConsultationIdRef.current
    ) {
      const messageData = {
        type: "message",
        message: message,
        consultation_id: activeConsultationIdRef.current,
        sender_id: userId,
        sender_type: userType,
        message_type: "text",
        attachments: [],
        created_at: new Date().toISOString(),
      };
      
      wsRef.current.send(JSON.stringify(messageData));
    }
  };

  const handleVideoCallRequest = useCallback(async () => {
    const result = await Swal.fire({
      title: "Videocall Request",
      text: "Do you want to continue with videocall",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
    });

    if (!result.isConfirmed) {
      await sendVideoCallResponse("Doctor Rejected video Call");
      return;
    }

    await sendVideoCallResponse("Doctor accepted video Call");
    toast.success("You will recive a notification if user start the session",{position:'bottom-center'});
    await updateAvailabilityRoute(userId,false)

    setTimeout(() => {
      navigate("/doctor_view_notifications");
    }); 
  }, [sendVideoCallResponse, navigate]);

  const handleVideoCallRequestforUser = useCallback(async () => {
    toast.success("Connecting...", { position: "bottom-center" });
    setTimeout(async () => {
      await navigate("/user_booking", {
        state: { doctorId: currentSelectedUserid.current },
      });
    }, 5000);
  }, [navigate]);
  // Helper function to upload files
  const uploadFiles = useCallback(
    async (files, consultationId) => {
      if (!files || files.length === 0) return [];

      try {
        const uploadPromises = files.map(async (fileObj) => {
          // Validate file size before upload attempt
          if (fileObj.size > 50 * 1024 * 1024) {
            // 50MB
            return {
              filename: fileObj.name,
              upload_status: "failed",
              error: "File exceeds 50MB limit",
              file_size: fileObj.size,
            };
          }

          const formData = new FormData();
          formData.append("file", fileObj.file);
          formData.append("consultation_id", consultationId);
          formData.append("sender_id", userId);
          formData.append("sender_type", userType);

          try {
            const response = await axiosInstance.post(
              "/consultations/upload_chat_file",
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
                timeout: 300000, // 5 minute timeout
              }
            );

            return {
              ...response.data,
              upload_status: "success",
              original_filename: fileObj.name,
            };
          } catch (error) {
            let errorMsg = "Upload failed";
            if (error.response) {
              if (error.response.status === 413) {
                errorMsg = "File too large (max 50MB)";
              } else {
                errorMsg =
                  error.response.data?.detail || error.response.statusText;
              }
            } else {
              errorMsg = error.message || "Network error";
            }

            return {
              filename: fileObj.name,
              upload_status: "failed",
              error: errorMsg,
              file_size: fileObj.size,
            };
          }
        });

        return await Promise.all(uploadPromises);
      } catch (error) {
        console.error("Error in upload process:", error);
        return files.map((fileObj) => ({
          filename: fileObj.name,
          upload_status: "failed",
          error: "Upload processing failed",
          file_size: fileObj.size,
        }));
      }
    },
    [userId, userType]
  );

  const handleWebSocketMessage = useCallback(
    async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[RECEIVED MESSAGE]", data);

        if (
          data.message == "Doctor accepted video Call" &&
          userType == "user"
        ) {
          toast.info("doctor approved Connecting...", {
            position: "bottom-center",
          });
          handleVideoCallRequestforUser();
        }
        if (
          data.message == "Doctor Rejected video Call" &&
          userType == "user"
        ) {
          toast.info("Doctor Rejected");
        }

        if (
          data.message == "requested for a video call" &&
          userType == "doctor"
        ) {
          handleVideoCallRequest(); 
        }

        // Handle status updates (online/offline)
        if (data.type === "status") {
          const { status, user_id } = data;
          if (user_id !== userId) {
            setIsOnline(status === "online");

            // Update user online status in users list
            setUsers((prevUsers) =>
              prevUsers.map((user) =>
                (userType === "doctor" ? user.user_id : user.doctor_id) ===
                user_id
                  ? { ...user, online: status === "online" }
                  : user
              )
            );
          }
        }

        // Handle typing indicators
        if (data.type === "typing") {
          const { sender_id, is_typing } = data;
          const currentConsultationId = activeConsultationIdRef.current;
          if (
            sender_id !== userId &&
            data.consultation_id === currentConsultationId
          ) {
            setIsTyping(is_typing);
          }
        }

        // Handle regular messages
        if (data.type === "message") {
          const currentConsultationId = activeConsultationIdRef.current;

          console.log("[MESSAGE RECEIVED]", {
            dataConsultationId: data.consultation_id,
            currentConsultationId: currentConsultationId,
            matches: data.consultation_id === currentConsultationId,
          });

          // Only add message if it's for the active consultation
          if (data.consultation_id === currentConsultationId) {
            const receivedMessage = {
              id: data.id || `${data.sender_id}-${Date.now()}`,
              message: data.message,
              created_at: data.created_at || new Date().toISOString(),
              sender: data.sender_type,
              sender_id: data.sender_id,
              consultation_id: data.consultation_id,
              // Handle file attachments
              attachments: data.attachments || [],
              message_type: data.message_type || "text",
            };

            console.log("[ADDING MESSAGE TO STATE]", receivedMessage);

            setMessages((prevMessages) => {
              // Check for duplicate messages
              const isDuplicate = prevMessages.some(
                (msg) =>
                  msg.id === receivedMessage.id || // Same ID
                  (msg.message === receivedMessage.message &&
                    msg.sender_id === receivedMessage.sender_id &&
                    Math.abs(
                      new Date(msg.created_at) -
                        new Date(receivedMessage.created_at)
                    ) < 2000)
              );

              if (isDuplicate) {
                console.log("[DUPLICATE MESSAGE DETECTED]", receivedMessage);
                return prevMessages;
              }

              const newMessages = [...prevMessages, receivedMessage];
              console.log("[MESSAGES UPDATED]", newMessages);
              return newMessages;
            });

            // Auto-scroll to bottom when new message arrives
            setTimeout(() => {
              scrollToBottom();
            }, 100);
          }
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    },
    [userId, userType, scrollToBottom]
  );

  // Updated handleSendMessage to support files

  const handleSendMessage = useCallback(
    async (attachedFiles = []) => {
      if ( !newMessage=='requested for a video call' ){
      sendNotification(activeChat, "You have message", "message",0);

      }

      if (
        (!newMessage.trim() && attachedFiles.length === 0) ||
        !wsRef.current ||
        !activeConsultationId ||
        !isConnected
      ) {
        return;
      }

      setIsSendingMessage(true);

      try {
        let uploadedFiles = [];

        if (attachedFiles.length > 0) {
          uploadedFiles = await uploadFiles(
            attachedFiles,
            activeConsultationId
          );

          // Show immediate feedback for failed uploads
          const failedUploads = uploadedFiles.filter(
            (f) => f.upload_status === "failed"
          );
          if (failedUploads.length > 0) {
            showToast(
              `${failedUploads.length} file(s) failed to upload: ${failedUploads
                .map((f) => f.filename)
                .join(", ")}`
            );
          }
        }

        const messageData = {
          type: "message",
          message: newMessage.trim(),
          consultation_id: activeConsultationId,
          sender_id: userId,
          sender_type: userType,
          message_type: attachedFiles.length > 0 ? "media" : "text",
          attachments: uploadedFiles,
          created_at: new Date().toISOString(),
        };
        
        wsRef.current.send(JSON.stringify(messageData));

        setNewMessage("");
      } catch (error) {
        toast.error("Failed to send message. Please try again.");
        console.error("Message send error:", error);
      } finally {
        setIsSendingMessage(false);
      }
    },
    [
      newMessage,
      activeConsultationId,
      userId,
      userType,
      isConnected,
      uploadFiles,
    ]
  );
  const initializeChat = useCallback(
    async (consultationId) => {
      console.log("[INITIALIZING CHAT]", consultationId);

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setIsConnected(false);
      setConnectionStatus("Connecting...");

      try {
        const ws = new WebSocket(
          `${socketBaseUrl}/consultations/ws/chat/${consultationId}?token=${accessToken}`
        );
        wsRef.current = ws;

        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Connection timeout"));
          }, 10000);

          ws.onopen = () => {
            console.log("[WEBSOCKET CONNECTED]");
            clearTimeout(timeout);
            setIsConnected(true);
            setConnectionStatus("Connected");

            const initPayload = {
              type: "join",
              sender_id: userId,
              sender_type: userType,
              consultation_id: consultationId,
            };

            console.log("[SENDING JOIN PAYLOAD]", initPayload);
            ws.send(JSON.stringify(initPayload));
            resolve();
          };

          ws.onerror = (error) => {
            console.error("[WEBSOCKET ERROR]", error);
            clearTimeout(timeout);
            setIsConnected(false);
            setConnectionStatus("Connection failed");
            reject(error);
          };
        });

        ws.onclose = (event) => {
          console.log("[WEBSOCKET CLOSED]", event);
          setConnectionStatus("Disconnected");
          setIsConnected(false);
        };

        ws.onmessage = handleWebSocketMessage;
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        setConnectionStatus("Connection failed");
        setIsConnected(false);
      }
    },
    [userId, userType, handleWebSocketMessage]
  );

  const handleUserSelect = useCallback(
    async (selectedUserId, consultationId) => {
      console.log("[USER SELECTED]", { selectedUserId, consultationId });

      if (activeConsultationId === consultationId) return;

      try {
        setIsLoadingMessages(true);
        setMessages([]);

        // SET CONSULTATION ID
        setActiveConsultationId(consultationId);
        setActiveChat(selectedUserId);
        currentSelectedUserid.current = selectedUserId;

        const user = users.find((u) =>
          userType === "doctor"
            ? u.user_id === selectedUserId
            : u.psychologist_id === selectedUserId
        );
        setActiveUser(user);

        // Initialize WebSocket connection
        await initializeChat(consultationId);

        // Fetch chat history
        const response = await axiosInstance.get(
          `/consultations/get_chat_messages/${consultationId}`
        );

        console.log("[CHAT HISTORY LOADED]", response.data);
        setMessages(response.data || []);

        // Scroll to bottom after messages load
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } catch (error) {
        console.error("Error fetching chat messages:", error);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [activeConsultationId, users, initializeChat, userType, scrollToBottom]
  );

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  

  return {
    // State
    activeChat,
    activeUser,
    newMessage,
    setNewMessage,
    messages,
    users,
    isOnline,
    isConnected,
    connectionStatus,
    isLoadingMessages,
    isTyping,
    isSendingMessage, // New state
    messagesEndRef,

    // Actions
    handleSendMessage, // Now supports files
    handleUserSelect,

    // Utils
    scrollToBottom,
    uploadFiles, // Expose for manual file uploads if needed
  };
};
