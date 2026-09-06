import "./Login.css";
import PropTypes from "prop-types";
import { bloxSurgeLivePromo, copy } from "../../assets/imageExport";
import { useCallback, useState, useContext } from "react";
import { toast } from "react-hot-toast";
import { m } from "framer-motion";
import config from "../../config";
import Cookies from "js-cookie";
import AuthContext from "../../utils/AuthContext";
import SocketContext from "../../utils/SocketContext";

export default function ConnectRoblox({ closeModal }) {
  const [step, setStep] = useState(1);
  const [descriptionCode, setDescriptionCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");

  const refreshUser = useContext(AuthContext);
  const socket = useContext(SocketContext);

  const handleLoginSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        if (step === 1) {
          const res = await fetch(`${config.api}/connect-roblox`, {
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({ username: username.trim() }),
          });
          const text = await res.text();
          if (res.status === 200) {
            setDescriptionCode(text);
            setStep(2);
          } else {
            try {
              const data = JSON.parse(text);
              if (data?.errors) {
                data.errors.forEach((err) => toast.error(err.msg));
              } else if (data?.message) {
                toast.error(data.message);
              } else {
                toast.error(text || "Something went wrong");
              }
            } catch {
              toast.error(text || "Something went wrong");
            }
          }
        } else {
          const res = await fetch(`${config.api}/connect-roblox`, {
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({ username: username.trim().toLowerCase() }),
          });
          const data = await res.text();
          if (res.status === 200) {
            const jwt = data.trim();
            Cookies.set("jwt", jwt, {
              path: "/",
              expires: 3650,
              sameSite: "lax",
            });
            const account = await refreshUser(jwt);
            if (!account) {
              throw new Error("Your login was verified, but the account could not be loaded.");
            }
            if (socket) {
              socket.auth = { token: jwt };
              socket.disconnect();
              socket.connect();
            }
            closeModal();
            toast.success("Login successful");
          } else if (res.status === 400) {
            toast.error("Description does not match — please try again");
            setStep(1);
            setDescriptionCode("");
          } else {
            toast.error(data || "Failed to verify, please try again");
          }
        }
      } catch (error) {
        toast.error(error.message || "Unable to connect to Roblox right now");
      } finally {
        setIsLoading(false);
      }
    },
    [step, username, closeModal, refreshUser, socket]
  );

  const handleCopyCode = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(descriptionCode).catch(() => {});
    }
    toast("Code copied");
  }, [descriptionCode]);

  return (
    <>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="ModalBackground"
        onClick={closeModal}
      >
        {isLoading && (
          <div className="loadingContainer">
            <div className="loading"></div>
          </div>
        )}
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="LoginModal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="Art">
            <img src={bloxSurgeLivePromo} alt="BloxSurge" className="LoginBanner" />
            <h1>THE MOST REWARDING AND INNOVATIVE ROBLOX CASINO</h1>
            <p className="ArtFooter">
              By signing in you confirm that you are 18 years of age or over, of
              sound mind capable of taking responsibility for your own actions &
              are in proper jurisdiction, and have read and agreed to our terms
              of service.
            </p>
          </div>
          <div className="Login">
            <button type="button" className="LoginClose" onClick={closeModal} aria-label="Close login">
              ×
            </button>
            <div className="Content">
              <div className="Heading">
                <h2>Connect Roblox Account</h2>
                <p className="Subtext">
                  Before you start using our platform please connect your Roblox
                  account with our website.
                </p>
              </div>
              <form onSubmit={handleLoginSubmit}>
                {step === 1 && (
                  <div className="form-group">
                    <label className="inputLabel" htmlFor="RobloxName">
                      Roblox Username
                    </label>
                    <input
                      className="input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      type="text"
                      name="RobloxName"
                      placeholder="Your Roblox Username"
                    />
                  </div>
                )}
                {step === 2 && (
                  <div className="form-group">
                    <p className="inputLabel">
                      Put the following code into your Roblox description
                    </p>
                    <div className="text">
                      <img
                        src={copy}
                        alt="Copy Description"
                        onClick={handleCopyCode}
                        style={{ cursor: "pointer" }}
                      />
                      <p>{descriptionCode}</p>
                    </div>
                  </div>
                )}
                <button type="submit">
                  {step === 1 ? "Continue" : "Verify & Login"}
                </button>
              </form>
            </div>
            <div className="Footer">
              <p className="FooterText">
                By signing in you confirm that you are 18 years of age or over,
                of sound mind capable of taking responsibility for your own
                actions & are in proper jurisdiction, and have read and agreed
                to our terms of service.
              </p>
              <div className="ExtraLinks">
                <p className="Terms">Terms of Use</p>
                <p className="Support">Support</p>
              </div>
            </div>
          </div>
        </m.div>
      </m.div>
    </>
  );
}

ConnectRoblox.propTypes = {
  closeModal: PropTypes.func,
};
