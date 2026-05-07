import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
    res.send("KVS ML Backend Running 🚀");
});

app.post("/predict", upload.single("file"), (req, res) => {

    const text = req.body.text;

    let fileName = null;

    if(req.file){
        fileName = req.file.originalname;
    }

    res.json({
        success: true,
        message: "Prediction Successful ✅",
        entered_text: text,
        uploaded_file: fileName
    });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
