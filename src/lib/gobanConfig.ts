import { GobanBase } from "goban";
import { setGobanCallbacks } from "../vendor/goban/Goban/callbacks";

let configured = false;

export function configureGoban(): void {
    if (configured) return;
    configured = true;

    setGobanCallbacks({
        defaultConfig: () => ({
            player_id: 0,
        }),

        getCDNReleaseBase: () => "https://cdn.online-go.com/oss",
        getClockDrift: () => 0,
        getNetworkLatency: () => 0,
        getLocation: () => window.location.pathname,

        getCoordinateDisplaySystem: () => "A1",
        getShowVariationMoveNumbers: () => false,
        getStoneFontScale: () => 1.0,
        getLastMoveCrosshair: () => ({ enabled: false, color: "#000", thickness: 1 }),
        getFuzzyPlacementEnabled: () => true,
        getMoveTreeNumbering: () => "none",

        getSoundEnabled: () => false,
        getSoundVolume: () => 0.5,

        getSelectedThemes: () => ({
            board: "Plain",
            black: "Plain",
            white: "Plain",
            "removal-graphic": "square" as const,
            "removal-scale": 1.0,
            "stone-scale": 1.0,
        }),

        watchSelectedThemes: (cb) => {
            const noop = { remove: () => {} };
            return noop;
        },

        isAnalysisDisabled: (_goban: GobanBase, _appliesToNonPlayers: boolean) => false,
    });
}
