import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HomePage.css";
import car1 from "../assets/car-1.jpg";
import car2 from "../assets/car-2.jpg";
import car3 from "../assets/car-3.jpg";
import bike4 from "../assets/car-4.avif";
import bike5 from "../assets/car-5.avif";
import bike6 from "../assets/car-6.avif";

const branches = {
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

const sampleVehicles = [
  { id: 1, name: "Sedan Car", image: car1 },
  { id: 2, name: "SUV Car", image: car2 },
  { id: 3, name: "Luxury Car", image: car3 },
  { id: 4, name: "Benelli", image: bike4 },
  { id: 5, name: "Royal Enfield", image: bike5 },
  { id: 6, name: "Kawasaki", image: bike6 },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? sampleVehicles.length - 1 : prev - 1
    );
  };

  const nextSlide = () => {
    setCurrentIndex((prev) =>
      prev === sampleVehicles.length - 1 ? 0 : prev + 1
    );
  };

  const visibleVehicles = [
    sampleVehicles[currentIndex],
    sampleVehicles[(currentIndex + 1) % sampleVehicles.length],
    sampleVehicles[(currentIndex + 2) % sampleVehicles.length],
  ];

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title">Welcome to EasyRent</h1>
        <p className="hero-subtitle">Book your vehicle online easily and quickly.</p>
        <button className="explore-btn" onClick={() => navigate("/vehicles")}>
          Explore Vehicles
        </button>
      </section>

      {/* Vehicles Carousel */}
      <section className="vehicles">
        <h2 className="section-title">Our Vehicles</h2>
        <div className="carousel-container">
          <button className="arrow left" onClick={prevSlide}>
            &#10094;
          </button>

          <div className="vehicle-grid">
            {visibleVehicles.map((v) => (
              <div key={v.id} className="vehicle-card">
                <img src={v.image} alt={v.name} />
                <h3>{v.name}</h3>
              </div>
            ))}
          </div>

          <button className="arrow right" onClick={nextSlide}>
            &#10095;
          </button>
        </div>
      </section>

      {/* Night Discount */}
      <section className="night-discount">
        <div className="discount-content">
          <div className="moon-icon">🌙</div>
          <div className="discount-text">
            <h3>Night Pickup Special!</h3>
            <p>
              Book a vehicle between <strong>8 PM - 6 AM</strong> and get <span>25% off</span>!
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about">
        <h2 className="section-title">About EasyRent</h2>
        <p>
          EasyRent is your trusted partner for convenient and affordable vehicle
          rentals. Whether you need a compact car for city drives, an SUV for
          adventures, or a luxury car for special occasions, we’ve got you
          covered. Our mission is to provide a seamless booking experience with
          reliable vehicles and excellent customer service.
        </p>
        <p>
          With EasyRent, you can book your vehicle online in minutes, enjoy
          transparent pricing, and choose from a wide selection of well-maintained
          cars. Experience hassle-free rides with EasyRent today!
        </p>
      </section>

      {/* Branches Section */}
      <section className="branches">
        <h2 className="section-title">Our Branches</h2>
        <p id="branch-subhead">We are available in the following branches:</p>
        <div className="branch-list">
          {Object.entries(branches).map(([city, areas]) => (
            <div key={city} className="branch-item">
              <strong>{city}:</strong> {areas.join(", ")}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
