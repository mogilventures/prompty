import React, { useState, useEffect } from "react";
import Timer, { TimerDisplayMode } from "./Timer";
import { useTimer } from "@/hooks/useTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TimerDemo: React.FC = () => {
  const [displayMode, setDisplayMode] = useState<TimerDisplayMode>("digital");
  const [enableSound, setEnableSound] = useState(true);
  const [testSpeed, setTestSpeed] = useState(1);
  
  const timer = useTimer({
    initialTime: 30,
    enableOvertime: true,
    testMode: true,
    testSpeed,
    onComplete: () => console.log("Timer completed!"),
    onTick: (time) => console.log(`Time: ${time}`),
  });

  const modes: { key: TimerDisplayMode; name: string; description: string }[] = [
    { key: "digital", name: "Digital", description: "Classic countdown display" },
    { key: "circular", name: "Circular", description: "Progress ring with time" },
    { key: "linear", name: "Linear", description: "Progress bar with details" },
    { key: "analog", name: "Analog", description: "Clock face visualization" },
  ];

  useEffect(() => {
    timer.setTestSpeed(testSpeed);
  }, [testSpeed, timer]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Timer Component Demo</CardTitle>
          <CardDescription>
            Test all timer display modes with various states and controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Display Mode Selection */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Display Modes</h3>
            <div className="flex gap-2 flex-wrap">
              {modes.map((mode) => (
                <Button
                  key={mode.key}
                  variant={displayMode === mode.key ? "default" : "outline"}
                  onClick={() => setDisplayMode(mode.key)}
                  className="flex-col h-auto p-3"
                >
                  <span className="font-semibold">{mode.name}</span>
                  <span className="text-xs text-muted-foreground">{mode.description}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Timer Controls */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Timer Controls</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={timer.start} disabled={timer.isRunning && !timer.isPaused}>
                Start
              </Button>
              <Button onClick={timer.pause} disabled={!timer.isRunning || timer.isPaused}>
                Pause
              </Button>
              <Button onClick={timer.resume} disabled={!timer.isPaused}>
                Resume
              </Button>
              <Button onClick={timer.stop} disabled={!timer.isRunning}>
                Stop
              </Button>
              <Button onClick={() => timer.reset(30)} variant="outline">
                Reset (30s)
              </Button>
              <Button onClick={() => timer.extend(15)} variant="outline">
                +15s
              </Button>
            </div>
          </div>

          {/* Test Speed Controls */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Speed</h3>
            <div className="flex gap-2">
              {[0.5, 1, 2, 5, 10].map((speed) => (
                <Button
                  key={speed}
                  size="sm"
                  variant={testSpeed === speed ? "default" : "outline"}
                  onClick={() => setTestSpeed(speed)}
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>

          {/* Timer Status */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Status</h3>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={timer.isRunning ? "default" : "secondary"}>
                {timer.isRunning ? "Running" : "Stopped"}
              </Badge>
              {timer.isPaused && <Badge variant="outline">Paused</Badge>}
              {timer.isOvertime && <Badge variant="destructive">Overtime</Badge>}
              <Badge variant="outline">Time: {timer.time.toFixed(1)}s</Badge>
            </div>
          </div>

          {/* Timer Display */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Timer Display</h3>
            <div className="flex justify-center p-8 border rounded-lg bg-muted/20">
              <Timer
                time={timer.time}
                totalTime={30}
                displayMode={displayMode}
                isHost={true}
                showControls={true}
                onPause={timer.pause}
                onResume={timer.resume}
                onExtend={timer.extend}
                isPaused={timer.isPaused}
                size="lg"
                enableSound={enableSound}
                onSoundToggle={setEnableSound}
                isOvertime={timer.isOvertime}
                testMode={true}
              />
            </div>
          </div>

          {/* Quick Test Scenarios */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Quick Test Scenarios</h3>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  timer.reset(10);
                  timer.start();
                }}
              >
                Test Urgency (10s)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  timer.reset(5);
                  timer.start();
                }}
              >
                Test Critical (5s)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  timer.reset(1);
                  timer.start();
                }}
              >
                Test Completion
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  timer.reset(-5);
                }}
              >
                Test Overtime
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimerDemo;