import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lazy-load-list"],
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    proxy: {
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true,
        changeOrigin: true,
      },
      "/values/adopt-me": { target: "http://localhost:3000", changeOrigin: true },
      "/connect-roblox": { target: "http://localhost:3000", changeOrigin: true },
      "/login-auto": { target: "http://localhost:3000", changeOrigin: true },
      "/user": { target: "http://localhost:3000", changeOrigin: true },
      "/profile": { target: "http://localhost:3000", changeOrigin: true },
      "/admin/stats": { target: "http://localhost:3000", changeOrigin: true },
      "/admin/users": { target: "http://localhost:3000", changeOrigin: true },
      "/admin/set-balance": { target: "http://localhost:3000", changeOrigin: true },
      "/admin/set-rank": { target: "http://localhost:3000", changeOrigin: true },
      "/admin/items": { target: "http://localhost:3000", changeOrigin: true },
      "/admin/user-inventory": { target: "http://localhost:3000", changeOrigin: true },
      "/admin/tax": { target: "http://localhost:3000", changeOrigin: true },
      "/message": { target: "http://localhost:3000", changeOrigin: true },
      "/chat": { target: "http://localhost:3000", changeOrigin: true },
      "/coinflip": { target: "http://localhost:3000", changeOrigin: true },
      "/coinflips": { target: "http://localhost:3000", changeOrigin: true },
      "/giveaway": { target: "http://localhost:3000", changeOrigin: true },
      "/giveaways": { target: "http://localhost:3000", changeOrigin: true },
      "/cashier": { target: "http://localhost:3000", changeOrigin: true },
      "/deposit": { target: "http://localhost:3000", changeOrigin: true },
      "/withdraw": { target: "http://localhost:3000", changeOrigin: true },
      "/withdrawals": { target: "http://localhost:3000", changeOrigin: true },
      "/callback": { target: "http://localhost:3000", changeOrigin: true },
      "/mines": { target: "http://localhost:3000", changeOrigin: true },
      "/get-balance": { target: "http://localhost:3000", changeOrigin: true },
      "/get-address": { target: "http://localhost:3000", changeOrigin: true },
      "/send-payout": { target: "http://localhost:3000", changeOrigin: true },
      "/create-static-address": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
});
