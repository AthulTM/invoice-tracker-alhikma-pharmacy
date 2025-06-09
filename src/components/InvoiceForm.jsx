// src/components/InvoiceForm.jsx
import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc
} from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";

// you'll need to install react-datepicker:
//    npm install react-datepicker
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function InvoiceForm() {
  // ─── Form state ───────────────────────────────────────────────────
  const [date, setDate] = useState(new Date());
  const [invoiceNo, setInvoiceNo] = useState("");
  const [amountWithVAT, setAmountWithVAT] = useState("");
  const [vatAmount, setVatAmount] = useState("");

  // ─── Suppliers dropdown ───────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    // load supplier list once
    async function fetchSuppliers() {
      const snap = await getDocs(collection(db, "suppliers"));
      setSuppliers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    fetchSuppliers();
  }, []);

  useEffect(() => {
    // update the selected supplier object
    setSelectedSupplier(
      suppliers.find((s) => s.id === selectedSupplierId) || null
    );
  }, [selectedSupplierId, suppliers]);

  // ─── Handle form submit ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // required: supplier, date, invoiceNo, amountWithVAT
    if (
      !selectedSupplier ||
      !date ||
      !invoiceNo.trim() ||
      !amountWithVAT
    ) {
      alert("Please fill all required fields.");
      return;
    }

    // if vatAmount is blank, treat as zero
    const vatVal =
      vatAmount.trim() === "" ? 0 : parseFloat(vatAmount);

    const invoice = {
      date: dayjs(date).format("YYYY-MM-DD"),
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      vatNo: selectedSupplier.vatNo,
      invoiceNo: invoiceNo.trim(),
      amountWithVAT: parseFloat(amountWithVAT),
      vatAmount: vatVal,
      month: dayjs(date).format("YYYY-MM"),
    };

    // ─── Duplicate‐check ──────────────────────────────────────────────
    const dupQ = query(
      collection(db, "invoices"),
      where("invoiceNo", "==", invoice.invoiceNo),
      where("amountWithVAT", "==", invoice.amountWithVAT),
      where("vatAmount", "==", invoice.vatAmount)
    );
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      alert(
        "❗ Invoice already exists (same number, amount & VAT)."
      );
      return;
    }

    // ─── Save to Firestore ───────────────────────────────────────────
    try {
      await addDoc(collection(db, "invoices"), invoice);
      alert("✅ Invoice added successfully!");
      // reset form
      setDate(new Date());
      setInvoiceNo("");
      setAmountWithVAT("");
      setVatAmount("");
      setSelectedSupplierId("");
    } catch (err) {
      alert("Error adding invoice: " + err.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Add New Invoice</h1>

      {/* Supplier dropdown */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">
          Select Supplier
        </label>
        <select
          className="border p-2 w-full"
          value={selectedSupplierId}
          onChange={(e) =>
            setSelectedSupplierId(e.target.value)
          }
        >
          <option value="">-- Select Supplier --</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* VAT No display */}
      {selectedSupplier && (
        <div className="mb-4 text-gray-700">
          <strong>VAT No:</strong> {selectedSupplier.vatNo}
        </div>
      )}

      {/* Invoice form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Custom date picker (no "Set/Cancel" on mobile) */}
        <DatePicker
          selected={date}
          onChange={(d) => setDate(d)}
          dateFormat="yyyy-MM-dd"
          className="border p-2 w-full"
        />

        <input
          type="text"
          placeholder="Invoice Number"
          className="border p-2"
          value={invoiceNo}
          onChange={(e) => setInvoiceNo(e.target.value)}
        />

        <input
          type="number"
          placeholder="Amount (with VAT)"
          className="border p-2"
          value={amountWithVAT}
          onChange={(e) =>
            setAmountWithVAT(e.target.value)
          }
        />

        {/* VAT Amount now optional */}
        <input
          type="number"
          placeholder="VAT Amount (optional)"
          className="border p-2"
          value={vatAmount}
          onChange={(e) => setVatAmount(e.target.value)}
        />

        <button
          type="submit"
          className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
        >
          Save Invoice
        </button>
      </form>
    </div>
  );
}
