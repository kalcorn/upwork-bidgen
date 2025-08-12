import { JobData } from '../core/UpWorkAPI';

export interface AIGenerator {
  generateScreeningAnswers(
    jobData: JobData,
    questions: Array<{id?: string, question?: string, required?: boolean}>
  ): Promise<{success: boolean, answers?: Array<{question: string, answer: string}>, error?: string}>;
}