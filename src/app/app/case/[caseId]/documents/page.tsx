import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import {
  FileText,
  Upload,
  FileCheck,
  FileClock,
  Shield,
  Receipt,
  ClipboardList,
  Heart,
} from "lucide-react";

const expectedDocuments = [
  {
    title: "Death Certificate",
    description: "Official certificate from the county or state",
    icon: FileCheck,
    category: "Legal",
    required: true,
  },
  {
    title: "Insurance Policy",
    description: "Life insurance or burial insurance documents",
    icon: Shield,
    category: "Financial",
    required: false,
  },
  {
    title: "Funeral Home Contract",
    description: "Service agreement with the funeral provider",
    icon: Receipt,
    category: "Services",
    required: false,
  },
  {
    title: "Obituary Draft",
    description: "Written obituary for publication",
    icon: ClipboardList,
    category: "Personal",
    required: false,
  },
  {
    title: "Veterans Discharge Papers (DD-214)",
    description: "If applicable, for military honors",
    icon: FileText,
    category: "Legal",
    required: false,
  },
  {
    title: "Pre-Need Arrangement Documents",
    description: "Any pre-arranged funeral plans or trusts",
    icon: FileClock,
    category: "Financial",
    required: false,
  },
  {
    title: "Social Security Information",
    description: "Social Security number and documentation",
    icon: FileText,
    category: "Legal",
    required: true,
  },
  {
    title: "Personal Wishes / Directives",
    description: "Any documented wishes of the deceased",
    icon: Heart,
    category: "Personal",
    required: false,
  },
];

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const { caseId } = await params;

  const caseData = await prisma.case.findFirst({
    where: { id: caseId, userId: session.user.id },
    include: {
      checklistItems: {
        where: {
          category: "documents",
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!caseData) notFound();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Documents</h1>
        <p className="mt-1 text-sm text-stone-500">
          Track and manage important documents for this case
        </p>
      </div>

      {/* Upload area */}
      <div className="mb-8 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center transition-colors hover:border-stone-400">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Upload className="h-6 w-6 text-stone-400" />
        </div>
        <h3 className="font-semibold text-stone-700">Upload Documents</h3>
        <p className="mt-1 text-sm text-stone-500">
          Drag and drop files here, or click to browse
        </p>
        <p className="mt-2 text-xs text-stone-400">
          PDF, JPG, PNG up to 10MB each
        </p>
        <button
          disabled
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-200 px-5 py-2.5 text-sm font-medium text-stone-500 cursor-not-allowed"
        >
          <Upload className="h-4 w-4" />
          Browse Files
        </button>
        <p className="mt-3 text-xs text-amber-600 font-medium">
          Document upload coming soon
        </p>
      </div>

      {/* Expected documents */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-stone-900">
          Expected Documents
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {expectedDocuments.map((doc) => (
            <div
              key={doc.title}
              className="flex items-start gap-4 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-stone-300"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100">
                <doc.icon className="h-5 w-5 text-stone-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-stone-900">
                    {doc.title}
                  </h3>
                  {doc.required && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Required
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-stone-500">
                  {doc.description}
                </p>
                <span className="mt-1.5 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
                  {doc.category}
                </span>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                <div className="h-5 w-5 rounded-full border-2 border-stone-300" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist-sourced documents */}
      {caseData.checklistItems.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-stone-900">
            From Your Checklist
          </h2>
          <div className="space-y-2">
            {caseData.checklistItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <div
                  className={`h-3 w-3 rounded-full ${
                    item.status === "COMPLETED"
                      ? "bg-emerald-500"
                      : item.status === "IN_PROGRESS"
                      ? "bg-amber-500"
                      : "bg-stone-300"
                  }`}
                />
                <span className="text-sm text-stone-700">{item.title}</span>
                <span className="ml-auto text-xs capitalize text-stone-400">
                  {item.status.toLowerCase().replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
