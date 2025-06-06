const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json());

const port = 3001;
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const sessions = {};

app.post("/api/interview", async (req, res) => {
  const { sessionId, jobTitle, userAnswer } = req.body;

  if (!sessionId || !jobTitle) {
    return res
      .status(400)
      .json({ error: "Session ID and Job Title are required." });
  }
  if (!sessions[sessionId]) {
    sessions[sessionId] = [];
  }

  const chatHistory = sessions[sessionId];
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  try {
    let aiResponseText = "";
    if (chatHistory.length === 0 && !userAnswer) {
      aiResponseText = "Tell me about yourself.";
      chatHistory.push({ role: "model", parts: [{ text: aiResponseText }] });
    } else {
      if (userAnswer) {
        chatHistory.push({ role: "user", parts: [{ text: userAnswer }] });
      }

      const userAnswersCount = chatHistory.filter(
        (msg) => msg.role === "user"
      ).length;

      if (
        userAnswersCount >= 6 ||
        (userAnswer && userAnswer.toLowerCase().includes("end interview"))
      ) {
        const feedbackPrompt = `You are an AI job interviewer for a "${jobTitle}" role. The interview conversation has concluded. Based on the following conversation, please provide constructive feedback on the user's answers and suggest specific areas for improvement.
                
                Conversation history:
                ${chatHistory
                  .map(
                    (msg) =>
                      `${msg.role === "user" ? "Me" : "Interviewer"}: ${
                        msg.parts[0].text
                      }`
                  )
                  .join("\n")}
                
                Provide a concise summary of their performance and actionable advice for improvement.`;

        const result = await model.generateContent(feedbackPrompt);
        const response = await result.response;
        aiResponseText = response.text();
        chatHistory.push({ role: "model", parts: [{ text: aiResponseText }] });
      } else {
        const dynamicQuestionPrompt = `You are an AI job interviewer for a "${jobTitle}" role. Based on the previous conversation, ask the next relevant interview question. Do not provide feedback yet, only ask a question. Ensure your question is clear and concise.
                
                Conversation history:
                ${chatHistory
                  .map(
                    (msg) =>
                      `${msg.role === "user" ? "Me" : "Interviewer"}: ${
                        msg.parts[0].text
                      }`
                  )
                  .join("\n")}
                
                What is your next question?`;

        const result = await model.generateContent(dynamicQuestionPrompt);
        const response = await result.response;
        aiResponseText = response.text();
        chatHistory.push({ role: "model", parts: [{ text: aiResponseText }] });
      }
    }
    // Format for frontend
    const frontendHistory = chatHistory.map((msg) => ({
      role: msg.role === "user" ? "User" : "AI",
      text: msg.parts[0].text,
    }));
    res.json({ aiResponse: aiResponseText, chatHistory: frontendHistory });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({
      error:
        "Failed to get AI response. Please check your API key and network connection.",
    });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
