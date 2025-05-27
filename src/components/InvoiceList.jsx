// src/components/InvoiceList.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import dayjs from "dayjs";
import { db } from "../firebase";
import ExportExcel from "./ExportExcel";

// helper to build an array of three consecutive "YYYY-MM" strings
function getQuarterMonths(startMonth) {
  const months = [];
  const start = dayjs(startMonth);
  for (let i = 0; i < 3; i++) {
    months.push(start.add(i, "month").format("YYYY-MM"));
  }
  return months;
}

const InvoiceList = () => {
  // ─── State ──────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  // suppliers for dropdown in edit
  const [suppliers, setSuppliers] = useState([]);

  // sales totals state
  const [salesTotals, setSalesTotals] = useState({
    totalSales: 0,
    totalVATCollected: 0,
  });
  const [overrideValues, setOverrideValues] = useState({
    totalSales: "",
    totalVATCollected: "",
  });
  const [editingSalesTotals, setEditingSalesTotals] = useState(false);

  // ─── Purchase Totals ─────────────────────────────────────────────────
  const totalAmount = invoices.reduce(
    (sum, inv) => sum + (inv.amountWithVAT || 0),
    0
  );
  const totalVAT = invoices.reduce(
    (sum, inv) => sum + (inv.vatAmount || 0),
    0
  );

  // ─── Fetch suppliers once ────────────────────────────────────────────
  useEffect(() => {
    async function fetchSuppliers() {
      const snap = await getDocs(collection(db, "suppliers"));
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    fetchSuppliers();
  }, []);

  // ─── Fetch Monthly Invoices ─────────────────────────────────────────
  const fetchInvoices = async () => {
    const q = query(
      collection(db, "invoices"),
      where("month", "==", selectedMonth)
    );
    const snap = await getDocs(q);
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      // sort ascending by date
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    setInvoices(list);
  };

  // ─── Fetch Daily Sales & Monthly Override ────────────────────────────
  const fetchSalesTotals = async () => {
    const allSnap = await getDocs(collection(db, "dailySales"));
    const all = allSnap.docs.map((d) => d.data());
    const monthEntries = all.filter((e) =>
      e.date.startsWith(selectedMonth)
    );
    const computedSales = monthEntries.reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    );
    const computedVAT = monthEntries.reduce(
      (sum, e) => sum + (e.vatAmount || 0),
      0
    );

    // override logic
    const overrideSnap = await getDocs(
      query(
        collection(db, "monthlySales"),
        where("__name__", "==", selectedMonth)
      )
    );
    if (!overrideSnap.empty) {
      const data = overrideSnap.docs[0].data();
      const ts =
        typeof data.totalSales === "number"
          ? data.totalSales
          : computedSales;
      const tv =
        typeof data.totalVATCollected === "number"
          ? data.totalVATCollected
          : computedVAT;
      setSalesTotals({ totalSales: ts, totalVATCollected: tv });
      setOverrideValues({
        totalSales: ts.toFixed(2),
        totalVATCollected: tv.toFixed(2),
      });
    } else {
      setSalesTotals({
        totalSales: computedSales,
        totalVATCollected: computedVAT,
      });
      setOverrideValues({
        totalSales: computedSales.toFixed(2),
        totalVATCollected: computedVAT.toFixed(2),
      });
    }
  };

  // ─── Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchInvoices();
    fetchSalesTotals();
  }, [selectedMonth]);

  // ─── Edit / Delete Handlers ────────────────────────────────────────
  const startEdit = (inv) => {
    setEditingId(inv.id);
    setEditValues({ ...inv });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };
  // auto‐update vatNo on supplier change
  const handleSupplierChange = (e) => {
    const name = e.target.value;
    const sup = suppliers.find((s) => s.name === name);
    setEditValues({
      ...editValues,
      supplierName: name,
      vatNo: sup ? sup.vatNo : "",
    });
  };
  const saveEdit = async () => {
    const ref = doc(db, "invoices", editingId);
    const updated = {
      date: editValues.date,
      supplierName: editValues.supplierName,
      vatNo: editValues.vatNo,
      invoiceNo: editValues.invoiceNo,
      amountWithVAT: parseFloat(editValues.amountWithVAT),
      vatAmount: parseFloat(editValues.vatAmount),
      month: dayjs(editValues.date).format("YYYY-MM"),
    };
    // duplicate-check
    const dupSnap = await getDocs(
      query(
        collection(db, "invoices"),
        where("invoiceNo", "==", updated.invoiceNo),
        where("amountWithVAT", "==", updated.amountWithVAT),
        where("vatAmount", "==", updated.vatAmount)
      )
    );
    if (dupSnap.docs.some((d) => d.id !== editingId)) {
      alert(
        "❗ Invoice already exists with the same number, amount & VAT. Edit cancelled."
      );
      return;
    }
    await updateDoc(ref, updated);
    alert("✅ Changes saved successfully!");
    cancelEdit();
    fetchInvoices();
  };
  const deleteInvoice = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?"))
      return;
    await deleteDoc(doc(db, "invoices", id));
    fetchInvoices();
  };
  const handleChange = (e) =>
    setEditValues({ ...editValues, [e.target.name]: e.target.value });

  // ─── Delete Entire Month ─────────────────────────────────────────────
  const deleteMonth = async () => {
    if (
      !window.confirm(
        `Delete ALL invoices for ${selectedMonth}? This cannot be undone.`
      )
    )
      return;
    const snap = await getDocs(
      query(collection(db, "invoices"), where("month", "==", selectedMonth))
    );
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(doc(db, "invoices", d.id)));
    await batch.commit();
    fetchInvoices();
  };

  // ─── Sales Totals Edit Handlers ──────────────────────────────────────
  const handleSalesChange = (e) =>
    setOverrideValues({ ...overrideValues, [e.target.name]: e.target.value });
  const saveSalesOverride = async () => {
    const ref = doc(db, "monthlySales", selectedMonth);
    const updated = {
      totalSales: parseFloat(overrideValues.totalSales),
      totalVATCollected: parseFloat(overrideValues.totalVATCollected),
    };
    await setDoc(ref, { ...updated, month: selectedMonth });
    setSalesTotals(updated);
    setEditingSalesTotals(false);
  };
  const cancelSalesEdit = () => {
    setOverrideValues({
      totalSales: salesTotals.totalSales.toFixed(2),
      totalVATCollected: salesTotals.totalVATCollected.toFixed(2),
    });
    setEditingSalesTotals(false);
  };

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow">
      {/* Month Selector */}
      <h2 className="text-2xl font-bold mb-4 text-blue-700">
        Invoices for {selectedMonth}
      </h2>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Select Month:</label>
        <input
          type="month"
          className="border p-2"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </div>

      {/* Monthly Totals + Sales Totals */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <p className="font-medium">
          Total Purchase Amount (w/ VAT):{" "}
          <span className="text-blue-700">{totalAmount.toFixed(2)}</span>
        </p>
        <p className="font-medium">
          Total VAT Given:{" "}
          <span className="text-blue-700">{totalVAT.toFixed(2)}</span>
        </p>
        <div className="mt-4 border-t pt-4">
          {editingSalesTotals ? (
            <>
              <div className="mb-2">
                <label className="font-medium mr-2">Total Sales:</label>
                <input
                  type="number"
                  name="totalSales"
                  value={overrideValues.totalSales}
                  onChange={handleSalesChange}
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
                  onChange={handleSalesChange}
                  className="border p-1 w-32"
                />
              </div>
              <button
                onClick={saveSalesOverride}
                className="text-green-700 mr-4"
              >
                Save Sales
              </button>
              <button onClick={cancelSalesEdit} className="text-gray-500">
                Cancel
              </button>
            </>
          ) : (
            <>
              <p className="font-medium">
                Total Sales:{" "}
                <span className="text-blue-700">
                  {salesTotals.totalSales.toFixed(2)}
                </span>
              </p>
              <p className="font-medium">
                Total VAT Collected:{" "}
                <span className="text-blue-700">
                  {salesTotals.totalVATCollected.toFixed(2)}
                </span>
              </p>
              <button
                onClick={() => setEditingSalesTotals(true)}
                className="text-blue-700 mt-2"
              >
                Edit Sales
              </button>
            </>
          )}
        </div>
      </div>

      {/* Invoice Table */}
      {invoices.length === 0 ? (
        <p className="text-gray-600">No invoices found for this month.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100 text-center">
                  {[
                    "Date",
                    "Supplier",
                    "Invoice No",
                    "VAT No",
                    "Amount (with VAT)",
                    "VAT Amount",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="p-2 border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="text-center">
                    {editingId === inv.id ? (
                      <>
                        {/* Date */}
                        <td className="border p-2">
                          <input
                            type="date"
                            name="date"
                            value={editValues.date}
                            onChange={handleChange}
                            className="border p-1 w-full"
                          />
                        </td>
                        {/* Supplier dropdown */}
                        <td className="border p-2">
                          <select
                            name="supplierName"
                            value={editValues.supplierName}
                            onChange={handleSupplierChange}
                            className="border p-1 w-full"
                          >
                            <option value="">-- Select Supplier --</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.name}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        {/* Invoice No */}
                        <td className="border p-2">
                          <input
                            type="text"
                            name="invoiceNo"
                            value={editValues.invoiceNo}
                            onChange={handleChange}
                            className="border p-1 w-full"
                          />
                        </td>
                        {/* VAT No (read-only) */}
                        <td className="border p-2">
                          <input
                            type="text"
                            name="vatNo"
                            value={editValues.vatNo}
                            readOnly
                            className="border p-1 w-full bg-gray-100"
                          />
                        </td>
                        {/* Amount w/ VAT */}
                        <td className="border p-2">
                          <input
                            type="number"
                            name="amountWithVAT"
                            value={editValues.amountWithVAT}
                            onChange={handleChange}
                            className="border p-1 w-full"
                          />
                        </td>
                        {/* VAT Amount */}
                        <td className="border p-2">
                          <input
                            type="number"
                            name="vatAmount"
                            value={editValues.vatAmount}
                            onChange={handleChange}
                            className="border p-1 w-full"
                          />
                        </td>
                        {/* Actions */}
                        <td className="border p-2">
                          <button
                            onClick={saveEdit}
                            className="text-green-700 mr-2"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-500"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
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
                        <td className="border p-2">
                          <button
                            onClick={() => startEdit(inv)}
                            className="text-blue-700 mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteInvoice(inv.id)}
                            className="text-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export / Delete Month Buttons */}
          <div className="mt-4 flex items-center justify-between px-2">
            <ExportExcel
              data={invoices}
              filename={`invoices-${selectedMonth}.xlsx`}
              buttonText="Export Month"
              buttonClassName="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            />
            <button
              onClick={deleteMonth}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Delete Month
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default InvoiceList;
