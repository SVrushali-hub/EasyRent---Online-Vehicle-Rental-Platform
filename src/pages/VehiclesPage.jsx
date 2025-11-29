import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/VehiclesPage.css";

const VehiclesPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [showSubFilters, setShowSubFilters] = useState(false);
  const [filterSeats, setFilterSeats] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterFuel, setFilterFuel] = useState("All");
  const [priceSort, setPriceSort] = useState("None");
  const navigate = useNavigate();
  const filterRef = useRef(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowSubFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/current-user", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCurrentUser();

    const fetchVehicles = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/vehicles");
        const data = await res.json();
        setVehicles(data.vehicles);
      } catch (err) {
        console.error(err);
      }
    };
    fetchVehicles();
  }, []);

  const handleBookClick = (vehicle) => {
    if (!user) {
      setShowModal(true);
      return;
    }
    navigate("/booking", { state: { vehicle } });
  };

  // Filtering
  let filteredVehicles = vehicles.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) &&
      (filterSeats === "All" || v.seating_capacity === parseInt(filterSeats)) &&
      (filterType === "All" || v.type === filterType) &&
      (filterFuel === "All" || v.fuel_type === filterFuel)
  );

  if (priceSort === "LowToHigh") {
    filteredVehicles = filteredVehicles.sort((a, b) => a.price_per_day - b.price_per_day);
  } else if (priceSort === "HighToLow") {
    filteredVehicles = filteredVehicles.sort((a, b) => b.price_per_day - a.price_per_day);
  }

  return (
    <div className="vehicles-page">
      <h1>Available Vehicles</h1>

      {/* Search & Filter */}
      <div className="search-filter-container">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />

        <div className="dropdown-container" ref={filterRef}>
          <button
            className="main-filter-btn"
            onClick={() => setShowSubFilters(!showSubFilters)}
          >
            Filter Options ▼
          </button>

          <div className={`sub-filters ${showSubFilters ? "open" : ""}`}>
            <div className="filter-group">
              <label>Seats:</label>
              <select onChange={(e) => setFilterSeats(e.target.value)}>
                <option value="All">All</option>
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="7">7</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Type:</label>
              <select onChange={(e) => setFilterType(e.target.value)}>
                <option value="All">All</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Motorcycle">Motorcycle</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Convertible">Convertible</option>
                <option value="MPV">MPV</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Fuel:</label>
              <select onChange={(e) => setFilterFuel(e.target.value)}>
                <option value="All">All</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Price:</label>
              <select onChange={(e) => setPriceSort(e.target.value)}>
                <option value="None">None</option>
                <option value="LowToHigh">Low → High</option>
                <option value="HighToLow">High → Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="vehicles-grid">
        {filteredVehicles.map((v) => (
          <div key={v.id} className="vehicle-card">
            <img src={v.image_url} alt={v.name} />
            <h3>{v.name}</h3>
            <p>Brand: {v.brand}</p>
            <p>Type: {v.type}</p>
            <p>Year: {v.year_of_manufacture}</p>
            <p>Seats: {v.seating_capacity}</p>
            <p>Fuel: {v.fuel_type}</p>
            <p>Mileage: {v.mileage} km/l</p>
            <p>Price: ₹{v.price_per_day} / day</p>
            <button className="book-button" onClick={() => handleBookClick(v)}>
              Book Now
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Sign In Required</h2>
            <p>You must sign in or log in to book a vehicle.</p>
            <div className="modal-buttons">
              <button onClick={() => (window.location.href = "/signin")}>
                Sign In
              </button>
              <button onClick={() => (window.location.href = "/login")}>
                Login
              </button>
              <button onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesPage;
