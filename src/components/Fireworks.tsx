import { useEffect, useState } from "react";

interface FireworksProps {
    points: number;
    duration?: number;
    onDone?: () => void;
}

export function Fireworks({ points, duration = 1000, onDone }: FireworksProps): React.ReactElement {
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        const t1 = window.setTimeout(() => setLeaving(true), duration - 200);
        const t2 = window.setTimeout(() => onDone?.(), duration);
        return () => {
            window.clearTimeout(t1);
            window.clearTimeout(t2);
        };
    }, [duration, onDone]);

    return (
        <div className={`points-toast ${leaving ? "out" : "in"}`} aria-hidden="true">
            +{points}
        </div>
    );
}
