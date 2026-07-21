import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ApiDemoPage from "./pages/internal/ApiDemoPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      {import.meta.env.DEV && <Route path="/dev/api-demo" element={<ApiDemoPage />} />}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
