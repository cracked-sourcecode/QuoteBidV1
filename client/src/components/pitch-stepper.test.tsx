import React from "react";
import { render } from "@testing-library/react";
import PitchProgressTracker from "./pitch-progress-tracker";
import { PitchStatus } from "@/utils/pitchStage";

/**
 * Jest test for the PitchProgressTracker component using
 * React Testing Library. For each stage we render the component
 * with sample props and verify the output via snapshot.
 */

describe("PitchProgressTracker", () => {
  const renderTracker = (stage: PitchStatus) =>
    render(
      <PitchProgressTracker
        currentStage={stage}
        pitch={{ paymentIntentId: "pi_test123" }}
      />
    );

  const stages: PitchStatus[] = [
    "draft",
    "pending",
    "sent_to_reporter",
    "reporter_interested",
    "reporter_not_interested",
    "successful_coverage",
  ];

  it.each(stages)("renders correctly at %s stage", (stage) => {
    const { container } = renderTracker(stage as PitchStatus);
    expect(container).toMatchSnapshot();
  });
});
