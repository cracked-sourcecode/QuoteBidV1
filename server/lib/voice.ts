/**
 * Enhanced voice processing utility using OpenAI's Whisper model with improved SDK
 */
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Initialize OpenAI client with enhanced configuration
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60000, // 60 second timeout for audio processing
    maxRetries: 2, // Retry failed requests
  });
}

// Helper function to convert base64 to a temporary file with proper audio format detection
async function base64ToTempFile(base64Data: string): Promise<string> {
  // Remove the data URL prefix if it exists and detect format
  let base64String = base64Data;
  let fileExtension = 'webm'; // default
  
  if (base64Data.includes('data:')) {
    const [header, data] = base64Data.split(',');
    base64String = data;
    
    // Detect audio format from header
    if (header.includes('audio/wav')) fileExtension = 'wav';
    else if (header.includes('audio/mp3')) fileExtension = 'mp3';
    else if (header.includes('audio/mp4')) fileExtension = 'mp4';
    else if (header.includes('audio/m4a')) fileExtension = 'm4a';
    else if (header.includes('audio/ogg')) fileExtension = 'ogg';
    else if (header.includes('audio/webm')) fileExtension = 'webm';
  }
  
  // Create a buffer from the base64 string
  const audioBuffer = Buffer.from(base64String, 'base64');
  
  // Create a temporary file with the correct extension
  const tempFilePath = path.join(os.tmpdir(), `voice-recording-${Date.now()}.${fileExtension}`);
  
  // Write the buffer to the file
  await fs.promises.writeFile(tempFilePath, audioBuffer);
  
  return tempFilePath;
}

// Enhanced function to process voice recordings using the improved Whisper SDK
export async function processVoiceRecording(
  audioBase64: string
): Promise<{ text: string; duration: number; confidence?: number; language?: string }> {
  let tempFilePath: string | null = null;
  
  try {
    console.log('[Voice] Starting transcription process...');
    
    // Convert base64 to temp file with format detection
    tempFilePath = await base64ToTempFile(audioBase64);
    console.log('[Voice] Created temporary file:', tempFilePath);
    
    // Initialize OpenAI client with enhanced configuration
    const openai = getOpenAIClient();
    
    // Create a read stream from the file
    const audioFile = fs.createReadStream(tempFilePath);
    
    // Use enhanced OpenAI Whisper API with better configuration
    console.log('[Voice] Using enhanced Whisper configuration...');
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json", // Get detailed response with timestamps and confidence
      language: "en", // Default to English, can be auto-detected
      temperature: 0.1, // Lower temperature for more consistent results
      prompt: "This is a professional business pitch or communication. Please transcribe accurately with proper punctuation and formatting." // Context for better accuracy
    });
    
    console.log('[Voice] Enhanced transcription completed successfully');
    
    // Extract detailed information from verbose response
    const result = {
      text: transcription.text || '',
      duration: transcription.duration || 0,
      language: transcription.language || 'en',
      // Calculate confidence from average log probability if available
      confidence: (transcription as any).avg_logprob ? 
        Math.round(Math.exp((transcription as any).avg_logprob) * 100) / 100 : 
        undefined
    };
    
    console.log('[Voice] Transcription result:', {
      textLength: result.text.length,
      duration: result.duration,
      language: result.language,
      confidence: result.confidence
    });
    
    return result;
    
  } catch (error) {
    console.error("[Voice] Error processing voice recording:", error);
    
    // Enhanced error handling with more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error("OpenAI API key is invalid or missing. Please check your configuration.");
      } else if (error.message.includes('rate limit')) {
        throw new Error("API rate limit exceeded. Please try again in a moment.");
      } else if (error.message.includes('audio')) {
        throw new Error("Audio file format is not supported. Please try recording again.");
      } else if (error.message.includes('timeout')) {
        throw new Error("Audio processing timed out. Please try with a shorter recording.");
      } else {
        throw new Error(`Voice processing failed: ${error.message}`);
      }
    }
    
    throw new Error("Failed to process voice recording. Please try again.");
  } finally {
    // Clean up the temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('[Voice] Cleaned up temporary file');
      } catch (cleanupError) {
        console.warn('[Voice] Failed to cleanup temporary file:', cleanupError);
      }
    }
  }
}

// Enhanced fallback function for testing with more realistic simulation
export async function simulateVoiceTranscription(
  audioBase64: string
): Promise<{ text: string; duration: number; confidence?: number; language?: string }> {
  console.log('[Voice] Using simulation mode for transcription');
  
  // Simulated processing delay
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  // Extract some data from the audio base64 string to generate a somewhat random length
  const dataLength = audioBase64.length;
  
  // Calculate a simulated duration (between 10-120 seconds)
  const duration = Math.min(120, Math.max(10, Math.floor(dataLength % 110) + 10));
  
  // Generate more realistic and varied simulated transcripts
  const simulatedTranscripts = [
    "Hello, I'm reaching out regarding your recent article opportunity. I have over 10 years of experience in this industry and have been featured in several major publications including Forbes and TechCrunch. I believe I can provide unique insights that would be valuable to your readers.",
    
    "Thank you for posting this media opportunity. As an expert in this field, I've worked with leading companies and have extensive knowledge on this specific topic. I'm confident I can deliver high-quality content that aligns with your publication's standards and audience needs.",
    
    "I'm excited about the possibility of contributing to your article. My background includes both academic research and practical industry experience, which gives me a comprehensive perspective on this subject matter. I've published extensively and have a track record of creating engaging content.",
    
    "This opportunity perfectly matches my area of expertise. I've been working in this space for many years and have developed innovative approaches that I believe would interest your audience. I'm available for interviews and can provide detailed insights on this topic.",
    
    "I believe I'd be an excellent fit for this media opportunity. My professional experience includes working with Fortune 500 companies in this sector, and I've been recognized as a thought leader in this field. I can offer unique perspectives and data-driven insights for your article."
  ];
  
  // Select a transcript based on a hash of the audio data
  const transcriptIndex = Math.floor((dataLength % simulatedTranscripts.length));
  const text = simulatedTranscripts[transcriptIndex];
  
  // Simulate confidence score
  const confidence = 0.85 + (Math.random() * 0.15); // Between 85% and 100%
  
  return { 
    text, 
    duration, 
    confidence: Math.round(confidence * 100) / 100,
    language: 'en'
  };
}
