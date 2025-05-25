// src/components/ExportExcel.jsx
import React from "react";
import * as XLSX from "xlsx";

export default function ExportExcel({
  data,
  filename,
  buttonText,
  buttonClassName = "px-4 py-2 bg-blue-600 text-white rounded",
}) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert("No data to export!");
      return;
    }

    // map your raw invoices into a sheet-friendly format
    const sheetData = data.map((inv) => ({
      Date: inv.date,
      Supplier: inv.supplierName,
      "Invoice No": inv.invoiceNo,
      "VAT No": inv.vatNo,
      "Amount (with VAT)": inv.amountWithVAT,
      "VAT Amount": inv.vatAmount,
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");

    // this will trigger the download
    XLSX.writeFile(wb, filename);
  };

  return (
    <button onClick={handleExport} className={buttonClassName}>
      {buttonText}
    </button>
  );
}
