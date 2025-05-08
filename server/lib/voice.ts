/**
 * Voice processing utility for handling audio transcription using OpenAI's Whisper model
 */
import OpenAI from 'openai';
import fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import path from 'path';
import os from 'os';

// Initialize OpenAI client
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Helper function to convert base64 to a temporary file
async function base64ToTempFile(base64Data: string): Promise<string> {
  // Remove the data URL prefix if it exists
  const base64String = base64Data.replace(/^data:audio\/\w+;base64,/, '');
  
  // Create a buffer from the base64 string
  const audioBuffer = Buffer.from(base64String, 'base64');
  
  // Create a temporary file
  const tempFilePath = path.join(os.tmpdir(), `voice-recording-${Date.now()}.webm`);
  
  // Write the buffer to the file
  await fs.promises.writeFile(tempFilePath, audioBuffer);
  
  return tempFilePath;
}

// Function to process voice recordings and convert to text using OpenAI
export async function processVoiceRecording(
  audioBase64: string
): Promise<{ text: string; duration: number }> {
  let tempFilePath: string | null = null;
  
  try {
    // Convert base64 to temp file
    tempFilePath = await base64ToTempFile(audioBase64);
    
    // Create a read stream from the file
    const audioFile = fs.createReadStream(tempFilePath);
    
    // Initialize OpenAI client
    const openai = getOpenAIClient();
    
    // Call OpenAI Whisper API for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "json", 
    });
    
    // Extract the transcription text and duration
    const text = transcription.text;
    const duration = 0; // OpenAI doesn't provide duration, would need to be calculated separately
    
    return { text, duration };
  } catch (error) {
    console.error("Error processing voice recording:", error);
    throw new Error("Failed to process voice recording");
  } finally {
    // Clean up the temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

// Fallback function for when OpenAI API is not available or for testing
export async function simulateVoiceTranscription(
  audioBase64: string
): Promise<{ text: string; duration: number }> {
  // Simulated processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // Extract some data from the audio base64 string to generate a somewhat random length
  const dataLength = audioBase64.length;
  
  // Calculate a simulated duration (between 15-90 seconds)
  const duration = Math.min(90, Math.max(15, Math.floor(dataLength % 75) + 15));
  
  // Generate a relevant simulated transcript based on common pitch patterns
  const simulatedTranscripts = [
    "Hello, I'm an expert in this field with over 10 years of experience. I've worked with major publications and have extensive knowledge on this topic. I'd be delighted to contribute to your article.",
    "I believe I'd be a perfect fit for this opportunity. I have specialized expertise in this area and have published several articles on related topics. I can provide valuable insights that your readers would find beneficial.",
    "As someone who has been working in this industry for many years, I have unique perspectives on this subject. I've been featured in several publications and have a track record of delivering high-quality content.",
    "I'm excited about this opportunity to share my knowledge with your audience. My background includes significant research and practical experience in this field, which would bring depth to your article.",
    "I have specific expertise that directly relates to this topic. My professional background includes working with leading organizations in this space, and I've developed innovative approaches that would interest your readers."
  ];
  
  // Select a transcript based on a hash of the audio data
  const transcriptIndex = Math.floor((dataLength % simulatedTranscripts.length));
  const text = simulatedTranscripts[transcriptIndex];
  
  return { text, duration };
}
