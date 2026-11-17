import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, XCircle, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudy } from "./study-provider";
import { scoreMock, shuffle, AFRIKAANS_QUESTIONS, type Question } from "@/lib/quiz";
import { CATEGORIES } from "@/data/categories";
import { SignGraphic } from "./sign-graphic";
import { questionVisuals } from "@/lib/question-visuals";
import { signByCode } from "@/data/signs";
import { useLanguage } from "./language-provider";
export function QuizPlayer({
  questions,
  mock = false,
  onClose,
}: {
  questions: Question[];
  mock?: boolean;
  onClose: () => void;
}) {
  const { record } = useStudy();
  const { language, t } = useLanguage();
  const displayQuestions = language === "af"
    ? questions.map((question) => {
        const translated = AFRIKAANS_QUESTIONS[question.id];
        return translated
          ? { ...question, q: translated.q, options: translated.options, explain: translated.explain ?? question.explain, note: translated.note ?? question.note }
          : question;
      })
    : questions;
  const [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<Record<string, number>>({}),
    [finished, setFinished] = useState(false),
    [seconds, setSeconds] = useState(3600);
  const [orders] = useState(() =>
    Object.fromEntries(questions.map((q) => [q.id, shuffle(q.options.map((_, i) => i))])),
  );
  const q = displayQuestions[index];
  const selected = q ? answers[q.id] : undefined;
  const finish = () => {
    if (finished) return;
    setFinished(true);
    const created_at = new Date().toISOString();
    record(
      questions.map((q) => ({
        id: crypto.randomUUID(),
        question_id: q.id,
        category: q.cat,
        correct: answers[q.id] === q.answer,
        created_at,
      })),
      {
        id: crypto.randomUUID(),
        mode: mock ? "mock" : "practice",
        created_at,
        results: mock
          ? scoreMock(questions, answers)
          : {
              correct: questions.filter((q) => answers[q.id] === q.answer).length,
              total: questions.length,
            },
      },
    );
  };
  useEffect(() => {
    if (!mock || finished) return;
    const timer = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [mock, finished]);
  useEffect(() => {
    if (mock && seconds === 0) finish();
  }, [seconds]);
  if (finished) {
    const result = scoreMock(questions, answers);
    const correct = questions.filter((q) => answers[q.id] === q.answer).length;
    return (
      <div className="results">
        <span className="eyebrow">{mock ? t("quiz.mockResults") : t("quiz.practiceComplete")}</span>
        <h1>
          {mock
            ? result.passed
              ? t("quiz.passed")
              : t("quiz.keepGoing")
            : t("quiz.anotherStep")}
        </h1>
        <p className="result-score">
          {correct}
          <span> / {questions.length} {t("quiz.correct")}</span>
        </p>
        {mock ? (
          <div className="result-sections">
            {result.sections.map((s) => (
              <div key={s.key}>
                <h3>{language === "af" ? ({ rules: "Padreëls", signs: "Tekens, padmerke en seine", controls: "Voertuigkontroles" }[s.key] ?? s.name) : s.name}</h3>
                <strong>
                  {s.correct}/{s.total}
                </strong>
                <p>
                  {s.passed ? t("quiz.passedShort") : t("quiz.morePractice")} · {t("quiz.target")} {s.pass}/{s.count}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="lesson-actions">
          <Button onClick={onClose}>
            <RotateCcw />
            {t("quiz.practiseAgain")}
          </Button>
          <Button asChild variant="outline">
            <Link to="/review">
              {t("quiz.review")}
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <h2>{t("quiz.answers")}</h2>
        {displayQuestions.map((q) => (
          <div className="answer-review" key={q.id}>
            {answers[q.id] === q.answer ? (
              <CheckCircle2 className="text-primary" />
            ) : (
              <XCircle className="text-destructive" />
            )}
            <div>
              <strong>{q.q}</strong>
              <p>{t("quiz.correctAnswer")} {q.options[q.answer]}</p>
              {q.explain ? <p>{q.explain}</p> : null}
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (!q) return <p>{t("quiz.noQuestions")}</p>;
  return (
    <div className="quiz-space">
      <div className="quiz-top">
        <span>
          {mock ? t("quiz.mock") : t("quiz.practice")} · {t("quiz.question")} {index + 1} {t("quiz.of")} {displayQuestions.length}
        </span>
        {mock ? (
          <span>
            <Clock size={16} />
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
        ) : null}
      </div>
      <progress max={displayQuestions.length} value={index + 1} />
      <span className="eyebrow">{language === "af" ? t((`quiz.category${q.cat}`) as any) : CATEGORIES[q.cat]?.name}</span>
      <h1>{q.q}</h1>
      {questionVisuals(q).map((v) =>
        v.kind === "sign" ? (
          <figure className="question-image question-sign" key={v.code}>
            <SignGraphic
              sign={signByCode(v.code) ?? { code: v.code, name: v.code, meaning: "", group: "control", variants: [] }}
            />
            <figcaption>{v.label}</figcaption>
          </figure>
        ) : (
          <figure className="question-image" key={v.url}>
            <img src={v.url} alt={v.cap} loading="lazy" />
            <figcaption>{v.cap}</figcaption>
          </figure>
        ),
      )}
      <div className="answer-options">
        {orders[q.id]?.map((opt, i) => (
          <Button
            key={opt}
            variant="outline"
            disabled={!mock && selected !== undefined}
            className={`answer-option ${selected === opt ? "answer-selected" : ""} ${!mock && selected !== undefined && opt === q.answer ? "answer-correct" : ""}`}
            onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
          >
            <span>{String.fromCharCode(65 + i)}</span>
            <span>{q.options[opt]}</span>
            {!mock && selected !== undefined && opt === q.answer ? <CheckCircle2 /> : null}
          </Button>
        ))}
      </div>
      {!mock && selected !== undefined ? (
        <div className={`feedback ${selected === q.answer ? "feedback-correct" : ""}`}>
          <strong>{selected === q.answer ? t("quiz.correctFeedback") : t("quiz.incorrectFeedback")}</strong>
          <p>{q.explain || (language === "af" ? `Die korrekte antwoord is: ${q.options[q.answer]}.` : `The correct answer is: ${q.options[q.answer]}.`)}</p>
          {q.note ? <small>{q.note}</small> : null}
        </div>
      ) : null}
      <div className="quiz-actions">
        <Button variant="ghost" onClick={onClose}>
          {t("quiz.exit")} {mock ? t("quiz.test") : t("quiz.practice").toLowerCase()}
        </Button>
        {index > 0 && mock ? (
          <Button variant="outline" onClick={() => setIndex((i) => i - 1)}>
            {t("quiz.previous")}
          </Button>
        ) : null}
        <Button
          disabled={selected === undefined}
          onClick={() => (index === displayQuestions.length - 1 ? finish() : setIndex((i) => i + 1))}
        >
          {index === displayQuestions.length - 1 ? t("quiz.finish") : t("quiz.next")}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
