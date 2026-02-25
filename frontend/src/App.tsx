import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Providers from './app/providers';
import Layout from './app/Layout';
import HomePage from './app/HomePage';
import SupplyPointsPage from './features/supply-points/pages/SupplyPointsPage';
import ReadingsPage from './features/readings/pages/ReadingsPage';
import TariffsPage from './features/tariffs/pages/TariffsPage';
import ConversionFactorsPage from './features/conversion-factors/pages/ConversionFactorsPage';
import TaxesPage from './features/taxes/pages/TaxesPage';
import BillingPage from './features/billing/pages/BillingPage';

function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/supply-points" element={<SupplyPointsPage />} />
            <Route path="/readings" element={<ReadingsPage />} />
            <Route path="/tariffs" element={<TariffsPage />} />
            <Route path="/conversion-factors" element={<ConversionFactorsPage />} />
            <Route path="/taxes" element={<TaxesPage />} />
            <Route path="/billing" element={<BillingPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </Providers>
  );
}

export default App;

