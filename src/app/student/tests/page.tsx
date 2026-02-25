"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Star,
  AlertCircle,
  BookOpen,
  CheckCircle,
  Lightbulb,
  Map,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function ImprovementBadge({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-xs text-slate-400">First attempt</span>;
  if (value > 0)
    return (
      <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-semibold">
        <TrendingUp className="w-3.5 h-3.5" />+{value}%
      </span>
    );
  if (value < 0)
    return (
      <span className="flex items-center gap-0.5 text-red-600 text-xs font-semibold">
        <TrendingDown className="w-3.5 h-3.5" />
        {value}%
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-slate-500 text-xs font-semibold">
      <Minus className="w-3.5 h-3.5" />
      No change
    </span>
  );
}

function GradeBadge({ pct }: { pct: number }) {
  const config =
    pct >= 90
      ? { grade: "A+", bg: "bg-emerald-500", text: "text-white" }
      : pct >= 80
        ? { grade: "A", bg: "bg-green-500", text: "text-white" }
        : pct >= 70
          ? { grade: "B", bg: "bg-blue-500", text: "text-white" }
          : pct >= 60
            ? { grade: "C", bg: "bg-amber-500", text: "text-white" }
            : pct >= 50
              ? { grade: "D", bg: "bg-orange-500", text: "text-white" }
              : { grade: "F", bg: "bg-red-500", text: "text-white" };

  return (
    <div
      className={`w-9 h-9 rounded-xl ${config.bg} ${config.text} flex items-center justify-center font-bold text-sm flex-shrink-0`}
    >
      {config.grade}
    </div>
  );
}

export default function StudentTestsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    fetch("/api/student/tests")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const results = (data?.results ?? []).filter(
    (r: any) => filter === "all" || r.tests?.type === filter,
  );

  const summary = data?.summary;

  return (
    <div className="w-full max-w-5xl mx-auto md:p-8 p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100/50">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
          </div>
          My Test Results
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-2 tracking-wide">
          View all your test results with rankings and improvement trends
        </p>
      </div>

      {/* Summary */}
      {!loading && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-[20px] p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
              <ClipboardList className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{summary.avgPercentage}%</p>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-1.5">Average Score</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 rounded-[20px] p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
              <Trophy className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">
              {summary.bestRank ? `#${summary.bestRank}` : "—"}
            </p>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-1.5">Best Rank</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 rounded-[20px] p-5 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
              <Star className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{summary.totalTests}</p>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-1.5">Tests Taken</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2.5 flex-wrap">
        {["all", "weekly", "monthly", "unit", "annual", "practice"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all duration-300 ${filter === t
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-white rounded-[20px] border border-slate-100 shadow-sm animate-pulse"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 py-20 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 z-0"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-4 shadow-sm border border-slate-100">
              <ClipboardList className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">No Results Found</h3>
            <p className="text-sm font-medium text-slate-500 mt-1 max-w-sm">When you complete tests, your graded results and analytics will appear right here.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r: any) => {
            const pct = r.percentage ?? 0;
            const barWidth = Math.min(pct, 100);
            const barColor =
              pct >= 80
                ? "bg-emerald-500"
                : pct >= 60
                  ? "bg-amber-500"
                  : "bg-red-500";
            const testDate = r.tests?.test_date
              ? new Date(r.tests.test_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
              : "";
            const typeBg: Record<string, string> = {
              weekly: "bg-blue-100 text-blue-700",
              monthly: "bg-purple-100 text-purple-700",
              unit: "bg-green-100 text-green-700",
              annual: "bg-red-100 text-red-700",
              practice: "bg-slate-100 text-slate-700",
            };

            return (
              <div
                key={r.id}
                className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-5 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <GradeBadge pct={pct} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-base font-bold text-slate-800 tracking-tight">
                          {r.tests?.test_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            {r.tests?.subject}
                          </span>
                          {r.tests?.type && (
                            <span
                              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${typeBg[r.tests.type] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {r.tests.type}
                            </span>
                          )}
                          {testDate && (
                            <>
                              <span className="w-1 h-1 bg-slate-300 rounded-full" />
                              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                {testDate}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-black text-slate-800 tracking-tighter">
                          {r.marks_obtained}
                          <span className="text-sm font-semibold text-slate-400">
                            /{r.tests?.total_marks}
                          </span>
                        </p>
                        <p className="text-xs font-bold tracking-widest text-slate-400 mt-0.5">{pct}%</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-1000`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <ImprovementBadge value={r.improvement} />
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
                          {r.paper_url && (
                            <a
                              href={r.paper_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold uppercase tracking-widest bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors whitespace-nowrap"
                            >
                              <BookOpen className="w-3.5 h-3.5" /> Question Paper
                            </a>
                          )}
                          {r.answer_sheet_path && (
                            <a
                              href={r.answer_sheet_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors whitespace-nowrap"
                            >
                              <ClipboardList className="w-3.5 h-3.5" /> Your Answer Sheet
                            </a>
                          )}
                          {r.rank && (
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full flex items-center gap-1 border border-amber-100 whitespace-nowrap">
                              <Trophy className="w-3.5 h-3.5" />
                              Rank {r.rank}
                            </span>
                          )}
                        </div>

                        {(r.strong_areas || r.weak_topics || r.teacher_suggestions || r.improvement_plan || r.remarks) && (
                          <button
                            onClick={() => toggleCard(r.id)}
                            className={`w-full sm:w-auto text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-colors border ${expandedCards[r.id]
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                          >
                            Details
                            {expandedCards[r.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Qualitative Feedback Loop */}
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${expandedCards[r.id] ? 'grid-rows-[1fr] opacity-100 mt-5' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
                        }`}
                    >
                      <div className="overflow-hidden">
                        {(r.strong_areas ||
                          r.weak_topics ||
                          r.improvement_plan) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                              {r.strong_areas && (
                                <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-[14px] border border-emerald-100/50">
                                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                  <div className="text-xs">
                                    <p className="font-bold text-emerald-800 uppercase tracking-widest text-[9px] mb-1">
                                      Strong Areas
                                    </p>
                                    <p className="text-emerald-700 font-medium leading-relaxed">
                                      {r.strong_areas}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {r.weak_topics && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-[14px] border border-red-100/50">
                                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                  <div className="text-xs">
                                    <p className="font-bold text-red-800 uppercase tracking-widest text-[9px] mb-1">
                                      Needs Work
                                    </p>
                                    <p className="text-red-700 font-medium leading-relaxed">{r.weak_topics}</p>
                                  </div>
                                </div>
                              )}
                              {r.teacher_suggestions && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-[14px] border border-amber-100/50">
                                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <div className="text-xs">
                                    <p className="font-bold text-amber-800 uppercase tracking-widest text-[9px] mb-1">
                                      Teacher's Advice
                                    </p>
                                    <p className="text-amber-700 font-medium leading-relaxed">
                                      {r.teacher_suggestions}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {r.improvement_plan && (
                                <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-[14px] border border-indigo-100/50">
                                  <Map className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                                  <div className="text-xs">
                                    <p className="font-bold text-indigo-800 uppercase tracking-widest text-[9px] mb-1">
                                      Action Plan
                                    </p>
                                    <p className="text-indigo-700 font-medium leading-relaxed">
                                      {r.improvement_plan}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                        {r.remarks && (
                          <div className={`text-[11px] font-bold text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed ${(r.strong_areas || r.weak_topics || r.teacher_suggestions || r.improvement_plan) ? 'mt-4' : 'mt-4 border-t border-slate-100 pt-4'}`}>
                            <span className="text-slate-400">Teacher Remarks:</span> {r.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
