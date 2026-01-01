// Quick local smoke runner (node/ts-node or tsx)
import { buildEmpathicAnswer } from "../src/utils/empathyEngine";

const samples = [
  {
    name: "LUNAR",
    birth: { year: 1996, month: 1, day: 21, calendar: "lunar" as const, leapMonth: false },
    question: "출생정보를 음력으로 넣었는데 별자리는 어떻게 잡아?",
    cards: ["The Star", "Temperance", "The World"],
    baseReading: "큰 흐름은 조절과 통합이야. 급하게 결론 내리기보단 균형을 잡아가는 편이 좋아.",
    env: { weather: "비", location: "Seoul", timestamp: Date.now() },
    seedKey: "sample-lunar",
  },

  {
    name: "A",
    birth: { year: 1998, month: 12, day: 27, calendar: "solar" as const },
    question: "요즘 일이 너무 답답하고 이직 타이밍이 맞는지 모르겠어",
    cards: ["The Hermit", "Two of Wands", "Queen of Pentacles"],
    baseReading: "지금은 혼자 정리하는 시간이 필요하고, 선택지를 넓혀본 뒤 현실적인 기준으로 결정하는 흐름이야.",
    env: { weather: "흐림", location: "Seoul", timestamp: Date.now() },
    seedKey: "sample-1",
  },
  {
    name: "B",
    birth: { year: 2001, month: 6, day: 10, calendar: "solar" as const },
    question: "연락이 끊긴 사람, 다시 연락 올까?",
    cards: ["Six of Cups", "Page of Cups", "Two of Swords"],
    baseReading: "추억과 감정은 살아있지만, 현재는 결정을 미루는 모습이 강해. 먼저 기준을 세우는 게 포인트.",
    env: { weather: "맑음", location: "Busan", timestamp: Date.now() },
    seedKey: "sample-2",
  },
];

for (const s of samples) {
  const { text, meta } = buildEmpathicAnswer(s as any);
  console.log("\n====================");
  console.log(text);
  console.log("META:", meta);
}
