import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ApiDemoPage from "./pages/internal/ApiDemoPage";
import ComponentsPage from "./pages/internal/ComponentsPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import CustomerDetailPage from "./pages/customers/CustomerDetailPage";
import CustomerFormPage from "./pages/customers/CustomerFormPage";
import CustomersListPage from "./pages/customers/CustomersListPage";
import { AppLayout } from "./routing/AppLayout";
import { ProtectedRoute } from "./routing/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/customers" element={<CustomersListPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
        </Route>
      </Route>
      {import.meta.env.DEV && <Route path="/dev/api-demo" element={<ApiDemoPage />} />}
      {import.meta.env.DEV && <Route path="/dev/components" element={<ComponentsPage />} />}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
