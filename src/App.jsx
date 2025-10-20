import { useCallback, useReducer, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import {
  CheckCircle,
  Play,
  RefreshCcw,
  RefreshCw,
  XCircle,
} from "lucide-react";

const NUM_WORKERS = 4;
const INITIAL_STATE = {
  status: "idle", // 'idle' | 'working' | 'finished' | 'ready'
  workers: [],
  finalResult: null,
  errorMessage: null,
};
// --- HELPER FUNCTION: Simulates a worker calculating the product of a range ---
const workerSimulator = (start, end, workerId) => {
  return new Promise((resolve, reject) => {
    const latency = Math.random() * 2000 + 1000; // Simulate variable latency between 1-3 seconds
    setTimeout(() => {
      try {
        if (Math.random() < 0.05) {
          // 5% chance to simulate an error
          throw new Error(`Worker ${workerId} encountered an error.`);
        }
        let result = BigInt(1);
        for (let i = start; i <= end; i++) {
          result *= BigInt(i);
        }
        resolve({ workerId, start, end, result: result.toString(), latency });
      } catch (error) {
        reject({ workerId, error: error.message, latency });
      }
    }, latency);
  });
};
//REDUCER FOR STATE MANAGEMENT
const reducer = (state, action) => {
  switch (action.type) {
    case "START_DISTRIBUTION":
      return {
        ...INITIAL_STATE,
        status: "working",
        workers: action.payload.chunks.map((chunk, index) => ({
          workerId: index + 1,
          start: chunk.start,
          end: chunk.end,
          status: "pending",
          result: null,
          time: null,
        })),
      };
    case "WORKER_SUCCESS":
      const newWorkersSuccess = state.workers.map((worker) =>
        worker.workerId === action.payload.workerId
          ? {
              ...worker,
              status: "finished",
              result: action.payload.result,
              time: action.payload.latency,
            }
          : worker
      );
      return { ...state, workers: newWorkersSuccess };
    case "WORKER_FAILURE":
      const newWorkersFailure = state.workers.map((worker) =>
        worker.workerId === action.payload.workerId
          ? {
              ...worker,
              status: "error",
              result: action.payload.error,
              time: action.payload.latency,
            }
          : worker
      );
      return {
        ...state,
        status: "error",
        workers: newWorkersFailure,
        errorMessage: `Task failed on worker ${action.payload.workerId}: ${action.payload.error}`,
      };
    case "FINISH_COORDINATION":
      return {
        ...state,
        status: "finished",
        finalResult: action.payload.finalResult,
      };
    case "ERROR_COORDINATION":
      return {
        ...state,
        status: "error",
        errorMessage: action.payload.errorMessage,
      };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
};

function App() {
  const [inputNumber, setInputNumber] = useState(666);
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const formatBigInt = (bigIntValue) => {
    if (!bigIntValue) return "N/A";
    try {
      const str = bigIntValue.toString();

      return str.length > 40 ? `${str.slice(0, 40)}...  ` : str;
    } catch (error) {
      return "Calculation error";
    }
  };
  const distributeTask = useCallback(async () => {
    const N = parseInt(inputNumber);
    if (isNaN(N) || N < 1) {
      alert("Please enter a valid positive integer.");
      return;
    }
    // Step 1: Divide the task into chunks
    const chunkSize = Math.floor(N / NUM_WORKERS);
    const chunks = [];
    let start = 1;
    for (let i = 0; i < NUM_WORKERS; i++) {
      const end = i === NUM_WORKERS - 1 ? N : start + chunkSize - 1;
      chunks.push({ start, end });
      start = end + 1;
    }
    // Step 2: Initialize workers and dispatch tasks
    dispatch({ type: "START_DISTRIBUTION", payload: { chunks } });
    const workerPromises = chunks.map((chunk, index) =>
      workerSimulator(chunk.start, chunk.end, index + 1)
        .then((result) => {
          dispatch({ type: "WORKER_SUCCESS", payload: result });
          return result.result;
        })
        .catch((error) => {
          dispatch({ type: "WORKER_FAILURE", payload: error });
          throw new Error(error.error);
        })
    );
    try {
      const partialResults = await Promise.all(workerPromises);
      // Step 3: Coordinate results
      let finalResult = BigInt(1);
      for (const partial of partialResults) {
        finalResult *= BigInt(partial);
      }
      dispatch({
        type: "FINISH_COORDINATION",
        payload: { finalResult: finalResult.toString() },
      });
    } catch (error) {
      dispatch({
        type: "ERROR_COORDINATION",
        payload: { errorMessage: error.message },
      });
    }
  }, [inputNumber]);
  const statusMap = {
    idle: { text: "Ready", color: "bg-gray-500", icon: Play },
    working: {
      text: "Distributing Tasks...",
      color: "bg-blue-500 animate-pulse",
      icon: RefreshCw,
    },
    finished: {
      text: "Success! (Coordinated)",
      color: "bg-green-500",
      icon: CheckCircle,
    },
    error: {
      text: "Failure (Coordination Halted)",
      color: "bg-red-500",
      icon: XCircle,
    },
  };

  const {
    text,
    color: statusColor,
    icon: StatusIcon,
  } = statusMap[state.status];
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex items-center justify-center font-[Inter]">
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-xl p-6 md:p-10">
        <h1 className="text-3xl font-extrabold text-blue-700 mb-2">
          Distributed Computing Simulator
        </h1>
        <p className="text-gray-600 mb-6">
          Simulating a complex factorial calculation across {NUM_WORKERS} worker
          nodes (parallel processing) and coordination by a central server.
        </p>

        {/* --- INPUT & ACTION AREA --- */}
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label
            htmlFor="input-num"
            className="flex-shrink-0 font-semibold text-gray-700"
          >
            Calculate Factorial (N! where N=):
          </label>
          <input
            id="input-num"
            type="number"
            value={inputNumber}
            onChange={(e) => setInputNumber(e.target.value)}
            min="1"
            max="1000"
            className="w-full sm:w-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition duration-150"
            disabled={state.status === "working"}
          />
          <button
            onClick={distributeTask}
            disabled={
              state.status === "working" ||
              inputNumber < 1 ||
              inputNumber > 1000
            }
            className={`flex items-center justify-center p-3 rounded-lg text-black font-bold transition duration-300 transform shadow-md
              ${
                state.status === "working"
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]"
              }
            `}
          >
            <Play className="w-5 h-5 mr-2" />
            Distribute & Calculate
          </button>
          <button
            onClick={() => dispatch({ type: "RESET" })}
            className={`p-3 rounded-lg font-bold transition duration-300 ${
              state.status === "working"
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:text-red-500"
            }`}
            disabled={state.status === "working"}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* --- STATUS BAR --- */}
        <div
          className={`p-4 rounded-lg text-white font-bold flex items-center mb-8 ${statusColor}`}
        >
          <StatusIcon className="w-6 h-6 mr-3" />
          <span className="text-lg">{text}</span>
        </div>

        {state.errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {state.errorMessage}</span>
          </div>
        )}

        {/* --- WORKER NODE STATUS GRID --- */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
          Worker Node Status (Distributed Tasks)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.workers.map((worker) => {
            let statusClass = "bg-gray-200 text-gray-600";
            let statusText = "PENDING...";
            let statusIcon = (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            );

            if (worker.status === "finished") {
              statusClass =
                "bg-green-100 border-l-4 border-green-500 text-green-700";
              statusText = `Finished (${(worker.time / 1000).toFixed(2)}s)`;
              statusIcon = <CheckCircle className="w-4 h-4 mr-2" />;
            } else if (worker.status === "error") {
              statusClass = "bg-red-100 border-l-4 border-red-500 text-red-700";
              statusText = `FAILED (${(worker.time / 1000).toFixed(2)}s)`;
              statusIcon = <XCircle className="w-4 h-4 mr-2" />;
            } else if (
              state.status === "working" &&
              worker.status === "pending"
            ) {
              statusClass =
                "bg-blue-100 border-l-4 border-blue-500 text-blue-700";
              statusText = "Working...";
              statusIcon = <RefreshCw className="w-4 h-4 mr-2 animate-spin" />;
            }

            return (
              <div
                key={worker.id}
                className={`p-4 rounded-lg shadow-md ${statusClass}`}
              >
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  Worker {worker.id}
                </h3>
                <p className="text-sm">
                  Range: **{worker.start}** to **{worker.end}**
                </p>
                <div className="mt-2 text-xs font-semibold flex items-center">
                  {statusIcon}
                  {statusText}
                </div>
                {worker.status === "finished" && (
                  <p
                    className="mt-2 text-xs truncate"
                    title={formatBigInt(BigInt(worker.result))}
                  >
                    Partial Result: {formatBigInt(BigInt(worker.result))}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* --- FINAL RESULT AREA (Coordination Result) --- */}
        {state.finalResult && state.status === "finished" && (
          <div className="mt-8 p-6 bg-green-50 rounded-lg border border-green-300">
            <h2 className="text-2xl font-bold text-green-700 mb-3 flex items-center">
              <CheckCircle className="w-6 h-6 mr-3" />
              Coordinated Final Result ({inputNumber}!)
            </h2>
            <div className="bg-white p-4 rounded-md overflow-x-auto text-sm font-mono text-gray-800 shadow-inner">
              {formatBigInt(BigInt(state.finalResult))}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              This result was aggregated from the {NUM_WORKERS} partial results
              processed concurrently.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
