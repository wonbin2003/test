/* =========================================================
   연구용 실험 웹 앱
   기능:
   1. 참가자 정보 입력
   2. 2048 게임 수행
   3. 랜덤 간격 알림 제시
   4. 알림 색상 R/G/B, 중요도 높음/낮음 기록
   5. 사후 회상 설문
   6. CSV 저장
   ========================================================= */

/* ==============================
   실험 설정값
   ============================== */

// 게임 시간: 3분 = 180초
const EXPERIMENT_SECONDS = 10;

// 알림은 5초 동안 화면에 표시
const NOTIFICATION_VISIBLE_MS = 5000;

// 전체 알림 개수
// 색상 3개 x 중요도 2개 x 반복 3회 = 18개
const NOTIFICATION_COUNT = 18;

// 알림 제시 최소/최대 시점
const MIN_NOTIFICATION_TIME = 12;
const MAX_NOTIFICATION_TIME = EXPERIMENT_SECONDS - 15;

/* ==============================
   DOM 요소
   ============================== */

const startScreen = document.getElementById("startScreen");
const experimentScreen = document.getElementById("experimentScreen");
const surveyScreen = document.getElementById("surveyScreen");
const resultScreen = document.getElementById("resultScreen");

const participantForm = document.getElementById("participantForm");
const recallForm = document.getElementById("recallForm");

const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("score");
const boardEl = document.getElementById("board");
const reshuffleBtn = document.getElementById("reshuffleBtn");

const notificationToast = document.getElementById("notificationToast");
const toastImportance = document.getElementById("toastImportance");
const toastMessage = document.getElementById("toastMessage");

const surveyList = document.getElementById("surveyList");
const summaryBox = document.getElementById("summaryBox");

const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const restartBtn = document.getElementById("restartBtn");

/* ==============================
   실험 데이터 저장 변수
   ============================== */

let participantInfo = {};
let notificationSchedule = [];
let shownNotifications = [];
let surveyResponses = {};

let experimentTimer = null;
let experimentStartTime = null;
let remainingSeconds = EXPERIMENT_SECONDS;

/* ==============================
   2048 게임 변수
   ============================== */

let board = [];
let score = 0;
let mergedPositions = [];

let pointerStartX = 0;
let pointerStartY = 0;
let isPointerDown = false;

/* ==============================
   알림 문구 데이터
   ============================== */

const highImportanceMessages = [
  "오늘 18시까지 팀 프로젝트 보고서를 제출해야 합니다.",
  "내일 오전 9시 전공 수업 발표 순서가 변경되었습니다.",
  "장학금 신청 마감이 오늘 자정까지입니다.",
  "교수님 면담 시간이 오늘 14시로 변경되었습니다.",
  "중간고사 시험 강의실이 변경되었습니다.",
  "오늘 17시까지 졸업요건 확인 서류를 제출해야 합니다.",
  "팀 회의가 30분 뒤 시작됩니다.",
  "수강 정정 신청 마감이 오늘까지입니다.",
  "과제 피드백 확인 후 재제출이 필요합니다."
];

const lowImportanceMessages = [
  "학생식당에 새로운 메뉴가 추가되었습니다.",
  "동아리 홍보 부스가 학생회관 앞에서 운영 중입니다.",
  "학교 앱 배경화면이 새롭게 업데이트되었습니다.",
  "도서관 로비에서 사진 전시가 진행 중입니다.",
  "캠퍼스 카페에서 시즌 음료를 판매합니다.",
  "학교 굿즈 온라인 판매가 시작되었습니다.",
  "학생회 SNS 이벤트가 진행 중입니다.",
  "교내 산책로 야간 조명이 개선되었습니다.",
  "이번 주 영화 동아리 상영작이 공개되었습니다."
];

/* ==============================
   화면 전환 함수
   ============================== */

function showScreen(screen) {
  [startScreen, experimentScreen, surveyScreen, resultScreen].forEach((s) => {
    s.classList.remove("active");
  });

  screen.classList.add("active");
}

/* ==============================
   배열 랜덤 섞기 함수
   ============================== */

function shuffleArray(array) {
  return array
    .map((value) => ({ value, random: Math.random() }))
    .sort((a, b) => a.random - b.random)
    .map((item) => item.value);
}

/* ==============================
   참가자 정보 입력 후 실험 시작
   ============================== */

participantForm.addEventListener("submit", (event) => {
  event.preventDefault();

  participantInfo = {
    participantId: document.getElementById("participantId").value.trim(),
    age: document.getElementById("age").value,
    gender: document.getElementById("gender").value,
    experimentDate: new Date().toLocaleString()
  };

  startExperiment();
});

/* ==============================
   실험 시작
   ============================== */

function startExperiment() {
  showScreen(experimentScreen);
  document.body.classList.add("lock-scroll");

  initGame();
  createNotificationSchedule();

  shownNotifications = [];
  surveyResponses = {};

  remainingSeconds = EXPERIMENT_SECONDS;
  experimentStartTime = Date.now();

  updateTimerDisplay();

  experimentTimer = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();

    const elapsedSeconds = EXPERIMENT_SECONDS - remainingSeconds;
    checkNotificationTiming(elapsedSeconds);

    if (remainingSeconds <= 0) {
      endExperiment();
    }
  }, 1000);
}

/* ==============================
   타이머 표시
   ============================== */

function updateTimerDisplay() {
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  timerEl.textContent = `${minutes}:${seconds}`;
}

/* ==============================
   알림 스케줄 생성
   ============================== */

function createNotificationSchedule() {
  const colors = ["red", "green", "blue"];
  const importanceLevels = ["high", "low"];

  let baseConditions = [];

  for (let repeat = 0; repeat < 3; repeat++) {
    colors.forEach((color) => {
      importanceLevels.forEach((importance) => {
        baseConditions.push({
          color,
          importance
        });
      });
    });
  }

  baseConditions = shuffleArray(baseConditions).slice(0, NOTIFICATION_COUNT);

  const randomTimes = [];

  const availableStart = MIN_NOTIFICATION_TIME;
  const availableEnd = MAX_NOTIFICATION_TIME;
  const totalRange = availableEnd - availableStart;
  const interval = Math.floor(totalRange / baseConditions.length);

  for (let i = 0; i < baseConditions.length; i++) {
    const baseTime = availableStart + i * interval;

    // 너무 규칙적으로 나오지 않게 0~4초 정도 흔들림 추가
    const jitter = Math.floor(Math.random() * 5);

    randomTimes.push(Math.min(baseTime + jitter, availableEnd));
  }

  randomTimes.sort((a, b) => a - b);

  notificationSchedule = baseConditions.map((condition, index) => {
    const messagePool =
      condition.importance === "high"
        ? highImportanceMessages
        : lowImportanceMessages;

    return {
      id: `N${String(index + 1).padStart(2, "0")}`,
      color: condition.color,
      importance: condition.importance,
      message: messagePool[index % messagePool.length],
      showAt: randomTimes[index],
      displayed: false
    };
  });
}

/* ==============================
   알림 표시 시점 확인
   ============================== */

function checkNotificationTiming(elapsedSeconds) {
  notificationSchedule.forEach((notification) => {
    if (!notification.displayed && notification.showAt === elapsedSeconds) {
      notification.displayed = true;
      showNotification(notification, elapsedSeconds);
    }
  });
}

/* ==============================
   알림 표시
   ============================== */

function showNotification(notification, elapsedSeconds) {
  notificationToast.className = `notification-toast ${notification.color}`;

  // 중요도 문구는 참가자에게 보이지 않게 숨김
  toastImportance.textContent = "";
  toastImportance.style.display = "none";

  toastMessage.textContent = notification.message;

  notificationToast.classList.remove("hidden");

  shownNotifications.push({
    ...notification,
    shownAtSecond: elapsedSeconds,
    shownAtClock: new Date().toLocaleTimeString()
  });

  setTimeout(() => {
    notificationToast.classList.add("hidden");
  }, NOTIFICATION_VISIBLE_MS);
}

/* ==============================
   실험 종료
   ============================== */

function endExperiment() {
  clearInterval(experimentTimer);
  notificationToast.classList.add("hidden");

  document.body.classList.remove("lock-scroll");

  createRecallSurvey();
  showScreen(surveyScreen);
}

/* =========================================================
   2048 게임 구현
   ========================================================= */

function initGame() {
  board = Array.from({ length: 4 }, () => Array(4).fill(0));
  score = 0;
  mergedPositions = [];

  addRandomTile();
  addRandomTile();

  renderBoard();
}

function renderBoard() {
  boardEl.innerHTML = "";

  board.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const tile = document.createElement("div");
      tile.classList.add("tile");

      if (value > 0) {
        tile.textContent = value;

        // 2048보다 큰 숫자도 오류 없이 표시되도록 기본 클래스는 유지
        tile.classList.add(`tile-${value}`);

        const isMerged = mergedPositions.some(
          (pos) => pos.row === rowIndex && pos.col === colIndex
        );

        if (isMerged) {
          tile.classList.add("merged");
        }
      }

      boardEl.appendChild(tile);
    });
  });

  scoreEl.textContent = score;
  updateReshuffleButton();
}

function addRandomTile() {
  const emptyCells = [];

  board.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value === 0) {
        emptyCells.push({ r, c });
      }
    });
  });

  if (emptyCells.length === 0) return;

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];

  // 실제 2048 규칙: 새 타일은 보통 2, 낮은 확률로 4
  board[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
}

/* ==============================
   2048 실제 게임 규칙
   ============================== */

/*
  핵심 규칙:
  1. 0은 먼저 제거한다.
  2. 이동 방향 기준으로 앞에서부터 같은 숫자만 합친다.
  3. 한 번 합쳐진 타일은 같은 이동에서 다시 합쳐지지 않는다.
  4. 점수는 합쳐져서 만들어진 숫자만큼만 증가한다.

  예시:
  [2, 0, 2, 2] -> [4, 2, 0, 0], 점수 +4
  [2, 2, 2, 2] -> [4, 4, 0, 0], 점수 +8
  [2, 4, 8, 0] -> [2, 4, 8, 0], 점수 +0
*/
function mergeLine(line) {
  const numbers = line.filter((value) => value !== 0);

  const newLine = [];
  const mergedIndexes = [];
  let gainedScore = 0;

  for (let i = 0; i < numbers.length; i++) {
    const current = numbers[i];
    const next = numbers[i + 1];

    if (current === next) {
      const mergedValue = current * 2;

      newLine.push(mergedValue);
      gainedScore += mergedValue;
      mergedIndexes.push(newLine.length - 1);

      // 다음 타일은 이미 합쳐졌으므로 건너뜀
      i++;
    } else {
      newLine.push(current);
    }
  }

  while (newLine.length < 4) {
    newLine.push(0);
  }

  return {
    line: newLine,
    gainedScore,
    mergedIndexes
  };
}

function cloneBoard(targetBoard) {
  return targetBoard.map((row) => [...row]);
}

function boardsAreSame(boardA, boardB) {
  return JSON.stringify(boardA) === JSON.stringify(boardB);
}

function hasAvailableMove() {
  // 빈칸이 있으면 아직 이동 가능
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (board[row][col] === 0) {
        return true;
      }
    }
  }

  // 가로로 합칠 수 있는 타일이 있는지 확인
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      if (board[row][col] === board[row][col + 1]) {
        return true;
      }
    }
  }

  // 세로로 합칠 수 있는 타일이 있는지 확인
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      if (board[row][col] === board[row + 1][col]) {
        return true;
      }
    }
  }

  // 빈칸도 없고 합칠 숫자도 없으면 이동 불가
  return false;
}

function updateReshuffleButton() {
  if (!reshuffleBtn) return;

  if (!hasAvailableMove()) {
    reshuffleBtn.classList.remove("hidden");
  } else {
    reshuffleBtn.classList.add("hidden");
  }
}

/* ==============================
   이동 처리 통합 함수
   ============================== */

function move(direction) {
  const oldBoard = cloneBoard(board);
  const nextBoard = Array.from({ length: 4 }, () => Array(4).fill(0));

  let totalGainedScore = 0;
  mergedPositions = [];

  for (let i = 0; i < 4; i++) {
    let line = [];

    if (direction === "left") {
      line = [...board[i]];
    }

    if (direction === "right") {
      line = [...board[i]].reverse();
    }

    if (direction === "up") {
      line = [board[0][i], board[1][i], board[2][i], board[3][i]];
    }

    if (direction === "down") {
      line = [board[3][i], board[2][i], board[1][i], board[0][i]];
    }

    const result = mergeLine(line);
    totalGainedScore += result.gainedScore;

    if (direction === "left") {
      for (let col = 0; col < 4; col++) {
        nextBoard[i][col] = result.line[col];
      }

      result.mergedIndexes.forEach((col) => {
        mergedPositions.push({ row: i, col });
      });
    }

    if (direction === "right") {
      const reversedResult = [...result.line].reverse();

      for (let col = 0; col < 4; col++) {
        nextBoard[i][col] = reversedResult[col];
      }

      result.mergedIndexes.forEach((reversedCol) => {
        mergedPositions.push({ row: i, col: 3 - reversedCol });
      });
    }

    if (direction === "up") {
      for (let row = 0; row < 4; row++) {
        nextBoard[row][i] = result.line[row];
      }

      result.mergedIndexes.forEach((row) => {
        mergedPositions.push({ row, col: i });
      });
    }

    if (direction === "down") {
      const reversedResult = [...result.line].reverse();

      for (let row = 0; row < 4; row++) {
        nextBoard[row][i] = reversedResult[row];
      }

      result.mergedIndexes.forEach((reversedRow) => {
        mergedPositions.push({ row: 3 - reversedRow, col: i });
      });
    }
  }

  /*
    실제 2048 규칙:
    - 보드가 변했을 때만 이동 성공
    - 이동 성공 시에만 새 타일 생성
    - 점수는 병합 점수만 더함
    - 단순 이동이면 totalGainedScore가 0이므로 점수 변화 없음
  */
  if (!boardsAreSame(oldBoard, nextBoard)) {
    board = nextBoard;
    score += totalGainedScore;

    addRandomTile();
    renderBoard();
  } else {
    // 보드가 안 움직였으면 아무 일도 일어나면 안 됨
    mergedPositions = [];
  }
}

/* 방향별 이동 함수 */

function moveLeft() {
  move("left");
}

function moveRight() {
  move("right");
}

function moveUp() {
  move("up");
}

function moveDown() {
  move("down");
}

/* ==============================
   PC/모바일 공통 스와이프 조작
   ============================== */

boardEl.addEventListener("pointerdown", (event) => {
  event.preventDefault();

  isPointerDown = true;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;

  boardEl.setPointerCapture(event.pointerId);
});

boardEl.addEventListener("pointermove", (event) => {
  event.preventDefault();
});

boardEl.addEventListener("pointerup", (event) => {
  event.preventDefault();

  if (!isPointerDown) return;
  isPointerDown = false;

  const pointerEndX = event.clientX;
  const pointerEndY = event.clientY;

  const diffX = pointerEndX - pointerStartX;
  const diffY = pointerEndY - pointerStartY;

  const absX = Math.abs(diffX);
  const absY = Math.abs(diffY);

  // 너무 짧은 움직임은 무시
  if (absX < 40 && absY < 40) return;

  if (absX > absY) {
    if (diffX > 0) {
      moveRight();
    } else {
      moveLeft();
    }
  } else {
    if (diffY > 0) {
      moveDown();
    } else {
      moveUp();
    }
  }
});

boardEl.addEventListener("pointercancel", () => {
  isPointerDown = false;
});

/* =========================================================
   사후 회상 설문
   ========================================================= */

function createRecallSurvey() {
  surveyList.innerHTML = "";

  surveyList.innerHTML = `
    <div class="survey-item">
      <p>
        <strong>1. 2048 게임을 수행하는 동안 화면에 여러 알림이 나타났습니다.</strong><br />
        기억나는 알림의 내용들을 최대한 자세히, 모두 적어주십시오.
        <span style="color: #ef4444;">*</span>
      </p>

      <p class="description" style="margin: 8px 0 12px;">
        완벽한 문장이 아니어도 좋으니, 핵심 단어나 상황을 자유롭게 서술해 주십시오.
      </p>

      <label>
        기억나는 알림 내용
        <textarea 
          name="freeRecallText" 
          rows="8"
          required
          placeholder="예: 장학금 신청 마감 알림, 팀 회의가 곧 시작된다는 알림, 과제 제출 관련 알림..."
        ></textarea>
      </label>
    </div>

    <div class="survey-item">
      <p>
        <strong>2. 앞서 작성하신 '기억나는 알림'들의 내용은 각각 어떤 테두리 색상과 함께 나타났습니까?</strong><br />
        작성하신 알림 내용과 그에 해당하는 색상(빨강, 초록, 파랑)을 짝지어 적어주십시오.
        <span style="color: #ef4444;">*</span>
      </p>

      <p class="description" style="margin: 8px 0 12px;">
        예시: 장학금 알림 - 파란색, 화재 알림 - 빨간색
      </p>

      <label>
        알림 내용과 색상 짝짓기
        <textarea 
          name="colorRecallText" 
          rows="8"
          required
          placeholder="예: 장학금 신청 마감 알림 - 파란색&#10;팀 회의 알림 - 빨간색&#10;학교 굿즈 판매 알림 - 초록색"
        ></textarea>
      </label>
    </div>

    <div class="survey-item">
      <p>
        <strong>3. 가장 눈에 띄었던 테두리의 색상은 무엇이었습니까?</strong>
        <span style="color: #ef4444;">*</span>
      </p>

      <p class="description" style="margin: 8px 0 12px;">
        단일 선택
      </p>

      <div class="radio-row">
        <label>
          <input type="radio" name="mostNoticeableColor" value="빨간색" required />
          빨간색
        </label>

        <label>
          <input type="radio" name="mostNoticeableColor" value="초록색" />
          초록색
        </label>

        <label>
          <input type="radio" name="mostNoticeableColor" value="파랑색" />
          파랑색
        </label>

        <label>
          <input type="radio" name="mostNoticeableColor" value="없음" />
          없음
        </label>
      </div>

      <label style="margin-top: 16px;">
        위와 같이 고른 이유는 무엇입니까?
        <textarea 
          name="mostNoticeableReason" 
          rows="5"
          required
          placeholder="예: 빨간색 테두리가 가장 강하게 느껴졌고, 다른 색보다 더 빠르게 눈에 들어왔습니다."
        ></textarea>
      </label>
    </div>

    <div class="survey-item">
      <p class="eyebrow">Subjective Cognitive Load</p>
      <h3 style="margin: 0 0 10px;">주관적 인지 부하 평가</h3>

      <p class="description" style="margin: 8px 0 18px;">
        아래의 질문들을 확인하고 답해주시기 바랍니다.
      </p>

      <div class="likert-question">
        <p>
          <strong>4-1. 게임을 하면서 알림 내용을 함께 인지하기 위해 정신적, 인지적 노력을 얼마나 기울여야 했습니까?</strong>
          <span style="color: #ef4444;">*</span>
        </p>

        <div class="radio-row likert-row">
          <span>매우 적음</span>

          <label>
            <input type="radio" name="mentalEffort" value="1" required />
            1
          </label>

          <label>
            <input type="radio" name="mentalEffort" value="2" />
            2
          </label>

          <label>
            <input type="radio" name="mentalEffort" value="3" />
            3
          </label>

          <label>
            <input type="radio" name="mentalEffort" value="4" />
            4
          </label>

          <label>
            <input type="radio" name="mentalEffort" value="5" />
            5
          </label>

          <span>매우 많음</span>
        </div>
      </div>

      <div class="likert-question">
        <p>
          <strong>4-2. 게임 진행 중 나타났다 사라지는 알림 시간이 정보를 파악하기에 얼마나 촉박하게 느껴졌습니까?</strong>
          <span style="color: #ef4444;">*</span>
        </p>

        <div class="radio-row likert-row">
          <span>전혀 촉박하지 않음</span>

          <label>
            <input type="radio" name="timePressure" value="1" required />
            1
          </label>

          <label>
            <input type="radio" name="timePressure" value="2" />
            2
          </label>

          <label>
            <input type="radio" name="timePressure" value="3" />
            3
          </label>

          <label>
            <input type="radio" name="timePressure" value="4" />
            4
          </label>

          <label>
            <input type="radio" name="timePressure" value="5" />
            5
          </label>

          <span>매우 촉박함</span>
        </div>
      </div>

      <div class="likert-question">
        <p>
          <strong>4-3. 주어진 과업(게임과 알림 인지)을 수행하기 위해 귀하의 주의력을 얼마나 집중해야 했습니까?</strong>
          <span style="color: #ef4444;">*</span>
        </p>

        <div class="radio-row likert-row">
          <span>매우 적음</span>

          <label>
            <input type="radio" name="attentionDemand" value="1" required />
            1
          </label>

          <label>
            <input type="radio" name="attentionDemand" value="2" />
            2
          </label>

          <label>
            <input type="radio" name="attentionDemand" value="3" />
            3
          </label>

          <label>
            <input type="radio" name="attentionDemand" value="4" />
            4
          </label>

          <label>
            <input type="radio" name="attentionDemand" value="5" />
            5
          </label>

          <span>매우 많음</span>
        </div>
      </div>
    </div>
  `;
}

/* 설문 제출 */

recallForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(recallForm);

  surveyResponses = {
    freeRecallText: formData.get("freeRecallText") || "",
    colorRecallText: formData.get("colorRecallText") || "",
    mostNoticeableColor: formData.get("mostNoticeableColor") || "",
    mostNoticeableReason: formData.get("mostNoticeableReason") || "",
    mentalEffort: formData.get("mentalEffort") || "",
    timePressure: formData.get("timePressure") || "",
    attentionDemand: formData.get("attentionDemand") || ""
  };

   try {
  const payload = {
    participantInfo: participantInfo,
    surveyResponses: {
      freeRecallText: surveyResponses.freeRecallText,
      colorRecallText: surveyResponses.colorRecallText,
      mostNoticeableColor: surveyResponses.mostNoticeableColor,
      mostNoticeableReason: surveyResponses.mostNoticeableReason,
      mentalEffort: surveyResponses.mentalEffort,
      timePressure: surveyResponses.timePressure,
      attentionDemand: surveyResponses.attentionDemand
    },
    shownNotifications: shownNotifications,
    score: score
  };

  await fetch("https://script.google.com/macros/s/AKfycbyDKRiAO2JpD1hwkzVFAEM2XnzMRjy6wq5MYZ3PqF47_M5k4aaZ-CuxS940HW5q-MkX/exec", {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  createSummary();
  showScreen(resultScreen);
} catch (error) {
  console.error("전송 에러:", error);
  createSummary();
  showScreen(resultScreen);
}}

/* ==============================
   결과 요약 생성
   ============================== */

function createSummary() {
  summaryBox.innerHTML = `
    <strong>사후 설문 응답이 저장되었습니다.</strong><br />
    참가자가 자유 회상, 색상 회상, 테두리 색상 인식, 주관적 인지 부하 평가에 응답했습니다.<br />
    아래 버튼을 눌러 CSV 파일로 저장할 수 있습니다.
  `;
}

/* =========================================================
   CSV 다운로드
   ========================================================= */

downloadCsvBtn.addEventListener("click", () => {
  downloadCSV();
});

function downloadCSV() {
  const headers = [
    "participantId",
    "age",
    "gender",
    "experimentDate",
    "freeRecallText",
    "colorRecallText",
    "mostNoticeableColor",
    "mostNoticeableReason",
    "mentalEffort",
    "timePressure",
    "attentionDemand"
  ];

  const row = [
    participantInfo.participantId,
    participantInfo.age,
    participantInfo.gender,
    participantInfo.experimentDate,
    surveyResponses.freeRecallText,
    surveyResponses.colorRecallText,
    surveyResponses.mostNoticeableColor,
    surveyResponses.mostNoticeableReason,
    surveyResponses.mentalEffort,
    surveyResponses.timePressure,
    surveyResponses.attentionDemand
  ];

  const csvContent = [
    headers.join(","),
    row
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `recall_experiment_${participantInfo.participantId}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

/* ==============================
   다시 시작
   ============================== */

reshuffleBtn.addEventListener("click", () => {
  continueWithNewBoard();
});

function continueWithNewBoard() {
  // 점수와 남은 시간은 유지하고 보드만 새로 시작
  board = Array.from({ length: 4 }, () => Array(4).fill(0));
  mergedPositions = [];

  addRandomTile();
  addRandomTile();

  renderBoard();
}

restartBtn.addEventListener("click", () => {
  location.reload();
});
