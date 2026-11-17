import { buildType } from "./build";
import { elemTypes } from "./data-elem";
import { teenTypes } from "./data-teen";
import { adultTypes } from "./data-adult";
import { workTypes } from "./data-work";
import type { Audience, AudienceId } from "./types";

export const AUDIENCES: Audience[] = [
  {
    id: "elem",
    name: "초등학생",
    short: "초등",
    tagline: "초성·넌센스·이모지·속담으로 깔깔깔",
    tone: "butter",
    mascot: "owl",
    cheer: { start: "준비됐나요? 다 같이 시작!", hint: "힌트가 나왔어요! 다시 생각해 봐요.", correct: "짜잔! 정답은요…", end: "모두 정말 잘했어요! 박수 짝짝짝!" },
    types: elemTypes.map(buildType),
  },
  {
    id: "teen",
    name: "중·고등학생",
    short: "중고등",
    tagline: "교과 상식·사자성어·디지털 리터러시",
    tone: "mint",
    mascot: "fox",
    cheer: { start: "가볍게 몸풀기 가 보자!", hint: "힌트 떴다! 아직 늦지 않았어.", correct: "정답 공개!", end: "수고했어! 오늘 MVP는 누구?" },
    types: teenTypes.map(buildType),
  },
  {
    id: "adult",
    name: "대학생·성인 수강생",
    short: "성인",
    tagline: "AI 개념·컴퓨터 상식·IT 용어·단축키",
    tone: "lavender",
    mascot: "cat",
    cheer: { start: "강의 전 워밍업, 시작해 볼까요?", hint: "힌트가 열렸어요.", correct: "정답과 해설을 확인해 보세요.", end: "수고하셨어요! 헷갈린 개념은 복습해요." },
    types: adultTypes.map(buildType),
  },
  {
    id: "work",
    name: "직장인 연수",
    short: "직장인",
    tagline: "업무 AI·보안 상식·비즈니스 용어·아이스브레이킹",
    tone: "peach",
    mascot: "bear",
    cheer: { start: "연수 시작 전, 가볍게 몸 풀어 볼까요?", hint: "힌트를 확인해 보세요.", correct: "정답을 공개합니다!", end: "함께해 주셔서 감사합니다!" },
    types: workTypes.map(buildType),
  },
];

export function getAudience(id: AudienceId) {
  return AUDIENCES.find((a) => a.id === id)!;
}
