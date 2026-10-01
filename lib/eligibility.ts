import type { EligibilityAnswers, EligibilityResult } from "@/types";
import { DONATION_INTERVAL_DAYS, MIN_WEIGHT_KG, MIN_AGE, MAX_AGE } from "./constants";
import { daysBetween, now } from "./utils";

interface EligibilityInput {
  age: number;
  weightKg: number;
  lastDonationDate: string | null;
  answers?: Partial<EligibilityAnswers>;
}

/**
 * Indicative, non-medical eligibility check used only to guide the user.
 * Final eligibility is always decided by qualified staff at the donation centre.
 */
export function checkEligibility({ age, weightKg, lastDonationDate, answers = {} }: EligibilityInput): EligibilityResult {
  const reasons: string[] = [];
  let status: EligibilityResult["status"] = "likely_eligible";
  let daysUntilEligible = 0;

  if (age < MIN_AGE || age > MAX_AGE) {
    status = "consult";
    reasons.push(`Donors are usually between ${MIN_AGE} and ${MAX_AGE} years old.`);
  }
  if (weightKg && weightKg < MIN_WEIGHT_KG) {
    status = "consult";
    reasons.push(`Donors usually weigh at least ${MIN_WEIGHT_KG} kg.`);
  }
  if (lastDonationDate) {
    const since = daysBetween(lastDonationDate, now());
    if (since < DONATION_INTERVAL_DAYS) {
      daysUntilEligible = DONATION_INTERVAL_DAYS - since;
      if (status === "likely_eligible") status = "wait";
      reasons.push(`Your last donation was ${since} days ago. The usual gap is ${DONATION_INTERVAL_DAYS} days.`);
    }
  }
  if (answers.feelingWell === false) {
    status = status === "consult" ? "consult" : "wait";
    reasons.push("Donate only when you feel well on the day.");
  }
  if (answers.recentIllness) {
    status = status === "consult" ? "consult" : "wait";
    reasons.push("A recent fever or infection usually means waiting until you've recovered.");
  }
  if (answers.recentTattoo) {
    status = status === "consult" ? "consult" : "wait";
    reasons.push("Recent tattoos or piercings often need a waiting period.");
  }
  if (answers.recentSurgery) {
    status = "consult";
    reasons.push("Recent surgery needs review by the donation centre's doctor.");
  }
  if (answers.onMedication) {
    status = "consult";
    reasons.push("Some medicines affect eligibility. Tell the screening staff what you take.");
  }
  if (answers.pregnantOrNursing) {
    status = "consult";
    reasons.push("Pregnancy and breastfeeding usually defer donation.");
  }

  return { status, daysUntilEligible, reasons };
}

export const ELIGIBILITY_DISCLAIMER =
  "This is a guide, not a medical assessment. Staff at the donation centre make the final decision after a short health screening.";
