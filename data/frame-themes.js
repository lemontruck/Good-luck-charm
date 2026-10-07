/**
 * 부적 틀 테마 설정
 * - 이미지: assets/frames/{id}/{운세id}.webp   (운세id: money love people daily job study)
 * - size: 틀 이미지 픽셀 크기(비율만 사용). 카드 좌표는 가로 1080 기준, 세로 = 1080 × 세로/가로
 * - area: 스티커 자동 배치 범위 { y: [위, 아래], xk: 가로 폭 비율, sk: 스티커 크기 비율 }
 * - text: 날짜(sub)·한 줄 문장(foot) 위치 [y, 글자 크기, (최대 폭)]
 * - colors: 운세별 글자색(ink)과 글자 테두리색(paper, 틀 종이색)
 * 첫 번째 테마가 기본값이며, 다른 테마에 없는 운세는 첫 번째 테마 틀을 씀
 */
window.FRAME_THEMES = [
  {
    id: "y2k", name: "Y2K 팝",
    fortunes: ["money", "love", "people", "daily", "job", "study"],      // 이미지가 있는 운세
    size: [941, 1672],                                 // 틀 이미지 비율 → 카드 1080×1919
    area: { y: [760, 1520], xk: 1, sk: 1 },            // 스티커 자리(세로 범위), 가로 폭 비율, 스티커 크기 비율
    text: { sub: [585, 42], foot: [1790, 36, 820] },   // [y, 글자 크기, (최대 폭)] — 카드 좌표 기준
    colors: {                                          // ink: 글자색, paper: 글자 뒤 테두리색(틀 종이색)
      money: { ink: "#4E8A3A", paper: "#FDEFB4" }, love: { ink: "#D9506F", paper: "#FAE2D7" },
      people: { ink: "#23946F", paper: "#E5F2DF" }, daily: { ink: "#D95E6E", paper: "#F9DED3" },
      job: { ink: "#5E57B0", paper: "#E5DCF0" }, study: { ink: "#3478C4", paper: "#F8EDDF" },
    },
  },
  {
    id: "retro", name: "레트로",
    fortunes: ["money", "love", "people", "daily", "job", "study"],
    size: [1024, 1536],                                // → 카드 1080×1620
    area: { y: [640, 1230], xk: 0.9, sk: 0.88 },
    text: { sub: [556, 40], foot: [1398, 30, 620] },
    colors: {
      money: { ink: "#3D7337", paper: "#F2E6C9" }, love: { ink: "#C2445A", paper: "#F5E6D3" },
      people: { ink: "#2D6A50", paper: "#F2E6CB" }, daily: { ink: "#BE3A4D", paper: "#F4E6D2" },
      job: { ink: "#5A4592", paper: "#F2E7D2" }, study: { ink: "#2E5AA3", paper: "#F2E7D1" },
    },
  },
  {
    id: "doodle", name: "두들",
    fortunes: ["money", "love", "people", "daily", "job", "study"],
    size: [1024, 1536],                                // → 카드 1080×1620
    area: { y: [700, 1300], xk: 0.92, sk: 0.88 },
    text: { sub: [528, 40], foot: [1462, 32, 700] },
    colors: {
      money: { ink: "#2F7A3F", paper: "#FAF4E6" }, love: { ink: "#D03F5E", paper: "#FAF4E6" },
      people: { ink: "#22805C", paper: "#FAF4E6" }, daily: { ink: "#D2455E", paper: "#FAF4E6" },
      job: { ink: "#5847A0", paper: "#FAF4E6" }, study: { ink: "#2C5EAF", paper: "#FAF4E6" },
    },
  },
];
