export interface FaqItem { id: string; q: string; a: string }
export interface FaqGroup { id: string; title: string; items: FaqItem[] }

export const faqGroups: FaqGroup[] = [
  {
    id: "eligibility",
    title: "Eligibility",
    items: [
      { id: "who", q: "Who can donate blood?", a: "Most healthy adults aged 18 to 60 who weigh at least 50 kg can donate. The donation centre does a short health check — blood pressure, haemoglobin and a few questions — before every donation, and their decision is final." },
      { id: "gap", q: "How often can I donate?", a: "Whole blood can usually be donated every 3 months (90 days). Qatra reminds you when you are likely eligible again, but the centre confirms it on the day." },
      { id: "defer", q: "What might stop me donating for a while?", a: "Common reasons include a recent fever or infection, a new tattoo or piercing, recent surgery, some medicines, pregnancy or breastfeeding, and low haemoglobin. Most of these are temporary." },
    ],
  },
  {
    id: "requests",
    title: "Requesting blood",
    items: [
      { id: "how-request", q: "How do I request blood for a patient?", a: "Create a request with the patient's blood group, units needed, hospital and the time it's needed by. We alert compatible donors near that hospital and show the request on the public board." },
      { id: "emergency", q: "What counts as an emergency request?", a: "Use Emergency when blood is needed within hours — trauma, severe bleeding or surgery that can't wait. Emergency requests alert nearby donors immediately and are reviewed by our coordinators." },
      { id: "cost", q: "Does Qatra charge for blood?", a: "No. Qatra is free for donors and patients. Hospitals and blood banks may charge standard processing and screening fees." },
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    items: [
      { id: "address", q: "Can people see where I live?", a: "No. Your home address is never shown. Other users see only your city, area and an approximate distance, such as \"2.4 km away\"." },
      { id: "phone", q: "Who can see my phone number?", a: "Nobody, by default. When someone asks you to donate, you get a notification and choose whether to share your number with that requester." },
      { id: "hide", q: "Can I stop appearing in donor searches?", a: "Yes. Turn off donor visibility in Settings, or set yourself as unavailable. You can switch back at any time." },
    ],
  },
];
