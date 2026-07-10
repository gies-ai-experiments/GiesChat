import { Model } from 'mongoose';
import type { IIssueReport } from '~/types';
import issueReportSchema from '~/schema/issueReport';

export function createIssueReportModel(mongoose: typeof import('mongoose')): Model<IIssueReport> {
  return (
    mongoose.models.IssueReport || mongoose.model<IIssueReport>('IssueReport', issueReportSchema)
  );
}
