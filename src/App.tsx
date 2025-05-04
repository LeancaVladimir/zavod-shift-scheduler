import { ShiftScheduler } from "./components/ShiftScheduler";
import { FC } from "react";

const App: FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">Shift Scheduler</h1>

      <ShiftScheduler />
    </div>
  );
};

export default App;
