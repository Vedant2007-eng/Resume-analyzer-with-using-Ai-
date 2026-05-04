const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const pdf = require("pdf-parse");
const mongoose = require("mongoose");

// ✅ MongoDB Connection
mongoose.connect(
  "mongodb://vvedantkubde2007:Vedantkubde2007@ac-goevvkv-shard-00-00.baxmkyb.mongodb.net:27017,ac-goevvkv-shard-00-01.baxmkyb.mongodb.net:27017,ac-goevvkv-shard-00-02.baxmkyb.mongodb.net:27017/resumeDB?ssl=true&replicaSet=atlas-fmwmmt-shard-0&authSource=admin&retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB Error:", err));

const app = express();
app.use(cors());

// ✅ Schema
const Resume = mongoose.model("Resume", {
  name: String,
  email: String,
  skills: [String],
  projects: [String],
  score: Number
});

// Upload folder
const upload = multer({ dest: "uploads/" });

// =========================
// ✅ UPLOAD API
// =========================
app.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdf(dataBuffer);

    const rawText = data.text;
    const lowerText = rawText.toLowerCase();

    const lines = rawText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line !== "");

    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);
    const email = emailMatch ? emailMatch[0] : "Not found";

    const name = lines[0] || "Not found";

    const skillsList = ["C", "C++", "Python", "JavaScript", "Java", "HTML", "CSS", "React", "Node"];
    const skills = skillsList.filter(skill =>
      lowerText.includes(skill.toLowerCase())
    );

    // 🔹 Projects
    let projects = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();

      if (
        (line.includes("project") ||
         line.includes("developed") ||
         line.includes("built") ||
         line.includes("implementation")) &&
        !line.includes("objective") &&
        !line.includes("seeking")
      ) {
        let cleanLine = lines[i].replace(/^[-•*]\s*/, "");
        if (cleanLine.length > 15) {
          projects.push(cleanLine);
        }
      }
    }
    projects = [...new Set(projects)];

    // 🔹 Score
    let score = 0;

    if (name !== "Not found") score += 10;
    if (email !== "Not found") score += 15;

    if (skills.length >= 6) score += 30;
    else if (skills.length >= 4) score += 20;
    else score += 10;

    if (projects.length >= 3) score += 30;
    else if (projects.length === 2) score += 20;
    else score += 10;

    if (lowerText.includes("github")) score += 5;

    if (score > 100) score = 100;

    // 📊 Score Breakdown
    let scoreBreakdown = {
      name: name !== "Not found" ? 10 : 0,
      email: email !== "Not found" ? 15 : 0,
      skills:
        skills.length >= 6 ? 30 :
        skills.length >= 4 ? 20 : 10,
      projects:
        projects.length >= 3 ? 30 :
        projects.length === 2 ? 20 : 10,
      github: lowerText.includes("github") ? 5 : 0
    };

    // 🔹 Feedback
    let feedback = {
      strengths: [],
      improvements: [],
      missing: []
    };

    if (skills.length >= 5) feedback.strengths.push("Strong technical skill set");
    if (projects.length >= 2) feedback.strengths.push("Good number of projects");
    if (lowerText.includes("github")) feedback.strengths.push("Includes GitHub links");

    if (projects.length < 4) feedback.improvements.push("Add more advanced projects");
    if (!lowerText.includes("react")) feedback.improvements.push("Add React");
    if (!lowerText.includes("node")) feedback.improvements.push("Add Node.js");

    if (!lowerText.includes("experience"))
      feedback.missing.push("No internship or work experience");

    if (!lowerText.includes("achievement"))
      feedback.missing.push("Add achievements");

    // =========================
    // 🤖 SMART AI SUGGESTIONS (FIXED)
    // =========================
    let aiSuggestions = [];

    // Score based
    if (score >= 80) {
      aiSuggestions.push("Your resume is strong. Start applying for internships/jobs.");
    } else if (score >= 60) {
      aiSuggestions.push("Your resume is good but can be improved with stronger projects.");
    } else {
      aiSuggestions.push("Your resume needs improvement. Focus on building projects and adding skills.");
    }

    // Skills
    if (skills.length < 5) {
      aiSuggestions.push("Add more technical skills to strengthen your profile.");
    }

    if (!skills.includes("React")) {
      aiSuggestions.push("Learn React to improve frontend opportunities.");
    }

    if (!skills.includes("Node")) {
      aiSuggestions.push("Learn Node.js for backend development.");
    }

    // Projects
    if (projects.length < 3) {
      aiSuggestions.push("Build more projects to showcase real-world experience.");
    }

    // Experience
    if (!lowerText.includes("experience")) {
      aiSuggestions.push("Try adding internship or real-world experience.");
    }

    // GitHub
    if (!lowerText.includes("github")) {
      aiSuggestions.push("Add GitHub links to showcase your work.");
    }

    // Achievements
    if (!lowerText.includes("achievement")) {
      aiSuggestions.push("Include achievements with measurable impact.");
    }

    // 🎯 Job Role
    let jobRole = "General Software Developer";

    if (skills.includes("HTML") && skills.includes("CSS") && skills.includes("JavaScript"))
      jobRole = "Frontend Developer";

    if (skills.includes("React"))
      jobRole = "Web Developer";

    if (skills.includes("Node") || skills.includes("Java") || skills.includes("Python"))
      jobRole = "Backend Developer";

    // 🧠 Skill Gap
    let requiredSkills = ["HTML", "CSS", "JavaScript", "React", "Node", "MongoDB"];
    let skillGap = requiredSkills.filter(skill => !skills.includes(skill));

    // 🗺️ Roadmap
    let roadmap = [
      "Learn basics",
      "Build projects",
      "Learn advanced tools",
      "Apply for jobs"
    ];

    // SAVE
    await Resume.create({ name, email, skills, projects, score });

    // RESPONSE
    res.json({
      name,
      email,
      skills,
      projects,
      score,
      scoreBreakdown,
      feedback,
      aiSuggestions,
      jobRole,
      skillGap,
      roadmap
    });

  } catch (error) {
    console.log(error);
    res.status(500).send("Error extracting data");
  }
});

// GET HISTORY
app.get("/resumes", async (req, res) => {
  try {
    const data = await Resume.find().sort({ _id: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).send("Error fetching resumes");
  }
});

// Start server
app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});