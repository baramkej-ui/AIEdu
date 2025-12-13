
'use server';
/**
 * @fileOverview A flow to analyze a recorded teaching session.
 *
 * - analyzeSession - Transcribes audio and provides an evaluation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeSessionInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The recorded audio of the session, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

const AnalyzeSessionOutputSchema = z.object({
  transcript: z.string().describe('The full transcript of the conversation.'),
  evaluation: z.string().describe("An evaluation of the student's performance based on the transcript, formatted as a study guide."),
});

export async function analyzeSession(input: z.infer<typeof AnalyzeSessionInputSchema>): Promise<z.infer<typeof AnalyzeSessionOutputSchema>> {
  return analyzeSessionFlow(input);
}

const analyzeSessionFlow = ai.defineFlow(
  {
    name: 'analyzeSessionFlow',
    inputSchema: AnalyzeSessionInputSchema,
    outputSchema: AnalyzeSessionOutputSchema,
  },
  async (input) => {
    // Use a model that can handle audio input, like gemini-2.5-flash.
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: [
        {
          text: `You are an expert English teacher's assistant. Your task is to analyze an audio recording of a teaching session between a teacher and a student. Your goal is to create a detailed "study guide" from the conversation.

          First, transcribe the entire conversation accurately. Label the speakers as "Teacher:" and "Student:".

          Second, using the transcript, generate a comprehensive study guide under the title "Organizing the contents of the class". The primary purpose of this guide is for the student to review what they've learned. It should be well-structured, easy to read with appropriate line breaks, and focus on the core concepts rather than just repeating the transcript. Include the following sections:
          1.  **Learning Topic**: Briefly state the main topic of the lesson (e.g., "Using prepositions 'in', 'on', and 'at'").
          2.  **Key Concepts**: Summarize the main rules or concepts explained by the teacher. Do not just copy sentences; synthesize the information into clear, easy-to-understand points.
          3.  **Q&A Breakdown**: Analyze each question the teacher asks and the student's response. This section should serve as an 'error-correction note'. For each Q&A pair:
              - State the teacher's question.
              - State the student's answer.
              - Evaluate if the answer was correct or incorrect.
              - Provide a brief, clear analysis of the answer, explaining why it was right or wrong.
              - If the answer was incorrect or could be improved, suggest a better alternative.

          Provide your response in a clear, structured format with a "Transcript" section and an "Evaluation" section containing the detailed study guide.`,
        },
        {
          media: {
            url: input.audioDataUri,
          },
        },
      ],
      output: {
        format: 'json',
        schema: AnalyzeSessionOutputSchema,
      }
    });

    if (!output) {
      throw new Error("The model failed to return a valid analysis.");
    }
    return output;
  }
);
