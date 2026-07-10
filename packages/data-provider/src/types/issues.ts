export type TSubmitIssueRequest = {
  description: string;
  route?: string;
  userAgent?: string;
  occurredAt?: string;
};

export type TSubmitIssueResponse = {
  reportId: string;
  diagnosis: string;
  confidence: 'low' | 'medium' | 'high';
  evidenceCount: number;
};
