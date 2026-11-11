import { createYdExample } from "../circuit/yd-example";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { createSampleProject } from "../circuit/project";
import { useSimulation } from "./useSimulation";
class FakeWorker {
  static instances: FakeWorker[] = [];
  postMessage = vi.fn();
  terminate = vi.fn();
  onmessage: any;
  onerror: any;
  constructor(public url?: URL) {
    FakeWorker.instances.push(this);
  }
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}
beforeEach(() => {
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const ready = {
  cycles: 0,
  timeMicros: 0,
  state: "ready",
  gpio: { D13: null },
  serial: "",
  transitions: [],
};
describe("isolated simulation sessions", () => {
  it("discards stale worker outputs when a circuit changes", () => {
    const project = createSampleProject();
    const { result, rerender } = renderHook(
      ({ project }) => useSimulation(project),
      { initialProps: { project } },
    );
    act(() => result.current.load(":00000001FF", "sample.hex"));
    const old = FakeWorker.instances[0];
    expect(old.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ version: "1.1.0", type: "load" }),
    );
    act(() =>
      old.emit({ version: "1.1.0", id: 1, type: "snapshot", snapshot: ready }),
    );
    expect(result.current.status).toBe("ready");
    rerender({ project: { ...project, name: "Changed" } });
    expect(old.terminate).toHaveBeenCalled();
    act(() =>
      old.emit({
        version: "1.1.0",
        id: 0,
        type: "snapshot",
        snapshot: { ...ready, state: "running", serial: "STALE" },
      }),
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.serial).toBe("");
  });
  it("rejects unsupported multiple boards without spawning execution", () => {
    const project = createSampleProject();
    project.components.push({ ...project.components[0], id: "second-uno" });
    const { result } = renderHook(() => useSimulation(project));
    act(() => result.current.load("hex", "bad.hex"));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("exactly one");
    expect(FakeWorker.instances).toHaveLength(0);
  });
  it("terminates unresponsive workers and reports explicit errors", () => {
    vi.useFakeTimers();
    const project = createSampleProject();
    const { result } = renderHook(() => useSimulation(project));
    act(() => result.current.load("hex", "bad.hex"));
    act(() => vi.advanceTimersByTime(7000));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("stopped responding");
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalled();
  });
  it("caps serial history and clears it on reset", () => {
    const project = createSampleProject();
    const { result } = renderHook(() => useSimulation(project));
    act(() => result.current.load("hex", "sample.hex"));
    act(() =>
      FakeWorker.instances[0].emit({
        version: "1.1.0",
        id: 1,
        type: "snapshot",
        snapshot: { ...ready, serial: "x".repeat(20000) },
      }),
    );
    expect(result.current.serial.length).toBe(16384);
    act(() => result.current.command("reset"));
    expect(result.current.serial).toBe("");
    expect(FakeWorker.instances[0].postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "reset" }),
    );
  });
  it("validates delayed loads against the current circuit", () => {
    const project = createSampleProject();
    const { result, rerender } = renderHook(
      ({ project }) => useSimulation(project),
      { initialProps: { project } },
    );
    const delayedLoad = result.current.load;
    rerender({
      project: {
        ...project,
        components: [
          ...project.components,
          { ...project.components[0], id: "second" },
        ],
      },
    });
    act(() => delayedLoad("hex", "delayed.hex"));
    expect(result.current.status).toBe("error");
    expect(FakeWorker.instances).toHaveLength(0);
  });
  it("rejects mismatched engine protocol without fallback", () => {
    const project = createSampleProject();
    const { result } = renderHook(() => useSimulation(project));
    act(() => result.current.load("hex", "sample.hex"));
    act(() =>
      FakeWorker.instances[0].emit({
        version: "99.0.0",
        type: "snapshot",
        snapshot: ready,
      }),
    );
    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("Incompatible");
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalled();
  });
  it("routes S3 binary initialization exclusively to the S3 Worker", () => {
    const project = createYdExample();
    const { result } = renderHook(() => useSimulation(project));
    act(() => result.current.load(new ArrayBuffer(65568), "s3.bin"));
    expect(result.current.target).toBe("esp32s3");
    expect(String(FakeWorker.instances[0].url)).toContain("esp32.worker");
    expect(FakeWorker.instances[0].postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "load-esp", version: "1.1.0" }),
    );
  });
  it("rejects AVR text for S3 before any Worker can run", () => {
    const project = createYdExample();
    const { result } = renderHook(() => useSimulation(project));
    act(() => result.current.load(":00000001FF", "avr.hex"));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("AVR HEX");
    expect(FakeWorker.instances).toHaveLength(0);
  });
  it("rejects mixed architectures without choosing an AVR fallback", () => {
    const project = createYdExample();
    project.components.push({
      ...createSampleProject().components[0],
      id: "uno-added",
    });
    const { result } = renderHook(() => useSimulation(project));
    act(() => result.current.load(new ArrayBuffer(65568), "s3.bin"));
    expect(result.current.target).toBe("multiple");
    expect(FakeWorker.instances).toHaveLength(0);
  });
  it("sends UART/contact commands as versioned events rather than simulated outputs", () => {
    const project = createYdExample();
    const { result } = renderHook(() => useSimulation(project));
    act(() => result.current.load(new ArrayBuffer(65568), "s3.bin"));
    act(() => {
      result.current.sendUART("print(123)");
      result.current.setButton("switch-1", true);
    });
    expect(FakeWorker.instances[0].postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "uart", text: "print(123)" }),
    );
    expect(FakeWorker.instances[0].postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "button",
        componentId: "switch-1",
        pressed: true,
      }),
    );
    expect(result.current.serial).toBe("");
  });
});

it("mock Worker auto-start waits for ready once and Stop cancels pending readiness", () => {
  const project = createSampleProject();
  const { result } = renderHook(() => useSimulation(project));
  act(() => result.current.load("hex", "design.hex", { autoStart: true }));
  const first = FakeWorker.instances[0];
  expect(
    first.postMessage.mock.calls.filter(([m]) => m.type === "start"),
  ).toHaveLength(0);
  act(() =>
    first.emit({ version: "1.1.0", type: "snapshot", snapshot: ready }),
  );
  act(() =>
    first.emit({ version: "1.1.0", type: "snapshot", snapshot: ready }),
  );
  expect(
    first.postMessage.mock.calls.filter(([m]) => m.type === "start"),
  ).toHaveLength(1);
  act(() => result.current.load("hex", "second.hex", { autoStart: true }));
  const second = FakeWorker.instances[1];
  act(() => result.current.command("stop"));
  act(() =>
    second.emit({ version: "1.1.0", type: "snapshot", snapshot: ready }),
  );
  expect(
    second.postMessage.mock.calls.filter(([m]) => m.type === "start"),
  ).toHaveLength(0);
});

it("mock S3 Worker asynchronous readiness starts once; superseded and error sessions never start", () => {
  const project = createYdExample();
  const { result } = renderHook(() => useSimulation(project));
  act(() =>
    result.current.load(new ArrayBuffer(65568), "first.merged.bin", {
      autoStart: true,
    }),
  );
  const old = FakeWorker.instances[0];
  expect(
    old.postMessage.mock.calls.filter(([m]) => m.type === "start"),
  ).toHaveLength(0);
  act(() =>
    result.current.load(new ArrayBuffer(65568), "second.merged.bin", {
      autoStart: true,
    }),
  );
  const next = FakeWorker.instances[1];
  act(() => old.emit({ version: "1.1.0", type: "snapshot", snapshot: ready }));
  expect(
    old.postMessage.mock.calls.filter(([m]) => m.type === "start"),
  ).toHaveLength(0);
  act(() => next.emit({ version: "1.1.0", type: "snapshot", snapshot: ready }));
  expect(
    next.postMessage.mock.calls.filter(([m]) => m.type === "start"),
  ).toHaveLength(1);
  act(() =>
    result.current.load(new ArrayBuffer(65568), "broken.merged.bin", {
      autoStart: true,
    }),
  );
  const broken = FakeWorker.instances[2];
  act(() =>
    broken.emit({
      version: "1.1.0",
      type: "error",
      message: "initialization failed",
    }),
  );
  act(() =>
    broken.emit({ version: "1.1.0", type: "snapshot", snapshot: ready }),
  );
  expect(
    broken.postMessage.mock.calls.filter(([m]) => m.type === "start"),
  ).toHaveLength(0);
});

it("mock Worker load identity advances even for same-name loading and invalid attempts", () => {
  const project = createSampleProject();
  const { result } = renderHook(() => useSimulation(project));
  let first: number | undefined, second: number | undefined;
  act(() => {
    first = result.current.load("hex", "same.hex");
  });
  act(() => {
    second = result.current.load("different hex", "same.hex");
  });
  expect(second).toBe((first ?? 0) + 1);
  expect(result.current.loadSession).toBe(second);
  act(() => result.current.load(new ArrayBuffer(1), "same.hex"));
  expect(result.current.loadSession).toBe((second ?? 0) + 1);
});
