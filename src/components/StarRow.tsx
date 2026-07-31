interface StarRowProps {
    count: 0 | 1 | 2 | 3;
    size?: "sm" | "md" | "lg";
}

export function StarRow({ count, size = "md" }: StarRowProps): React.ReactElement {
    return (
        <span className={`star-row ${size}`}>
            {[0, 1, 2].map((i) => (
                <span key={i} className={`star ${i < count ? "on" : ""}`}>
                    ★
                </span>
            ))}
        </span>
    );
}
