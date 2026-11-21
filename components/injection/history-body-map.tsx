"use client";

import { BodyMap, type BodyMapRotation } from "@/components/injection/body-map";

export function HistoryBodyMap({ rotation }: { rotation: BodyMapRotation }) {
  return <BodyMap value={null} onChange={() => undefined} rotation={rotation} readOnly />;
}
