"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";

import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE } from "~/lib/constants";

function QuizCard({ currentQuestion, answers, onAnswer }: { 
  currentQuestion: number, 
  answers: number[], 
  onAnswer: (index: number) => void 
}) {
  const question = QUIZ_QUESTIONS[currentQuestion];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Question {currentQuestion + 1}</CardTitle>
        <CardDescription>{question.question}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onAnswer(index)}
            className={`p-2 text-left rounded ${
              answers[currentQuestion] === index 
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
            }`}
          >
            {option}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function ResultCard({ score }: { score: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Complete!</CardTitle>
        <CardDescription>
          You scored {score} out of {QUIZ_QUESTIONS.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <button 
          onClick={() => window.location.reload()}
          className="w-full p-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Try Again
        </button>
      </CardContent>
    </Card>
  );
}

export default function Frame() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [added, setAdded] = useState(false);
  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const score = answers.reduce((acc, answer, index) => 
    acc + (answer === QUIZ_QUESTIONS[index]?.correct ? 1 : 0), 0);

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
    
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-gray-700 dark:text-gray-300">
          {QUIZ_TITLE}
        </h1>

        {currentQuestion < QUIZ_QUESTIONS.length ? (
          <>
            <QuizCard 
              currentQuestion={currentQuestion}
              answers={answers}
              onAnswer={handleAnswer}
            />
            <div className="flex justify-between mt-4">
              {currentQuestion > 0 && (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ← Previous
                </button>
              )}
              <span className="flex-grow"></span>
              <span className="text-gray-500">
                {currentQuestion + 1} / {QUIZ_QUESTIONS.length}
              </span>
            </div>
          </>
        ) : (
          <ResultCard score={score} />
        )}
      </div>
    </div>
  );
}
