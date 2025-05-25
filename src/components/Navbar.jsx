// src/components/Navbar.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* BACKDROP */}
      <div
        className={`${
          open ? "block" : "hidden"
        } fixed inset-0 bg-black bg-opacity-50 z-10`}
        onClick={close}
      />

      {/* TOP BAR */}
      <nav className="bg-blue-700 text-white fixed w-full z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <Link to="/" onClick={close} className="text-2xl font-bold">
            Invoice Tracker
          </Link>

          {/* Hamburger */}
          <button
            className="sm:hidden p-2 focus:outline-none"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? (
              <span className="text-3xl">&times;</span>
            ) : (
              <span className="text-3xl">&#9776;</span>
            )}
          </button>

          {/* Desktop links */}
          <ul className="hidden sm:flex space-x-6">
            {[
              ["/", "Dashboard"],
              ["/add", "Add Invoice"],
              ["/supplier", "Add Supplier"],
              ["/invoices", "View Invoices"],
              ["/summary", "Quarterly Summary"],
            ].map(([to, label]) => (
              <li key={to}>
                <Link
                  to={to}
                  className="hover:underline"
                  onClick={close}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* SLIDING DRAWER */}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 bg-white shadow-lg
          transform ${open ? "translate-x-0" : "-translate-x-full"}
          transition-transform duration-300 ease-in-out z-20
        `}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-xl font-bold text-blue-700">Menu</span>
          <button onClick={close} className="text-2xl">&times;</button>
        </div>

        {/* Drawer links */}
        <ul className="flex flex-col mt-2">
          {[
            ["/", "Dashboard"],
            ["/add", "Add Invoice"],
            ["/supplier", "Add Supplier"],
            ["/invoices", "View Invoices"],
            ["/summary", "Quarterly Summary"],
          ].map(([to, label]) => (
            <li key={to} className="border-b last:border-b-0">
              <Link
                to={to}
                onClick={close}
                className="block px-6 py-4 text-lg hover:bg-blue-100"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
