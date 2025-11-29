import React, { useEffect, useRef } from "react";

const BookingReceipt = ({ bookingId }) => {
  const iframeRef = useRef();

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = `http://localhost:5000/api/receipt/${bookingId}`;
    }
  }, [bookingId]);

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h2>Booking Receipt</h2>
      <iframe
        ref={iframeRef}
        title="Receipt"
        width="80%"
        height="600px"
        style={{ border: "1px solid #ccc", borderRadius: "8px" }}
      ></iframe>
      <br />
      <button
        onClick={handlePrint}
        style={{
          marginTop: "15px",
          padding: "10px 20px",
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Print Receipt
      </button>
    </div>
  );
};

export default BookingReceipt;
