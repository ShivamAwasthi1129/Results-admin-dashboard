import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDocumentType {
  type: string;
  label: string;
  required: boolean;
}

export interface ICategoryDocumentRequirement {
  _id?: string;
  category: string;
  categoryLabel: string;
  documents: IDocumentType[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICategoryDocumentRequirementDocument extends Omit<ICategoryDocumentRequirement, '_id'>, Document {}

const DocumentTypeSchema = new Schema({
  type: { type: String, required: true },
  label: { type: String, required: true },
  required: { type: Boolean, default: true },
});

const CategoryDocumentRequirementSchema = new Schema<ICategoryDocumentRequirementDocument>(
  {
    category: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    categoryLabel: {
      type: String,
      required: true,
      trim: true,
    },
    documents: [DocumentTypeSchema],
  },
  {
    timestamps: true,
    collection: 'category_document_requirements',
  }
);

const CategoryDocumentRequirement: Model<ICategoryDocumentRequirementDocument> =
  mongoose.models.CategoryDocumentRequirement ||
  mongoose.model<ICategoryDocumentRequirementDocument>('CategoryDocumentRequirement', CategoryDocumentRequirementSchema);

export default CategoryDocumentRequirement;

