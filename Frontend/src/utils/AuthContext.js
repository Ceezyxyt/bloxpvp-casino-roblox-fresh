import { createContext } from "react";

const AuthContext = createContext(() => Promise.resolve(null));

export default AuthContext;
