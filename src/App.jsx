// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import InvoiceForm from "./components/InvoiceForm";
import SupplierPage from "./components/SupplierPage";
import InvoiceList from "./components/InvoiceList";
import QuarterlySummary from "./components/QuarterlySummary";
import pharmacyImg from "./assets/pharmacy.jpg";

const Dashboard = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
    <h1 className="text-3xl font-bold text-blue-800 mb-4">
      Welcome to Al-Hikma Invoice Tracker
    </h1>
    <p className="text-gray-600 mb-6">
      Use the navigation above to manage and view invoices.
    </p>
    <img
      src={pharmacyImg}
      alt="Pharmacy storefront"
      className="w-full max-w-xs h-auto rounded-lg shadow-lg object-contain"
    />
  </div>
);

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar is now here, outside of any specific page */}
      <Navbar />
      <div className="h-24" />
      {/* All pages will render below the navbar */}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/add" element={<InvoiceForm />} />
        <Route path="/supplier" element={<SupplierPage />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/summary" element={<QuarterlySummary />} />
      </Routes>
    </div>
  );
}

export default App;
