import { NextRequest, NextResponse } from "next/server";
import {
  updateContributionStatus,
  deleteContribution,
  findContributionById,
} from "@/lib/mock-data";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { status } = body;

    if (
      !status ||
      !["draft", "pending", "published", "rejected"].includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid status is required (draft, pending, published, rejected)",
        },
        { status: 400 }
      );
    }

    const success = updateContributionStatus(id, status);

    if (!success) {
      return NextResponse.json(
        { error: "Contribution not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contribution status updated successfully",
    });
  } catch (error) {
    console.error("Error updating contribution:", error);
    return NextResponse.json(
      { error: "Failed to update contribution" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const success = deleteContribution(id);

    if (!success) {
      return NextResponse.json(
        { error: "Contribution not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contribution deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting contribution:", error);
    return NextResponse.json(
      { error: "Failed to delete contribution" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const contribution = findContributionById(id);

    if (!contribution) {
      return NextResponse.json(
        { error: "Contribution not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: contribution,
    });
  } catch (error) {
    console.error("Error fetching contribution:", error);
    return NextResponse.json(
      { error: "Failed to fetch contribution" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
