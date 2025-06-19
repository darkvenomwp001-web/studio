import { config } from 'dotenv';
config();

import '@/ai/flows/generate-story-outline.ts';
import '@/ai/flows/detect-plagiarism-flow.ts';
import '@/ai/flows/improve-writing-style.ts';