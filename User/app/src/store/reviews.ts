import { create } from 'zustand';
import { persist, storage } from './persist';

export interface ReviewEntry {
  bookingId: string;
  rating: number;
  text: string;
  createdAt: string;
}

interface ReviewsState {
  reviews: ReviewEntry[];
  submitReview: (entry: Omit<ReviewEntry, 'createdAt'>) => void;
  getReview: (bookingId: string) => ReviewEntry | undefined;
}

export const useReviews = create<ReviewsState>()(
  persist(
    (set, get) => ({
      reviews: [],
      submitReview: (entry) =>
        set((s) => ({
          reviews: [
            ...s.reviews.filter((r) => r.bookingId !== entry.bookingId),
            { ...entry, createdAt: new Date().toISOString() },
          ],
        })),
      getReview: (bookingId) => get().reviews.find((r) => r.bookingId === bookingId),
    }),
    { name: 'teddy-reviews', storage }
  )
);
