export type Language = "tr" | "en";

export type ApiError = { code: string; message: string; status: number };

export type FeedItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  descriptionPreview: string;
  language: Language;
  status: string;
  authorDisplay: string;
  createdAt: string;
  commentCount: number;
  imageUrls: string[];
};
