import { describe, it, expect } from "vitest";
import { buildEmpathicAnswer, toSolarBirth } from "./empathyEngine";

describe("Empathy Engine v7", () => {
  it("is deterministic for same seedKey", () => {
    const input = {
      name: "테스터",
      birth: { year: 2000, month: 1, day: 1, calendar: "solar" as const },
      question: "요즘 너무 불안해서 잠이 안 와",
      cards: ["The Moon", "Nine of Swords", "The Star"],
      baseReading: "기본 리딩 텍스트",
      seedKey: "fixed-seed",
    };

    const a = buildEmpathicAnswer(input);
    const b = buildEmpathicAnswer(input);

    expect(a.text).toBe(b.text);
    expect(a.meta.seed).toBe("fixed-seed");
  });

  it("converts 2nd-person into name honorifics when name exists", () => {
    const { text } = buildEmpathicAnswer({
      name: "하성",
      birth: { year: 2000, month: 1, day: 1, calendar: "solar" },
      question: "너무 지치고, 내가 잘하고 있는지 모르겠어",
      cards: ["Ten of Wands"],
      baseReading: "너는 혼자 다 짊어지고 있어. 이제 내려놔야 해.",
      seedKey: "seed-2p",
    } as any);

    expect(text.includes("하성님")).toBe(true);
    expect(text.includes("너는")).toBe(false);
  });

  it("supports lunar birth to solar conversion when leapMonth is provided", () => {
    // Example from korean-lunar-calendar docs: lunar 1956-01-21 -> solar 1956-03-03
    const { solar, converted } = toSolarBirth({ year: 1956, month: 1, day: 21, calendar: "lunar", leapMonth: false });
    expect(converted).toBe(true);
    expect([solar.year, solar.month, solar.day]).toEqual([1956, 3, 3]);
  });

  it("includes a micro question and stays within western occult belief system", () => {
    const { text, meta } = buildEmpathicAnswer({
      birth: { year: 2000, month: 1, day: 1, calendar: "solar" },
      question: "돈 때문에 압박감이 심해",
      cards: ["Five of Pentacles"],
      seedKey: "seed-micro",
    });

    expect(text.includes("질문 하나만 더:")).toBe(true);
    expect(meta.need).toBeDefined();
    expect(meta.belief_ok).toBe(true);
  });

  it("flags belief violations when saju/shinsal keywords are injected", () => {
    const { meta } = buildEmpathicAnswer({
      birth: { year: 2000, month: 1, day: 1, calendar: "solar" },
      question: "이직 타이밍",
      cards: ["The Chariot"],
      baseReading: "사주로 보면 올해는 이동수가 강하다.",
      seedKey: "seed-guard",
    });

    expect(meta.belief_ok).toBe(false);
    expect(meta.belief_violations && meta.belief_violations.length).toBeTruthy();
  });
});
