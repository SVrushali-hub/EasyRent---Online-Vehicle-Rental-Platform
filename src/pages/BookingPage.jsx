// src/pages/BookingPage.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../styles/BookingPage.css";
import PaymentForm from "../components/PaymentForm";
import { generateBookingReceipt } from "../utils/generateReceipt";

const branchAreas = {
  Andheri: ["Andheri", "Bandra", "Dadar", "Thane"],
  Thane: ["Thane", "Mulund", "Bhandup", "Airoli"],
  Dadar: ["Dadar", "Mahim", "Worli", "Bandra"],
  Chinchwad: ["Chinchwad", "Pimpri", "Hinjewadi", "Kothrud"],
  Kothrud: ["Kothrud", "Shivajinagar", "Baner", "Aundh"],
  "Nashik Road": ["Nashik Road", "Dwarka", "Upnagar", "Satpur"],
  "College Road": ["College Road", "Panchavati", "Indiranagar"],
  Panjim: ["Panjim", "Porvorim", "Mapusa"],
  Margao: ["Margao", "Colva", "Navelim"],
};

/* Fix default Leaflet icon paths (CDN) */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ========== CONFIG ==========
const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQ5NDVkZWM0NzIxNDBmNzQ4NDJmZGIyYzMyOGYxZTUwNjU5NzBmYTZkY2I5ZGNjM2UyM2ZhMzgwIiwiaCI6Im11cm11cjY0In0=";

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { vehicle } = location.state || {};

  if (!vehicle) {
    return (
      <div className="booking-container">
        <h2>No vehicle selected. Please go back and choose one.</h2>
        <button className="btn" onClick={() => navigate("/vehicles")}>
          Back to Vehicles
        </button>
      </div>
    );
  }

  // ---------- state ----------
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [selectedBranch, setSelectedBranch] = useState("");
  const [timeFrom, setTimeFrom] = useState({
    hour: "12",
    minute: "00",
    meridian: "AM",
  });
  const [timeTo, setTimeTo] = useState({
    hour: "12",
    minute: "00",
    meridian: "PM",
  });
  // default return time

  const [fromPos, setFromPos] = useState(null);
  const [toPos, setToPos] = useState(null);
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [activePicker, setActivePicker] = useState(null);

  const [distanceKm, setDistanceKm] = useState(null);
  const [price, setPrice] = useState(null);
  const [feeDetails, setFeeDetails] = useState(null);

  const [consentChecked, setConsentChecked] = useState(false);

  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // driver form & booking
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverContact, setDriverContact] = useState("");
  const [driverAge, setDriverAge] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");

  // ---------- FEEDBACK ----------
  const [feedbackList, setFeedbackList] = useState([]);
  const [newFeedback, setNewFeedback] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);


  useEffect(() => {
    if (!vehicle?.id) return;

    const fetchFeedback = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/vehicles/${vehicle.id}/feedback`,
          {
            credentials: "include",
          }
        );
        if (res.ok) {
          const data = await res.json();
          setFeedbackList(data.feedback || []);
        } else {
          console.error("Failed to fetch feedback");
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchFeedback();
  }, [vehicle]);

  // ---------- helpers: ORS requests ----------
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://api.openrouteservice.org/geocode/reverse?api_key=${ORS_API_KEY}&point.lat=${lat}&point.lon=${lng}`
      );
      const data = await res.json();
      const label = data.features?.[0]?.properties?.label || "";
      return label;
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      return "";
    }
  };

  const getCoordsFromAddress = async (address) => {
    try {
      const res = await fetch(
        `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(
          address
        )}`
      );
      const data = await res.json();
      const coords = data.features?.[0]?.geometry?.coordinates;
      if (coords) {
        return {
          lat: coords[1],
          lng: coords[0],
          label: data.features[0].properties.label,
        };
      }
      return null;
    } catch (err) {
      console.error("Forward geocoding error:", err);
      return null;
    }
  };

  const fetchDistanceFromORS = async (startPos, endPos) => {
    try {
      const res = await fetch("http://localhost:5000/api/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: [startPos.lng, startPos.lat],
          end: [endPos.lng, endPos.lat],
        }),
      });

      const data = await res.json();
      const meters = data?.routes?.[0]?.summary?.distance;
      if (!meters) throw new Error("No route found");

      return meters / 1000;
    } catch (err) {
      console.error("Distance error:", err);
      return null;
    }
  };

  // ---------- map click handler component ----------
  function MapClickHandler() {
    useMapEvents({
      click: async (e) => {
        if (!activePicker) return;
        if (activePicker === "from" && !selectedBranch) {
          alert("Please select a branch first.");
          return;
        }

        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        const addr = await getAddressFromCoords(lat, lng);

        if (activePicker === "from") {
          const allowedAreas = branchAreas[selectedBranch];
          const matchesBranch = allowedAreas.some((area) =>
            addr.toLowerCase().includes(area.toLowerCase())
          );
          if (!matchesBranch) {
            alert(`Source must be within ${selectedBranch} branch area.`);
            return;
          }
          setFromPos({ lat, lng });
          setFromAddress(addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } else if (activePicker === "to") {
          setToPos({ lat, lng });
          setToAddress(addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }

        setActivePicker(null);
      },
    });
    return null;
  }

  // ---------- calculate days ----------
  const calculateDays = () => {
    if (!dateFrom || !dateTo) return 1;

    const fromHour24 =
      (parseInt(timeFrom.hour) % 12) + (timeFrom.meridian === "PM" ? 12 : 0);
    const toHour24 =
      (parseInt(timeTo.hour) % 12) + (timeTo.meridian === "PM" ? 12 : 0);

    const startDate = new Date(
      `${dateFrom}T${fromHour24.toString().padStart(2, "0")}:${timeFrom.minute}`
    );
    const endDate = new Date(
      `${dateTo}T${toHour24.toString().padStart(2, "0")}:${timeTo.minute}`
    );

    let diffMs = endDate - startDate;
    if (diffMs <= 0) return 1;

    let days = diffMs / (1000 * 60 * 60 * 24);
    return Math.ceil(days * 2) / 2; // round to nearest 0.5 day
  };

  // ---------- calculate price ----------
  const calculatePrice = async () => {
    setPrice(null);
    setFeeDetails(null);
    setDistanceKm(null);

    if (!fromPos || !toPos) {
      alert("Please provide both Source (From) and Destination (To).");
      return;
    }
    if (!dateFrom || !dateTo) {
      alert("Please choose From and To dates.");
      return;
    }

    const distKm = await fetchDistanceFromORS(fromPos, toPos);
    if (distKm === null) {
      alert("Could not calculate route distance. Try another route.");
      return;
    }

    const days = calculateDays();

    const baseFare = 100;
    const ratePerKm = 15;
    const serviceFeePercent = 5;

    const roundTripDistance = distKm * 2;

    // --------- rental cost ----------
    let rentalCost = (vehicle.price_per_day || 0) * days;

    // --------- NIGHT DISCOUNT ---------
    const pickupHour24 =
      (parseInt(timeFrom.hour) % 12) + (timeFrom.meridian === "PM" ? 12 : 0);
    if (pickupHour24 >= 20 || pickupHour24 < 6) {
      rentalCost *= 0.75; // 25% discount for night pickup
    }

    const distanceCost = roundTripDistance * ratePerKm;
    const subTotal = baseFare + distanceCost + rentalCost;
    const serviceFee = (subTotal * serviceFeePercent) / 100;
    const total = subTotal + serviceFee;

    setDistanceKm(roundTripDistance.toFixed(2));
    setPrice(Math.round(total));
    setFeeDetails({
      baseFare,
      distance: roundTripDistance.toFixed(2),
      ratePerKm,
      rentalCost: Math.round(rentalCost),
      serviceFee: serviceFee.toFixed(2),
      serviceFeePercent,
      days,
      distanceCost: Math.round(distanceCost),
      pickupHour: pickupHour24,
    });

    setTimeout(() => {
      const el = document.querySelector(".price-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  };

  // ---------- handle manual address blurs ----------
  const onFromBlur = async () => {
    if (!fromAddress || !selectedBranch) return;

    const found = await getCoordsFromAddress(fromAddress);
    if (found) {
      const allowedAreas = branchAreas[selectedBranch];
      const matchesBranch = allowedAreas.some((area) =>
        found.label.toLowerCase().includes(area.toLowerCase())
      );
      if (matchesBranch) {
        setFromPos({ lat: found.lat, lng: found.lng });
        setFromAddress(found.label);
      } else {
        alert(`Selected address is not in the ${selectedBranch} branch area.`);
        setFromAddress("");
        setFromPos(null);
      }
    }
  };

  const onToBlur = async () => {
    if (!toAddress) return;
    const found = await getCoordsFromAddress(toAddress);
    if (found) {
      setToPos({ lat: found.lat, lng: found.lng });
      setToAddress(found.label);
    }
  };

  // ---------- booking flow ----------
  const startDriverForm = () => {
    if (!consentChecked) {
      alert("Please accept the booking terms & consent before proceeding.");
      return;
    }
    if (!price) {
      alert("Please calculate price first.");
      return;
    }
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let cap = "";
    for (let i = 0; i < 6; i++)
      cap += chars.charAt(Math.floor(Math.random() * chars.length));
    setCaptchaValue(cap);
    setCaptchaInput("");
    setShowDriverForm(true);
  };

  const submitDriverForm = async (e) => {
    e.preventDefault();

    if (captchaInput.trim() !== captchaValue) {
      alert("CAPTCHA does not match.");
      return;
    }

    if (driverLicense.trim().length < 6) {
      alert("License number seems too short.");
      return;
    }

    const fromHour24 =
      (parseInt(timeFrom.hour) % 12) + (timeFrom.meridian === "PM" ? 12 : 0);
    const toHour24 =
      (parseInt(timeTo.hour) % 12) + (timeTo.meridian === "PM" ? 12 : 0);

    const bookingPayload = {
      vehicleId: vehicle.id,
      pickup: fromAddress,
      drop: toAddress,
      dateFrom,
      timeFrom: `${fromHour24
        .toString()
        .padStart(2, "0")}:${timeFrom.minute.padStart(2, "0")}:00`,
      dateTo,
      timeTo: `${toHour24.toString().padStart(2, "0")}:${timeTo.minute.padStart(
        2,
        "0"
      )}:00`,
      distanceKm,
      price,
      driverName,
      driverContact,
      driverAge,
      driverLicense,
      branchName: selectedBranch,
    };

    try {
      const res = await fetch("http://localhost:5000/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bookingPayload),
      });
      const data = await res.json();

      if (res.ok) {
        setShowDriverForm(false);
        setShowPayment(true);
      } else {
        alert(data.message || "Failed to save booking");
      }
    } catch (err) {
      console.error("Booking submit error:", err);
      alert("Error saving booking. Try again.");
    }
  };

  const pickModeLabel =
    activePicker === "from"
      ? "Click on the map to select the SOURCE location"
      : activePicker === "to"
      ? "Click on the map to select the DESTINATION location"
      : "";

  // ---------- render ----------
  return (
    <div className="booking-container-withFeedback">
      <div className="booking-container">
          {/* LEFT COLUMN: Vehicle only */}
      <div className="left-column">
        <div className="vehicle-card-info">
        <h2 className="vehicle-Name">{vehicle.name}</h2>
          <img
            className="vehicle-Image"
            src={vehicle.image_url || "/assets/car-1.jpg"}
            alt={vehicle.name}
          />
          <h3>Vehicle Info : </h3>
          <div className="vehicle-meta">
            <div>
              <strong>Brand: </strong> {vehicle.brand || "—"}
            </div>
            <div>
              <strong>Type: </strong> {vehicle.type || "—"}
            </div>
            <div>
              <strong>Price/Day: </strong> ₹{vehicle.price_per_day}
            </div>
            <div>
              <strong>Seats: </strong> {vehicle.seating_capacity || "—"}
            </div>
            <div>
              <strong>Fuel: </strong> {vehicle.fuel_type || "—"}
            </div>
            <div>
              <strong>Description:</strong> {vehicle.description || "-"}
            </div>
          </div>
        </div>
      </div>
      {/* RIGHT COLUMN: Map, form, date, price, driver/payment */}
      <div className="right-column">
        <div className="map-section">
          <MapContainer
            center={fromPos || { lat: 19.076, lng: 72.8777 }}
            zoom={13}
            style={{ height: "300px", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <MapClickHandler />
            {fromPos && <Marker position={fromPos} />}
            {toPos && <Marker position={toPos} />}
          </MapContainer>
          {pickModeLabel && <p className="map-pick-label">{pickModeLabel}</p>}
        </div>

        {/* Date Inputs */}
        <div className="input-row">
          <div className="input-group">
            <label>From Date & Time:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              min={today}
            />
            <div className="time-picker">
              <input
                type="number"
                min="1"
                max="12"
                value={timeFrom.hour}
                onChange={(e) =>
                  setTimeFrom({ ...timeFrom, hour: e.target.value })
                }
              />
              :
              <input
                type="number"
                min="0"
                max="59"
                value={timeFrom.minute}
                onChange={(e) =>
                  setTimeFrom({ ...timeFrom, minute: e.target.value })
                }
              />
              <select
                value={timeFrom.meridian}
                onChange={(e) =>
                  setTimeFrom({ ...timeFrom, meridian: e.target.value })
                }
              >
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>To Date & Time:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || today}
            />
            <div className="time-picker">
              <input
                type="number"
                min="1"
                max="12"
                value={timeTo.hour}
                onChange={(e) => setTimeTo({ ...timeTo, hour: e.target.value })}
              />
              :
              <input
                type="number"
                min="0"
                max="59"
                value={timeTo.minute}
                onChange={(e) =>
                  setTimeTo({ ...timeTo, minute: e.target.value })
                }
              />
              <select
                value={timeTo.meridian}
                onChange={(e) =>
                  setTimeTo({ ...timeTo, meridian: e.target.value })
                }
              >
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
          </div>
        </div>

        <div className="address-section">
          <label>
            Select Branch:
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">--Select Branch--</option>
              {Object.keys(branchAreas).map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </label>
          <br />
          <div className="input-row">
            <div className="input-group">
              <label>From:</label>
              <div className="input-with-btn">
                <input
                  type="text"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  onBlur={onFromBlur}
                />
                <button type="button" onClick={() => setActivePicker("from")}>
                  Pick
                </button>
              </div>
            </div>
            <div className="input-group">
              <label>To:</label>
              <div className="input-with-btn">
                <input
                  type="text"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  onBlur={onToBlur}
                />
                <button type="button" onClick={() => setActivePicker("to")}>
                  Pick
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="price-section">
          <button className="calculate-btn" onClick={calculatePrice}>
            Calculate Price
          </button>
          {price && feeDetails && (
            <div className="price-details">
              <h3>Booking Details</h3>
              <p>Distance (round-trip): {feeDetails.distance} km</p>
              <p>Days: {feeDetails.days}</p>
              <p>Rental Cost: ₹{feeDetails.rentalCost}</p>
              <p>Distance Cost: ₹{feeDetails.distanceCost}</p>
              <p>
                Service Fee ({feeDetails.serviceFeePercent}%): ₹
                {feeDetails.serviceFee}
              </p>
              <h3>Total Price: ₹{price}</h3>
            </div>
          )}
        </div>

        <div className="consent-section">
          <label>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
            />
            I accept the terms and conditions and consent to share my location.
          </label>
          <button className="driver-form-btn" onClick={startDriverForm}>
            Proceed to Driver & Booking
          </button>
        </div>
        {showDriverForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button
                className="close-btn"
                onClick={() => setShowDriverForm(false)}
              >
                ×
              </button>
              <h3>Driver Details</h3>
              <form onSubmit={submitDriverForm}>
                <label>
  Name:
  <input
    type="text"
    value={driverName}
    onChange={(e) => setDriverName(e.target.value)}
    required
    pattern="^(?!.*(.)\1{2,})[A-Za-z\s]{2,50}$"
    title="Name should contain only letters and spaces, 2-50 characters, no letter repeated more than twice consecutively."
  />
</label>


 <label>
  Contact:
  <input
    type="text"
    value={driverContact}
    maxLength={10} // Limit to 10 digits
    onChange={(e) => {
      // Only allow digits
      const value = e.target.value.replace(/\D/g, "");
      setDriverContact(value);
    }}
    required
    pattern="\d{10}" // Exactly 10 digits
    title="Contact number must be exactly 10 digits."
  />
</label>


  <label>
    Age:
    <input
      type="number"
      value={driverAge}
      onChange={(e) => setDriverAge(e.target.value)}
      required
      min={18}  // Minimum age 18
      max={65}  // Maximum age 65
      title="Driver age must be between 18 and 65."
    />
  </label>

  <label>
    License No:
    <input
      type="text"
      value={driverLicense}
      onChange={(e) => setDriverLicense(e.target.value)}
      required
      pattern="[A-Z0-9]{6,15}" // Example: alphanumeric, 6-15 chars
      title="License number should be alphanumeric, 6-15 characters."
    />
  </label>
                <label>
                  CAPTCHA: {captchaValue}
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" className="confirm-btn">
                  Confirm Booking
                </button>
              </form>
            </div>
          </div>
        )}

        {showPayment && !paymentSuccess && (
          <PaymentForm
            amount={price}
            onSuccess={(data) => {
              setPaymentSuccess(true);
              setShowPayment(false);

              // Prepare booking object
              const bookingForPDF = {
                id:
                  data.bookingId || Math.floor(100000 + Math.random() * 900000),
                transactionId: data.transactionId,
                vehicleName: vehicle.name,
                pickup: fromAddress,
                drop: toAddress,
                dateFrom,
                dateTo,
                driverName,
                driverContact,
                price,
              };

              // Optional: save to backend
              fetch("http://localhost:5000/api/bookings/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  ...bookingForPDF,
                  vehicleId: vehicle.id,
                }),
              }).catch((err) => console.error(err));

              // Alert & generate PDF
              alert(
                `Payment Successful! Transaction ID: ${data.transactionId}`
              );
              generateBookingReceipt(bookingForPDF);
            }}
          />
        )}
      </div>
      </div>
                 {/* FEEDBACK SECTION */}
<div className="feedback-section"> 
  <h3>Vehicle Feedback</h3>

  {/* Show existing feedback */}
  {feedbackList.length > 0 ? (
    feedbackList.map((fb) => (
      <div key={fb.id} className="feedback-item">
        <p className="feedback-user"><strong>{fb.userName || "Anonymous"}</strong></p>
        <p className="feedback-rating">Rating: ⭐ {fb.rating}/5</p>
        <p className="feedback-rating">
  {[1, 2, 3, 4, 5].map((num) => {
    const fill =
      fb.rating >= num
        ? "filled"
        : fb.rating >= num - 0.5
        ? "half"
        : "";
    return <span key={num} className={`star ${fill}`}>★</span>;
  })}
</p>

        <p className="feedback-comment">"{fb.comment}"</p>
        <p className="feedback-date">
          {new Date(fb.created_at).toLocaleString()}
        </p>
      </div>
    ))
  ) : (
    <p>No feedback yet. Be the first to share your experience!</p>
  )}

  {/* Add new feedback */}
  <div className="add-feedback">
  <h4>Add Your Feedback</h4>

  <label>Rating:</label>
{/* Add this in your BookingPage JSX */}
<div className="star-rating">
  {[1, 2, 3, 4, 5].map((num) => {
    const fill = hoverRating
      ? hoverRating >= num
        ? "filled"
        : hoverRating >= num - 0.5
        ? "half"
        : ""
      : rating >= num
      ? "filled"
      : rating >= num - 0.5
      ? "half"
      : "";

    return (
      <span
        key={num}
        className={`star ${fill}`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const half = clickX < rect.width / 2 ? 0.5 : 1;
          setRating(num - 1 + half); // Set rating to exact half/full
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const hoverX = e.clientX - rect.left;
          const hoverHalf = hoverX < rect.width / 2 ? 0.5 : 1;
          setHoverRating(num - 1 + hoverHalf); // Show hover preview
        }}
        onMouseLeave={() => setHoverRating(0)} // Reset hover preview
      >
        ★
      </span>
    );
  })}
</div>



  <textarea
    placeholder="Write your feedback..."
    value={newFeedback}
    onChange={(e) => setNewFeedback(e.target.value)}
  ></textarea>

  <button
    className="submit-feedback-btn"
    onClick={async () => {
      if (!rating || rating < 1 || rating > 5) {
  alert("Please select a rating before submitting.");
  return;
}


      try {
        const res = await fetch(`http://localhost:5000/api/vehicles/${vehicle.id}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ comment: newFeedback.trim(), rating }),
        });

        if (res.ok) {
          alert("Feedback submitted successfully!");
          setNewFeedback("");
          const updated = await fetch(`http://localhost:5000/api/vehicles/${vehicle.id}/feedback`, {
            credentials: "include",
          });
          const data = await updated.json();
          setFeedbackList(data.feedback || []);
        } else {
          const data = await res.json();
          alert(data.message || "Failed to submit feedback.");
        }
      } catch (err) {
        console.error(err);
        alert("Error submitting feedback.");
      }
    }}
  >
    Submit Feedback
  </button>
</div>

</div>


    </div>
    
  );
};

export default BookingPage;
