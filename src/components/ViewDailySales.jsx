// src/components/ViewDailySales.jsx
import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import dayjs from "dayjs";
import { db } from "../firebase";

const ViewDailySales = () => {
  // ─── State: daily view ─────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(
    dayjs().format("YYYY-MM-DD")
  );
  const [entries, setEntries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  // ─── State: monthly view ────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(
    dayjs().format("YYYY-MM")
  );
  const [monthEntries, setMonthEntries] = useState([]);

  // ─── Fetch entries for a single date ───────────────────────────────
  const fetchEntries = async () => {
    const q = query(
      collection(db, "dailySales"),
      where("date", "==", selectedDate)
    );
    const snap = await getDocs(q);
    setEntries(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
    );
  };

  // ─── Fetch entries for a whole month ───────────────────────────────
  const fetchMonthEntries = async () => {
    const start = `${selectedMonth}-01`;
    const end = dayjs(start).add(1, "month").format("YYYY-MM-DD");
    const q = query(
      collection(db, "dailySales"),
      where("date", ">=", start),
      where("date", "<", end)
    );
    const snap = await getDocs(q);
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    setMonthEntries(list);
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedDate]);

  useEffect(() => {
    fetchMonthEntries();
  }, [selectedMonth]);

  // ─── Handlers for editing a daily entry ────────────────────────────
  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditValues({ ...entry });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async () => {
    const ref = doc(db, "dailySales", editingId);
    await updateDoc(ref, {
      date: editValues.date,
      amount: parseFloat(editValues.amount),
      vatAmount: parseFloat(editValues.vatAmount),
    });
    alert("✅ Changes saved successfully!");
    cancelEdit();
    fetchEntries();
    fetchMonthEntries();
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    await deleteDoc(doc(db, "dailySales", id));
    fetchEntries();
    fetchMonthEntries();
  };

  const handleChange = (e) =>
    setEditValues({ ...editValues, [e.target.name]: e.target.value });

  // ─── Compute monthly totals ─────────────────────────────────────────
  const totalMonthSales = monthEntries.reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );
  const totalMonthVAT = monthEntries.reduce(
    (sum, e) => sum + (e.vatAmount || 0),
    0
  );

  return (
    <div className="max-w-lg mx-auto mt-10 p-4 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">View Daily Sales</h1>

      {/* Daily Picker */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Select Date:</label>
        <input
          type="date"
          className="border p-2"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {/* Daily Entries Table */}
      {entries.length === 0 ? (
        <p className="text-gray-600 mb-6">No sales entry for this date.</p>
      ) : (
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100 text-center">
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Sales</th>
                <th className="p-2 border">VAT</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="text-center">
                  {editingId === e.id ? (
                    <>
                      <td className="border p-2">
                        <input
                          type="date"
                          name="date"
                          value={editValues.date}
                          onChange={handleChange}
                          className="border p-1"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          name="amount"
                          value={editValues.amount}
                          onChange={handleChange}
                          className="border p-1"
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          name="vatAmount"
                          value={editValues.vatAmount}
                          onChange={handleChange}
                          className="border p-1"
                        />
                      </td>
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
                      <td className="border p-2">{e.date}</td>
                      <td className="border p-2">{e.amount.toFixed(2)}</td>
                      <td className="border p-2">{e.vatAmount.toFixed(2)}</td>
                      <td className="border p-2">
                        <button
                          onClick={() => startEdit(e)}
                          className="text-blue-700 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteEntry(e.id)}
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
      )}

      {/* ───── Separator ─────────────────────────────────────────────── */}
      <div className="border-t border-gray-300 my-6" />

      {/* ───── Monthly Summary Section ───────────────────────────────────── */}
      <h2 className="text-xl font-semibold mb-4">Monthly Summary</h2>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Select Month:</label>
        <input
          type="month"
          className="border p-2"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </div>

      {monthEntries.length === 0 ? (
        <p className="text-gray-600">No sales entries for this month.</p>
      ) : (
        <>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100 text-center">
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Sales</th>
                  <th className="p-2 border">VAT</th>
                </tr>
              </thead>
              <tbody>
                {monthEntries.map((e) => (
                  <tr key={e.id} className="text-center">
                    <td className="border p-2">{e.date}</td>
                    <td className="border p-2">{e.amount.toFixed(2)}</td>
                    <td className="border p-2">{e.vatAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-right font-medium">
            <p>
              Total Sales (month):{" "}
              <span className="text-blue-700">{totalMonthSales.toFixed(2)}</span>
            </p>
            <p>
              Total VAT (month):{" "}
              <span className="text-blue-700">{totalMonthVAT.toFixed(2)}</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ViewDailySales;
