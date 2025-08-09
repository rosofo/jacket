import {
  GiEvilWings,
  GiNextButton,
  GiPauseButton,
  GiPlayButton,
  GiPreviousButton,
  GiSwordInStone,
} from "react-icons/gi";
import { Slider } from "radix-ui";
import "./TimelineControls.css";

export type TimelineControlsProps = {
  duration: number;
  frames: number;
  frame: number;
  position: number;
  playing: boolean;
};
export default function TimelineControls({
  duration,
  frames,
  frame,
  position,
  playing,
}: TimelineControlsProps) {
  return (
    <div className="box far compact timeline">
      <div className="cluster">
        <button>{!playing ? <GiPlayButton /> : <GiPauseButton />}</button>
        <div className="" role="status">
          {(position * duration).toFixed(2)}/{duration}s
        </div>
        <div className="" role="status">
          frame {frame}/{frames}
        </div>
        <button>
          <GiPreviousButton />
        </button>
        <Transport position={position} />
        <button>
          <GiNextButton />
        </button>
      </div>
    </div>
  );
}

function Transport({ position }: { position: number }) {
  return (
    <Slider.Root asChild min={0} max={1} step={0.001} value={[position]}>
      <div className="transport grow">
        <Slider.Track className="track">
          <Slider.Range className="range"></Slider.Range>
        </Slider.Track>
        <Slider.Thumb className="thumb">
          <GiEvilWings />
        </Slider.Thumb>
      </div>
    </Slider.Root>
  );
}
