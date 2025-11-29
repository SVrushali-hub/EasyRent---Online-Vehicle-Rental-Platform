import React, { useState } from "react";
import ReactStars from "react-rating-stars-component";

function FeedbackForm({ vehicleId, onFeedbackSubmit }) {
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment || rating === 0) return alert("Please enter comment and rating");

    const res = await fetch(`/api/vehicles/${vehicleId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment, rating }),
    });

    const data = await res.json();
    if (res.ok) {
      onFeedbackSubmit(data);
      setComment("");
      setRating(0);
    } else {
      alert(data.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        placeholder="Write your feedback"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        required
      />
      <ReactStars
        count={5}
        size={30}
        isHalf={true}
        value={rating}
        onChange={(newRating) => setRating(newRating)}
        activeColor="#ffd700"
      />
      <button type="submit">Submit Feedback</button>
    </form>
  );
}

export default FeedbackForm;
