// src/components/QuarterlySummary.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import dayjs from "dayjs";
import { db } from "../firebase";
import * as XLSX from "xlsx";

// helper to get three consecutive YYYY-MM strings
const getQuarterMonths = (startMonth) => {
  const months = [];
  const m = dayjs(startMonth);
  for (let i = 0; i < 3; i++) {
    months.push(m.add(i, "month").format("YYYY-MM"));
  }
  return months;
};

export default function QuarterlySummary() {
  const [startMonth, setStartMonth] = useState(dayjs().format("YYYY-MM"));
  const [quarterInvoices, setQuarterInvoices] = useState([]);
  const [totals, setTotals] = useState({
    totalWithVAT: "0.00",
    totalVAT: "0.00",
  });

  // sales‐totals state & overrides
  const [salesTotals, setSalesTotals] = useState({
    totalSales: 0,
    totalVATCollected: 0,
  });
  const [overrideValues, setOverrideValues] = useState({
    totalSales: "",
    totalVATCollected: "",
  });
  const [editingOverride, setEditingOverride] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);

  useEffect(() => {
    async function fetchQuarterData() {
      const months = getQuarterMonths(startMonth);

      // ─── 1) Fetch ALL invoices for these 3 months in one go ───
      const invSnap = await getDocs(
        query(collection(db, "invoices"), where("month", "in", months))
      );
      const invs = invSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // ─── sort by date ascending ───────────────────────────────
      invs.sort((a, b) => new Date(a.date) - new Date(b.date));
      setQuarterInvoices(invs);

      // compute purchase totals
      const totalWithVAT = invs.reduce(
        (sum, inv) => sum + (inv.amountWithVAT || 0),
        0
      );
      const totalVAT = invs.reduce(
        (sum, inv) => sum + (inv.vatAmount || 0),
        0
      );
      setTotals({
        totalWithVAT: totalWithVAT.toFixed(2),
        totalVAT: totalVAT.toFixed(2),
      });

      // ─── 2) Fetch ALL dailySales over the quarter window ───
      const startDate = `${startMonth}-01`;
      const endDate = dayjs(startDate)
        .add(3, "month")
        .format("YYYY-MM-DD");
      const dailySnap = await getDocs(
        query(
          collection(db, "dailySales"),
          where("date", ">=", startDate),
          where("date", "<", endDate)
        )
      );
      const dailyRecords = dailySnap.docs.map((d) => d.data());

      // ─── 3) Fetch all per‐month overrides in one go ───
      const monthOverrideSnap = await getDocs(
        query(collection(db, "monthlySales"), where("month", "in", months))
      );
      const monthOverrideMap = {};
      monthOverrideSnap.docs.forEach((d) => {
        monthOverrideMap[d.id] = d.data();
      });

      // build up quarterly sales/VAT using overrides where present
      let computedSales = 0;
      let computedVAT = 0;
      months.forEach((m) => {
        if (monthOverrideMap[m]) {
          computedSales += monthOverrideMap[m].totalSales || 0;
          computedVAT += monthOverrideMap[m].totalVATCollected || 0;
        } else {
          // sum dailyRecords for this month
          dailyRecords
            .filter((e) => e.date.startsWith(m))
            .forEach((e) => {
              computedSales += e.amount || 0;
              computedVAT += e.vatAmount || 0;
            });
        }
      });

      // ─── 4) Finally check for a quarterly override ───
      const quarterRef = doc(db, "quarterlySales", startMonth);
      const quarterSnap = await getDoc(quarterRef);
      if (quarterSnap.exists() && quarterSnap.data().totalSales > 0) {
        const d = quarterSnap.data();
        setSalesTotals({
          totalSales: d.totalSales,
          totalVATCollected: d.totalVATCollected,
        });
        setOverrideValues({
          totalSales: d.totalSales.toFixed(2),
          totalVATCollected: d.totalVATCollected.toFixed(2),
        });
        setHasOverride(true);
      } else {
        setSalesTotals({
          totalSales: computedSales,
          totalVATCollected: computedVAT,
        });
        setOverrideValues({
          totalSales: computedSales.toFixed(2),
          totalVATCollected: computedVAT.toFixed(2),
        });
        setHasOverride(false);
      }
    }

    fetchQuarterData();
  }, [startMonth]);

  const months = getQuarterMonths(startMonth);
  const monthsDisplay = months.join(", ");

  // ─── Export with your same footers ───────────────────────────────
  const exportQuarter = () => {
    const aoa = [];
    aoa.push([
      "Month",
      "Date",
      "Supplier",
      "Invoice No",
      "VAT No",
      "Amount (with VAT)",
      "VAT Amount",
    ]);
    months.forEach((m) => {
      aoa.push([m, "", "", "", "", "", ""]);
      quarterInvoices
        .filter((inv) => inv.month === m)
        .forEach((inv) =>
          aoa.push([
            "",
            inv.date,
            inv.supplierName,
            inv.invoiceNo,
            inv.vatNo,
            inv.amountWithVAT,
            inv.vatAmount,
          ])
        );
      aoa.push([], [], [], [], [], []);
    });

    // summary at bottom
    aoa.push([]);
    aoa.push(["Total Purchase", totals.totalWithVAT]);
    aoa.push(["Total Sales", salesTotals.totalSales.toFixed(2)]);
    aoa.push(["Total VAT Given", totals.totalVAT]);
    aoa.push([
      "Total VAT Collected",
      salesTotals.totalVATCollected.toFixed(2),
    ]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Q-${startMonth}`);
    XLSX.writeFile(wb, `invoices-quarter-${startMonth}.xlsx`);
  };

  const saveOverride = async () => {
    const ref = doc(db, "quarterlySales", startMonth);
    const payload = {
      totalSales: parseFloat(overrideValues.totalSales),
      totalVATCollected: parseFloat(overrideValues.totalVATCollected),
    };
    await setDoc(ref, { ...payload, month: startMonth });
    setSalesTotals(payload);
    setEditingOverride(false);
    setHasOverride(true);
    alert("✅ Quarterly override saved!");
  };

  const clearOverride = async () => {
    await deleteDoc(doc(db, "quarterlySales", startMonth));
    // re-fetch data to recalculate
    const months = getQuarterMonths(startMonth);
    let recomputedSales = 0;
    let recomputedVAT = 0;

    // fetch dailySales and monthly overrides again
    const startDate = `${startMonth}-01`;
    const endDate = dayjs(startDate)
      .add(3, "month")
      .format("YYYY-MM-DD");
    const [dailySnap, monthOverrideSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "dailySales"),
          where("date", ">=", startDate),
          where("date", "<", endDate)
        )
      ),
      getDocs(
        query(collection(db, "monthlySales"), where("month", "in", months))
      ),
    ]);
    const dailyRecords = dailySnap.docs.map((d) => d.data());
    const monthOverrideMap = {};
    monthOverrideSnap.docs.forEach((d) => {
      monthOverrideMap[d.id] = d.data();
    });

    months.forEach((m) => {
      if (monthOverrideMap[m]) {
        recomputedSales += monthOverrideMap[m].totalSales || 0;
        recomputedVAT += monthOverrideMap[m].totalVATCollected || 0;
      } else {
        dailyRecords
          .filter((e) => e.date.startsWith(m))
          .forEach((e) => {
            recomputedSales += e.amount || 0;
            recomputedVAT += e.vatAmount || 0;
          });
      }
    });

    setSalesTotals({
      totalSales: recomputedSales,
      totalVATCollected: recomputedVAT,
    });
    setOverrideValues({
      totalSales: recomputedSales.toFixed(2),
      totalVATCollected: recomputedVAT.toFixed(2),
    });
    setHasOverride(false);
    alert("✅ Quarterly override cleared!");
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-purple-700">
        Quarterly Summary
      </h2>

      {/* Month picker */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">
          Select Start Month:
        </label>
        <input
          type="month"
          className="border p-2"
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
        />
      </div>

      {/* Purchase Totals */}
      <p className="mb-2 text-gray-700">
        Showing totals for: <strong>{monthsDisplay}</strong>
      </p>
      <div className="mb-6 p-4 bg-gray-100 rounded text-left">
        <p>
          <strong>Total Purchase (3 months):</strong>{" "}
          {totals.totalWithVAT}
        </p>
        <p>
          <strong>Total VAT Given (3 months):</strong>{" "}
          {totals.totalVAT}
        </p>
      </div>

      {/* Sales Totals & Overrides */}
      <div className="mb-6 p-4 bg-gray-100 rounded text-left">
        {editingOverride ? (
          <>
            <div className="mb-2">
              <label className="font-medium mr-2">Total Sales:</label>
              <input
                type="number"
                name="totalSales"
                value={overrideValues.totalSales}
                onChange={(e) =>
                  setOverrideValues({
                    ...overrideValues,
                    [e.target.name]: e.target.value,
                  })
                }
                className="border p-1 w-32"
              />
            </div>
            <div className="mb-2">
              <label className="font-medium mr-2">
                Total VAT Collected:
              </label>
              <input
                type="number"
                name="totalVATCollected"
                value={overrideValues.totalVATCollected}
                onChange={(e) =>
                  setOverrideValues({
                    ...overrideValues,
                    [e.target.name]: e.target.value,
                  })
                }
                className="border p-1 w-32"
              />
            </div>
            <button
              onClick={saveOverride}
              className="text-green-700 mr-4"
            >
              Save
            </button>
            <button
              onClick={() => {
                setOverrideValues({
                  totalSales: salesTotals.totalSales.toFixed(2),
                  totalVATCollected: salesTotals.totalVATCollected.toFixed(2),
                });
                setEditingOverride(false);
              }}
              className="text-gray-500"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <p className="font-medium">
              Total Sales (3 months):{" "}
              <span className="text-blue-700">
                {salesTotals.totalSales.toFixed(2)}
              </span>
            </p>
            <p className="font-medium">
              Total VAT Collected (3 months):{" "}
              <span className="text-blue-700">
                {salesTotals.totalVATCollected.toFixed(2)}
              </span>
            </p>
            <div className="flex items-center space-x-4 mt-2">
              <button
                onClick={() => setEditingOverride(true)}
                className="text-purple-700 underline"
              >
                Edit Sales Totals
              </button>
              {hasOverride && (
                <button
                  onClick={clearOverride}
                  className="text-red-600 underline"
                >
                  Clear Override
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detailed 3-month table */}
      {quarterInvoices.length === 0 ? (
        <p className="text-gray-600 mb-6">
          No invoices found for this period.
        </p>
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
                      <td className="border p-2">
                        {inv.amountWithVAT.toFixed(2)}
                      </td>
                      <td className="border p-2">
                        {inv.vatAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Export */}
      <button
        onClick={exportQuarter}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Export Quarter
      </button>
    </div>
  );
}
