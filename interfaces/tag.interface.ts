import { ObjectId } from 'mongodb';

/**
 * @requirement REQ-104
 * Expense tag — a creatable, archivable label attachable to pending-expense
 * line items and used to filter the expense list/report.
 */
export interface ITag {
  _id: ObjectId;
  name: string;
  slug: string;
  archivedAt?: Date;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTagDTO {
  name: string;
  createdBy: string;
}
