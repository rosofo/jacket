import xxhash from "xxhash-wasm";
const hashes = await xxhash();
import {
  GiAbstract001,
  GiAbstract002,
  GiAbstract003,
  GiAbstract004,
  GiAbstract005,
  GiAbstract006,
  GiAbstract007,
  GiAbstract008,
  GiAbstract009,
  GiAbstract010,
  GiAbstract011,
  GiAbstract012,
  GiAbstract013,
  GiAbstract014,
  GiAbstract015,
  GiAbstract016,
  GiAbstract017,
  GiAbstract018,
  GiAbstract019,
  GiAbstract020,
  GiAbstract021,
  GiAbstract022,
  GiAbstract023,
} from "react-icons/gi";

const icons = [
  <GiAbstract001 />,
  <GiAbstract002 />,
  <GiAbstract003 />,
  <GiAbstract004 />,
  <GiAbstract005 />,
  <GiAbstract006 />,
  <GiAbstract007 />,
  <GiAbstract008 />,
  <GiAbstract009 />,
  <GiAbstract010 />,
  <GiAbstract011 />,
  <GiAbstract012 />,
  <GiAbstract013 />,
  <GiAbstract014 />,
  <GiAbstract015 />,
  <GiAbstract016 />,
  <GiAbstract017 />,
  <GiAbstract018 />,
  <GiAbstract019 />,
  <GiAbstract020 />,
  <GiAbstract021 />,
  <GiAbstract022 />,
  <GiAbstract023 />,
];

export default function AbstractSvg({ from }: { from: number | string }) {
  let i: number;
  if (typeof from === "number") {
    i = from;
  } else {
    i = hashes.h32(from);
  }
  return icons[Math.floor(i % icons.length)];
}
