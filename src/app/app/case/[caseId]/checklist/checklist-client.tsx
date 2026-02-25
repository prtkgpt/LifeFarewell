"use client";

import { useOptimistic, useTransition } from "react";
import { updateChecklistItem } from "@/lib/actions/case";
import { formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Clock,
  SkipForward,
  AlertCircle,
  ListChecks,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type ChecklistItemData = {
  id: string;
  caseId: string | null;
  planId: string | null;
  scopeType: string;
  title: string;
  description: string | null;
  category: string | null;
  sortOrder: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  immediate: "Immediate (Within 24 Hours)",
  first_week: "First Week",
  first_month: "First Month",
  ongoing: "Ongoing",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  immediate: "Time-sensitive tasks that need attention right away",
  first_week: "Important tasks to address in the coming days",
  first_month: "Tasks to complete within the next few weeks",
  ongoing: "Recurring or long-term tasks to keep track of",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  immediate: <AlertCircle className="h-5 w-5 text-red-500" />,
  first_week: <Clock className="h-5 w-5 text-amber-500" />,
  first_month: <CalendarDays className="h-5 w-5 text-blue-500" />,
  ongoing: <ListChecks className="h-5 w-5 text-stone-500" />,
};

const CATEGORY_ORDER = ["immediate", "first_week", "first_month", "ongoing"];

const STATUS_CONFIG: Record<
  string,
  {
    variant: "success" | "warning" | "secondary" | "outline";
    label: string;
    icon: React.ReactNode;
  }
> = {
  NOT_STARTED: {
    variant: "secondary",
    label: "Not Started",
    icon: <Circle className="h-3 w-3" />,
  },
  IN_PROGRESS: {
    variant: "warning",
    label: "In Progress",
    icon: <Clock className="h-3 w-3" />,
  },
  COMPLETED: {
    variant: "success",
    label: "Completed",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  SKIPPED: {
    variant: "outline",
    label: "Skipped",
    icon: <SkipForward className="h-3 w-3" />,
  },
};

export function ChecklistClient({
  caseId,
  items: initialItems,
}: {
  caseId: string;
  items: ChecklistItemData[];
}) {
  const [optimisticItems, setOptimisticItems] = useOptimistic(
    initialItems,
    (state, update: { id: string; status: ChecklistItemData["status"] }) =>
      state.map((item) =>
        item.id === update.id ? { ...item, status: update.status } : item
      )
  );

  const [, startTransition] = useTransition();

  const completedCount = optimisticItems.filter(
    (i) => i.status === "COMPLETED"
  ).length;
  const totalCount = optimisticItems.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group by category
  const grouped = optimisticItems.reduce(
    (acc, item) => {
      const cat = item.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItemData[]>
  );

  // Sort categories
  const sortedCategories = CATEGORY_ORDER.filter((c) => grouped[c]);
  for (const c of Object.keys(grouped)) {
    if (!sortedCategories.includes(c)) {
      sortedCategories.push(c);
    }
  }

  function handleToggle(item: ChecklistItemData) {
    const newStatus: ChecklistItemData["status"] =
      item.status === "COMPLETED" ? "NOT_STARTED" : "COMPLETED";

    startTransition(async () => {
      setOptimisticItems({ id: item.id, status: newStatus });
      await updateChecklistItem(item.id, newStatus);
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Checklist</h1>
        <p className="mt-1 text-stone-500">
          Track important tasks and deadlines for this case
        </p>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-stone-900">
                Overall Progress
              </h2>
              <Badge variant={progressPercent === 100 ? "success" : "secondary"}>
                {completedCount} of {totalCount}
              </Badge>
            </div>
            <span className="text-lg font-bold text-stone-900">
              {progressPercent}%
            </span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          {progressPercent === 100 && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              All tasks complete. Great work.
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-16 text-center">
          <ListChecks className="mx-auto h-12 w-12 text-stone-300" />
          <h2 className="mt-4 text-lg font-semibold text-stone-700">
            No checklist items yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
            Checklist items will be generated by the concierge agent based on
            your case needs. Visit the Concierge Console to get started.
          </p>
        </div>
      )}

      {/* Category sections */}
      <div className="space-y-8">
        {sortedCategories.map((category) => {
          const categoryItems = grouped[category];
          if (!categoryItems || categoryItems.length === 0) return null;

          const catCompleted = categoryItems.filter(
            (i) => i.status === "COMPLETED"
          ).length;
          const catTotal = categoryItems.length;

          return (
            <section key={category}>
              {/* Category header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {CATEGORY_ICONS[category] ?? (
                    <ListChecks className="h-5 w-5 text-stone-400" />
                  )}
                  <div>
                    <h2 className="text-base font-semibold text-stone-900">
                      {CATEGORY_LABELS[category] ?? category}
                    </h2>
                    {CATEGORY_DESCRIPTIONS[category] && (
                      <p className="text-xs text-stone-500">
                        {CATEGORY_DESCRIPTIONS[category]}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium text-stone-400">
                  {catCompleted}/{catTotal} done
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {categoryItems.map((item) => {
                  const isCompleted = item.status === "COMPLETED";
                  const isSkipped = item.status === "SKIPPED";
                  const statusConfig = STATUS_CONFIG[item.status];
                  const isDue =
                    item.dueDate &&
                    !isCompleted &&
                    !isSkipped &&
                    new Date(item.dueDate) < new Date();

                  return (
                    <div
                      key={item.id}
                      className={`group rounded-xl border bg-white p-4 transition-all hover:shadow-sm ${
                        isCompleted
                          ? "border-emerald-200 bg-emerald-50/30"
                          : isDue
                            ? "border-red-200 bg-red-50/30"
                            : "border-stone-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggle(item)}
                          className="mt-0.5 shrink-0 focus:outline-none"
                          aria-label={
                            isCompleted
                              ? `Mark "${item.title}" as not started`
                              : `Mark "${item.title}" as completed`
                          }
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 transition-colors group-hover:text-emerald-700" />
                          ) : (
                            <Circle className="h-5 w-5 text-stone-300 transition-colors group-hover:text-stone-500" />
                          )}
                        </button>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3
                                className={`text-sm font-medium ${
                                  isCompleted
                                    ? "text-stone-500 line-through"
                                    : "text-stone-900"
                                }`}
                              >
                                {item.title}
                              </h3>
                              {item.description && (
                                <p
                                  className={`mt-0.5 text-xs ${
                                    isCompleted
                                      ? "text-stone-400"
                                      : "text-stone-500"
                                  }`}
                                >
                                  {item.description}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {statusConfig && (
                                <Badge
                                  variant={statusConfig.variant}
                                  className="gap-1"
                                >
                                  {statusConfig.icon}
                                  {statusConfig.label}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Due date */}
                          {item.dueDate && (
                            <div
                              className={`mt-2 inline-flex items-center gap-1 text-xs ${
                                isDue
                                  ? "font-medium text-red-600"
                                  : isCompleted
                                    ? "text-stone-400"
                                    : "text-stone-500"
                              }`}
                            >
                              <CalendarDays className="h-3 w-3" />
                              {isDue ? "Overdue: " : "Due: "}
                              {formatDate(item.dueDate)}
                            </div>
                          )}

                          {/* Completed timestamp */}
                          {item.completedAt && (
                            <p className="mt-1 text-[10px] text-stone-400">
                              Completed {formatDate(item.completedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
