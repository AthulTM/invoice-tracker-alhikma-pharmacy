// src/components/SupplierForm.jsx
import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

const SupplierForm = () => {
  const [name, setName] = useState("");
  const [vatNo, setVatNo] = useState("");

  const addSupplier = async (e) => {
    e.preventDefault();
    if (!name || !vatNo) {
      alert("Please enter both supplier name and VAT number.");
      return;
    }
    try {
      await addDoc(collection(db, "suppliers"), { name, vatNo });
      alert("Supplier added successfully!");
      setName("");
      setVatNo("");
    } catch (err) {
      alert("Error adding supplier: " + err.message);
    }
  };

  return (
    <form onSubmit={addSupplier} className="max-w-xl mx-auto p-6 bg-white rounded shadow flex flex-col gap-4">
      <input
        type="text"
        placeholder="Supplier Name"
        className="border p-2 rounded"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        placeholder="VAT Number"
        className="border p-2 rounded"
        value={vatNo}
        onChange={(e) => setVatNo(e.target.value)}
      />
      <button
        type="submit"
        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
      >
        Add Supplier
      </button>
    </form>
  );
};

export default SupplierForm;
