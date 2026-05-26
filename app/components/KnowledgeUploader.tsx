"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Check,
  ArrowRight,
} from "lucide-react";

const LIME = "#d4ff00";

const flows = [
  {
    business:
      "We help restaurants automate Instagram replies and customer support using AI automation.",
    question: "Hey, what does your business do?",
    answer:
      "We automate Instagram replies, customer support, and lead generation using AI.",
  },
  {
    business:
      "Our Pro package costs $249/month and includes full AI automation tools.",
    question: "How much is your pro package?",
    answer:
      "Our Pro package costs $249/month and includes complete AI automation features.",
  },
  {
    business:
      "Setup takes 3-5 business days and all customers receive 24/7 support.",
    question: "How long does setup take?",
    answer:
      "Setup usually takes 3–5 business days and includes 24/7 support.",
  },
];

export default function AiFlowSection() {
  const [step, setStep] = useState(0);

  const [typedBusiness, setTypedBusiness] = useState("");
  const [typedQuestion, setTypedQuestion] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");

  const [showButton, setShowButton] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const current = flows[step];

  useEffect(() => {
    startFlow();
  }, [step]);

  const typeText = async (
    text: string,
    setter: (value: string) => void,
    speed = 28
  ) => {
    setter("");

    return new Promise<void>((resolve) => {
      let i = 0;

      const interval = setInterval(() => {
        setter(text.slice(0, i + 1));

        i++;

        if (i >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  };

  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const startFlow = async () => {
    setTypedBusiness("");
    setTypedQuestion("");
    setTypedAnswer("");

    setShowButton(false);
    setShowSync(false);
    setShowQuestion(false);
    setShowTyping(false);
    setShowAnswer(false);

    // AI TRAINING
    await typeText(current.business, setTypedBusiness, 22);

    await wait(400);

    setShowButton(true);

    await wait(900);

    setShowSync(true);

    await wait(1000);

    // CUSTOMER QUESTION
    setShowQuestion(true);

    await typeText(current.question, setTypedQuestion, 26);

    await wait(600);

    // AI TYPING
    setShowTyping(true);

    await wait(1400);

    setShowTyping(false);

    // ANSWER
    setShowAnswer(true);

    await typeText(current.answer, setTypedAnswer, 20);

    await wait(3200);

    setStep((prev) => (prev + 1) % flows.length);
  };

  return (
    <section className="relative overflow-hidden ">
      <div className="mx-auto max-w-6xl px-6">

        <div className="grid items-center gap-14 lg:grid-cols-[0.72fr_0.95fr]">

          {/* LEFT SIDE */}
          <div className="max-w-[430px]">

            {/* TAG */}
           

            {/* HEADING */}
            <h2 className="text-3xl font-black leading-[1] tracking-tight text-black md:text-5xl">
              Automate replies
              <br />
              using your knowledge.
            </h2>

            {/* DESCRIPTION */}
            <p className="mt-5 text-sm font-semibold leading-7 text-black/60 md:text-base">
              Save your business information once and let your AI
              automatically answer customer questions using your
              knowledge base.
            </p>

            {/* FEATURES */}
            <div className="mt-10 space-y-7">

              <div className="flex items-start gap-4">
                <div
                  className="mt-1.5 h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: LIME,
                  }}
                />

                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.15em] text-black">
                    Save Business Data
                  </h4>

                  <p className="mt-1 text-sm font-semibold leading-6 text-black/55">
                    Store pricing, FAQs, support details, and services
                    directly inside your AI system.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className="mt-1.5 h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: LIME,
                  }}
                />

                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.15em] text-black">
                    Understand Questions
                  </h4>

                  <p className="mt-1 text-sm font-semibold leading-6 text-black/55">
                    The AI understands customer messages naturally
                    and generates contextual replies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className="mt-1.5 h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: LIME,
                  }}
                />

                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.15em] text-black">
                    Instant AI Replies
                  </h4>

                  <p className="mt-1 text-sm font-semibold leading-6 text-black/55">
                    Customers instantly receive responses generated
                    from your saved business knowledge.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex justify-center lg:justify-end">

            {/* MOBILE */}
            <div className="relative w-full max-w-[285px]">

              {/* GLOW */}
              <div
                className="absolute inset-0 scale-110 blur-3xl opacity-20"
                style={{
                  backgroundColor: LIME,
                }}
              />

              {/* PHONE */}
              <div className="relative overflow-hidden rounded-[34px] border-[6px] border-[#1a1a1a] bg-black shadow-[0_30px_80px_rgba(0,0,0,0.18)]">

                {/* INSTAGRAM HEADER */}
                <div className="border-b border-white/10 bg-[#111] px-4 py-3">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2.5">

                      {/* PROFILE */}
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{
                          background:
                            "linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)",
                        }}
                      >
                        <div className="flex h-[31px] w-[31px] items-center justify-center rounded-full bg-black">
                          <Brain
                            className="h-4 w-4 text-white"
                            strokeWidth={2.5}
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[13px] font-black text-white">
                          yourbusiness.ai
                        </h3>

                        <p className="text-[10px] font-semibold text-green-400">
                          Active now
                        </p>
                      </div>
                    </div>

                    {/* LIVE */}
                    <div className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-white">
                      LIVE
                    </div>
                  </div>
                </div>

                {/* CHAT BODY */}
                <div className="space-y-3 bg-[#0c0c0c] px-3 py-4 min-h-[500px]">

                  {/* AI TRAINING */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-[24px] border border-white/5 bg-white/[0.03] p-3"
                  >
                    <p className="mb-2 text-[8px] font-black uppercase tracking-[0.15em] text-white/35">
                      AI TRAINING
                    </p>

                    <div className="rounded-2xl bg-black px-3 py-3 min-h-[88px]">
                      <p className="text-[12px] font-semibold leading-6 text-white/80">
                        {typedBusiness}

                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1,
                          }}
                          className="ml-1 inline-block h-3 w-[2px] bg-white"
                        />
                      </p>
                    </div>

                    {/* BUTTON */}
                    <AnimatePresence>
                      {showButton && (
                        <motion.button
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.15em] text-black"
                        >
                          Save To AI

                          <ArrowRight
                            className="h-3.5 w-3.5"
                            strokeWidth={2.5}
                          />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* AI UPDATED */}
                  <AnimatePresence>
                    {showSync && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2.5 rounded-2xl border border-green-500/10 bg-green-500/10 px-3 py-2.5"
                      >
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: LIME,
                          }}
                        >
                          <Check
                            className="h-3.5 w-3.5 text-black"
                            strokeWidth={3}
                          />
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white">
                            AI Updated
                          </p>

                          <p className="mt-0.5 text-[10px] font-semibold text-white/45">
                            Knowledge synced successfully.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* USER MESSAGE */}
                  {showQuestion && (
                    <div className="flex justify-start">
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-[82%] rounded-[20px] rounded-bl-sm bg-[#262626] px-3 py-2.5"
                      >
                        <p className="text-[11px] font-medium leading-5 text-white">
                          {typedQuestion}
                        </p>
                      </motion.div>
                    </div>
                  )}

                  {/* AI TYPING */}
                  {showTyping && (
                    <div className="flex justify-end">
                      <div
                        className="flex items-center gap-1.5 rounded-[20px] rounded-br-sm px-3 py-2"
                        style={{
                          backgroundColor: LIME,
                        }}
                      >
                        <span className="text-[10px] font-black text-black">
                          typing
                        </span>

                        <div className="flex gap-1">
                          <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                            }}
                            className="h-1 w-1 rounded-full bg-black"
                          />

                          <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                              delay: 0.15,
                            }}
                            className="h-1 w-1 rounded-full bg-black"
                          />

                          <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                              delay: 0.3,
                            }}
                            className="h-1 w-1 rounded-full bg-black"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI REPLY */}
                  {showAnswer && (
                    <div className="flex justify-end">
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-[82%] rounded-[20px] rounded-br-sm bg-white px-3 py-2.5"
                      >
                        <p className="text-[11px] font-semibold leading-5 text-black">
                          {typedAnswer}
                        </p>
                      </motion.div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}