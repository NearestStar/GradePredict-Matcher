import { GoogleGenAI } from "@google/genai";
import { ComparisonData } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateStudentInsight = async (student: ComparisonData): Promise<string> => {
  try {
    const ai = getClient();
    
    const prompt = `
      Analyze the performance prediction accuracy for the following student:
      Student: ${student.name} (${student.usn})
      
      Data (Subject: Actual vs Predicted):
      ${student.subjects.map(sub => `- ${sub}: Actual ${student.actual[sub]}, Predicted ${student.predicted[sub]}`).join('\n')}
      
      Overall Model Accuracy for this student: ${student.averageAccuracy.toFixed(2)}%

      Please provide a concise analysis (max 3 bullet points) focusing on:
      1. Which subject had the largest prediction error?
      2. Did the model generally overestimate or underestimate the student?
      3. A brief conclusion on the reliability of the prediction for this student.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "No insight generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate AI insights at this time. Please check your API key.";
  }
};
