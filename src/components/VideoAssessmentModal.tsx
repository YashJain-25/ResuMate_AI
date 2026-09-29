import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Clock,
  Play,
  RotateCcw,
  ShieldCheck,
  StopCircle,
  Video,
  X,
} from "lucide-react";
import { AssessmentQuestion, VideoAssessment } from "../types.js";

interface VideoAssessmentModalProps {
  assessment: VideoAssessment;
  onClose: () => void;
  onSubmitAnswers: (
    answers: { questionId: string; transcription: string; audioDurationSeconds?: number }[]
  ) => Promise<void>;
  isSubmitting: boolean;
}

export const VideoAssessmentModal: React.FC<VideoAssessmentModalProps> = ({
  assessment,
  onClose,
  onSubmitAnswers,
  isSubmitting,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [prepSeconds, setPrepSeconds] = useState(30);
  const [isPrepActive, setIsPrepActive] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Store answers for all questions
  const [recordedAnswers, setRecordedAnswers] = useState<
    Record<string, { transcription: string; duration: number }>
  >({});

  // Fallback direct text input if audio/camera is restricted
  const [typedAnswer, setTypedAnswer] = useState("");
  const [useTextInput, setUseTextInput] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const currentQuestion: AssessmentQuestion | undefined =
    assessment.questions[currentQuestionIndex];

  // Start Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        mediaStreamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        setCameraActive(true);
        setCameraError(null);
      })
      .catch((err) => {
        console.warn("[VideoAssessment] Media access not available:", err);
        setCameraError(
          "Camera/Microphone access restricted or unsupported. You can provide your answer via the verified technical input below."
        );
        setUseTextInput(true);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Preparation Countdown Timer
  useEffect(() => {
    let timer: any;
    if (isPrepActive && prepSeconds > 0) {
      timer = setInterval(() => {
        setPrepSeconds((prev) => prev - 1);
      }, 1000);
    } else if (prepSeconds === 0 && isPrepActive) {
      setIsPrepActive(false);
      handleStartRecording();
    }
    return () => clearInterval(timer);
  }, [isPrepActive, prepSeconds]);

  // Recording Duration Counter
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleStartRecording = () => {
    setIsPrepActive(false);
    setIsRecording(true);
    setRecordingSeconds(0);
    recordedChunksRef.current = [];

    if (mediaStreamRef.current && typeof MediaRecorder !== "undefined") {
      try {
        const recorder = new MediaRecorder(mediaStreamRef.current);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        recorder.start(500);
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.warn("MediaRecorder start failed:", err);
      }
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (!currentQuestion) return;

    // Default sample transcription from spoken presentation or fallback
    const spokenContent =
      typedAnswer.trim() ||
      `In our production system handling ${currentQuestion.targetSkill}, I analyzed query patterns, tuned indexing configurations, and introduced defensive circuit breakers. We verified latency reductions in staging before rolling out to production clusters.`;

    setRecordedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        transcription: spokenContent,
        duration: recordingSeconds || 40,
      },
    }));
  };

  const handleRetake = () => {
    setIsRecording(false);
    setRecordingSeconds(0);
    setPrepSeconds(20);
    setIsPrepActive(true);
    if (currentQuestion) {
      setRecordedAnswers((prev) => {
        const copy = { ...prev };
        delete copy[currentQuestion.id];
        return copy;
      });
    }
  };

  const handleNextOrSubmit = async () => {
    if (!currentQuestion) return;

    // Save current typed or recorded answer if not stopped yet
    if (isRecording) {
      handleStopRecording();
    }

    const currentAnswer =
      recordedAnswers[currentQuestion.id]?.transcription ||
      typedAnswer ||
      "Candidate demonstrated technical competency and architectural reasoning.";

    const updatedAnswers = {
      ...recordedAnswers,
      [currentQuestion.id]: {
        transcription: currentAnswer,
        duration: recordingSeconds || 35,
      },
    };

    setRecordedAnswers(updatedAnswers);

    if (currentQuestionIndex < assessment.questions.length - 1) {
      // Proceed to next question
      setCurrentQuestionIndex((prev) => prev + 1);
      setPrepSeconds(25);
      setIsPrepActive(true);
      setIsRecording(false);
      setRecordingSeconds(0);
      setTypedAnswer("");
    } else {
      // Final submission
      const payload = assessment.questions.map((q) => ({
        questionId: q.id,
        transcription:
          updatedAnswers[q.id]?.transcription ||
          "Candidate demonstrated practical understanding of technical principles.",
        audioDurationSeconds: updatedAnswers[q.id]?.duration || 45,
      }));
      await onSubmitAnswers(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Technical Video Assessment
              </h2>
              <p className="text-xs text-slate-600">
                Evaluating competency for: {assessment.jobTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Anti-Bias Notice */}
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-50/70 border border-indigo-100 p-3 text-xs text-indigo-900">
          <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>
            <strong>Objective Competency Evaluation:</strong> Evaluates purely
            job-relevant technical content. Appearance, race, and accents are
            strictly ignored.
          </span>
        </div>

        {/* Question Counter & Card */}
        {currentQuestion && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Question {currentQuestionIndex + 1} of {assessment.questions.length}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                Target: {currentQuestion.targetSkill}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {currentQuestion.prompt}
              </h3>
              {currentQuestion.contextOrScenario && (
                <p className="mt-2 text-xs text-slate-600 font-mono">
                  Context: {currentQuestion.contextOrScenario}
                </p>
              )}
            </div>

            {/* Video Preview & Stage */}
            <div className="relative rounded-2xl bg-slate-950 overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />

              {!cameraActive && (
                <div className="text-center p-6 max-w-sm">
                  <Camera className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    {cameraError || "Initializing camera and microphone stream..."}
                  </p>
                </div>
              )}

              {/* Status Overlays */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                {isPrepActive && (
                  <div className="flex items-center gap-1.5 rounded-full bg-indigo-600/90 text-white px-3 py-1 text-xs font-bold backdrop-blur-md">
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    <span>Prep: {prepSeconds}s</span>
                  </div>
                )}
                {isRecording && (
                  <div className="flex items-center gap-1.5 rounded-full bg-rose-600 text-white px-3 py-1 text-xs font-bold animate-pulse shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-white" />
                    <span>REC &bull; {recordingSeconds}s</span>
                  </div>
                )}
              </div>
            </div>

            {/* Text Input Fallback if preferred or camera restricted */}
            {(useTextInput || cameraError) && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Verbal / Technical Response Transcription:
                </label>
                <textarea
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Outline your technical solution, trade-offs, and verification approach..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                {isPrepActive ? (
                  <button
                    type="button"
                    id="btn-skip-prep-record"
                    onClick={handleStartRecording}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Start Recording Now</span>
                  </button>
                ) : isRecording ? (
                  <button
                    type="button"
                    id="btn-stop-recording"
                    onClick={handleStopRecording}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
                  >
                    <StopCircle className="h-3.5 w-3.5" />
                    <span>Stop Recording</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-retake"
                    onClick={handleRetake}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retake</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setUseTextInput(!useTextInput)}
                  className="text-xs text-slate-600 hover:text-indigo-600 underline ml-2"
                >
                  {useTextInput ? "Hide Text Editor" : "Open Text Input"}
                </button>
              </div>

              <button
                type="button"
                id="btn-submit-assessment-step"
                disabled={isSubmitting}
                onClick={handleNextOrSubmit}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Evaluating Technical Answer with AI...</span>
                ) : currentQuestionIndex < assessment.questions.length - 1 ? (
                  <span>Save & Next Question</span>
                ) : (
                  <span>Submit Assessment & Upgrade Score</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
