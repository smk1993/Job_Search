import { WorkAuthorizationType } from "@prisma/client";

export const US_AUTH_REQUIRED_PATTERNS: RegExp[] = [
  /no\s+visa\s+sponsor(?:ship)?/i,
  /visa\s+sponsor(?:ship)?\s+(?:not\s+)?(?:available|offered|provided)/i,
  /not\s+able\s+to\s+(?:provide|offer)\s+(?:visa\s+)?sponsor(?:ship)?/i,
  /unable\s+to\s+sponsor/i,
  /does?\s+not\s+sponsor/i,
  /will\s+not\s+sponsor/i,
  /cannot\s+sponsor/i,
  /sponsorship\s+not\s+available/i,
  /must\s+be\s+authorized\s+to\s+work\s+in\s+the\s+u\.?s\.?/i,
  /must\s+be\s+(?:legally\s+)?eligible\s+to\s+work\s+(?:in\s+)?(?:the\s+)?u\.?s\.?/i,
  /authorized\s+to\s+work\s+(?:in\s+)?(?:the\s+)?(?:united\s+states|us|u\.s\.)/i,
  /work\s+authorization\s+(?:in\s+)?(?:the\s+)?u\.?s\.?/i,
  /(?:must\s+have|require[sd]?)\s+(?:valid\s+)?(?:us|u\.s\.)\s+work\s+auth/i,
  /u\.?s\.?\s+citizens?\s+only/i,
  /(?:only|exclusively)\s+(?:hiring|for)\s+u\.?s\.?\s+citizens?/i,
  /must\s+be\s+a\s+u\.?s\.?\s+citizen/i,
  /(?:must\s+have|require[sd]?)\s+(?:a\s+)?(?:green\s+card|ead|employment\s+authorization)/i,
  /\bU\.?S\.?[-\s]only\b/i,
  /\bUnited\s+States[-\s]only\b/i,
  /position\s+is\s+(?:only\s+)?(?:available|open)\s+(?:in\s+)?(?:the\s+)?u\.?s\.?/i,
  /must\s+(?:reside|be\s+located|work)\s+in\s+the\s+(?:united\s+states|u\.?s\.?)/i,
  /(?:active|current)\s+(?:security\s+)?clearance\s+required/i,
  /no\s+(?:c2c|corp.?to.?corp)/i,
  /w2\s+only/i,
];

export function detectUsAuthRequired(description: string): {
  requiresUsAuth: boolean;
  matchedKeywords: string[];
} {
  const matchedKeywords: string[] = [];
  for (const pattern of US_AUTH_REQUIRED_PATTERNS) {
    const match = description.match(pattern);
    if (match) {
      matchedKeywords.push(match[0]);
    }
  }
  return { requiresUsAuth: matchedKeywords.length > 0, matchedKeywords };
}

const CAN_WORK_IN_US = new Set<WorkAuthorizationType>([
  WorkAuthorizationType.CITIZEN,
  WorkAuthorizationType.PERMANENT_RESIDENT,
]);

export function canUserApplyToJob(
  requiresUsAuth: boolean,
  userCountry: string | null,
  userWorkAuth: WorkAuthorizationType | null
): { canApply: boolean; reason: string | null } {
  if (!requiresUsAuth) return { canApply: true, reason: null };
  if (!userCountry || userCountry === "US") return { canApply: true, reason: null };
  if (userWorkAuth && CAN_WORK_IN_US.has(userWorkAuth)) return { canApply: true, reason: null };
  return {
    canApply: false,
    reason:
      userWorkAuth === WorkAuthorizationType.WORK_VISA ||
      userWorkAuth === WorkAuthorizationType.STUDENT_VISA
        ? "This job does not offer visa sponsorship. Your current status likely requires sponsorship."
        : "This job requires US work authorization. Update your work auth settings in your profile.",
  };
}

export function filterByWorkAuth<T extends { id: string; requiresUsAuth: boolean }>(
  jobs: T[],
  userCountry: string | null,
  userWorkAuth: WorkAuthorizationType | null,
  removeBlocked = true
): Array<T & { workAuthStatus: "ok" | "blocked"; workAuthReason: string | null }> {
  const result = jobs.map((job) => {
    const { canApply, reason } = canUserApplyToJob(
      job.requiresUsAuth,
      userCountry,
      userWorkAuth
    );
    return {
      ...job,
      workAuthStatus: (canApply ? "ok" : "blocked") as "ok" | "blocked",
      workAuthReason: reason,
    };
  });
  return removeBlocked ? result.filter((j) => j.workAuthStatus !== "blocked") : result;
}
