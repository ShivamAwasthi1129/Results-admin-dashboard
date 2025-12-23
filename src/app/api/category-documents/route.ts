import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CategoryDocumentRequirement from '@/models/CategoryDocumentRequirement';
import { verifyAuth, canPerform } from '@/lib/auth';
import { CATEGORY_DOCUMENTS, SERVICE_CATEGORIES } from '@/lib/constants/usa';

// GET - Get all category document requirements or by category
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // If requesting a specific category
    if (category) {
      let requirement = await CategoryDocumentRequirement.findOne({ category: category.toLowerCase() });
      
      // If not in database, return from static constants
      if (!requirement) {
        const staticDocs = CATEGORY_DOCUMENTS[category.toLowerCase()];
        const categoryInfo = SERVICE_CATEGORIES.find(c => c.value === category.toLowerCase());
        if (staticDocs) {
          return NextResponse.json({
            success: true,
            data: {
              category: category.toLowerCase(),
              categoryLabel: categoryInfo?.label || category,
              documents: staticDocs,
              isDefault: true,
            },
          });
        }
        return NextResponse.json({
          success: false,
          error: 'Category not found',
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: requirement,
      });
    }

    // Get all from database
    const dbRequirements = await CategoryDocumentRequirement.find().sort({ categoryLabel: 1 });

    // Merge with static categories to ensure all categories are represented
    const allCategories = SERVICE_CATEGORIES.map(cat => {
      const dbReq = dbRequirements.find(r => r.category === cat.value);
      if (dbReq) {
        return dbReq;
      }
      // Return static default if not customized in database
      return {
        category: cat.value,
        categoryLabel: cat.label,
        documents: CATEGORY_DOCUMENTS[cat.value] || [],
        isDefault: true,
      };
    });

    return NextResponse.json({
      success: true,
      data: allCategories,
    });
  } catch (error) {
    console.error('Error fetching category document requirements:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch category document requirements',
    }, { status: 500 });
  }
}

// POST - Create or update category document requirements
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerform(tokenPayload.role, 'manageServiceProviders')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { category, categoryLabel, documents } = body;

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Category is required',
      }, { status: 400 });
    }

    // Validate documents array
    if (!Array.isArray(documents)) {
      return NextResponse.json({
        success: false,
        error: 'Documents must be an array',
      }, { status: 400 });
    }

    // Validate each document entry
    for (const doc of documents) {
      if (!doc.type || !doc.label) {
        return NextResponse.json({
          success: false,
          error: 'Each document must have a type and label',
        }, { status: 400 });
      }
    }

    // Upsert the category document requirements
    const result = await CategoryDocumentRequirement.findOneAndUpdate(
      { category: category.toLowerCase() },
      {
        category: category.toLowerCase(),
        categoryLabel: categoryLabel || SERVICE_CATEGORIES.find(c => c.value === category)?.label || category,
        documents,
      },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Category document requirements saved successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error saving category document requirements:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save category document requirements',
    }, { status: 500 });
  }
}

// PUT - Add a new document type to a category
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerform(tokenPayload.role, 'manageServiceProviders')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { category, document: newDoc } = body;

    if (!category || !newDoc || !newDoc.type || !newDoc.label) {
      return NextResponse.json({
        success: false,
        error: 'Category, document type, and label are required',
      }, { status: 400 });
    }

    // Check if category exists in DB
    let requirement = await CategoryDocumentRequirement.findOne({ category: category.toLowerCase() });

    if (!requirement) {
      // Create from static defaults first
      const staticDocs = CATEGORY_DOCUMENTS[category.toLowerCase()] || [];
      const categoryLabel = SERVICE_CATEGORIES.find(c => c.value === category.toLowerCase())?.label || category;
      
      requirement = new CategoryDocumentRequirement({
        category: category.toLowerCase(),
        categoryLabel,
        documents: staticDocs,
      });
    }

    // Check if document type already exists
    const existingDoc = requirement.documents.find(d => d.type === newDoc.type);
    if (existingDoc) {
      return NextResponse.json({
        success: false,
        error: 'Document type already exists in this category',
      }, { status: 400 });
    }

    // Add the new document type
    requirement.documents.push({
      type: newDoc.type,
      label: newDoc.label,
      required: newDoc.required ?? true,
    });

    await requirement.save();

    return NextResponse.json({
      success: true,
      message: 'Document type added successfully',
      data: requirement,
    });
  } catch (error) {
    console.error('Error adding document type:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add document type',
    }, { status: 500 });
  }
}

// DELETE - Remove a document type from a category
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const tokenPayload = await verifyAuth(request);
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerform(tokenPayload.role, 'manageServiceProviders')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const documentType = searchParams.get('documentType');

    if (!category || !documentType) {
      return NextResponse.json({
        success: false,
        error: 'Category and documentType are required',
      }, { status: 400 });
    }

    // Find or create the category document requirements
    let requirement = await CategoryDocumentRequirement.findOne({ category: category.toLowerCase() });

    if (!requirement) {
      // Create from static defaults first
      const staticDocs = CATEGORY_DOCUMENTS[category.toLowerCase()] || [];
      const categoryLabel = SERVICE_CATEGORIES.find(c => c.value === category.toLowerCase())?.label || category;
      
      requirement = new CategoryDocumentRequirement({
        category: category.toLowerCase(),
        categoryLabel,
        documents: staticDocs,
      });
    }

    // Remove the document type
    const docIndex = requirement.documents.findIndex(d => d.type === documentType);
    if (docIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Document type not found in this category',
      }, { status: 404 });
    }

    requirement.documents.splice(docIndex, 1);
    await requirement.save();

    return NextResponse.json({
      success: true,
      message: 'Document type removed successfully',
      data: requirement,
    });
  } catch (error) {
    console.error('Error removing document type:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to remove document type',
    }, { status: 500 });
  }
}

