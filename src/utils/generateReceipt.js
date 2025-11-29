import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import robotoFontBase64 from "../fonts/NOTO-Regular.js";


export const generateBookingReceipt = (booking) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Embed Roboto font
doc.addFileToVFS("Roboto-Regular.ttf", robotoFontBase64);
doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
doc.setFont("Roboto");


  // Helper: combine date & time
  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return "N/A";
    let date = new Date(dateStr);
    const time = timeStr ? timeStr : "00:00";
    const [hour, min] = time.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const formattedTime = `${hour12}:${min} ${ampm}`;
    return `${date.toLocaleDateString()} ${formattedTime}`;
  };

  // Helper: clean and format price
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

  // Header
  doc.setFillColor(40, 167, 69);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("EasyRent Vehicles", pageWidth / 2, 17, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("Booking Receipt", pageWidth / 2, 35, { align: "center" });

  // Table with booking details
  autoTable(doc, {
    startY: 45,
    head: [["Field", "Details"]],
    body: [
      ["Booking ID", booking.id || "N/A"],
      ["Transaction ID", booking.transactionId || "N/A"],
      ["Vehicle", booking.vehicleName || "N/A"],
      ["Pickup Location", booking.pickup || "N/A"],
      ["Drop Location", booking.drop || "N/A"],
      ["From", formatDateTime(booking.dateFrom, booking.timeFrom)],
      ["To", formatDateTime(booking.dateTo, booking.timeTo)],
      ["Driver Name", booking.driverName || "N/A"],
      ["Driver Contact", booking.driverContact || "N/A"],
      ["Total Price", formatPrice(booking.price)],
    ],
    theme: "grid",
    headStyles: { fillColor: [40, 167, 69], textColor: 255, font: "Roboto" },
    styles: { cellPadding: 3, fontSize: 11, font: "Roboto" },
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY || 70;
  doc.setFontSize(10);
  doc.text(
    "Thank you for booking with EasyRent! We wish you a safe ride.",
    pageWidth / 2,
    finalY + 15,
    { align: "center" }
  );

  doc.save(`BookingReceipt_${booking.id || "N/A"}.pdf`);
};
