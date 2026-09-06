import Router from "./router";
import { io } from "socket.io-client";
import SocketContext from "./utils/SocketContext";
import UserContext from "./utils/UserContext";
import AuthContext from "./utils/AuthContext";
import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getJWT } from "./utils/api";
import "./global.css";
import config from "./config";
import ConnectRoblox from "./components/Account/ConnectRoblox";
import { AnimatePresence } from "framer-motion";
import { LazyMotion, domAnimation } from "framer-motion";
import Cookies from "js-cookie";
import { bloxSurgeLivePromo } from "./assets/imageExport";

const socket = io(`${config.api}/`, {
  reconnectionDelayMax: 10000,
  auth: {
    token: getJWT(),
  },
  transports: ["websocket"],
});

export default function App() {
  const [userData, setUserData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [ConnectRobloxModal, setModalState] = useState(null);

  const handleBalanceUpdate = useCallback(
    (balance) => {
      setUserData({
        ...userData,
        balance: balance,
      });
    },
    [userData]
  );

  const fetchUser = useCallback((jwt) => {
    return fetch(`${config.api}/login-auto`, {
      method: "GET",
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          Cookies.remove("jwt", { path: "/" });
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.robloxId) {
          setUserData(data);
          return data;
        } else {
          Cookies.remove("jwt", { path: "/" });
          setUserData(null);
          return null;
        }
      })
      .catch(() => {
        Cookies.remove("jwt", { path: "/" });
        setUserData(null);
        return null;
      });
  }, []);

  const refreshUser = useCallback((newJwt) => {
    const jwt = newJwt || getJWT();
    if (!jwt) { setUserData(null); return Promise.resolve(null); }
    return fetchUser(jwt);
  }, [fetchUser]);

  useEffect(() => {
    const jwt = getJWT();
    if (!jwt) {
      setUserData(null);
      setLoadingData(false);
      return;
    }
    fetchUser(jwt).finally(() => setLoadingData(false));
  }, [fetchUser]);

  useEffect(() => {
    socket.on("BALANCE_UPDATE", handleBalanceUpdate);
    return () => {
      socket.off("BALANCE_UPDATE", handleBalanceUpdate);
    };
  }, [handleBalanceUpdate]);

  return (
    <>
      {loadingData && (
        <div className="LoadingScreen">
          <div className="LoadingGlow" />
          <img src={bloxSurgeLivePromo} alt="BloxSurge loading" />
          <p>Loading the surge...</p>
        </div>
      )}

      {!loadingData && (
        <AuthContext.Provider value={refreshUser}>
        <SocketContext.Provider value={socket}>
          <UserContext.Provider value={userData}>
            <LazyMotion features={domAnimation}>
              <Toaster
                toastOptions={{
                  style: {
                    // border: '1px solid #8f1d2c',
                    padding: "16px",
                    color: "#fff",
                     background: "#160b0e",
                  },
                  iconTheme: {
                   primary: "#b52b3d",
                    secondary: "#fff",
                  },
                }}
              />
              <AnimatePresence>
                {ConnectRobloxModal && ConnectRobloxModal}
              </AnimatePresence>
              <Router />
            </LazyMotion>
          </UserContext.Provider>
        </SocketContext.Provider>
        </AuthContext.Provider>
      )}
    </>
  );
}
