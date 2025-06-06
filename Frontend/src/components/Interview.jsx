import React, { useState, useEffect, useRef } from "react";
import styles from "./Interview.module.css";

function App() {
  const [jobTitle, setJobTitle] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [interviewStarted, setInterviewStarted] = useState(false);
  const conversationEndRef = useRef(null);

  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const startInterview = async () => {
    if (!jobTitle.trim()) {
      setErrorMessage(
        "Please enter a Job Title before starting the interview."
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("http://localhost:3001/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({ sessionId, jobTitle, userAnswer: "" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch initial AI question."
        );
      }

      const data = await response.json();
      setConversation(data.chatHistory);
      setInterviewStarted(true);
    } catch (error) {
      console.error("Error starting interview:", error);
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        setErrorMessage(
          "Error: Could not connect to the backend server. Please ensure the Node.js backend (server.js) is running on http://localhost:3001 and your Gemini API key is correctly set in its .env file."
        );
      } else {
        setErrorMessage(
          `Error: ${error.message}. Please ensure the backend is running and your API key is correct.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const jobTitleChange = (e) => {
    setJobTitle(e.target.value);
  };
  const answerChange = (e) => {
    setUserAnswer(e.target.value);
  };
  const submit = async (e) => {
    e.preventDefault();

    if (!userAnswer.trim()) {
      setErrorMessage("Please type an answer before submitting.");
      return;
    }
    if (!interviewStarted) {
      setErrorMessage(
        'Please start the interview first by entering a job title and clicking "Start Interview".'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setConversation((prevConversation) => [
      ...prevConversation,
      { sender: "User", text: userAnswer.trim() },
    ]);
    const currentAnswer = userAnswer.trim();
    setUserAnswer("");

    try {
      const response = await fetch("http://localhost:3001/api/interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          jobTitle,
          userAnswer: currentAnswer,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get AI response.");
      }

      const data = await response.json();
      setConversation(data.chatHistory);
    } catch (error) {
      console.error("Error submitting answer:", error);
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        setErrorMessage(
          "Error: Could not connect to the backend server. Please ensure the Node.js backend (server.js) is running on http://localhost:3001 and your Gemini API key is correctly set in its .env file."
        );
      } else {
        setErrorMessage(`Error: ${error.message}. Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.main}>
      <div className={styles.appContainer}>
        <h1 className={styles.appTitle}>AI Mock Interviewer</h1>
        <section className={styles.inputGroup}>
          <div>
            <p className={styles.label}>Job Title:</p>
            <input
              type="text"
              id="jobTitle"
              className={`${styles.input} ${styles.inputJobTitle}`}
              placeholder="Junior Developer .etc"
              value={jobTitle}
              onChange={jobTitleChange}
              disabled={interviewStarted || isLoading}
            />
          </div>
          <button
            type="button"
            onClick={startInterview}
            className={`${styles.btn} ${styles.btnGreen}`}
            disabled={isLoading || interviewStarted || !jobTitle.trim()}
          >
            Start Interview
          </button>
        </section>

        {/* Conversation Display Area */}
        <section className={styles.conversationArea}>
          {conversation.length === 0 && !isLoading && !interviewStarted && (
            <p className={styles.placeholderText}>
              Enter a job title and click "Start Interview" to begin.
            </p>
          )}
          {conversation.map((msg, index) => (
            <div
              key={index}
              className={`${styles.message} ${
                msg.role === "User" ? styles.user : styles.ai
              }`}
            >
              <strong>{msg.role === "User" ? "Me" : "Interviewer"}:</strong>{" "}
              {msg.text}
            </div>
          ))}
          {isLoading && (
            <div className={styles.loadingIndicator}>
              <div className={styles.spinner}></div>
              <p>AI is thinking...</p>
            </div>
          )}
          <div ref={conversationEndRef} />
        </section>

        {/* Error Message Display */}
        {errorMessage && (
          <div className={styles.errorMessage} role="alert">
            <strong>Error!</strong>
            <span> {errorMessage}</span>
          </div>
        )}

        {/* User Answer Input and Submit Button */}
        <form onSubmit={submit} className={styles.inputGroup}>
          <input
            type="text"
            className={styles.input}
            placeholder="Type your answer here..."
            value={userAnswer}
            onChange={answerChange}
            disabled={isLoading || !interviewStarted}
          />
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnBlue}`}
            disabled={isLoading || !userAnswer.trim() || !interviewStarted}
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
