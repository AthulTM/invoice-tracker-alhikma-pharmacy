// src/components/QuarterlySummary.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { db } from "../firebase";

// helper to get three consecutive YYYY-MM strings
const getQuarterMonths = (startMonth) => {
  const months = [];
  const m = dayjs(startMonth);
  for (let i = 0; i < 3; i++) {
    months.push(m.add(i, "month").format("YYYY-MM"));
  }
  return months;
};

const QuarterlySummary = () => {
  const [startMonth, setStartMonth] = useState(dayjs().format("YYYY-MM"));
  const [quarterInvoices, setQuarterInvoices] = useState([]);
  const [totals, setTotals] = useState({
    totalWithVAT: "0.00",
    totalVAT: "0.00",
  });

  // Fetch invoices + compute totals
  useEffect(() => {
    async function fetchQuarterData() {
      const months = getQuarterMonths(startMonth);
      let all = [];
      for (const m of months) {
        const q = query(collection(db, "invoices"), where("month", "==", m));
        const snap = await getDocs(q);
        all.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
      setQuarterInvoices(all);

      const totalWithVAT = all.reduce((sum, inv) => sum + (inv.amountWithVAT || 0), 0);
      const totalVAT = all.reduce((sum, inv) => sum + (inv.vatAmount || 0), 0);
      setTotals({
        totalWithVAT: totalWithVAT.toFixed(2),
        totalVAT: totalVAT.toFixed(2),
      });
    }
    fetchQuarterData();
  }, [startMonth]);

  const months = getQuarterMonths(startMonth);
  const monthsDisplay = months.join(", ");

  // Export single-sheet with blank separators
  const exportQuarter = () => {
    const aoa = [];

    // Header row
    aoa.push([
      "Month",
      "Date",
      "Supplier",
      "Invoice No",
      "VAT No",
      "Amount (with VAT)",
      "VAT Amount",
    ]);

    // For each month, push label row + its data + two blank rows
    months.forEach((m) => {
      // month label
      aoa.push([m, "", "", "", "", "", ""]);

      // rows for that month
      quarterInvoices
        .filter((inv) => inv.month === m)
        .forEach((inv) => {
          aoa.push([
            "",
            inv.date,
            inv.supplierName,
            inv.invoiceNo,
            inv.vatNo,
            inv.amountWithVAT,
            inv.vatAmount,
          ]);
        });

      // two blank rows as separator
      aoa.push([]);
      aoa.push([]);
      aoa.push([]);
      aoa.push([]);
      aoa.push([]);
      aoa.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Q-${startMonth}`);
    XLSX.writeFile(wb, `invoices-quarter-${startMonth}.xlsx`);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-purple-700">
        Quarterly Summary
      </h2>

      {/* Month picker */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Select Start Month:</label>
        <input
          type="month"
          className="border p-2"
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
        />
      </div>

      {/* Totals */}
      <p className="mb-2 text-gray-700">
        Showing totals for: <strong>{monthsDisplay}</strong>
      </p>
      <div className="text-right mb-6">
        <p>
          <strong>Total Amount with VAT (3 months):</strong> {totals.totalWithVAT}
        </p>
        <p>
          <strong>Total VAT Amount (3 months):</strong> {totals.totalVAT}
        </p>
      </div>

      {/* Detailed 3-month table */}
      {quarterInvoices.length === 0 ? (
        <p className="text-gray-600 mb-6">No invoices found for this period.</p>
      ) : (
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100 text-center">
                <th className="p-2 border">Month</th>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Supplier</th>
                <th className="p-2 border">Invoice No</th>
                <th className="p-2 border">VAT No</th>
                <th className="p-2 border">Amount (with VAT)</th>
                <th className="p-2 border">VAT Amount</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) =>
                quarterInvoices
                  .filter((inv) => inv.month === m)
                  .map((inv) => (
                    <tr key={inv.id} className="text-center">
                      <td className="border p-2">{m}</td>
                      <td className="border p-2">{inv.date}</td>
                      <td className="border p-2">{inv.supplierName}</td>
                      <td className="border p-2">{inv.invoiceNo}</td>
                      <td className="border p-2">{inv.vatNo}</td>
                      <td className="border p-2">{inv.amountWithVAT.toFixed(2)}</td>
                      <td className="border p-2">{inv.vatAmount.toFixed(2)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Export single-sheet with separators */}
      <button
        onClick={exportQuarter}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Export Quarter
      </button>
    </div>
  );
};

export default QuarterlySummary;
