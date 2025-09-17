import axiosInstance from "../api/axiosconfig";
import publicaxiosconfig from "../api/Publicaxiosconfig"

export const loginRoute = async (email, password) => {
  const response = await publicaxiosconfig.post("v1/auth/login", {
    email: email,
    password: password,
  });
  return response;
};
export const signupRoute = async (formData) => {
  const response = await publicaxiosconfig.post("v1/auth/signup", formData);
  return response;
};