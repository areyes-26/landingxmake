import { freeTemplate } from "./freeTemplate";
import { basicTemplate } from "./basicTemplate";
import { proTemplate } from "./proTemplate";

export type PlanType = "free" | "basic" | "pro";

export function getTemplateByPlan(plan: PlanType) {
  switch (plan) {
    case "basic":
      return basicTemplate;
    case "pro":
      return proTemplate;
    case "free":
    default:
      return freeTemplate;
  }
} 