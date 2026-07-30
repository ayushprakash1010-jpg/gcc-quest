const axios = require("axios");

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});
apiClient.interceptors.response.use((res) => res.data);

async function testAuth() {
  try {
    const res = await apiClient.post("/auth/login", {
      email: "admin@gccquest.com",
      password: "admin123",
    });
    console.log("Login Res:", res);

    const profileRes = await apiClient.get("/auth/me", {
      headers: { Authorization: `Bearer ${res.data.accessToken}` },
    });
    console.log("Profile Res:", profileRes);
  } catch (e) {
    console.error("Auth Error:", e.response ? e.response.status : e.message);
  }
}
testAuth();
