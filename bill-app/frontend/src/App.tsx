import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/welcome';
import CreateInvoicePage from './pages/create';
import ViewInvoicesPage from './pages/invoices';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/app/create" element={<CreateInvoicePage />} />
        <Route path="/app/invoices" element={<ViewInvoicesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
