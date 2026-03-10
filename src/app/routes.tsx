import { createBrowserRouter } from "react-router";
import Root from "./pages/Root";
import Dashboard from "./pages/Dashboard";
import ProjectDetails from "./pages/ProjectDetails";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import Integrations from "./pages/Integrations";
import NotificationRules from "./pages/NotificationRules";
import Search from "./pages/Search";
import Login from "./pages/Login";
import OAuthCallback from "./pages/OAuthCallback";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/oauth/callback",
    Component: OAuthCallback,
  },
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "projects/:projectId", Component: ProjectDetails },
      { path: "alerts", Component: Alerts },
      { path: "reports", Component: Reports },
      { path: "integrations", Component: Integrations },
      { path: "notifications", Component: NotificationRules },
      { path: "search", Component: Search },
    ],
  },
]);