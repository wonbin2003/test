const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-this-key";

const csvPath = path.join(__dirname, "responses.csv");

// public 폴더 안의 index.html, style.css, app.js 제공
app.use(express.static(path.join(__dirname, "public")));

// JSON 데이터 받기
app.use(express.json({ limit: "2mb" }));

// CSV에서 깨짐 방지용
function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  return `"${String(value).replaceAll('"', '""')}"`;
}

// 참가자 결과 저장 API
app.post("/api/responses", (req, res) => {
  try {
    const data = req.body;

    const headers = [
      "savedAt",
      "participantId",
      "age",
      "gender",
      "experimentDate",
      "score",
      "freeRecallText",
      "colorRecallText",
      "mostNoticeableColor",
      "mostNoticeableReason",
      "mentalEffort",
      "timePressure",
      "attentionDemand",
      "shownNotifications"
    ];

    const row = [
      new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
      data.participantInfo?.participantId,
      data.participantInfo?.age,
      data.participantInfo?.gender,
      data.participantInfo?.experimentDate,
      data.score,
      data.surveyResponses?.freeRecallText,
      data.surveyResponses?.colorRecallText,
      data.surveyResponses?.mostNoticeableColor,
      data.surveyResponses?.mostNoticeableReason,
      data.surveyResponses?.mentalEffort,
      data.surveyResponses?.timePressure,
      data.surveyResponses?.attentionDemand,
      JSON.stringify(data.shownNotifications || [])
    ];

    const fileExists = fs.existsSync(csvPath);

    const csvLine = row.map(escapeCSV).join(",") + "\n";

    if (!fileExists) {
      fs.writeFileSync(csvPath, "\uFEFF" + headers.join(",") + "\n", "utf8");
    }

    fs.appendFileSync(csvPath, csvLine, "utf8");

    res.json({
      success: true,
      message: "응답이 서버에 저장되었습니다."
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "서버 저장 중 오류가 발생했습니다."
    });
  }
});

// 관리자용 CSV 다운로드
app.get("/admin/download", (req, res) => {
  const key = req.query.key;

  if (key !== ADMIN_KEY) {
    return res.status(403).send("접근 권한이 없습니다.");
  }

  if (!fs.existsSync(csvPath)) {
    return res.status(404).send("아직 저장된 응답이 없습니다.");
  }

  res.download(csvPath, "responses.csv");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});