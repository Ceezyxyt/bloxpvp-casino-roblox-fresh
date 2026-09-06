import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Home from "./pages/Tabs/Home";
import Jackpot from "./pages/Tabs/Jackpot";
import Marketplace from "./pages/Tabs/Marketplace";
import Admin from "./pages/Admin/Admin";
import Error from "./pages/Error/Error";
import Values from "./pages/Tabs/Values";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    errorElement: <Error />,
  },
  {
    path: "/jackpot",
    element: <Jackpot />,
  },
  {
    path: "/marketplace",
    element: <Marketplace />,
  },
  {
    path: "/values",
    element: <Values />,
  },
  {
    path: "/admin",
    element: <Admin />,
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
