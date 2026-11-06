import type { SimulationController } from "./useSimulation";
/** @brief Display only observed output-enable/level snapshots; Hi-Z is not a fabricated input reading. */
export function GPIOStates({
  simulation,
}: {
  simulation: SimulationController;
}) {
  return (
    <div className="gpio-states">
      <p>
        Observed MCU outputs. Hi-Z/input level is not exposed by this snapshot
        API.
      </p>
      {Object.entries(simulation.snapshot?.gpio ?? {}).map(([pin, level]) => (
        <div key={pin} data-testid={`gpio-${pin}`}>
          <strong>{pin}</strong>
          <span className={level === 1 ? "high" : level === 0 ? "low" : "hiz"}>
            {level === 1 ? "HIGH" : level === 0 ? "LOW" : "Hi-Z / input"}
          </span>
        </div>
      ))}
    </div>
  );
}
