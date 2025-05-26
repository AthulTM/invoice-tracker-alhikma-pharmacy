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
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [entries, setEntries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const fetchEntries = async () => {
    const q = query(
      collection(db, "dailySales"),
      where("date", "==", selectedDate)
    );
    const snap = await getDocs(q);
    setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedDate]);

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
    cancelEdit();
    fetchEntries();
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    await deleteDoc(doc(db, "dailySales", id));
    fetchEntries();
  };

  const handleChange = (e) =>
    setEditValues({ ...editValues, [e.target.name]: e.target.value });

  return (
    <div className="max-w-md mx-auto mt-10 p-4 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">View Daily Sales</h1>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Select Date:</label>
        <input
          type="date"
          className="border p-2"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-600">No sales entry for this date.</p>
      ) : (
        <div className="overflow-x-auto">
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
    </div>
  );
};

export default ViewDailySales;
