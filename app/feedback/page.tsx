import FeedbackSurvey from '@/components/FeedbackSurvey';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Swole Squad — Debrief',
  description: 'Two minutes of feedback from the squad.',
};

export default function FeedbackPage() {
  return <FeedbackSurvey />;
}
