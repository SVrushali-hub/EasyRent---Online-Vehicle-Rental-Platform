import React, { useEffect, useState } from "react";
import "../styles/RentHistory.css";
import { generateBookingReceipt } from "../utils/generateReceipt";

const RentHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Format date and time for display
  const formatDateTime = (dateTimeStr, timeStr) => {
    if (!dateTimeStr) return "";
    const date = new Date(dateTimeStr);
    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      date.setHours(h);
      date.setMinutes(m);
    }
    return date.toLocaleString([], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Format price display
  const formatPrice = (price) => {
    if (!price) return "N/A";
    const cleaned = String(price).replace(/[^\d.]/g, "");
    const num = Number(cleaned);
    if (isNaN(num)) return "N/A";
    return `₹${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Fetch bookings on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/bookings-history", {
          credentials: "include",
        });
        if (res.status === 401) {
          alert("You must be logged in to view your booking history.");
          setBookings([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setBookings(data.bookings || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Cancel booking — mark as cancelled, do NOT remove from table
  const handleCancelBooking = async (bookingId) => {
    const booking = bookings.find((b) => b.id === bookingId);
    const now = new Date();

    // Prevent cancelling ended bookings
    if (new Date(booking.date_to) < now) {
      alert("You cannot cancel a booking that has already ended.");
      return;
    }

    if (booking.status === "cancelled") {
      alert("This booking is already cancelled.");
      return;
    }

    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${bookingId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        alert("Booking cancelled successfully.");
        // ✅ Keep it in table — just update status
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: "cancelled" } : b
          )
        );
      } else {
        const data = await res.json();
        alert(data.message || "Failed to cancel booking.");
      }
    } catch (err) {
      console.error(err);
      alert("Error cancelling booking.");
    }
  };

  if (loading) return <p>Loading rent history...</p>;

  if (!bookings.length)
    return (
      <div className="rent-history">
        <h3>Your Rent History</h3>
        <p>No bookings found.</p>
      </div>
    );

  return (
    <div className="rent-history">
      <div className="history-header">
        <h3>Your Rent History</h3>
      </div>
      <table>
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Pickup</th>
            <th>Drop</th>
            <th>Price</th>
            <th>Driver</th>
            <th>Booking Date</th>
            <th>Date & Time</th>
            <th>Receipt</th>
            <th>Status / Cancel</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const now = new Date();
            const fromDate = new Date(b.date_from);
            const toDate = new Date(b.date_to);

            // Disable if rent period ended or booking cancelled
            const isPast = toDate < now;
            const isCancelled = b.status === "cancelled";
            const isDisabled = isPast || isCancelled;

            return (
              <tr
                key={b.id}
                className={isDisabled ? "disabled-row" : ""}
                title={
                  isCancelled
                    ? "Booking already cancelled"
                    : isPast
                    ? "Rent period has ended – cannot cancel"
                    : ""
                }
              >
                <td>{b.vehicle_name}</td>
                <td>{b.pickup_location}</td>
                <td>{b.drop_location}</td>
                <td>{formatPrice(b.price)}</td>
                <td>{b.driver_name}</td>
                <td>{new Date(b.created_at).toLocaleString()}</td>
                <td>
                  {formatDateTime(b.date_from, b.time_from)} to{" "}
                  {formatDateTime(b.date_to, b.time_to)}
                </td>
                <td>
                  <button
                    className="btn download-btn"
                    onClick={() =>
                      generateBookingReceipt({
                        id: b.id,
                        transactionId: b.transaction_id,
                        vehicleName: b.vehicle_name,
                        pickup: b.pickup_location,
                        drop: b.drop_location,
                        dateFrom: b.date_from,
                        dateTo: b.date_to,
                        timeFrom: b.time_from,
                        timeTo: b.time_to,
                        driverName: b.driver_name,
                        driverContact: b.driver_contact,
                        price: b.price,
                      })
                    }
                  >
                    Download PDF
                  </button>
                </td>
                <td>
  {b.status === "completed" ? (
    <span className="transaction-id">{b.transaction_id || "N/A"}</span>
  ) : isCancelled ? (
    <span className="cancelled-text">Cancelled</span>
  ) : (
    <button
      className="btn cancel-btn"
      onClick={() => handleCancelBooking(b.id)}
      disabled={isDisabled}
    >
      Cancel
    </button>
  )}
</td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RentHistory;
