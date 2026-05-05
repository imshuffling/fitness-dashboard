import type { IGarminTokens } from "garmin-connect/dist/garmin/types";
import { createTokenStore } from "./tokenStore";

const store = createTokenStore<IGarminTokens>({ kvKey: "garmin:tokens" });

export const loadGarminTokens = store.load;
export const saveGarminTokens = store.save;
export const clearGarminTokens = store.clear;
export const isGarminConnected = store.isPresent;
