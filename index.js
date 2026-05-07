import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.send("KVS ML Backend Running 🚀");
});

// Prediction route
app.post("/predict", (req, res) => {

  const data = req.body;

  console.log("Received Data:", data);

  // Dummy prediction
  res.json({
    success: true,
    prediction: "Analysis Completed Successfully",
    received: data
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
