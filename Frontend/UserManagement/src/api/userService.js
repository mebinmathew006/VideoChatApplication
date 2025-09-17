import axiosInstance from "../api/axiosconfig";

export const RoomCreationRoute = async (formData)=>{
    const response = await axiosInstance.post('v1/rooms',formData)
    return response
}
export const fetchRoomsRoute = async ()=>{
    const response = await axiosInstance.get('v1/rooms')
    return response
}

