// src/components/DailySalesForm.jsx
import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import dayjs from "dayjs";
import { db } from "../firebase";

const DailySalesForm = () => {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [amount, setAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !amount || !vatAmount) {
      alert("Please fill all fields.");
      return;
    }
    try {
      await addDoc(collection(db, "dailySales"), {
        date,
        amount: parseFloat(amount),
        vatAmount: parseFloat(vatAmount),
      });
      alert("Daily sales added!");
      setAmount("");
      setVatAmount("");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Add Daily Sales</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="date"
          className="border p-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="number"
          placeholder="Total Sales"
          className="border p-2"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          type="number"
          placeholder="VAT Amount"
          className="border p-2"
          value={vatAmount}
          onChange={(e) => setVatAmount(e.target.value)}
        />
        <button
          type="submit"
          className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
        >
          Save Daily Sales
        </button>
      </form>
    </div>
  );
};

export default DailySalesForm;
