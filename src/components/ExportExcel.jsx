// src/components/ExportExcel.jsx
import React from "react";
import * as XLSX from "xlsx";

export default function ExportExcel({
  data,
  filename,
  buttonText,
  buttonClassName = "px-4 py-2 bg-blue-600 text-white rounded",
  summary,    // ← new
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

    // build worksheet
    const ws = XLSX.utils.json_to_sheet(sheetData);

    // if summary provided, append blank + summary rows
    if (summary) {
      const {
        totalAmount,
        totalSales,
        totalVAT,
        totalVATCollected,
      } = summary;

      const extra = [
        [],  // blank row
        ["Total Purchase", totalAmount],
        ["Total Sales", totalSales],
        ["Total VAT Given", totalVAT],
        ["Total VAT Collected", totalVATCollected],
      ];
      XLSX.utils.sheet_add_aoa(ws, extra, { origin: -1 });
    }

    // pack & write
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, filename);
  };

  return (
    <button onClick={handleExport} className={buttonClassName}>
      {buttonText}
    </button>
  );
}
