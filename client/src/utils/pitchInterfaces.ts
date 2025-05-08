import { PitchStatus } from "./pitchStage";

export interface Publication {
  id: number;
  name: string;
  logo?: string;
}

export interface Opportunity {
  id: number;
  title: string;
  publicationId: number;
  outlet?: string;
  publication?: Publication;
}

export interface PitchDTO {
  id: number;
  userId: number;
  opportunityId: number;
  content: string;
  bidAmount: number;
  status: PitchStatus;
  createdAt: string;
  updatedAt?: string;
  adminNotes?: string;
  paymentIntentId?: string | null;
  article?: {
    title?: string;
    url: string;
  };
  opportunity?: Opportunity;
  publication?: Publication;
  isDraft?: boolean;
  pitchType?: string;
  needsFollowUp?: boolean;
}

export interface PitchMessage {
  id: number;
  pitchId: number;
  senderId: number;
  isAdmin: boolean;
  message: string;
  createdAt: string;
  isRead: boolean;
  senderName?: string; // Additional fields that might be joined from users
  senderAvatar?: string; // Additional fields that might be joined from users
}