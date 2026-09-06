import "./Navbar.css";
import {
  discordBox,
  twitterBox,
  robux,
  notificationBell,
  logout,
  longLogo,
  coloredLogo,
  dollarsNav,
  bloxSurgeMark,
} from "../../assets/imageExport";
import { useContext, useCallback, useState, useEffect } from "react";
import UserContext from "../../utils/UserContext";
//import Login from "../Account/Login";
import Withdraw from "../Cashier/Withdraw";
import Deposit from "../Cashier/Deposit";
import FAQ from "../Popups/FAQ";
import TOS from "../Popups/TOS";
import { useNavigate } from "react-router-dom";
import SocketContext from "../../utils/SocketContext";
import Cookies from "js-cookie";
import { AnimatePresence, m } from "framer-motion";
//import Register from "../Account/Register";
import Profile from "../Popups/Profile";
import ForgotPassword from "../Popups/ForgotPassword";
import ConnectRoblox from "../Account/ConnectRoblox";
import Fairness from "../Popups/Fairness";
import ValuesPopup from "../Popups/ValuesPopup";
export default function Navbar() {
  const navigate = useNavigate();
  const userData = useContext(UserContext);
  const [modalState, setModalState] = useState(null);
  const [userBalance, setUserBalance] = useState(0);
  const [balanceInteger, setBalanceInteger] = useState("0");
  const [balanceDecimal, setBalanceDecimal] = useState("00");
  const socket = useContext(SocketContext);


  const handleLoginModal = useCallback(() => {
    setModalState(
      <ConnectRoblox
        closeModal={() => setModalState(null)}
        changeModal={() =>
          setModalState(
            <ForgotPassword closeModal={() => setModalState(null)} />
          )
        }
      />
    );
  }, []);

  const handleDepositModal = useCallback(() => {
    setModalState(
      <Deposit
        closeModal={() => setModalState(null)}
        changeModal={setModalState}
      />
    );
  }, []);

  const handleWithdraw = useCallback(() => {
    setModalState(
      <Withdraw
        closeModal={() => setModalState(null)}
        renderModal={setModalState}
      />
    );
  }, []);

  const handleLogout = useCallback(() => {
    Cookies.remove("jwt", { path: "/" });
    window.location.reload();
  }, []);

  useEffect(() => {
    if (userData?.robloxId) {
      const balanceDivided = userData.balance.toString().split(".");
      if (balanceDivided.length < 2) {
        setBalanceInteger(balanceDivided[0]);
        setBalanceDecimal("00");
      } else {
        setBalanceInteger(balanceDivided[0]);
        setBalanceDecimal(balanceDivided[1]);
      }
      if (userData?.robloxId) {
        setUserBalance(userData.balance);
      }
    }
  }, [userData]);

  return (
    <>
      <div className="Navbar">
        <div className="BrandLockup DesktopBrand" aria-label="BloxSurge">
          <span className="BrandWord Blox">Blox</span>
          <img src={bloxSurgeMark} alt="" />
          <span className="BrandWord Surge">Surge</span>
        </div>
        <div className="Content">
          <div className="InfoLinks">
            <div className="Link Purple Raffle">
              <p>1K Raffle</p>
            </div>
            <div className="Link Purple Event">
              <p>EVENT</p>
            </div>
            <div className="ImportantLinks">
              <div className="Affiliates Link">
                <p>Affiliates</p>
              </div>
              <div className="Responsibility Link">
                <p>Game Responsibly</p>
              </div>
              <div
                className="Fairness Link"
                onClick={() =>
                  setModalState(<Fairness closeModal={() => setModalState(null)} />)
                }
              >
                <p>Fairness</p>
              </div>
            </div>
            <div
              className="Link FAQ"
              onClick={() =>
                setModalState(<FAQ closeModal={() => setModalState(null)} />)
              }
            >
              <p>FAQ</p>
            </div>
            <div
              className="Link ValuesLink"
              onClick={() =>
                setModalState(<ValuesPopup closeModal={() => setModalState(null)} />)
              }
            >
              <p>Values</p>
            </div>
            <div
              className="Link TOS"
              onClick={() =>
                setModalState(<TOS closeModal={() => setModalState(null)} />)
              }
            >
              <p>Terms Of Service</p>
            </div>
            <div className="Link Claims">
              <p>Claims</p>
            </div>
            <div className="SocialLinks">
              <a href="https://twitter.com/bloxpvp1" target="_blank">
                <img src={twitterBox} alt="Twitter" className="Twitter" />
              </a>
              <a href="https://discord.gg/bloxsurge" target="_blank">
                <img src={discordBox} alt="Discord" className="Discord" />
              </a>
            </div>
          </div>
          <div className="NavLinks">
            <div className="BrandLockup CompactBrand" aria-label="BloxSurge">
              <span className="BrandWord Blox">Blox</span>
              <img src={bloxSurgeMark} alt="" />
              <span className="BrandWord Surge">Surge</span>
            </div>
            {userData && (
              <div className="Wallet">
                <div className="Balance">
                  <div className="ImageContainer">
                    <img
                      src={`${dollarsNav}`}
                      className="foregroundImage"
                      alt="Item"
                    />
                    <img
                      src={`${dollarsNav}`}
                      className="backgroundImage"
                      alt="Item"
                    />
                  </div>
                  <span className="Integers">
                    {balanceInteger}
                    <span className="Decimals">
                      .{balanceDecimal.substring(0, 2)}
                    </span>
                  </span>
                </div>
                <div className="Deposit" onClick={handleDepositModal}>
                  <p>Deposit</p>
                </div>
                <div
                  className="Cashier"
                  onClick={() => handleWithdraw()}
                  style={{ display: "none" }}
                >
                  <p>Wallet</p>
                </div>
              </div>
            )}
            {userData && ["OWNER", "ADMIN"].includes(String(userData.rank || "").toUpperCase()) && (
              <div
                className="AdminPanelBtn"
                onClick={() => navigate("/admin")}
                style={{
                  background: "linear-gradient(135deg, #d33148, #8f1d2c)",
                  color: "#fff",
                  padding: "0.4rem 1rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "0.8rem",
                  letterSpacing: "0.05em",
                  marginRight: "0.5rem",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                ⚙ Admin
              </div>
            )}
            {userData && (
              <div className="Profile">
                <div className="Money">
                  <div className="Withdraw" onClick={() => handleWithdraw()}>
                    <p>Withdraw</p>
                  </div>
                  <div className="Notifications Notification">
                    <img src={notificationBell} alt="Notification Bell" />
                  </div>
                </div>
                <div className="User">
                  <m.img
                    src={userData.thumbnail}
                    alt="profile picture"
                    onClick={() => {
                      setModalState(
                        <Profile
                          closeModal={() => setModalState(null)}
                          userId={userData.robloxId}
                        />
                      );
                    }}
                  />
                  <div className="ProfileInfo">
                    <p className="Username">{userData.username}</p>
                    <p className="Level">Level {Math.floor(userData.level)}</p>
                  </div>
                  <div className="Logout" onClick={handleLogout}>
                    <img src={logout} alt="Logout" />
                  </div>
                </div>
              </div>
            )}
            {!userData && (
              <div className="auth-buttons">
                <div className="Login" onClick={handleLoginModal}>
                  <p>Login</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>{modalState && modalState}</AnimatePresence>
    </>
  );
}
